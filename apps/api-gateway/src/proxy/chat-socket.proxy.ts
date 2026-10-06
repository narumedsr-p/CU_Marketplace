import type { IncomingMessage, Server } from 'http';
import type { Duplex } from 'stream';
import { INestApplication, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { getServiceHttpUrl, UserClaims } from '@workspace/contracts';

const SOCKET_PATH = '/socket.io';

// Real-time chat: browsers connect Socket.IO to the gateway with `?token=<JWT>` (browsers can't set
// custom headers on a WebSocket). Every request on this path — Socket.IO's initial HTTP long-polling
// requests and the later WebSocket upgrade — is authenticated here, given the same trusted headers the
// REST proxies send, and piped to chat-service, which checks them once in its handshake.
export function mountChatSocketProxy(app: INestApplication) {
  const jwt = app.get(JwtService, { strict: false });
  const logger = new Logger('ChatSocketProxy');

  // `ws` stays off on purpose: with `ws: true` the middleware subscribes its own upgrade handler,
  // which would forward WebSocket upgrades without the token check below. We call `upgrade` ourselves.
  const proxy = createProxyMiddleware<IncomingMessage>({
    target: getServiceHttpUrl('chat'),
    changeOrigin: true,
    pathFilter: SOCKET_PATH,
  });

  // Replaces any identity headers the client sent with ones derived from a verified token, and drops
  // the token from the forwarded URL so it never reaches chat-service logs.
  const authorize = (req: IncomingMessage): boolean => {
    delete req.headers['x-user-id'];
    delete req.headers['x-user-role'];
    delete req.headers['x-internal-key'];

    const url = new URL(req.url ?? '/', 'http://gateway.local');
    const token = url.searchParams.get('token');
    if (!token) return false;

    try {
      const claims = jwt.verify<UserClaims>(token);
      req.headers['x-user-id'] = claims.userId;
      req.headers['x-user-role'] = claims.role;
      req.headers['x-internal-key'] = process.env.INTERNAL_SERVICE_SECRET ?? '';
    } catch {
      return false;
    }

    url.searchParams.delete('token');
    req.url = url.pathname + url.search;
    return true;
  };

  const isSocketPath = (req: IncomingMessage) => (req.url ?? '').startsWith(SOCKET_PATH);

  app.use((req: IncomingMessage, res: any, next: () => void) => {
    if (!isSocketPath(req)) return next();
    if (!authorize(req)) {
      res.statusCode = 401;
      res.end('Missing or invalid token');
      return;
    }
    proxy(req, res, next);
  });

  const server: Server = app.getHttpServer();
  server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (!isSocketPath(req)) return;
    if (!authorize(req)) {
      logger.warn('Rejected chat socket upgrade: missing or invalid token');
      socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n');
      return;
    }
    proxy.upgrade(req, socket as any, head);
  });
}
