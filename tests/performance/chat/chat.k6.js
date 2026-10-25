import http from 'k6/http';
import { WebSocket } from 'k6/websockets';
import { setTimeout, clearTimeout } from 'k6/timers';
import { check, fail } from 'k6';
import encoding from 'k6/encoding';
import { Counter, Rate, Trend } from 'k6/metrics';
import { decodeFrame, encodeMessage, matchesRecipient, deliveryResult } from './protocol.mjs';
import { createPacer } from './pacing.mjs';

const base = (__ENV.BASE_URL || 'http://localhost:30080').replace(/\/+$/, '');
const seconds = Number(__ENV.DURATION_SECONDS || 60);
if (!Number.isSafeInteger(seconds) || seconds < 1) throw new Error('DURATION_SECONDS must be a positive integer.');
const useTotal = __ENV.TOTAL_MESSAGES !== undefined;
if (useTotal && __ENV.MESSAGE_RATE !== undefined) {
  throw new Error('Choose TOTAL_MESSAGES or MESSAGE_RATE, not both.');
}
const requestedRate = Number(__ENV.MESSAGE_RATE || 1);
if (!useTotal && (!Number.isSafeInteger(requestedRate) || requestedRate < 1)) {
  throw new Error('MESSAGE_RATE must be a positive integer.');
}
const expected = useTotal ? Number(__ENV.TOTAL_MESSAGES) : requestedRate * seconds;
if (!Number.isSafeInteger(expected) || expected < 1) throw new Error('TOTAL_MESSAGES must be a positive integer.');
const rate = expected / seconds;
const sent = new Counter('chat_messages_sent');
const received = new Counter('chat_messages_received');
const resolved = new Counter('chat_messages_resolved');
const delivery = new Rate('chat_delivery_success');
const timely = new Rate('chat_within_budget');
const latency = new Trend('chat_e2e_ms', true);
const attempted = new Trend('chat_observation_ms', true);
const duplicates = new Counter('chat_duplicate_deliveries');
const failures = new Counter('chat_connection_or_protocol_errors');
const connections = new Counter('chat_ready_connections');
const missedSlots = new Counter('chat_pacing_missed_slots');
const scheduleLag = new Trend('chat_scheduling_lag_ms', true);

export const options = {
  scenarios: {
    chat: { executor: 'shared-iterations', vus: 1, iterations: 1, maxDuration: `${seconds + 30}s`, gracefulStop: '10s' },
  },
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate==0'],
    dropped_iterations: ['count==0'],
    chat_messages_sent: [`count==${expected}`],
    chat_messages_received: [`count==${expected}`],
    chat_messages_resolved: [`count==${expected}`],
    chat_delivery_success: ['rate==1'],
    chat_within_budget: ['rate==1'],
    chat_e2e_ms: ['max<1000'],
    chat_duplicate_deliveries: ['count==0'],
    chat_connection_or_protocol_errors: ['count==0'],
    chat_ready_connections: ['count==2'],
    chat_pacing_missed_slots: ['count==0'],
  },
  summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'],
};
if (expected >= 2) {
  for (const direction of ['buyer_to_seller', 'seller_to_buyer']) {
    options.thresholds[`chat_e2e_ms{direction:${direction}}`] = ['max<1000'];
  }
}

function json(response) { try { return response.json(); } catch { return null; } }
function request(method, path, token, body, name) {
  return http.request(method, `${base}${path}`, body == null ? null : JSON.stringify(body), {
    headers: { Authorization: `Bearer ${token.trim()}`, 'Content-Type': 'application/json' },
    timeout: '5s', tags: { name },
  });
}
function claims(token, label) {
  try {
    const data = JSON.parse(encoding.b64decode(token.trim().split('.')[1], 'rawurl', 's'));
    if (!data.userId || !Number.isFinite(data.exp) || data.exp * 1000 <= Date.now() + (seconds + 90) * 1000) throw new Error();
    return data;
  } catch { fail(`${label} is missing, invalid or expires too soon. Sign in again; need more than ${seconds + 90}s remaining.`); }
}

