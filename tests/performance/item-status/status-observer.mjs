import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const runId = randomUUID();
const fixturePrefix = `k6-status-${runId}-`;
const port = Number(process.env.OBSERVER_PORT || 9172);
const forwardPort = Number(process.env.OBSERVER_DB_PORT || 15432);
const kubeconfig = process.env.KUBECONFIG || resolve(homedir(), '.kube/k3s.yaml');
const kubectlArgs = ['--kubeconfig', kubeconfig, '--request-timeout=15s', '-n', 'cu-marketplace'];

for (const value of [port, forwardPort]) {
  if (!Number.isInteger(value) || value < 1024 || value > 65535) {
    throw new Error('Observer ports must be integers between 1024 and 65535.');
  }
}

export function createObserver(pool, prefix, observerRunId) {
  return createServer(async (request, response) => {
    const send = (status, body) => {
      response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(body));
    };
    if (request.method !== 'GET') return send(405, { error: 'Read-only observer' });
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/health') {
      try {
        await pool.query('SELECT 1');
        return send(200, { runId: observerRunId, readOnly: true });
      } catch {
        return send(503, { error: 'Observer database unavailable' });
      }
    }
    const match = url.pathname.match(/^\/items\/([0-9a-f-]{36})$/i);
    if (!match || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(match[1])) {
      return send(404, { error: 'Not found' });
    }
    try {
      // A primary-key read of this observer run's fixtures only. No write SQL.
      const result = await pool.query(
        'SELECT item_id AS id, status FROM "Item" WHERE item_id = $1::uuid AND left(title, length($2::text)) = $2::text',
        [match[1], prefix],
      );
      if (!result.rows[0]) return send(404, { error: 'Test fixture not found' });
      return send(200, result.rows[0]);
    } catch {
      return send(503, { error: 'Observer query failed' });
    }
  });
}

async function main() {
  let forward;
  let pool;
  let server;
  let closing = false;
  const close = async (exitCode) => {
    if (closing) return;
    closing = true;
    if (server) {
      server.closeAllConnections();
      await new Promise((done) => server.close(done));
    }
    if (pool) await pool.end();
    if (forward) forward.kill('SIGTERM');
    process.exitCode = exitCode;
  };
  process.once('SIGINT', () => { void close(0); });
  process.once('SIGTERM', () => { void close(0); });
  try {
    // Reuse pg already installed with Catalog's Prisma adapter; no new dependency.
    const catalogRequire = createRequire(resolve(root, 'apps/catalog-service/package.json'));
    const adapterRequire = createRequire(catalogRequire.resolve('@prisma/adapter-pg'));
    const { Pool } = adapterRequire('pg');
    let connectionString = process.env.OBSERVER_DATABASE_URL;
    if (!connectionString) {
      const secret = JSON.parse(execFileSync('kubectl', [...kubectlArgs, 'get', 'secret', 'app-secrets', '-o', 'json'], {
        encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      }));
      const encoded = secret.data?.CATALOG_DATABASE_URL;
      if (!encoded) throw new Error('Missing database configuration');
      const url = new URL(Buffer.from(encoded, 'base64').toString('utf8'));
      if (url.pathname !== '/cu_catalog_db') throw new Error('Unexpected database');
      url.hostname = '127.0.0.1';
      url.port = String(forwardPort);
      connectionString = url.toString();
      forward = spawn('kubectl', [...kubectlArgs, 'port-forward', 'svc/postgres', `${forwardPort}:5432`, '--address=127.0.0.1'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      await new Promise((ready, reject) => {
        const timer = setTimeout(() => reject(new Error('Port-forward timeout')), 15000);
        const finish = (error) => { clearTimeout(timer); error ? reject(error) : ready(); };
        forward.once('error', finish);
        forward.once('exit', () => finish(new Error('Port-forward stopped')));
        forward.stdout.on('data', (chunk) => {
          if (chunk.toString().includes('Forwarding from')) finish();
        });
      });
      forward.once('exit', () => { if (!closing) void close(1); });
    }
    pool = new Pool({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 1000,
      query_timeout: 1000,
      // Even accidental write queries from this connection must be rejected by PG.
      options: '-c default_transaction_read_only=on -c statement_timeout=750',
      application_name: 'k6-status-read-only-observer',
    });
    pool.on('error', () => console.error('Observer database connection error (details suppressed).'));
    const probe = await pool.query('SHOW default_transaction_read_only');
    if (probe.rows[0]?.default_transaction_read_only !== 'on') throw new Error('Read-only mode required');
    server = createObserver(pool, fixturePrefix, runId);
    await new Promise((ready, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', ready);
    });
    console.log(`Read-only status observer: http://127.0.0.1:${port}`);
    console.log(`Fixture prefix: ${fixturePrefix}`);
    console.log('Only this run\'s test items are readable. Ctrl+C closes the observer and its port-forward.');
  } catch {
    console.error('Observer startup failed. Check kubeconfig permissions, installed Catalog dependencies, database and free ports. Credentials/details suppressed.');
    await close(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
