import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Override with GATEWAY_URL=http://localhost:<port> when 3000 is taken.
const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': GATEWAY_URL,
      '/auth': GATEWAY_URL,
      '/socket.io': { target: GATEWAY_URL, ws: true },
    },
  },
});
