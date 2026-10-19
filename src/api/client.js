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
