import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

// Executes the repository's current controller, not a reimplementation of its
// retry algorithm. Only the queue names and create() dependency are substituted.
// All broker delays, x-death updates, nacks, acks and DLQ routing are real AMQP.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const serviceRequire = createRequire(resolve(root, 'apps/notification-service/package.json'));
const amqp = serviceRequire('amqplib');
const ts = serviceRequire('typescript');
const { RmqContext } = serviceRequire('@nestjs/microservices');
const contracts = serviceRequire('@workspace/contracts');
const runId = randomUUID();
const prefix = `reliability-notification-${runId}`;
const queueNames = {
  ...contracts.QUEUES,
  notification: `${prefix}.main`,
  notificationRetry: `${prefix}.retry`,
  notificationDlq: `${prefix}.dlq`,
};
const kubeconfig = process.env.KUBECONFIG || resolve(homedir(), '.kube/k3s.yaml');
const kubectlArgs = ['--kubeconfig', kubeconfig, '--request-timeout=15s', '-n', 'cu-marketplace'];
const forwardPort = Number(process.env.RELIABILITY_AMQP_PORT || 25673);
const sourcePath = resolve(root, 'apps/notification-service/src/notifications/notifications.rmq.controller.ts');
const source = readFileSync(sourcePath, 'utf8');

function loadController() {
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      esModuleInterop: true,
    },
    fileName: sourcePath,
  }).outputText;
  const loaded = new Module(sourcePath);
  loaded.filename = sourcePath;
  loaded.paths = Module._nodeModulePaths(dirname(sourcePath));
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = (specifier) => {
    if (specifier === '@workspace/contracts') return { ...contracts, QUEUES: queueNames };
    if (specifier === './notifications.service') return { NotificationsService: class {} };
    return originalRequire(specifier);
  };
  loaded._compile(compiled, sourcePath);
  return loaded.exports.NotificationsRmqController;
}

function retryQueueOptions() {
  // Read the actual assertQueue options in main.ts instead of silently testing a
  // hard-coded delay that could diverge from the application's topology.
  const path = resolve(root, 'apps/notification-service/src/main.ts');
  const main = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  let options;
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === 'assertQueue'
      && node.arguments[0]?.getText(main) === 'QUEUES.notificationRetry') {
      const literal = node.arguments[1];
      assert.ok(literal && ts.isObjectLiteralExpression(literal), 'Expected literal retry queue declaration');
      // The current source has only primitive literals plus QUEUES.notification.
      const convert = (value) => {
        if (ts.isObjectLiteralExpression(value)) return Object.fromEntries(value.properties.map(property => {
          assert.ok(ts.isPropertyAssignment(property), 'Unsupported queue declaration');
          return [property.name.text, convert(property.initializer)];
        }));
        if (ts.isStringLiteral(value)) return value.text;
        if (ts.isNumericLiteral(value)) return Number(value.text);
        if (value.kind === ts.SyntaxKind.TrueKeyword) return true;
        if (value.getText(main) === 'QUEUES.notification') return queueNames.notification;
        throw new Error('Unsupported queue declaration: review the integration harness');
      };
      options = convert(literal);
    }
    ts.forEachChild(node, visit);
  }
  visit(main);
  assert.ok(options, 'Retry declaration not found in main.ts; update harness before testing');
  assert.equal(options.arguments['x-message-ttl'], 10_000, 'Expected agreed fixed ten-second delay');
  return options;
}

function secretValue(data, key) {
  return data[key] ? Buffer.from(data[key], 'base64').toString('utf8') : undefined;
}

function brokerUrl() {
  if (process.env.RELIABILITY_RABBITMQ_URL) return process.env.RELIABILITY_RABBITMQ_URL;
  // Credentials stay in memory. Never print the Secret, URL, passwords or stderr.
  const result = execFileSync('kubectl', [...kubectlArgs, 'get', 'secret', 'app-secrets', '-o', 'json'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20_000,
  });
  const { data } = JSON.parse(result);
  const configured = secretValue(data, 'RABBITMQ_URL');
  const url = new URL(configured || 'amqp://127.0.0.1');
  url.hostname = '127.0.0.1';
  url.port = String(forwardPort);
  if (!configured) {
    url.username = secretValue(data, 'RABBITMQ_DEFAULT_USER') || 'guest';
    url.password = secretValue(data, 'RABBITMQ_DEFAULT_PASS') || 'guest';
  }
  return url.toString();
}

