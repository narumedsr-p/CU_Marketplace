// Offline checks for this folder's k6 flow and read-only observer.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { createObserver } from './status-observer.mjs';

const source = readFileSync(new URL('./item-status.k6.js', import.meta.url), 'utf8');
const itemId = '10000000-0000-4000-8000-000000000001';
const runId = '20000000-0000-4000-8000-000000000001';
const categoryId = '30000000-0000-4000-8000-000000000001';
const jwt = (id, exp = Math.floor(Date.now() / 1000) + 3600) =>
  `fixture.${Buffer.from(JSON.stringify({ userId: id, exp })).toString('base64url')}.not-a-real-signature`;

async function script(extraEnv = {}, mode = 'success') {
  const env = {
    ALLOW_TEST_WRITES: '1',
    SELLER_TOKEN: jwt('seller'),
    BUYER_TOKEN: jwt('buyer'),
    ...extraEnv,
  };
  const samples = {};
  const checks = [];
  const actions = [];
  let state = 'Available';
  let orderNumber = 0;
  let now = Date.now();
  class Clock extends Date { static now() { return now; } }
  const response = (status, body) => ({ status, json: () => body });
  const context = vm.createContext({
    __ENV: env,
    Date: Clock,
    console: { log() {}, error() {} },
  });
  const mock = (exports) => new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
  }, { context });
  const http = {
    get(url) {
      now += 5;
      if (url.endsWith('/health')) return response(200, { readOnly: true, runId });
      return response(200, { id: itemId, status: state });
    },
    request(method, url, body, params) {
      now += 10;
      actions.push({ method, url, body, name: params.tags.name });
      if (url.includes('/profiles/')) return response(200, { accountStatus: 'Active' });
      if (url.endsWith('/categories')) return response(200, [{ id: categoryId }]);
      if (url.endsWith('/catalog/items')) {
        return response(201, { id: itemId, title: JSON.parse(body).title, status: 'Available' });
      }
      if (url.endsWith('/orders/orders')) {
        state = 'Reserved';
        orderNumber += 1;
        return response(201, { id: `order-${orderNumber}`, itemId, status: 'Pending' });
      }
      if (url.endsWith('/cancel')) {
        if (mode === 'unauthorized') return response(401, { error: 'Unauthorized' });
        if (mode === 'delayed') now += 2100;
        if (mode !== 'missing-event') state = 'Available';
        return response(200, { id: 'order-1', itemId, status: 'Cancelled' });
      }
      if (url.endsWith('/qr-code')) return response(201, { orderId: 'order-2', token: 'fake-qr-only' });
      if (url.endsWith('/complete')) {
        state = 'Sold';
        return response(200, { id: 'order-2', itemId, status: 'Completed' });
      }
      throw new Error(`Unexpected mock action: ${method} ${url}`);
    },
  };
  class Metric {
    constructor(name) { this.name = name; samples[name] = []; }
    add(value, tags) { samples[this.name].push({ value, tags }); }
  }
  const modules = {
    'k6/http': mock({ default: http }),
    k6: mock({
      check(value, predicates) {
        const results = Object.values(predicates).map((predicate) => Boolean(predicate(value)));
        checks.push(...results);
        return results.every(Boolean);
      },
      fail(message) { throw new Error(message); },
      sleep(seconds) { now += seconds * 1000; },
    }),
    'k6/encoding': mock({ default: { b64decode: (input) => Buffer.from(input, 'base64url').toString() } }),
    'k6/execution': mock({ default: { scenario: { iterationInTest: 0 } } }),
    'k6/metrics': mock({ Counter: Metric, Rate: Metric, Trend: Metric }),
  };
  const module = new vm.SourceTextModule(source, { context });
  await module.link((name) => modules[name]);
  await module.evaluate();
  return { api: module.namespace, samples, checks, actions };
}

test('happy path measures all four transitions through buyer/seller flow', async () => {
  const result = await script();
  const data = result.api.setup();
  result.api.default(data);
  assert.equal(result.checks.every(Boolean), true);
  assert.equal(result.samples.item_status_propagation_ms.length, 4);
  assert.deepEqual(result.samples.item_status_propagation_ms.map((sample) => sample.tags.transition),
    ['reserve', 'cancel', 'reserve_again', 'complete']);
  assert.equal(result.samples.item_status_within_budget.every((sample) => sample.value), true);
  assert.equal(result.samples.item_status_completed_flows.at(-1).value, 1);
  assert.equal(result.actions.filter((action) => action.method === 'POST' && action.url.endsWith('/orders/orders')).length, 2);
});

for (const mode of ['missing-event', 'delayed', 'unauthorized']) {
  test(`${mode}: cannot pass or proceed to completion`, async () => {
    const result = await script({}, mode);
    result.api.default(result.api.setup());
    assert.equal(result.samples.item_status_within_budget.at(-1).value, false);
    assert.equal(result.samples.item_status_completed_flows.at(-1).value, 0);
    assert.equal(result.actions.some((action) => action.url.endsWith('/complete')), false);
    assert.equal(result.checks.includes(false), true);
  });
}

for (const [label, env] of [
  ['write permission', { ALLOW_TEST_WRITES: '0' }],
  ['missing buyer', { BUYER_TOKEN: '' }],
  ['same account', { BUYER_TOKEN: jwt('seller') }],
  ['expired JWT', { BUYER_TOKEN: jwt('buyer', Math.floor(Date.now() / 1000) - 1) }],
  ['JWT expires during run', { BUYER_TOKEN: jwt('buyer', Math.floor(Date.now() / 1000) + 100) }],
]) {
  test(`preflight rejects ${label} before writes`, async () => {
    const result = await script(env);
    assert.throws(() => result.api.setup());
    assert.equal(result.actions.some((action) => action.method !== 'GET'), false);
  });
}

test('invalid load configuration is rejected', async () => {
  for (const env of [{ ITERATIONS: '0' }, { VUS: '2' }, { MAX_DURATION_SECONDS: 'bad' }]) {
    await assert.rejects(script(env));
  }
});

test('observer only exposes scoped read-only status queries', async () => {
  const queries = [];
  const pool = { async query(sql, params) {
    queries.push({ sql, params });
    if (sql === 'SELECT 1') return { rows: [{ value: 1 }] };
    return { rows: params[0] === itemId ? [{ id: itemId, status: 'Reserved' }] : [] };
  } };
  const prefix = `k6-status-${runId}-`;
  const server = createObserver(pool, prefix, runId);
  const send = (method, url) => new Promise((resolve) => {
    let status;
    server.emit('request', { method, url }, {
      writeHead(value) { status = value; },
      end(body) { resolve({ status, body: JSON.parse(body) }); },
    });
  });
  assert.equal((await send('GET', '/health')).body.readOnly, true);
  assert.equal((await send('GET', `/items/${itemId}`)).body.status, 'Reserved');
  assert.equal(queries.at(-1).params[1], prefix);
  assert.match(queries.at(-1).sql, /^SELECT /);
  assert.equal((await send('POST', `/items/${itemId}`)).status, 405);
  assert.equal((await send('GET', '/items/not-a-uuid')).status, 404);
  assert.equal((await send('GET', '/items/10000000-0000-4000-8000-000000000002')).status, 404);
  assert.equal(queries.every((query) => query.sql.startsWith('SELECT ')), true);
  server.close();
});
