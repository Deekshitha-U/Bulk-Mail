import axios from 'axios';

// Default "/api" is same-origin: in development Vite proxies it to the Express server (no CORS involved).
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 30000 });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('pulsepost_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url || '';
    if (err.response?.status === 401 && !url.includes('/auth/login')) window.dispatchEvent(new Event('pulsepost:unauthorized'));
    return Promise.reject(err);
  }
);

// One place that turns any axios error into a message a person can act on.
export function errMsg(err, fallback = 'Something went wrong.') {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.response?.status === 502 || err?.response?.status === 504 || err?.code === 'ERR_NETWORK') {
    return 'Cannot reach the API. Start the server (cd server && npm run dev) and check it is on port 5000.';
  }
  if (err?.code === 'ECONNABORTED') return 'The server took too long to respond.';
  return err?.message || fallback;
}

export default api;
