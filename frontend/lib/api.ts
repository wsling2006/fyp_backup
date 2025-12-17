import axios from 'axios';

// Prefer env var; otherwise on the browser, derive http(s)://<host>:3000 (Nest backend)
// Finally, fall back to localhost:3000
const browserBase = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3000`
  : undefined;
const baseURL = process.env.NEXT_PUBLIC_API_URL || browserBase || 'http://localhost:3000';

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  try {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore in SSR or unexpected errors
  }
  return config;
});

// Global 401 handler: let pages/hook handle logout via thrown error; still provide hook here if desired
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If unauthorized, propagate error so auth layer can logout
    return Promise.reject(error);
  }
);

export default api;
