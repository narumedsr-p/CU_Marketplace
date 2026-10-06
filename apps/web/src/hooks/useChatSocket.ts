import { useCallback, useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getToken } from '../api/client';
import type { ApiChatMessage } from '../api/chat';

export type SendAck = { ok: true; message: ApiChatMessage } | { ok: false; error: string };

// One Socket.IO connection per signed-in session. It goes to this origin's /socket.io (Vite proxies it
// to the api-gateway, which verifies the token and forwards to chat-service). Browsers can't set
// headers on a WebSocket, so the token travels in the query string.
export default function useChatSocket(enabled: boolean, onMessage: (message: ApiChatMessage) => void) {
  const socketRef = useRef<Socket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const token = enabled ? getToken() : null;
    if (!token) return;

    const socket = io({ query: { token } });
    socket.on('message:new', (message: ApiChatMessage) => onMessageRef.current(message));
    // The query is fixed at creation, so refresh it before each reconnect: otherwise a reconnect after
    // the 1-hour JWT expiry (or after signing in again) keeps sending the old token and is rejected forever.
    socket.io.on('reconnect_attempt', () => {
      const fresh = getToken();
      if (fresh) socket.io.opts.query = { token: fresh };
      else socket.disconnect();
    });
    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);

  const send = useCallback(async (roomId: string, content: string): Promise<SendAck> => {
    const socket = socketRef.current;
    if (!socket?.connected) return { ok: false, error: 'Not connected to chat. Try again in a moment.' };
    try {
      return await socket.timeout(5000).emitWithAck('message:send', { roomId, content });
    } catch {
      return { ok: false, error: 'Chat server did not respond.' };
    }
  }, []);

  return { send };
}
