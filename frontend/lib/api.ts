import axios from 'axios';

// PRODUCTION-READY: Use environment variable or fallback safely
// For EC2 deployment, set NEXT_PUBLIC_API_URL in .env.production
const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from localStorage (client-side only)
api.interceptors.request.use((config) => {
  // Only access localStorage in browser context
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // Silently fail if localStorage unavailable (SSR, incognito, etc.)
      console.warn('[API] Failed to read token from localStorage:', e);
    }
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
