import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://bulk-mail-srlb.onrender.com/api'
    : '/api');

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pulsepost_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';

    if (
      error.response?.status === 401 &&
      !url.includes('/auth/login')
    ) {
      window.dispatchEvent(new Event('pulsepost:unauthorized'));
    }

    return Promise.reject(error);
  }
);

export function errMsg(error, fallback = 'Something went wrong.') {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.response?.status === 405) {
    return 'The API rejected this request method. Check the request URL and HTTP method.';
  }

  if (
    error.response?.status === 502 ||
    error.response?.status === 504 ||
    error.code === 'ERR_NETWORK'
  ) {
    return 'Cannot reach the backend. Please check the Render API service.';
  }

  if (error.code === 'ECONNABORTED') {
    return 'The server took too long to respond.';
  }

  return error.message || fallback;
}

export default api;