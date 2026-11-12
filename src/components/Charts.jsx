// Lightweight chart primitives — no chart library, just SVG + Tailwind.
import { Link } from 'react-router-dom';

export function StatCard({ label, value, icon, accent = 'bg-blue-100 text-blue-600', sub, to }) {
  const cls = `bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4${
    to ? ' hover:shadow-md hover:border-blue-300 transition cursor-pointer' : ''}`;
  const inner = (
    <>
      {icon && (
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            className="w-6 h-6" aria-hidden="true">
            <path d={icon} />
          </svg>
        </div>
      )}
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-tight">{value}</p>
        <p className="text-xs text-gray-500 truncate">{label}</p>
        {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
      </div>
    </>
  );
  return to
    ? <Link to={to} className={cls}>{inner}</Link>
    : <div className={cls}>{inner}</div>;
}

// Donut with a legend. slices: [{label, value, color}]
export function Donut({ slices, size = 150, thickness = 20, centerLabel }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = circumference * 0.25; // start at 12 o'clock

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} className="shrink-0">
        <circle cx={cx} cy={cx} r={r} fill="none"
          stroke="#f1f5f9" strokeWidth={thickness} />
        {total > 0 && slices.map((s) => {
          const len = total ? (s.value / total) * circumference : 0;
          const el = (
            <circle key={s.label} cx={cx} cy={cx} r={r} fill="none"
              stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={offset} />
          );
          offset -= len;
          return el;
        })}
        <text x={cx} y={cx - 4} textAnchor="middle"
          className="fill-gray-800" fontSize="24" fontWeight="700">
          {total}
        </text>
        {centerLabel && (
          <text x={cx} y={cx + 14} textAnchor="middle"
            className="fill-gray-400" fontSize="10">
            {centerLabel}
          </text>
        )}
      </svg>
      <ul className="space-y-1.5 text-sm min-w-0">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: s.color }} />
            <span className="text-gray-600 truncate">{s.label}</span>
            <span className="font-semibold ml-auto pl-3">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Horizontal labeled bars. rows: [{label, value, color}]
export function HBars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600">{r.label}</span>
            <span className="font-semibold">{r.value}</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Vertical mini bar chart. rows: [{label, value}]
export function VBars({ rows, color = '#2563eb', height = 120 }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {rows.map((r) => (
        <div key={r.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <span className="text-[10px] font-semibold text-gray-600">
            {r.value || ''}
          </span>
          <div className="w-full rounded-t-md"
            style={{
              height: `${Math.max((r.value / max) * (height - 42), r.value ? 4 : 0)}px`,
              background: r.color || color,
            }} />
          <span className="text-[10px] text-gray-400 truncate w-full text-center"
            title={r.label}>
            {r.short || r.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Panel({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${className}`}>
      <h2 className="text-sm font-semibold text-gray-700 mb-4">{title}</h2>
      {children}
    </div>
  );
}
