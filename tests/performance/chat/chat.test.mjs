import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import * as protocol from './protocol.mjs';
import * as pacing from './pacing.mjs';

function simulatedPacer({ rate = 5, seconds = 300, totalMessages, jitter = () => 1, cancelAt } = {}) {
  let time = 0, id = 0, ended = false;
  const timers = new Map(), sends = [], misses = [], lags = [];
  const pacer = pacing.createPacer({
    rate, seconds, totalMessages, now: () => time,
    setTimer(callback, delay) { const key = ++id; timers.set(key, { callback, at: time + delay }); return key; },
    clearTimer(key) { timers.delete(key); },
    send() { sends.push(time); }, onMiss: (count) => misses.push(count),
    onLag: (lag) => lags.push(lag), onEnd() { ended = true; },
  });
  pacer.start();
  while (timers.size) {
    const [key, entry] = [...timers].sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
    timers.delete(key);
    time = Math.max(time, entry.at) + jitter(entry.at);
    if (cancelAt != null && time >= cancelAt) { pacer.cancel(); continue; }
    entry.callback();
  }
  return { sends, misses, lags, ended };
}

for (const totalMessages of [1000, 1500, 3000, 6000]) {
  test(`pacing: exactly ${totalMessages} messages distributed over the same 300 seconds`, () => {
    const result = simulatedPacer({ totalMessages });
    assert.equal(result.sends.length, totalMessages);
    assert.equal(result.misses.length, 0);
    assert.equal(result.ended, true);
    assert.ok(result.sends.at(-1) < 300000);
    assert.ok(Math.abs(result.sends.at(-1) - (totalMessages - 1) * 300000 / totalMessages) <= 2);
  });
}

for (const rate of [1, 5, 10, 20]) {
  test(`pacing: ${rate}/s for 300s does not accumulate 1ms callback drift`, () => {
    const result = simulatedPacer({ rate });
    assert.equal(result.sends.length, rate * 300);
    assert.equal(result.misses.length, 0);
    assert.equal(result.ended, true);
    assert.ok(result.sends.at(-1) < 300000);
    assert.ok(Math.max(...result.lags) <= 1);
  });
}

test('pacing: long generator stalls skip slots instead of catch-up bursts', () => {
  let stalled = false;
  const result = simulatedPacer({ jitter(at) {
    if (at === 200 && !stalled) { stalled = true; return 450; }
    return 1;
  } });
  assert.equal(result.misses.reduce((a, b) => a + b, 0), 2);
  assert.equal(result.sends.length, 1498);
  assert.equal(new Set(result.sends).size, result.sends.length);
  assert.equal(result.ended, true);
});

test('pacing: ending after a long stall counts unsent slots; cancel clears timers', () => {
  const stalled = simulatedPacer({ seconds: 1, jitter: () => 2000 });
  assert.equal(stalled.sends.length, 1);
  assert.equal(stalled.misses.reduce((a, b) => a + b, 0), 4);
  const cancelled = simulatedPacer({ cancelAt: 500 });
  assert.equal(cancelled.sends.length, 3);
  assert.equal(cancelled.ended, false);
});

test('Engine.IO/Socket.IO framing handles handshake, heartbeat, event and ack', () => {
  assert.equal(protocol.decodeFrame('0{"sid":"engine"}').type, 'engine_open');
  assert.deepEqual(protocol.decodeFrame('2probe'), { type: 'ping', payload: 'probe' });
  assert.equal(protocol.decodeFrame('40{"sid":"socket"}').type, 'connected');
  assert.equal(protocol.decodeFrame('42["message:new",{"content":"hello"}]').data.content, 'hello');
  assert.equal(protocol.decodeFrame('431[{"ok":false}]').data.ok, false);
  assert.equal(protocol.decodeFrame('44{"message":"rejected"}').type, 'rejected');
  assert.equal(protocol.decodeFrame('41').type, 'disconnected');
  assert.equal(protocol.encodeMessage(7, 'room', 'hello'), '427["message:send",{"roomId":"room","content":"hello"}]');
  for (const invalid of [null, '0{}', '42{}', '42[1]', '431{}', '45binary']) assert.throws(() => protocol.decodeFrame(invalid));
});

