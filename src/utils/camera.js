// Camera feed verification for proctoring.
//
// getUserMedia succeeding is NOT proof of a working camera:
// - A physical cap streams pure-black frames.
// - An OS-privacy-disabled camera streams a frozen placeholder frame
//   (Chrome shows a grey camera icon) — not muted, not black.
// - A frozen/failed driver streams an unchanging frame.
//
// A real sensor always has noise, so consecutive frames differ. The
// probe rejects any feed that is near-black OR pixel-identical
// between samples.

const SLEEP = (ms) => new Promise((r) => setTimeout(r, ms));

const SIZE = 16;
const DARK_AVG = 8;      // average luminance below this = black feed
const MIN_DELTA = 0.5;   // frame-to-frame change below this = static

/**
 * Draw `video` into a 16×16 canvas and return { out, avg }:
 * `out` is the per-pixel luminance array, `avg` the mean.
 * `ctx` must come from a SIZE×SIZE canvas.
 */
export function sampleLuma(video, ctx, out) {
  ctx.drawImage(video, 0, 0, SIZE, SIZE);
  const d = ctx.getImageData(0, 0, SIZE, SIZE).data;
  let sum = 0;
  for (let i = 0, j = 0; i < d.length; i += 4, j += 1) {
    const v = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
    out[j] = v;
    sum += v;
  }
  return sum / (SIZE * SIZE);
}

/**
 * Average absolute luminance change between two sampled frames.
 */
export function frameDelta(prev, cur) {
  let delta = 0;
  for (let j = 0; j < prev.length; j += 1) delta += Math.abs(cur[j] - prev[j]);
  return delta / prev.length;
}

/**
 * Waits for REAL camera frames on a playing video element.
 * Returns true only once it sees a non-black frame that differs
 * from the previous sample — proving live sensor output.
 * Gives up after `timeoutMs` and returns false.
 */
export async function realCameraFrames(video, timeoutMs = 4000) {
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const prev = new Float32Array(SIZE * SIZE);
  const cur = new Float32Array(SIZE * SIZE);
  let havePrev = false;
  const end = Date.now() + timeoutMs;

  while (Date.now() < end) {
    if (video.readyState >= 2 && video.videoWidth > 0) {
      const avg = sampleLuma(video, ctx, cur);
      if (avg >= DARK_AVG) {
        if (havePrev && frameDelta(prev, cur) >= MIN_DELTA) return true;
        prev.set(cur);
        havePrev = true;
      }
    }
    await SLEEP(350);
  }
  return false;
}

/**
 * Probes a MediaStream by playing it on a detached video element.
 * Use before starting a proctored exam so a dead camera never
 * creates an attempt.
 */
export async function probeCameraStream(stream, timeoutMs = 4000) {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  try {
    await video.play();
  } catch {
    return false;
  }
  try {
    return await realCameraFrames(video, timeoutMs);
  } finally {
    video.srcObject = null;
  }
}
