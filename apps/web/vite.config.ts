import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// There's no gateway process anymore — Kong Ingress (jwt + pre-function plugins) fills
// that role once deployed, see the deploy plan. Until then, dev proxies each
// /api/v1/<prefix> straight to its own service, stripping the prefix the same way the old
// gateway's proxy controllers used to (each service's own controllers are mounted at '/',
// not '/api/v1/<name>'). IMPORTANT: every service's InternalAuthGuard requires
// x-internal-key, and @CurrentUser() reads x-user-id/x-user-role — the old gateway stamped
// all three onto every forwarded request. Nothing does that here, so every authenticated
// route (REST and the chat socket) returns 401 / has no user context until Kong is stood
// up. That's expected at this point in the migration, not a bug to patch around here.
function serviceProxy(prefix: string, port: number) {
  return {
    target: `http://localhost:${port}`,
    rewrite: (path: string) => path.replace(prefix, '') || '/',
  };
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/v1/catalog': serviceProxy('/api/v1/catalog', 3001),
      '/api/v1/orders': serviceProxy('/api/v1/orders', 3002),
      '/api/v1/chats': serviceProxy('/api/v1/chats', 3003),
      '/api/v1/wishlists': serviceProxy('/api/v1/wishlists', 3004),
      '/api/v1/matches': serviceProxy('/api/v1/matches', 3004),
      '/api/v1/reviews': serviceProxy('/api/v1/reviews', 3005),
      '/api/v1/profiles': serviceProxy('/api/v1/profiles', 3006),
      '/api/v1/notifications': serviceProxy('/api/v1/notifications', 3007),
      // Auth now lives in profile-service itself, mounted at '/auth' already — no rewrite.
      '/auth': 'http://localhost:3006',
      // NB: chat-service's socket gateway expects x-user-id/x-internal-key headers at the
      // WS handshake. The old gateway derived those from ?token=<jwt> before proxying;
      // until Kong (jwt + pre-function plugins) is deployed, realtime chat auth is broken
      // in local dev — see the deploy plan's Kong steps.
      '/socket.io': { target: 'http://localhost:3003', ws: true },
    },
  },
});