test('sender echo, wrong room, sender and content cannot count as delivery', () => {
  const expected = { receiver: 'seller', senderId: 'buyer', content: 'unique' };
  const message = { id: 'message', roomId: 'room', senderId: 'buyer', content: 'unique' };
  assert.equal(protocol.matchesRecipient(message, expected, 'seller', 'room'), true);
  assert.equal(protocol.matchesRecipient(message, expected, 'buyer', 'room'), false);
  for (const change of [{ roomId: 'other' }, { senderId: 'other' }, { content: 'other' }, { id: null }]) {
    assert.equal(protocol.matchesRecipient({ ...message, ...change }, expected, 'seller', 'room'), false);
  }
});

test('under 1 second is strict; missing delivery is never a success', () => {
  assert.equal(protocol.deliveryResult(0, 999, true).withinBudget, true);
  assert.equal(protocol.deliveryResult(0, 1000, true).withinBudget, false);
  assert.equal(protocol.deliveryResult(0, 5, false).withinBudget, false);
});

const source = readFileSync(new URL('./chat.k6.js', import.meta.url), 'utf8');
const token = (userId, lifetime = 3600) => `fixture.${Buffer.from(JSON.stringify({ userId, exp: Math.floor(Date.now() / 1000) + lifetime })).toString('base64url')}.fake`;

async function load(extraEnv = {}, behavior = 'success') {
  const env = { SELLER_TOKEN: token('seller'), BUYER_TOKEN: token('buyer'), ALLOW_TEST_WRITES: '1', MESSAGE_RATE: '4', DURATION_SECONDS: '1', ...extraEnv };
  if ('TOTAL_MESSAGES' in extraEnv && !('MESSAGE_RATE' in extraEnv)) delete env.MESSAGE_RATE;
  const samples = {}, requests = [], sockets = [], checks = [];
  class FakeSocket {
    constructor(url, protocols, params) {
      assert.equal(url.includes('token='), false);
      assert.match(params.headers.Authorization, /^Bearer /);
      this.side = params.tags.name.endsWith('buyer') ? 'buyer' : 'seller';
      this.readyState = 1; this.listeners = {};
      sockets.push(this);
      setTimeout(() => this.emit('message', '0{"sid":"engine"}'), 0);
    }
    addEventListener(name, callback) { (this.listeners[name] ??= []).push(callback); }
    emit(name, value) { for (const callback of this.listeners[name] || []) callback({ data: value }); }
    send(frame) {
      if (frame === '40') return void setTimeout(() => this.emit('message', '40{"sid":"socket"}'), 0);
      if (frame.startsWith('3')) return;
      const match = frame.match(/^42(\d+)(\[.*)$/s);
      const [, payload] = JSON.parse(match[2]);
      const message = { id: `message-${match[1]}`, roomId: payload.roomId, senderId: this.side, content: payload.content };
      setTimeout(() => {
        for (const socket of sockets) {
          if (behavior === 'echo-only' && socket !== this) continue;
          socket.emit('message', `42${JSON.stringify(['message:new', message])}`);
          if (behavior === 'duplicate' && socket !== this) socket.emit('message', `42${JSON.stringify(['message:new', message])}`);
        }
        this.emit('message', `43${match[1]}[{"ok":true}]`);
      }, behavior === 'late' ? 1100 : 5);
    }
    close() { this.readyState = 3; this.emit('close'); }
  }
  class Metric {
    constructor(name) { this.name = name; samples[name] = []; }
    add(value, tags) { samples[this.name].push({ value, tags }); }
  }
  const response = (status, body) => ({ status, json: () => body });
  const http = { request(method, url, body) {
    requests.push({ method, url });
    if (url.includes('/profiles/')) return response(200, { accountStatus: 'Active' });
    if (url.endsWith('/categories')) return response(200, [{ id: 'category' }]);
    if (url.endsWith('/catalog/items')) return response(201, { id: 'item' });
    if (url.endsWith('/chats/rooms')) return response(201, { id: 'room', ...JSON.parse(body) });
    throw new Error('Unexpected HTTP request');
  } };
  const context = vm.createContext({ __ENV: env, Date, Math, console: { log() {}, error() {} } });
  const mock = (exports) => new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
  }, { context });
  const modules = {
    'k6/http': mock({ default: http }),
    'k6/websockets': mock({ WebSocket: FakeSocket }),
    'k6/timers': mock({ setTimeout, clearTimeout, setInterval, clearInterval }),
    k6: mock({ check(value, rules) { const values = Object.values(rules).map((rule) => Boolean(rule(value))); checks.push(...values); return values.every(Boolean); }, fail(message) { throw new Error(message); } }),
    'k6/encoding': mock({ default: { b64decode: (value) => Buffer.from(value, 'base64url').toString() } }),
    'k6/metrics': mock({ Counter: Metric, Rate: Metric, Trend: Metric }),
    './protocol.mjs': mock(protocol),
    './pacing.mjs': mock(pacing),
  };
  const module = new vm.SourceTextModule(source, { context });
  await module.link((name) => modules[name]);
  await module.evaluate();
  return { api: module.namespace, samples, requests, sockets, checks };
}
const count = (samples) => samples.reduce((total, sample) => total + sample.value, 0);

