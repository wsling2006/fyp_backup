import axios from 'axios';

/**
 * PRODUCTION-READY API Client with Same-Origin Proxy
 * 
 * Architecture:
 * - Browser → /api/* (relative paths, same-origin)
 * - Next.js proxy at /app/api/[...path]/route.ts forwards to backend
 * - Backend runs on localhost:3000 (on same EC2 instance)
 * 
 * Benefits:
 * - No hardcoded IPs - works after every EC2 restart
 * - Simplified CORS - backend only needs to allow localhost:3001
 * - Frontend code is IP-agnostic
 */

const baseURL = process.env.NEXT_PUBLIC_API_BASE || '/api';

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
