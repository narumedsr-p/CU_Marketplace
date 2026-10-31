import http from 'k6/http';
import crypto from 'k6/crypto';
import encoding from 'k6/encoding';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE = __ENV.BASE || 'http://localhost:30080/api/v1';
const JWT_SECRET = __ENV.JWT_SECRET;
const JWT_ISSUER = __ENV.JWT_ISSUER || 'cu-marketplace-auth';
const RATE = Number(__ENV.RATE || 25);
const POLL_INTERVAL_S = 0.25;
const GIVE_UP_MS = 10000;

const indexCreateLagMs = new Trend('index_create_lag_ms', true);
const indexUpdateLagMs = new Trend('index_update_lag_ms', true);
const searchableCreateE2eMs = new Trend('searchable_create_e2e_ms', true);
const searchableUpdateE2eMs = new Trend('searchable_update_e2e_ms', true);
const indexed = new Rate('indexed');

export const options = {
  scenarios: {
    indexing: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: __ENV.DURATION || '5m',
      preAllocatedVUs: RATE * 2,
      maxVUs: RATE * 10,
    },
  },
  thresholds: {
    searchable_create_e2e_ms: ['p(95)<5000'],
    searchable_update_e2e_ms: ['p(95)<5000'],
    indexed: ['rate>0.99'],
  },
};

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function token() {
  return uuid().replace(/-/g, '').slice(0, 12);
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

function waitUntilSearchable(sellerToken, keyword, itemId, title, committedAt) {
  while (Date.now() - committedAt < GIVE_UP_MS) {
    const sentAt = Date.now();
    const res = http.get(`${BASE}/catalog/items?search=${keyword}`, auth(sellerToken));
    if (res.status === 200 && res.json().some((i) => i.id === itemId && i.title === title)) {
      return { sentAt, foundAt: Date.now() };
    }
    sleep(POLL_INTERVAL_S);
  }
  return null;
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
  const createKeyword = token();
  const createTitle = `k6idx ${createKeyword}`;
  const createStart = Date.now();
  const createRes = http.post(
    `${BASE}/catalog/items`,
    JSON.stringify({
      categoryId,
      title: createTitle,
      price: 100,
      condition: 'Good',
      handoverSpot: 'k6',
    }),
    auth(sellerToken),
  );
  if (!check(createRes, { 'item created': (r) => r.status === 201 || r.status === 200 })) {
    indexed.add(false);
    return;
  }
  const itemId = createRes.json().id;
  const createdAt = Date.now();

  const created = waitUntilSearchable(sellerToken, createKeyword, itemId, createTitle, createdAt);
  indexed.add(created !== null);
  if (created === null) {
    return;
  }
  indexCreateLagMs.add(created.sentAt - createdAt);
  searchableCreateE2eMs.add(created.foundAt - createStart);

  const updateKeyword = token();
  const updateTitle = `k6idx ${updateKeyword}`;
  const updateStart = Date.now();
  const updateRes = http.put(
    `${BASE}/catalog/items/${itemId}`,
    JSON.stringify({ title: updateTitle }),
    auth(sellerToken),
  );
  if (!check(updateRes, { 'item updated': (r) => r.status === 200 })) {
    indexed.add(false);
    return;
  }

  const updatedAt = Date.now();

  const updated = waitUntilSearchable(sellerToken, updateKeyword, itemId, updateTitle, updatedAt);
  indexed.add(updated !== null);
  if (updated !== null) {
    indexUpdateLagMs.add(updated.sentAt - updatedAt);
    searchableUpdateE2eMs.add(updated.foundAt - updateStart);
  }
}
