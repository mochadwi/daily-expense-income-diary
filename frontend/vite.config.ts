import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Vite proxies API calls to the dev Express server when VITE_API_URL is unset,
    // so `fetch('/api/...')` works out of the box. If VITE_API_URL is set, the
    // client uses an absolute URL and the proxy is just a safety net.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
