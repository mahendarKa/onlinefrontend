import { useEffect, useState } from 'react';
import { subscribePending } from '../api/loading';

// Indeterminate top progress bar shown while any API request is in
// flight. A short delay keeps it from flickering on instant requests.
const SHOW_AFTER_MS = 150;

const CSS = `
@keyframes loading-bar {
  from { transform: translateX(-100%); }
  to   { transform: translateX(300%); }
}
`;

export default function LoadingBar() {
  const [pending, setPending] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => subscribePending(setPending), []);

  useEffect(() => {
    if (pending > 0) {
      const t = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [pending > 0]);

  if (!visible) return null;

  return (
    <>
      <style>{CSS}</style>
      <div className="fixed top-0 left-0 right-0 h-1 z-[9999] overflow-hidden bg-indigo-100">
        <div
          className="h-full w-1/4 bg-indigo-600 rounded-full"
          style={{ animation: 'loading-bar 1s ease-in-out infinite' }}
        />
      </div>
    </>
  );
}
