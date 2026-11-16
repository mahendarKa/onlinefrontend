// Server timestamps are naive ISO strings representing UTC.
const hasTz = (s) => /(Z|[+-]\d{2}:?\d{2})$/.test(s);

// Parse a server timestamp as UTC.
export const apiDate = (s) => (s ? new Date(hasTz(s) ? s : s + 'Z') : null);

export const fmtDateTime = (s) => {
  const d = apiDate(s);
  return d ? d.toLocaleString() : '';
};

// Friendly relative timestamp for lists:
//   just now -> 5 mins ago -> 2 hrs ago -> yesterday 4:30 pm
//   -> Nov 7 12:30 pm (same year) -> Jun 23 2025 5:35 pm (older)
export const relTime = (s) => {
  const d = apiDate(s);
  if (!d) return '';
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const time = d.toLocaleString(undefined, {
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).toLowerCase();

  if (diff < 60000) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `yesterday ${time}`;

  const dayFmt = { month: 'short', day: 'numeric' };
  if (d.getFullYear() !== now.getFullYear()) dayFmt.year = 'numeric';
  return `${d.toLocaleString(undefined, dayFmt)} ${time}`;
};

// Server UTC instant -> "YYYY-MM-DDTHH:MM" in browser-local time,
// for datetime-local inputs.
export const toLocalInput = (s) => {
  const d = apiDate(s);
  if (!d) return '';
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

// datetime-local input value (browser-local) -> UTC ISO for the API.
export const toApiUtc = (v) => (v ? new Date(v).toISOString() : null);
