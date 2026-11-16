import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { detailText } from '../../api/client';
import { probeCameraStream } from '../../utils/camera';

// Shared student exam start/resume flow. Proctored exams show a
// disclaimer + live camera check BEFORE the attempt is created, so a
// denied camera never consumes an attempt.
//   const { handleStart, error, setError, modal } = useExamStarter({ onAutoSubmitted: load });
// Render {modal} inside the page; call handleStart(exam) to begin.
export default function useExamStarter({ onAutoSubmitted } = {}) {
  const [disclaimerExam, setDisclaimerExam] = useState(null);
  const [camChecking, setCamChecking] = useState(false);
  const [camError, setCamError] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const startExam = async (exam) => {
    setError('');
    try {
      const { data } = await api.post(`/student/exams/${exam.exam_id}/start`);
      // Expired in-progress attempts come back submitted with no time
      // left — show a time-up notice instead of opening the player.
      if (data.status !== 'in_progress' || data.remaining_seconds <= 0) {
        setError('Time is up for this exam — your attempt was auto-submitted.');
        onAutoSubmitted?.();
        return;
      }
      navigate(`/exam/${exam.exam_id}/attempt/${data.attempt_id}`);
    } catch (err) {
      setError(detailText(err, 'Unable to start exam'));
    }
  };

  const handleStart = (exam) => {
    if (exam.is_proctored) {
      setCamError('');
      setDisclaimerExam(exam);
    } else {
      startExam(exam);
    }
  };

  const agreeAndStart = async () => {
    const exam = disclaimerExam;
    setCamChecking(true);
    setCamError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      // Permission alone isn't enough — a closed cap or disabled
      // camera streams black/frozen frames. Require live frames.
      const live = await probeCameraStream(stream);
      stream.getTracks().forEach((t) => t.stop());
      if (!live) {
        setCamError(
          'Your camera is not producing video — open the camera ' +
          'cover or enable camera access, then try again.'
        );
        setCamChecking(false);
        return;
      }
    } catch {
      setCamError(
        'Camera access is required for this exam. Allow camera ' +
        'permission in your browser and try again.'
      );
      setCamChecking(false);
      return;
    }
    // Fullscreen requires a user gesture — request it here, while the
    // click is still active, so it survives the route change.
    try {
      await document.documentElement.requestFullscreen();
    } catch { /* the player shows a re-enter banner */ }
    setCamChecking(false);
    setDisclaimerExam(null);
    startExam(exam);
  };

  const modal = disclaimerExam && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={() => !camChecking && setDisclaimerExam(null)}>
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-lg mb-1">
          Proctored exam — {disclaimerExam.name}
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          This exam is remotely proctored. By continuing you agree
          that during the attempt:
        </p>
        <ul className="text-sm text-gray-700 space-y-1.5 mb-4 list-disc pl-5">
          <li>Your <strong>webcam stays on</strong> and your face
            remains visible to the camera.</li>
          <li>Periodically your webcam frame is checked — absence,
            extra people, or looking away are recorded.</li>
          <li>Switching tabs or minimising the browser is recorded
            as a violation.</li>
          <li>Copy, paste, cut and right-click are disabled and
            logged.</li>
          <li>Flagged snapshots are reviewed by your instructor.</li>
          {disclaimerExam.max_violations && (
            <li className="font-medium text-red-700">
              Reaching {disclaimerExam.max_violations} violations
              ends your attempt automatically.
            </li>
          )}
        </ul>

        {camError && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">
            {camError}
          </p>
        )}

        <div className="flex gap-2">
          <button onClick={agreeAndStart} disabled={camChecking}
            className="flex-1 bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            {camChecking
              ? 'Checking camera...'
              : disclaimerExam.status === 'in_progress'
                ? 'I agree — resume exam'
                : 'I agree — start exam'}
          </button>
          <button onClick={() => setDisclaimerExam(null)}
            disabled={camChecking}
            className="px-4 bg-gray-200 py-2 rounded text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return { handleStart, error, setError, modal };
}
