// Test client for chat-service WebSockets. Pretends to be the api-gateway by sending the
// trusted headers itself, so no frontend or gateway is needed.
//
// Usage (from apps/chat-service):
//   node scripts/ws-client.mjs <userId> [roomId]
//   node scripts/ws-client.mjs <userId> [roomId] --bad-key    (test that a wrong key is rejected)
//
// With a roomId, every line you type is sent as `message:send` to that room.

import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { io } from 'socket.io-client';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: join(here, '../../../.env') }); // repo-root .env holds INTERNAL_SERVICE_SECRET

const [userId, roomId] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const badKey = process.argv.includes('--bad-key');
const url = process.env.CHAT_WS_URL ?? 'http://localhost:3003';

if (!userId) {
  console.error('Usage: node scripts/ws-client.mjs <userId> [roomId] [--bad-key]');
  process.exit(1);
}

const socket = io(url, {
  extraHeaders: {
    'x-user-id': userId,
    'x-internal-key': badKey ? 'wrong-key' : process.env.INTERNAL_SERVICE_SECRET ?? '',
  },
});

const log = (...args) => console.log(`[${new Date().toLocaleTimeString()}]`, ...args);

socket.on('connect', () => {
  log(`connected as user ${userId} (socket ${socket.id})`);

  socket.timeout(3000).emit('ping', { from: userId }, (err, reply) => {
    if (err) log('ping: no reply within 3s (is the ping handler written yet?)');
    else log('ping reply:', reply);
  });

  if (roomId) log(`type a message and press Enter to send it to room ${roomId}`);
});

socket.on('disconnect', (reason) => log('disconnected:', reason));
socket.on('connect_error', (err) => log('connect error:', err.message));

socket.on('message:new', (message) => log('message:new', message));
socket.on('typing', (payload) => log('typing', payload));

if (roomId) {
  const rl = createInterface({ input: process.stdin });
  rl.on('line', (content) => {
    socket.timeout(5000).emit('message:send', { roomId, content }, (err, ack) => {
      if (err) log('message:send: no ack within 5s');
      else log('ack:', ack);
    });
  });
}
