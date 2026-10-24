import http from 'k6/http';
import crypto from 'k6/crypto';
import encoding from 'k6/encoding';
import exec from 'k6/execution';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE = __ENV.BASE || 'http://localhost:30080/api/v1';
const JWT_SECRET = __ENV.JWT_SECRET;
const JWT_ISSUER = __ENV.JWT_ISSUER || 'cu-marketplace-auth';
const RATE = Number(__ENV.RATE || 25);
const ROOMS = Number(__ENV.ROOMS || 500);
const SETUP_BATCH = 25;
const POLL_INTERVAL_S = 1;
const GIVE_UP_MS = 15000;
const ITEM_ID = '00000000-0000-0000-0000-000000000001';

const deliveryMs = new Trend('notification_delivery_ms', true);
const delivered = new Rate('notification_delivered');

export const options = {
  setupTimeout: '5m',
  batch: SETUP_BATCH,
  batchPerHost: SETUP_BATCH,
  scenarios: {
    notify: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: __ENV.DURATION || '5m',
      preAllocatedVUs: RATE * 2,
      maxVUs: RATE * 10,
    },
  },
  thresholds: {
    notification_delivery_ms: ['p(95)<10000'],
    notification_delivered: ['rate>0.99'],
  },
};

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function mint(userId) {
  const b64 = (obj) => encoding.b64encode(JSON.stringify(obj), 'rawurl');
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const payload = b64({
    userId,
    email: `k6-${userId.slice(0, 8)}@chula.ac.th`,
    role: 'Student',
    iss: JWT_ISSUER,
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  const signature = crypto.hmac('sha256', JWT_SECRET, `${header}.${payload}`, 'base64rawurl');
  return `${header}.${payload}.${signature}`;
}

function auth(token) {
  return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
}

export function setup() {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required: pass -e JWT_SECRET=...');
  }
  const senderToken = mint(uuid());
  const rooms = [];
  for (let i = 0; i < ROOMS; i += SETUP_BATCH) {
    const recipientIds = Array.from({ length: Math.min(SETUP_BATCH, ROOMS - i) }, uuid);
    const responses = http.batch(
      recipientIds.map((recipientId) => [
        'POST',
        `${BASE}/chats/rooms`,
        JSON.stringify({ sellerId: recipientId, itemId: ITEM_ID }),
        auth(senderToken),
      ]),
    );
    responses.forEach((res, j) => {
      if (res.status === 200 || res.status === 201) {
        const room = res.json();
        rooms.push({ roomId: room._id || room.id, recipientId: recipientIds[j] });
      }
    });
  }
  if (rooms.length < ROOMS) {
    throw new Error(`Only ${rooms.length}/${ROOMS} rooms created`);
  }
  return { senderToken, rooms };
}

export default function ({ senderToken, rooms }) {
  const { roomId, recipientId } = rooms[exec.scenario.iterationInTest % rooms.length];
  const recipientToken = mint(recipientId);

  const content = `k6-${__VU}-${__ITER}-${Date.now()}`;
  const start = Date.now();
  const sendRes = http.post(
    `${BASE}/chats/rooms/${roomId}/messages`,
    JSON.stringify({ content }),
    auth(senderToken),
  );
  if (!check(sendRes, { 'message sent': (r) => r.status === 200 || r.status === 201 })) {
    delivered.add(false);
    return;
  }

  while (Date.now() - start < GIVE_UP_MS) {
    const res = http.get(`${BASE}/notifications`, auth(recipientToken));
    check(res, { 'not rate limited': (r) => r.status !== 429 });
    if (res.status === 200 && res.json().some((n) => n.message === content)) {
      deliveryMs.add(Date.now() - start);
      delivered.add(true);
      return;
    }
    sleep(POLL_INTERVAL_S);
  }
  delivered.add(false);
}
