import { useEffect, useState } from 'react';

// Module-level event emitter: any file can call toast() without a
// provider — Toaster listens for emitted items and auto-dismisses.
const listeners = new Set();
let seq = 0;

export function toast(message, type = 'success') {
  const item = { id: ++seq, message, type };
  listeners.forEach((fn) => fn(item));
}

const STYLES = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-slate-700',
};

export default function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const onToast = (item) => {
      setItems((prev) => [...prev, item]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== item.id));
      }, 3500);
    };
    listeners.add(onToast);
    return () => listeners.delete(onToast);
  }, []);

  if (!items.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`${STYLES[t.type] || STYLES.success} text-white text-sm px-4 py-2 rounded shadow-lg max-w-xs`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
