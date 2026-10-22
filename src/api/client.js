import axios from 'axios';

// API base URL. '/api' uses the vite dev proxy (local backend).
// For a deployed backend, build with e.g.
//   VITE_API_URL=https://onlinebackend-s6hu.onrender.com/api
const baseURL = import.meta.env.VITE_API_URL || '/api';

// Origin serving the API, for resolving server-relative paths
// like /api/uploads/x.png. '' when same-origin (dev proxy).
const apiOrigin = baseURL.replace(/\/api\/?$/, '');

const api = axios.create({ baseURL });

// Server image/file paths come back relative (/api/uploads/...);
// blob:, data: and absolute URLs pass through untouched.
export const fileUrl = (u) =>
  u && u.startsWith('/') ? `${apiOrigin}${u}` : u;

// FastAPI error bodies: HTTPException gives detail as a string, while
// 422 validation failures give a list of {loc, msg} objects. Rendering
// the list directly would crash React, so always go through this.
export const detailText = (err, fallback = 'Request failed') => {
  const d = err.response?.data?.detail;
  if (typeof d === 'string' && d) return d;
  if (Array.isArray(d) && d.length) {
    const parts = d.map((e) => {
      if (e && typeof e === 'object') {
        const loc = (e.loc || [])
          .filter((p) => !['body', 'query', 'path'].includes(p))
          .join('.');
        const msg = String(e.msg ?? 'Invalid value')
          .replace(/^Value error, /, '');
        return loc ? `${loc}: ${msg}` : msg;
      }
      return String(e);
    }).join('; ');
    if (parts) return parts;
  }
  return fallback;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