test('two real receiving sides, paced bidirectional sends, no echo or ack counted', async () => {
  const result = await load();
  await result.api.default(result.api.setup());
  assert.equal(result.sockets.length, 2);
  assert.equal(count(result.samples.chat_messages_sent), 4);
  assert.equal(count(result.samples.chat_messages_received), 4);
  assert.equal(result.samples.chat_delivery_success.every((sample) => sample.value), true);
  assert.equal(new Set(result.samples.chat_e2e_ms.map((sample) => sample.tags.direction)).size, 2);
  assert.equal(result.checks.every(Boolean), true);
  assert.equal(result.sockets.every((socket) => socket.readyState === 3), true);
});

test('late deliveries are measured but fail the strict 1-second budget', async () => {
  const result = await load({}, 'late');
  await result.api.default(result.api.setup());
  assert.equal(count(result.samples.chat_messages_received), 4);
  assert.equal(result.samples.chat_within_budget.every((sample) => !sample.value), true);
});

test('total-message mode supports a fractional effective rate and exact counts', async () => {
  const result = await load({ TOTAL_MESSAGES: '3', DURATION_SECONDS: '2' });
  assert.equal(result.api.options.thresholds.chat_messages_sent[0], 'count==3');
  await result.api.default(result.api.setup());
  assert.equal(count(result.samples.chat_messages_sent), 3);
  assert.equal(count(result.samples.chat_messages_received), 3);
  assert.equal(result.samples.chat_delivery_success.every((sample) => sample.value), true);
  assert.equal(count(result.samples.chat_pacing_missed_slots), 0);
});

test('same-duration 1000 and 1500 presets retain exact target thresholds', async () => {
  for (const total of [1000, 1500]) {
    const result = await load({ TOTAL_MESSAGES: String(total), DURATION_SECONDS: '300' });
    for (const name of ['chat_messages_sent', 'chat_messages_received', 'chat_messages_resolved']) {
      assert.equal(result.api.options.thresholds[name][0], `count==${total}`);
    }
    assert.equal(result.api.options.scenarios.chat.maxDuration, '330s');
    assert.equal(result.api.options.thresholds.chat_e2e_ms[0], 'max<1000');
  }
});

test('sender echo plus successful ack cannot mask missing recipient delivery', async () => {
  const result = await load({ MESSAGE_RATE: '1' }, 'echo-only');
  await result.api.default(result.api.setup());
  assert.equal(count(result.samples.chat_messages_received), 0);
  assert.equal(result.samples.chat_delivery_success.at(-1).value, false);
  assert.equal(result.samples.chat_e2e_ms.length, 0);
  assert.equal(result.samples.chat_observation_ms.length, 1);
});

test('duplicate recipient events are counted separately, not twice as delivered', async () => {
  const result = await load({}, 'duplicate');
  await result.api.default(result.api.setup());
  assert.equal(count(result.samples.chat_messages_received), 4);
  assert.equal(count(result.samples.chat_duplicate_deliveries), 4);
});

for (const [label, env] of [
  ['no write acknowledgement', { ALLOW_TEST_WRITES: '0' }],
  ['same account', { BUYER_TOKEN: token('seller') }],
  ['expired token', { BUYER_TOKEN: token('buyer', -1) }],
  ['expiring token', { BUYER_TOKEN: token('buyer', 30) }],
]) {
  test(`preflight rejects ${label} before writes`, async () => {
    const result = await load(env);
    assert.throws(() => result.api.setup());
    assert.equal(result.requests.some((request) => request.method !== 'GET'), false);
  });
}

test('invalid rate or duration is rejected', async () => {
  await assert.rejects(load({ MESSAGE_RATE: '0' }));
  await assert.rejects(load({ DURATION_SECONDS: '-1' }));
  await assert.rejects(load({ TOTAL_MESSAGES: '0' }));
  await assert.rejects(load({ TOTAL_MESSAGES: '1.5' }));
  await assert.rejects(load({ TOTAL_MESSAGES: 'invalid' }));
  await assert.rejects(load({ TOTAL_MESSAGES: '1000', MESSAGE_RATE: '5' }));
});
