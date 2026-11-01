// NFR 2.2: Order-triggered Catalog status propagation.
import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import encoding from 'k6/encoding';
import execution from 'k6/execution';
import { Counter, Rate, Trend } from 'k6/metrics';

const baseUrl = (__ENV.BASE_URL || 'http://localhost:30080').replace(/\/+$/, '');
const observerUrl = (__ENV.OBSERVER_URL || 'http://127.0.0.1:9172').replace(/\/+$/, '');
const iterations = Number(__ENV.ITERATIONS || 1);
const vus = Number(__ENV.VUS || 1);
const maxSeconds = Number(__ENV.MAX_DURATION_SECONDS || 300);
for (const [key, value] of Object.entries({ ITERATIONS: iterations, VUS: vus, MAX_DURATION_SECONDS: maxSeconds })) {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${key} must be a positive integer.`);
}
if (vus > iterations) throw new Error('VUS must not exceed ITERATIONS.');

const stages = ['reserve', 'cancel', 'reserve_again', 'complete'];
const latency = new Trend('item_status_propagation_ms', true);
const timely = new Rate('item_status_within_budget');
const transitions = new Counter('item_status_transitions');
const completedFlows = new Counter('item_status_completed_flows');
const thresholds = {
  checks: ['rate==1'],
  http_req_failed: ['rate==0'],
  dropped_iterations: ['count==0'],
  item_status_propagation_ms: ['max<=2000'],
  item_status_within_budget: ['rate==1'],
  item_status_transitions: [`count==${iterations * stages.length}`],
  item_status_completed_flows: [`count==${iterations}`],
};
for (const stage of stages) {
  thresholds[`item_status_propagation_ms{transition:${stage}}`] = ['max<=2000'];
  thresholds[`item_status_transitions{transition:${stage}}`] = [`count==${iterations}`];
}

export const options = {
  scenarios: {
    item_status: { executor: 'shared-iterations', vus, iterations, maxDuration: `${maxSeconds}s`, gracefulStop: '10s' },
  },
  thresholds,
  summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'],
};

function json(response) {
  try { return response.json(); } catch { return null; }
}

function request(method, path, token, body, name) {
  return http.request(method, `${baseUrl}${path}`, body == null ? null : JSON.stringify(body), {
    headers: { Authorization: `Bearer ${token.trim()}`, 'Content-Type': 'application/json' },
    timeout: '5s',
    tags: { name },
  });
}

function claims(token, label) {
  try {
    const payload = JSON.parse(encoding.b64decode(token.trim().split('.')[1], 'rawurl', 's'));
    if (!payload.userId || !Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now() + (maxSeconds + 60) * 1000) {
      throw new Error('Invalid or expiring token');
    }
    return payload;
  } catch {
    fail(`${label} must be a JWT with userId and enough remaining lifetime (at least ${maxSeconds + 60}s). Sign in again.`);
  }
}

export function setup() {
  if (__ENV.ALLOW_TEST_WRITES !== '1') fail('This test creates listings/orders/chats/notifications. Set ALLOW_TEST_WRITES=1 only in an approved test environment.');
  if (!__ENV.SELLER_TOKEN || !__ENV.BUYER_TOKEN) fail('SELLER_TOKEN and BUYER_TOKEN are required (two different test accounts).');
  const seller = claims(__ENV.SELLER_TOKEN, 'SELLER_TOKEN');
  const buyer = claims(__ENV.BUYER_TOKEN, 'BUYER_TOKEN');
  if (seller.userId === buyer.userId) fail('Seller and buyer must be different accounts.');
  for (const [profile, token] of [[seller, __ENV.SELLER_TOKEN], [buyer, __ENV.BUYER_TOKEN]]) {
    const response = request('GET', `/api/v1/profiles/${profile.userId}`, token, null, 'status_preflight_profile');
    if (response.status !== 200 || json(response)?.accountStatus !== 'Active') fail('Test account unavailable or JWT rejected. No fixture created.');
  }
  const health = http.get(`${observerUrl}/health`, { timeout: '2s', tags: { name: 'status_observer_health' } });
  const observer = json(health);
  if (health.status !== 200 || observer?.readOnly !== true || !/^[0-9a-f-]{36}$/.test(observer.runId)) fail('Start the read-only status observer first.');
  const response = request('GET', '/api/v1/catalog/categories', __ENV.SELLER_TOKEN, null, 'status_preflight_categories');
  const categories = json(response);
  const categoryId = __ENV.CATEGORY_ID || (Array.isArray(categories) && categories[0]?.id);
  if (response.status !== 200 || !Array.isArray(categories) || !categoryId || !categories.some((category) => category.id === categoryId)) fail('A valid existing CATEGORY_ID is required.');
  completedFlows.add(0);
  transitions.add(0);
  return { runId: `${observer.runId}-${Date.now().toString(36)}`, categoryId };
}

function observe(itemId, expected, deadline) {
  while (Date.now() < deadline) {
    const response = http.get(`${observerUrl}/items/${itemId}`, {
      timeout: Math.max(1, Math.min(500, deadline - Date.now())),
      tags: { name: 'status_observer_item' },
    });
    const item = json(response);
    if (response.status === 200 && item?.id === itemId && item.status === expected) return true;
    if (response.status !== 200) return false;
    const remaining = deadline - Date.now();
    if (remaining > 0) sleep(Math.min(50, remaining) / 1000);
  }
  return false;
}

function transition(stage, itemId, expected, method, path, token, body, expectedOrderStatus) {
  const start = Date.now();
  const response = request(method, path, token, body, `status_action_${stage}`);
  const order = json(response);
  const accepted = [200, 201].includes(response.status) && order?.id && order.itemId === itemId && order.status === expectedOrderStatus;
  const observed = accepted && observe(itemId, expected, start + 2000);
  const elapsed = Date.now() - start;
  const ok = Boolean(observed && elapsed <= 2000);
  const tags = { transition: stage };
  latency.add(elapsed, tags);
  timely.add(ok, tags);
  transitions.add(1, tags);
  check(response, { [`${stage}: accepted and Catalog ${expected} observed within 2s`]: () => ok });
  if (!ok) {
    console.error(`Transition failed: ${stage}; HTTP=${response.status}; item=${itemId}; elapsed_ms=${elapsed}. Inspect fixture before retrying; no automatic cleanup.`);
    return null;
  }
  return order;
}

export default function (data) {
  const create = request('POST', '/api/v1/catalog/items', __ENV.SELLER_TOKEN, {
    title: `k6-status-${data.runId}-${execution.scenario.iterationInTest}`,
    description: 'Isolated NFR 2.2 test fixture; not a real sale.',
    price: 1,
    categoryId: data.categoryId,
    condition: 'Like new',
    handoverSpot: 'Performance test only',
  }, 'status_fixture_create');
  const item = json(create);
  if (!check(create, { 'test fixture created Available': () => create.status === 201 && item?.id && item.status === 'Available' })) return;
  console.log(`Test fixture item=${item.id}; title=${item.title}`);
  if (!check(item, { 'observer can read initial Available state': () => observe(item.id, 'Available', Date.now() + 2000) })) return;

  const order = transition('reserve', item.id, 'Reserved', 'POST', '/api/v1/orders/orders', __ENV.BUYER_TOKEN, { itemId: item.id }, 'Pending');
  if (!order) return;
  if (!transition('cancel', item.id, 'Available', 'PATCH', `/api/v1/orders/orders/${order.id}/cancel`, __ENV.BUYER_TOKEN, null, 'Cancelled')) return;
  const next = transition('reserve_again', item.id, 'Reserved', 'POST', '/api/v1/orders/orders', __ENV.BUYER_TOKEN, { itemId: item.id }, 'Pending');
  if (!next) return;
  const qrResponse = request('POST', `/api/v1/orders/orders/${next.id}/qr-code`, __ENV.SELLER_TOKEN, null, 'status_prepare_qr');
  const qr = json(qrResponse);
  if (!check(qrResponse, { 'seller QR prepared for test order': () => [200, 201].includes(qrResponse.status) && qr?.orderId === next.id && typeof qr.token === 'string' && qr.token.length > 0 })) return;
  if (!transition('complete', item.id, 'Sold', 'PATCH', `/api/v1/orders/orders/${next.id}/complete`, __ENV.BUYER_TOKEN, { token: qr.token }, 'Completed')) return;
  completedFlows.add(1);
}
