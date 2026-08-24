import axios from 'axios';

// Environment-driven API base URL (defaults to '/api' for Vite dev proxy)
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token & X-Session-ID to every request EXCEPT /auth/login/ itself
api.interceptors.request.use((config) => {
  const isLoginRequest = config.url?.includes('/auth/login/');
  if (!isLoginRequest) {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const sessionId = localStorage.getItem('session_id');
    if (sessionId) {
      config.headers['X-Session-ID'] = sessionId;
    }
  }
  return config;
});

// Handle 401 — check for explicit session revocation / account disabling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isLoginRequest = originalRequest?.url?.includes('/auth/login/');

    // If 401 on login itself — bad credentials, let it pass through
    if (isLoginRequest) {
      return Promise.reject(error);
    }

    const resData = error.response?.data;
    const errCode = resData?.code || (typeof resData?.detail === 'object' ? resData?.detail?.code : null);

    // Check for explicit session revocation or account disabling from backend
    if (errCode === 'session_revoked' || errCode === 'account_disabled') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('session_id');

      const message = (typeof resData?.detail === 'string' ? resData?.detail : null) ||
        (typeof resData?.detail === 'object' ? resData?.detail?.detail : null) ||
        'Your active session has been terminated by an Administrator.';

      window.dispatchEvent(new CustomEvent('auth-revoked', {
        detail: {
          code: errCode,
          message: message
        }
      }));

      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const res = await axios.post(`${API_BASE}/auth/refresh/`, { refresh });
          const newAccess = res.data.access;
          localStorage.setItem('access_token', newAccess);
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        } catch {
          // Refresh failed — clear everything and go to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          localStorage.removeItem('session_id');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('session_id');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
