import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const GATEWAY_URL = 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': GATEWAY_URL,
      '/auth': GATEWAY_URL,
    },
  },
});
