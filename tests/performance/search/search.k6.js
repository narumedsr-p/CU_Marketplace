// NFR 2.1: Search API response time.
import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const searchTime = new Trend('search_elapsed_ms', true);
const baseUrl = (__ENV.BASE_URL || 'http://localhost:30080').replace(/\/+$/, '');
const keywords = ['MacBook', 'iPad', 'Sony', 'zzznomatch987654'];
const rate = Number(__ENV.RATE || 1);

if (!Number.isInteger(rate) || rate < 1) {
  throw new Error('RATE must be a positive integer (requests per second).');
}

// Cover the 2-second NFR with 25% headroom. Preallocate the budget so that
// creating VUs mid-test does not distort the results at higher arrival rates.
const preAllocatedVUs = Number(__ENV.PRE_ALLOCATED_VUS || Math.max(10, Math.ceil(rate * 2 * 1.25)));
const maxVUs = Number(__ENV.MAX_VUS || preAllocatedVUs);

if (!Number.isInteger(preAllocatedVUs) || preAllocatedVUs < 1) {
  throw new Error('PRE_ALLOCATED_VUS must be a positive integer.');
}
if (!Number.isInteger(maxVUs) || maxVUs < preAllocatedVUs) {
  throw new Error('MAX_VUS must be an integer greater than or equal to PRE_ALLOCATED_VUS.');
}

export const options = {
  scenarios: {
    search: {
      executor: 'constant-arrival-rate',
      rate,
      timeUnit: '1s',
      duration: __ENV.DURATION || '60s',
      preAllocatedVUs,
      maxVUs,
      gracefulStop: '10s',
    },
  },
  thresholds: {
    search_elapsed_ms: ['max<=2000'],
    http_req_failed: ['rate==0'],
    checks: ['rate==1'],
    dropped_iterations: ['count==0'],
  },
  summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
  if (!__ENV.TOKEN || !__ENV.TOKEN.trim()) {
    throw new Error('TOKEN is required. Export a valid JWT before running the test.');
  }
}

export default function () {
  const keyword = keywords[Math.floor(Math.random() * keywords.length)];
  const start = Date.now();
  const response = http.get(
    `${baseUrl}/api/v1/catalog/items?search=${encodeURIComponent(keyword)}`,
    {
      headers: { Authorization: `Bearer ${__ENV.TOKEN.trim()}` },
      timeout: '5s',
      tags: { name: 'catalog_search', keyword },
    },
  );
  searchTime.add(Date.now() - start);

  let items = null;
  try {
    items = response.json();
  } catch (_) {
    // Invalid JSON must fail the checks rather than abort the iteration.
  }

  check(response, {
    'HTTP 200': (res) => res.status === 200,
    'response is an array': () => Array.isArray(items),
    'only Available items': () =>
      Array.isArray(items) &&
      items.every((item) => item !== null && item.status === 'Available'),
  });
}
