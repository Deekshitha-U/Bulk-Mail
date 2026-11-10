import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The browser calls /api on ITS OWN origin (e.g. http://localhost:5173/api/...).
// Vite forwards those calls to the Express server, so the browser never makes a cross-origin
// request and CORS cannot fail during development. Change the target if your API uses another port.
const API_TARGET = process.env.VITE_PROXY_TARGET || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
    },
  },
  preview: {
    proxy: { '/api': { target: API_TARGET, changeOrigin: true } },
  },
});
