// Centered spinner used while a page (or panel) fetches its data.
export default function Loader({ label = 'Loading...', full = false }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 text-gray-500 ${
        full ? 'min-h-[60vh]' : 'py-10'
      }`}
    >
      <svg
        className="w-8 h-8 animate-spin text-blue-600"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="opacity-20"
          cx="12" cy="12" r="10"
          stroke="currentColor" strokeWidth="4"
        />
        <path
          d="M22 12a10 10 0 0 0-10-10"
          stroke="currentColor" strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}
