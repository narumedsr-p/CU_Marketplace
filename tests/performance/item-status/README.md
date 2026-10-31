# NFR 2.2 — Item status propagation within 2 seconds

## What is measured

The test invokes real business actions **through Kong** and reads the resulting
Catalog item status through a separate localhost-only, read-only database observer.
Each iteration creates one isolated item and performs four transitions:

| Metric tag | Trigger | Expected Catalog status |
| --- | --- | --- |
| `reserve` | Buyer places an order | Available → Reserved |
| `cancel` | Buyer cancels that order | Reserved → Available |
| `reserve_again` | Buyer places a new order for the same test item | Available → Reserved |
| `complete` | Seller generates QR proof, buyer confirms it | Reserved → Sold |

Timing starts **before sending the trigger request** and ends when the observer
returns the expected exact Catalog status. The clock is the k6 process clock;
database timestamps are not subtracted from a different machine's clock.
The trigger response must also identify the correct item and expected order status.
QR preparation is not part of the complete action's timer, but the confirm request is.

This is a conservative client-observed upper bound: polling starts after the trigger
response, includes its full duration, the observer query/HTTP latency and polling
interval (up to 50 ms). It does **not** measure browser rendering, another browser's
cached listing, or all downstream consumers. The observer adds small read load.

The public Catalog details API currently returns 404 for both Reserved and Sold.
A 404 alone cannot prove either exact state, so it is deliberately not used as the
pass condition. No production API, schema, business logic or authentication is changed.

## Safety and test data

- Run only against the approved test cluster with two **test accounts**.
- This is **not read-only traffic**: it creates real listings, two orders per item,
  chat rooms and notifications through existing APIs. Use `ALLOW_TEST_WRITES=1`
  as an explicit acknowledgement. Do not use real sale listings or production users.
- Items are named `k6-status-<observer-run-id>-<run-time>-<iteration>` and priced at 1.
  The item IDs/titles are logged, but JWTs, database credentials and QR proof are not.
- Completed test items remain Sold; cancelled/completed orders, rooms and notifications
  remain too. There is **no automatic deletion or cleanup SQL**. Inspect the exact test
  records before any separately approved cleanup. Do not delete PVCs or reset the DB.
- If a step fails, the flow stops for that item without automatic compensating actions.
  A failed publish may still have persisted data: inspect the logged item before retrying.
- JWT expiry is checked before writes. Both tokens must have more than the scenario's
  maximum duration plus 60 seconds remaining, then profile reads verify acceptance.
- Default is only **one iteration, one VU**. One iteration means one full four-transition
  cycle, not one HTTP request. Do not reuse Search's 25–100 RPS settings for this workflow.

## 1. Start the read-only observer (Terminal A)

From the repository root on the Linux host:

```bash
export KUBECONFIG="$HOME/.kube/k3s.yaml"
node tests/performance/item-status/status-observer.mjs
```

Requires Node 22+, installed Catalog dependencies and kubectl access to namespace
`cu-marketplace`. It reuses the `pg` dependency of Catalog's installed Prisma adapter.
No new package installation is needed if the existing workspace dependencies are present.

The helper reads `CATALOG_DATABASE_URL` from `app-secrets` **in memory** and starts
`kubectl port-forward svc/postgres 15432:5432 --address=127.0.0.1` automatically.
It does not print secrets or change them. Its pool enforces default read-only
transactions, statement timeouts, and only exposes SELECT status for this run's
fixture prefix. Nothing is added to Kong or exposed outside localhost.

Wait for `Read-only status observer: http://127.0.0.1:9172` and leave it running.
Ports 15432 and 9172 must be free; `OBSERVER_DB_PORT` / `OBSERVER_PORT` can override
them. If the HTTP port changes, pass the matching `OBSERVER_URL` to k6 too.
For another approved local setup, `OBSERVER_DATABASE_URL` can supply a direct
Catalog connection URL instead of fetching the secret and creating a port-forward.
Keep credentials in environment only, not in a committed file.

## 2. Prepare seller and buyer JWTs (Terminal B)

Log in with two different test accounts (normal window and Incognito). Copy each
`cu-marketplace.token` from the correct window's Local Storage. Then:

```bash
read -rsp "Seller JWT: " SELLER_TOKEN
export SELLER_TOKEN
printf '\n'
read -rsp "Buyer JWT: " BUYER_TOKEN
export BUYER_TOKEN
printf '\n'
```

Do not include `Bearer`. Never paste tokens into chat or commit them.
Existing PostgreSQL CPU tuning may remain for this test; record it with the results.
Check the test rate-limit configuration is still in effect before larger runs.

## 3. Run one cycle first

From the root of the repo in Terminal B:

```bash
docker run --rm -i --network host \
  -e SELLER_TOKEN -e BUYER_TOKEN \
  -e ALLOW_TEST_WRITES=1 -e VUS=1 -e ITERATIONS=1 \
  grafana/k6 run - < tests/performance/item-status/item-status.k6.js
```

Native k6 alternative:

```bash
ALLOW_TEST_WRITES=1 VUS=1 ITERATIONS=1 \
  k6 run tests/performance/item-status/item-status.k6.js
```

Use the same pinned k6 image/version as other runs where possible.
The default scenario maximum is 300 seconds; override `MAX_DURATION_SECONDS`
when needed (also increases the required remaining JWT lifetime).
Do not use `--http-debug`: action bodies contain handover proof and auth headers.

## 4. Pass criteria

- All four `item_status_propagation_ms{transition:...}` max values ≤ 2000 ms.
- `item_status_within_budget`: 100%, including missing events and rejected actions.
- `item_status_transitions`: exactly four per requested iteration, with one per stage.
- `item_status_completed_flows`: exactly the requested iteration count.
- Checks: 100%; HTTP failures: zero; dropped iterations: zero.

Missing/late status is a failure, not an omitted latency sample. After a failed stage
later stages are not attempted; the expected-count thresholds prevent partial flows
from appearing to pass. A failure message logs stage, HTTP code and item ID only.
Observer failure also invalidates the measurement; investigate it before attributing
the failure to business propagation. A status above 2 seconds is not accepted even
if it becomes correct later. Do not loosen thresholds or timeout to claim a pass.

## 5. Increase business concurrency only after the first cycle passes

Example: 10 distinct test items, at most 5 cycles running concurrently:

```bash
docker run --rm -i --network host \
  -e SELLER_TOKEN -e BUYER_TOKEN \
  -e ALLOW_TEST_WRITES=1 -e VUS=5 -e ITERATIONS=10 \
  grafana/k6 run - < tests/performance/item-status/item-status.k6.js
```

This is a bounded concurrency test, **not 5/10 RPS**. It creates 10 items and up to
20 orders. Use separate agreed counts/arrival rates for later load testing, and account
for fixture creation, QR preparation, observer polling and notification/chat side effects.
Do not reserve one item concurrently here: that is NFR 2.5, a different correctness test.

Capture CPU/RAM and before/after CPU throttling as for Search. Report sample counts,
per-transition max/p95, failures, concurrency, dataset and resource configuration.

## 6. Stop

Stop the observer with Ctrl+C in Terminal A; it also closes its port-forward.
It deliberately leaves the database records in place for inspection.

```bash
unset SELLER_TOKEN BUYER_TOKEN
```

If no more performance tests are planned, restore Kong's original quota as described
in [the Search guide](../search/README.md). Keep baseline and tuned configuration results separate.

## Offline validation (no real API or database writes)

```bash
node --experimental-vm-modules tests/performance/item-status/item-status.test.mjs
```