export function setup() {
  if (__ENV.ALLOW_TEST_WRITES !== '1') fail('This test creates a listing, chat room, messages and notifications. Set ALLOW_TEST_WRITES=1 only in an approved test environment.');
  const seller = claims(__ENV.SELLER_TOKEN, 'SELLER_TOKEN');
  const buyer = claims(__ENV.BUYER_TOKEN, 'BUYER_TOKEN');
  if (seller.userId === buyer.userId) fail('Use two different test accounts.');
  for (const [profile, token] of [[seller, __ENV.SELLER_TOKEN], [buyer, __ENV.BUYER_TOKEN]]) {
    const res = request('GET', `/api/v1/profiles/${profile.userId}`, token, null, 'chat_preflight_profile');
    if (res.status !== 200 || json(res)?.accountStatus !== 'Active') fail('Test account or JWT rejected before creating fixtures.');
  }
  const categoryRes = request('GET', '/api/v1/catalog/categories', __ENV.SELLER_TOKEN, null, 'chat_preflight_categories');
  const categories = json(categoryRes);
  if (categoryRes.status !== 200 || !Array.isArray(categories) || !categories[0]?.id) fail('No category available for the test listing.');
  const runId = `k6-chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const itemRes = request('POST', '/api/v1/catalog/items', __ENV.SELLER_TOKEN, {
    title: runId, description: 'NFR 2.3 chat test fixture; not a real sale.', price: 1,
    categoryId: categories[0].id, condition: 'Like new', handoverSpot: 'Performance test only',
  }, 'chat_fixture_listing');
  const item = json(itemRes);
  if (itemRes.status !== 201 || !item?.id) fail('Could not create test listing. Inspect test data before retrying.');
  console.log(`Chat test listing=${item.id}; title=${runId}`);
  const roomRes = request('POST', '/api/v1/chats/rooms', __ENV.BUYER_TOKEN, {
    participant1: buyer.userId, participant2: seller.userId, itemId: item.id,
  }, 'chat_fixture_room');
  const room = json(roomRes);
  if (roomRes.status !== 201 || !room?.id || room.itemId !== item.id || room.participant1 !== buyer.userId || room.participant2 !== seller.userId) fail('Could not create the isolated test room.');
  console.log(`Chat test room=${room.id}; rate=${rate} total messages/s; duration=${seconds}s; expected=${expected}`);
  return { roomId: room.id, runId, buyerId: buyer.userId, sellerId: seller.userId };
}

export default async function (data) {
  for (const metric of [sent, received, resolved, duplicates, failures, connections, missedSlots]) metric.add(0);
  const sockets = {};
  const pending = new Map();
  const known = new Map();
  let sequence = 0, stopping = false, windowClosed = false;
  let pacer;
  let finish;
  const done = new Promise((resolve) => { finish = resolve; });

  function settle(id, delivered) {
    const entry = pending.get(id);
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.delete(id);
    entry.delivered = delivered;
    const result = deliveryResult(entry.startedAt, Date.now(), delivered);
    const tags = { direction: entry.receiver === 'seller' ? 'buyer_to_seller' : 'seller_to_buyer' };
    attempted.add(result.elapsed, tags);
    delivery.add(delivered, tags);
    timely.add(result.withinBudget, tags);
    resolved.add(1);
    if (delivered) { received.add(1); latency.add(result.elapsed, tags); }
    check(result, { 'recipient received correlated message in under 1s': (value) => value.withinBudget });
    if (windowClosed && pending.size === 0) stop();
  }
  function stop() {
    if (stopping) return;
    stopping = true;
    pacer?.cancel();
    for (const id of [...pending.keys()]) settle(id, false);
    for (const ws of Object.values(sockets)) {
      if (ws.readyState < 2) ws.close();
    }
    finish();
  }
  function broken() {
    if (stopping) return;
    failures.add(1);
    check(false, { 'connections and protocol remain healthy': (value) => value });
    stop();
  }
  function onEvent(side, message) {
    if (message?.roomId !== data.roomId || typeof message.content !== 'string') return;
    const match = message.content.match(/\[(\d+)\]$/);
    if (!match || !message.content.startsWith(`${data.runId} `)) return;
    const id = Number(match[1]);
    const entry = known.get(id);
    if (!entry || !matchesRecipient(message, entry, side, data.roomId)) return; // sender echo is not delivery
    if (entry.delivered) { duplicates.add(1); return; }
    settle(id, true);
  }
  function connect(side, token) {
    return new Promise((ready, reject) => {
      let connected = false;
      const timer = setTimeout(() => { reject(new Error('Socket.IO handshake timed out')); }, 5000);
      const wsUrl = `${base.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`;
      // k6 can use Authorization headers, avoiding JWTs in access-log query strings.
      const ws = new WebSocket(wsUrl, [], { headers: { Authorization: `Bearer ${token.trim()}` }, tags: { name: `chat_socket_${side}` } });
      sockets[side] = ws;
      ws.addEventListener('message', (event) => {
        try {
          const packet = decodeFrame(event.data);
          if (packet.type === 'engine_open') ws.send('40');
          else if (packet.type === 'ping') ws.send(`3${packet.payload}`);
          else if (packet.type === 'connected' && !connected) {
            connected = true; clearTimeout(timer); connections.add(1); ready();
          } else if (packet.type === 'event' && packet.name === 'message:new') onEvent(side, packet.data);
          else if (packet.type === 'ack' && packet.data?.ok === false) settle(packet.id, false);
          else if (packet.type === 'rejected' || packet.type === 'disconnected') throw new Error();
        } catch {
          clearTimeout(timer); reject(new Error('Socket.IO protocol rejected')); broken();
        }
      });
      ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Chat connection failed')); broken(); });
      ws.addEventListener('close', () => { clearTimeout(timer); reject(new Error('Chat disconnected')); if (!stopping) broken(); });
    });
  }
  try {
    await Promise.all([connect('buyer', __ENV.BUYER_TOKEN), connect('seller', __ENV.SELLER_TOKEN)]);
    if (stopping) return;
    check(true, { 'both authenticated recipient/sender sockets are ready': (value) => value });
    function sendOne() {
      if (stopping || windowClosed || sequence >= expected) return;
      const id = ++sequence;
      const sender = id % 2 ? 'buyer' : 'seller';
      const receiver = sender === 'buyer' ? 'seller' : 'buyer';
      const entry = {
        receiver, senderId: sender === 'buyer' ? data.buyerId : data.sellerId,
        content: `${data.runId} message from ${sender} [${id}]`, startedAt: Date.now(), delivered: false,
      };
      known.set(id, entry); pending.set(id, entry);
      entry.timer = setTimeout(() => settle(id, false), 5000);
      sent.add(1);
      try { sockets[sender].send(encodeMessage(id, data.roomId, entry.content)); } catch { settle(id, false); broken(); }
    }
    // Open-loop cadence anchored to the run origin, not the previous callback.
    pacer = createPacer({
      rate, seconds, totalMessages: expected,
      now: () => Date.now(), setTimer: setTimeout, clearTimer: clearTimeout,
      send: sendOne,
      onLag: (milliseconds) => scheduleLag.add(milliseconds),
      onMiss: (count) => missedSlots.add(count),
      onEnd: () => { windowClosed = true; if (pending.size === 0) stop(); },
    });
    pacer.start();
    await done;
  } catch {
    broken();
    stop();
    console.error('Chat connection/handshake failed. Check JWT lifetime, Kong and chat-service; no raw error or credentials logged.');
  }
}
