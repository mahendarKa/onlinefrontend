import { useEffect, useState } from 'react';

// Module-level event emitter: any file can call toast() without a
// provider — Toaster listens for emitted items and auto-dismisses.
// Items emitted before Toaster mounts are queued so they are never lost.
const listeners = new Set();
const queue = [];
let seq = 0;

export function toast(message, type = 'success') {
  if (message === null || message === undefined || message === '') return;
  const item = { id: ++seq, message: String(message), type };
  if (!listeners.size) {
    queue.push(item);
    return;
  }
  listeners.forEach((fn) => fn(item));
}

// Per-type icon + colors (icon = Heroicons outline path).
const THEME = {
  success: {
    icon: 'M4.5 12.75l6 6 9-13.5',
    badge: 'bg-emerald-100 text-emerald-600',
    bar: 'bg-emerald-500',
  },
  error: {
    icon: 'M6 18L18 6M6 6l12 12',
    badge: 'bg-red-100 text-red-600',
    bar: 'bg-red-500',
  },
  info: {
    icon: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
    badge: 'bg-slate-100 text-slate-600',
    bar: 'bg-slate-500',
  },
};

// Slide-in from the right; slide-out fades and drifts away.
const ANIMATION_CSS = `
@keyframes toast-in {
  from { opacity: 0; transform: translateX(110%) scale(.95); }
  to   { opacity: 1; transform: translateX(0) scale(1); }
}
@keyframes toast-out {
  from { opacity: 1; transform: translateX(0) scale(1); }
  to   { opacity: 0; transform: translateX(110%) scale(.95); }
}
`;

const VISIBLE_MS = 3200;
const EXIT_MS = 350;

// Inject keyframes once so the entry animation always resolves — the
// <style> tag used to mount/unmount with the item list, which could
// race the first toast's animation in some browsers.
if (
  typeof document !== 'undefined' &&
  !document.getElementById('toast-anim-css')
) {
  const el = document.createElement('style');
  el.id = 'toast-anim-css';
  el.textContent = ANIMATION_CSS;
  document.head.appendChild(el);
}

export default function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const dismiss = (id) =>
      setItems((prev) =>
        prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
      );
    const onToast = (item) => {
      setItems((prev) => [...prev, item]);
      setTimeout(() => dismiss(item.id), VISIBLE_MS);
      setTimeout(
        () => setItems((prev) => prev.filter((t) => t.id !== item.id)),
        VISIBLE_MS + EXIT_MS
      );
    };
    listeners.add(onToast);
    // Flush anything emitted before this listener registered.
    queue.splice(0).forEach(onToast);
    return () => listeners.delete(onToast);
  }, []);

  if (!items.length) return null;

  return (
    <>
      <div className="fixed top-5 right-5 z-[9999] space-y-3">
        {items.map((t) => {
          const theme = THEME[t.type] || THEME.success;
          return (
            <div
              key={t.id}
              className="relative flex items-center gap-3 bg-white rounded-xl shadow-2xl ring-1 ring-slate-200 pl-4 pr-10 py-4 min-w-[320px] max-w-sm overflow-hidden"
              style={{
                animation: `${t.leaving ? 'toast-out' : 'toast-in'} ${EXIT_MS}ms cubic-bezier(.21,1.02,.73,1) both`,
              }}
            >
              {/* Colored accent bar on the left edge. */}
              <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${theme.bar}`} />

              <span className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${theme.badge}`}>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={theme.icon}
                  />
                </svg>
              </span>

              <p className="text-[15px] font-medium text-slate-800 leading-snug">
                {t.message}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}
