import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Kong (see docker-compose.yml + deploy/kong/local.yml) is the gateway now, same role
// Kong Ingress plays once deployed. It already strips each /api/v1/<prefix> itself, so
// these just forward as-is with no rewriting on this side.
const KONG_URL = 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/v1': KONG_URL,
      '/auth': KONG_URL,
      '/socket.io': { target: KONG_URL, ws: true },
    },
  },
});
