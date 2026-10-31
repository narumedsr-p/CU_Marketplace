import http from 'k6/http';
import crypto from 'k6/crypto';
import encoding from 'k6/encoding';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE = __ENV.BASE || 'http://localhost:30080/api/v1';
const JWT_SECRET = __ENV.JWT_SECRET;
const JWT_ISSUER = __ENV.JWT_ISSUER || 'cu-marketplace-auth';
const RATE = Number(__ENV.RATE || 5);
const BUYERS = Number(__ENV.BUYERS || 10);

const lockResolveMs = new Trend('lock_resolve_ms', true);
const exactlyOneWinner = new Rate('exactly_one_winner');
const losersRejected = new Rate('losers_rejected');
const itemReserved = new Rate('item_reserved');

export const options = {
  batch: BUYERS,
  batchPerHost: BUYERS,
  scenarios: {
    contention: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: __ENV.DURATION || '5m',
      preAllocatedVUs: RATE * 2,
      maxVUs: RATE * 10,
    },
  },
  thresholds: {
    exactly_one_winner: ['rate==1'],
    losers_rejected: ['rate==1'],
    item_reserved: ['rate==1'],
    lock_resolve_ms: ['p(95)<1000'],
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
  const sellerToken = mint(uuid());
  const categories = http.get(`${BASE}/catalog/categories`, auth(sellerToken)).json();
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error('No categories found: seed the catalog first');
  }
  return { sellerToken, categoryId: categories[0].id };
}

export default function ({ sellerToken, categoryId }) {
  const itemRes = http.post(
    `${BASE}/catalog/items`,
    JSON.stringify({
      categoryId,
      title: `k6 contention ${__VU}-${__ITER}`,
      price: 100,
      condition: 'Good',
      handoverSpot: 'k6',
    }),
    auth(sellerToken),
  );
  if (!check(itemRes, { 'item created': (r) => r.status === 201 || r.status === 200 })) {
    return;
  }
  const itemId = itemRes.json().id;

  const body = JSON.stringify({ itemId });
  const requests = Array.from({ length: BUYERS }, () => [
    'POST',
    `${BASE}/orders/orders`,
    body,
    auth(mint(uuid())),
  ]);

  const start = Date.now();
  const responses = http.batch(requests);
  lockResolveMs.add(Date.now() - start);

  const winners = responses.filter((r) => r.status === 201).length;
  const rejected = responses.filter((r) => [404, 409, 503].includes(r.status)).length;
  exactlyOneWinner.add(winners === 1);
  losersRejected.add(winners + rejected === BUYERS);

  const itemCheck = http.get(`${BASE}/catalog/items/${itemId}`, {
    ...auth(sellerToken),
    responseCallback: http.expectedStatuses(404),
  });
  itemReserved.add(itemCheck.status === 404);
}