async function forwardBroker() {
  const forward = spawn('kubectl', [...kubectlArgs, 'port-forward', 'pod/rabbitmq-0',
    `${forwardPort}:5672`, '--address=127.0.0.1'], { stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((done, fail) => {
    const timer = setTimeout(() => fail(new Error('RabbitMQ port-forward readiness timeout')), 15_000);
    const ready = (chunk) => {
      if (chunk.toString().includes('Forwarding from')) { clearTimeout(timer); done(); }
    };
    forward.stdout.on('data', ready);
    forward.stderr.on('data', ready);
    forward.once('error', () => { clearTimeout(timer); fail(new Error('Could not start kubectl port-forward')); });
    forward.once('exit', () => { clearTimeout(timer); fail(new Error('kubectl port-forward exited')); });
  }).catch(error => { forward.kill('SIGTERM'); throw error; });
  return forward;
}

async function run() {
  assert.ok(process.argv.includes('--run'), 'Use --run to authorize creation and cleanup of isolated test queues');
  assert.ok(Number.isInteger(forwardPort) && forwardPort > 1023 && forwardPort < 65536);
  const Controller = loadController();
  const retryOptions = retryQueueOptions();
  const cases = new Map([
    ['always-fail', { failUntil: Infinity, expectedAttempts: 4, attempts: [], success: false }],
    ['recover-on-retry-2', { failUntil: 2, expectedAttempts: 3, attempts: [], success: false }],
  ]);
  const report = {
    runId,
    controllerSha256: createHash('sha256').update(source).digest('hex'),
    startedAt: new Date().toISOString(),
    queues: {
      main: queueNames.notification,
      retry: queueNames.notificationRetry,
      dlq: queueNames.notificationDlq,
    },
    delayMs: retryOptions.arguments['x-message-ttl'],
    scope: 'Current source controller + real RabbitMQ; controlled create() stub, no MongoDB or production consumer',
    events: [],
    cases: {},
  };
  let forward;
  let connection;
  let channel;
  let publisher;
  let consumerTag;
  let callbackError;
  let cleanupStarted = false;
  const ownedQueues = new Set();
  const cleanup = async () => {
    if (cleanupStarted) return;
    cleanupStarted = true;
    try {
      if (channel && consumerTag) await channel.cancel(consumerTag);
      if (channel) {
        // Only explicit UUID-scoped queues created by this invocation can be deleted.
        for (const queue of ownedQueues) {
          assert.ok(queue.startsWith(`${prefix}.`));
          await channel.deleteQueue(queue);
        }
      }
    } finally {
      await publisher?.close().catch(() => {});
      await channel?.close().catch(() => {});
      await connection?.close().catch(() => {});
      forward?.kill('SIGTERM');
    }
  };
  const interrupted = () => {
    callbackError = new Error('Test interrupted');
    void cleanup().finally(() => { process.exitCode = 1; });
  };
  process.once('SIGINT', interrupted);
  process.once('SIGTERM', interrupted);
  try {
    if (!process.env.RELIABILITY_RABBITMQ_URL) forward = await forwardBroker();
    connection = await amqp.connect(brokerUrl(), { timeout: 10_000 });
    // Match the production consumer's regular channel, including its current
    // unconfirmed sendToQueue path. Do not hide that limitation with a confirm mock.
    channel = await connection.createChannel();
    publisher = await connection.createConfirmChannel();
    await channel.assertQueue(queueNames.notificationRetry, retryOptions);
    ownedQueues.add(queueNames.notificationRetry);
    await channel.assertQueue(queueNames.notificationDlq, { durable: true });
    ownedQueues.add(queueNames.notificationDlq);
    await channel.assertQueue(queueNames.notification, contracts.getRetryableQueueOptions(queueNames.notificationRetry));
    ownedQueues.add(queueNames.notification);
    await channel.prefetch(1);
    const controller = new Controller({ create: async (payload) => {
      const state = cases.get(payload.testCase);
      assert.ok(state, 'Unexpected test case');
      const at = Date.now();
      const attempt = state.attempts.length + 1;
      state.attempts.push({ attempt, at, elapsedMs: at - state.sentAt });
      report.events.push({ testCase: payload.testCase, attempt, at: new Date(at).toISOString(), elapsedMs: at - state.sentAt });
      console.log(`${payload.testCase}: attempt ${attempt} at +${at - state.sentAt} ms`);
      if (attempt <= state.failUntil) throw new Error('CONTROLLED_TEST_DELIVERY_FAILURE');
      state.success = true;
      return { _id: `stub-${runId}` };
    } });
    // Capture current source logs without printing exception text or credentials.
    controller.logger = Object.fromEntries(['log', 'warn', 'error'].map(level => [level, () => {}]));
    ({ consumerTag } = await channel.consume(queueNames.notification, async msg => {
      if (!msg) return;
      try {
        const packet = JSON.parse(msg.content.toString('utf8'));
        await controller.pushNotification(packet.data, new RmqContext([msg, channel, packet.pattern]));
      } catch (error) { callbackError = error; }
    }, { noAck: false }));
    for (const [name, state] of cases) {
      state.sentAt = Date.now();
      state.messageId = randomUUID();
      const data = { testCase: name, userId: `${prefix}-${name}`, title: 'Isolated reliability test', message: 'Test fixture only' };
      publisher.sendToQueue(queueNames.notification, Buffer.from(JSON.stringify({ pattern: 'notification.push', data })), {
        messageId: state.messageId, persistent: true, contentType: 'application/json',
      });
    }
    await publisher.waitForConfirms();
    console.log(`Run ${runId}: real 10-second TTL; observing for 45 seconds`);
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
      if (callbackError) throw callbackError;
      await delay(250);
    }
    // Both cases have been observed beyond an extra retry interval: a spurious
    // fifth attempt or retry after recovery would have been counted by now.
    for (const [name, state] of cases) {
      assert.equal(state.attempts.length, state.expectedAttempts, `${name}: incorrect number of attempts`);
      assert.equal(state.success, name !== 'always-fail', `${name}: incorrect success result`);
      const intervals = state.attempts.slice(1).map((attempt, i) => attempt.at - state.attempts[i].at);
      for (const interval of intervals) {
        assert.ok(interval >= 9_900, `${name}: retry was earlier than fixed interval`);
        assert.ok(interval <= 15_000, `${name}: retry exceeded test-environment timing allowance`);
      }
      report.cases[name] = { attempts: state.attempts.length, success: state.success, retryIntervalsMs: intervals };
    }
    const dlq = await channel.get(queueNames.notificationDlq, { noAck: false });
    assert.ok(dlq, 'Permanent failure did not reach DLQ');
    const packet = JSON.parse(dlq.content.toString('utf8'));
    assert.equal(packet.data.testCase, 'always-fail');
    const death = dlq.properties.headers?.['x-death'];
    const retries = death?.find(entry => entry.queue === queueNames.notificationRetry && entry.reason === 'expired');
    assert.equal(retries?.count, 3, 'Broker retry evidence is incorrect');
    report.dlq = {
      testCase: packet.data.testCase,
      retryExpiryCount: retries.count,
      messageIdRetained: dlq.properties.messageId === cases.get('always-fail').messageId,
      explicitFailedHeader: dlq.properties.headers?.['x-status'] ?? null,
    };
    channel.ack(dlq);
    assert.equal(await channel.get(queueNames.notificationDlq, { noAck: true }), false, 'Unexpected second DLQ message');
    const main = await channel.checkQueue(queueNames.notification);
    const retry = await channel.checkQueue(queueNames.notificationRetry);
    assert.equal(main.messageCount, 0);
    assert.equal(retry.messageCount, 0);
    report.finishedAt = new Date().toISOString();
    report.result = 'PASS';
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await cleanup();
    process.removeListener('SIGINT', interrupted);
    process.removeListener('SIGTERM', interrupted);
    console.log('Cleanup: removed only this run\'s three test queues and closed its port-forward.');
  }
}

run().catch(error => {
  // Connection errors can embed credentials. Keep raw exceptions out of output.
  const detail = error?.code === 'ERR_ASSERTION' ? ` Assertion: ${error.message}` : '';
  console.error(`Reliability test failed or could not complete; no PASS is claimed.${detail}`);
  process.exitCode = 1;
});
