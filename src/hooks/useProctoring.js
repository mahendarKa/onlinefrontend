import { useEffect, useRef, useState } from 'react';
import api from '../api/client';

// How often the webcam frame is analysed (ms).
const CHECK_INTERVAL = 3000;
// Minimum gap between reports of the same event type (ms).
const RATE_LIMIT = 15000;
// A flag must persist this many consecutive checks before reporting —
// single-frame false positives (glance down, bad lighting) get ignored.
const CONFIRM_CHECKS = 2;
// Nose-tip offset from face-box centre (as a fraction of box width)
// beyond which we consider the face turned away.
const GAZE_RATIO = 0.32;

let faceApiPromise = null;

// face-api.js is heavy (~1MB) — load it and the model weights only when
// a proctored exam actually starts. Resolves to null when unavailable.
async function loadFaceApi() {
  if (!faceApiPromise) {
    faceApiPromise = (async () => {
      try {
        const faceapi = await import('face-api.js');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
        ]);
        return faceapi;
      } catch {
        return null;
      }
    })();
  }
  return faceApiPromise;
}

function noseOffsetRatio(landmarks, box) {
  const nose = landmarks.getNose();
  const tip = nose[Math.floor(nose.length / 2)] || nose[0];
  const centre = box.x + box.width / 2;
  return Math.abs(tip.x - centre) / box.width;
}

/**
 * useProctoring({ attemptId, enabled })
 *
 * When enabled: starts the webcam, runs periodic face detection, wires
 * browser-behaviour listeners (tab switch, blur, copy/paste, context
 * menu) and reports events to /api/proctoring. Flagged AI events also
 * upload the offending frame as evidence.
 *
 * Returns { videoRef, status, aiActive } — render a <video> element
 * with videoRef for the proctor preview.
 */
export default function useProctoring({ attemptId, enabled }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle|starting|active|no_camera
  const [aiActive, setAiActive] = useState(false);
  // Bumped by retry() to re-run the camera request after a denial.
  const [camAttempt, setCamAttempt] = useState(0);
  const retry = () => {
    setStatus('starting');
    setCamAttempt((c) => c + 1);
  };

  useEffect(() => {
    if (!enabled || !attemptId) return undefined;
    let cancelled = false;
    let stream = null;
    let checkTimer = null;
    let watchdog = null;
    const lastSent = {};
    const streak = {};

    const post = (type, detail) => {
      const now = Date.now();
      if (now - (lastSent[type] || 0) < RATE_LIMIT) return;
      lastSent[type] = now;
      api.post('/proctoring/events', {
        attempt_id: attemptId,
        event_type: type,
        detail: detail || null,
      }).catch(() => {});
    };

    const postSnapshot = (type, detail) => {
      const now = Date.now();
      if (now - (lastSent[type] || 0) < RATE_LIMIT) return;
      lastSent[type] = now;
      const video = videoRef.current;
      if (!video || !video.videoWidth) return;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const fd = new FormData();
        fd.append('attempt_id', String(attemptId));
        fd.append('event_type', type);
        if (detail) fd.append('detail', detail);
        fd.append('file', blob, 'snapshot.jpg');
        api.post('/proctoring/snapshots', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }).catch(() => {});
      }, 'image/jpeg', 0.7);
    };

    // Browser-behaviour listeners.
    const onVisibility = () => {
      if (document.hidden) post('tab_hidden');
    };
    const onBlur = () => post('window_blur');
    const block = (type) => (e) => {
      e.preventDefault();
      post(type);
    };
    const onCopy = block('copy');
    const onCut = block('cut');
    const onPaste = block('paste');
    const onMenu = block('context_menu');
    const onFullscreen = () => {
      if (!document.fullscreenElement) post('fullscreen_exit');
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onMenu);
    document.addEventListener('fullscreenchange', onFullscreen);

    const runChecks = (faceapi) => {
      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.4,
      });
      checkTimer = setInterval(async () => {
        const video = videoRef.current;
        if (cancelled || !video || video.readyState < 2) return;
        let dets;
        try {
          dets = await faceapi
            .detectAllFaces(video, options)
            .withFaceLandmarks(true);
        } catch {
          return;
        }
        const flag =
          dets.length === 0
            ? ['no_face', 'No face detected on webcam']
            : dets.length > 1
              ? ['multiple_faces', `${dets.length} faces detected`]
              : noseOffsetRatio(
                    dets[0].landmarks, dets[0].detection.box
                  ) > GAZE_RATIO
                ? ['looking_away', 'Face turned away from screen']
                : null;
        // Require CONFIRM_CHECKS consecutive detections of the same
        // flag before reporting.
        Object.keys(streak).forEach((k) => {
          if (!flag || k !== flag[0]) streak[k] = 0;
        });
        if (flag) {
          streak[flag[0]] = (streak[flag[0]] || 0) + 1;
          if (streak[flag[0]] >= CONFIRM_CHECKS) {
            streak[flag[0]] = 0;
            postSnapshot(flag[0], flag[1]);
          }
        }
      }, CHECK_INTERVAL);
    };

    const start = async () => {
      setStatus('starting');
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320 },
        });
      } catch {
        setStatus('no_camera');
        post('camera_denied', 'Camera permission denied or unavailable');
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      // Permission granted ≠ frames flowing: a camera cap or OS
      // privacy switch leaves the track muted/black. Watch for that
      // and for mid-exam loss, then drop back to the camera gate.
      const loseCamera = (kind) => {
        if (!cancelled) {
          setStatus('no_camera');
          post('camera_lost', kind);
        }
      };
      stream.getVideoTracks().forEach((t) => {
        t.addEventListener('ended', () =>
          loseCamera('Webcam stream ended during the exam')
        );
        t.addEventListener('mute', () =>
          loseCamera('Camera stopped producing video')
        );
        // Camera re-enabled (cap/switch opened) → exam resumes.
        t.addEventListener('unmute', () => {
          if (!cancelled) setStatus('active');
        });
      });
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.play().catch(() => {});
        // Frames actually rendered → truly active.
        video.addEventListener('playing', () => {
          if (!cancelled) setStatus('active');
        });
        // No frames within a few seconds → treat as no camera.
        watchdog = setTimeout(() => {
          if (!cancelled && video.readyState < 2 && video.videoWidth === 0) {
            loseCamera('Camera produced no video');
          }
        }, 4000);
      }
      if (stream.getVideoTracks().some((t) => t.muted)) {
        setStatus('no_camera');
        post('camera_denied',
          'Camera produced no video (cap closed or privacy switch)');
      } else {
        setStatus('active');
      }

      const faceapi = await loadFaceApi();
      if (cancelled) return;
      if (faceapi) {
        setAiActive(true);
        runChecks(faceapi);
      } else {
        post('ai_unavailable', 'Face detection models not available');
      }
    };
    start();

    return () => {
      cancelled = true;
      clearInterval(checkTimer);
      clearTimeout(watchdog);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onMenu);
      document.removeEventListener('fullscreenchange', onFullscreen);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [attemptId, enabled, camAttempt]); // eslint-disable-line react-hooks/exhaustive-deps

  return { videoRef, status, aiActive, retry };
}
