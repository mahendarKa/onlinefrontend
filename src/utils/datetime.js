// Server timestamps are naive ISO strings representing UTC.
const hasTz = (s) => /(Z|[+-]\d{2}:?\d{2})$/.test(s);

// Parse a server timestamp as UTC.
export const apiDate = (s) => (s ? new Date(hasTz(s) ? s : s + 'Z') : null);

export const fmtDateTime = (s) => {
  const d = apiDate(s);
  return d ? d.toLocaleString() : '';
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
