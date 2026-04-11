import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach the right JWT depending on which portal the request is coming from.
// User portal pages store their token under 'cya_user_token'.
// Admin portal pages use 'cya_token'.
api.interceptors.request.use((config) => {
  const isUserRoute = window.location.pathname.startsWith('/user/');
  const token = isUserRoute
    ? localStorage.getItem('cya_user_token')
    : localStorage.getItem('cya_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to correct login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isUserRoute = window.location.pathname.startsWith('/user/');
      if (isUserRoute) {
        localStorage.removeItem('cya_user_token');
        window.location.href = '/user/login';
      } else {
        localStorage.removeItem('cya_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
