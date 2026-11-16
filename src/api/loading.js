// Pending-request counter. The axios client calls trackStart/trackEnd
// around every request; LoadingBar subscribes to show a page-level
// progress indicator whenever any request is in flight.
const listeners = new Set();
let pending = 0;

const emit = () => listeners.forEach((fn) => fn(pending));

export const trackStart = () => {
  pending += 1;
  emit();
};

export const trackEnd = () => {
  pending = Math.max(0, pending - 1);
  emit();
};

export const subscribePending = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
