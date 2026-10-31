# NFR 3.1: fixed-interval notification retry

Recorded run: [25 October 2026 — both cases passed](results/2026-10-25-cf10850c.json).
The run used the existing controller with `MAX_ATTEMPTS = 3` (three delayed retries,
four total calls); its existing log wording undercounts the total number of attempts.

Run from the repository root:

```bash
node tests/reliability/notifications/retry.integration.mjs --run
```

Requires the existing notification-service dependencies, kubectl access to namespace
`cu-marketplace`, and RabbitMQ running in `rabbitmq-0`. The kubeconfig defaults to
`$HOME/.kube/k3s.yaml`; `KUBECONFIG` overrides it. No new dependency is installed.
`RELIABILITY_AMQP_PORT` overrides the default localhost port-forward port 25673.
Credentials are read from the Kubernetes Secret in memory, never printed.
For a separate broker, explicitly set `RELIABILITY_RABBITMQ_URL` instead; this skips
the Kubernetes Secret/port-forward steps. Never commit credentials.

## What the test actually exercises

- Loads the **current source** of `NotificationsRmqController` through TypeScript's
  compiler. Its retry/count/nack/ack/DLQ implementation is unchanged.
- Substitutes only unique UUID-scoped queue names and a controlled `create()` stub.
- Reads retry queue declaration options from `notification-service/src/main.ts`.
- Uses real RabbitMQ for the ten-second TTL, dead-letter routing and `x-death` counts.
- Does not start or modify the production notification consumer, change its code,
  stop MongoDB/RabbitMQ, or write notifications into MongoDB.

This is a **source-controller + real-broker integration test**, not an end-to-end
test of the running deployment, actual MongoDB delivery, email or device push.

## Cases and assertions

| Case | Controlled failure | Expected outcome |
| --- | --- | --- |
| `always-fail` | Every create attempt fails | Four calls total: initial + three delayed retries, then one message in test DLQ |
| `recover-on-retry-2` | First two attempts fail | Success on attempt three, no further calls and no DLQ entry |

Both cases run concurrently with different message IDs and test payload markers.
The test observes for 45 seconds, including at least one extra retry interval after
the permanent failure normally reaches DLQ around second 30. It verifies no fifth
attempt, no retry after recovery, empty main/retry queues and no extra DLQ message.

The retry interval assertion allows 9.9–15 seconds between create calls to account
for clock granularity and local scheduling/processing. It is not an assertion of
exactly 10.000 seconds or an exponential-backoff test. Under backlog, delays may
be longer; this is a small functional reliability test, not a load test.

## Failure evidence and known limits

For the current implementation, `Failed` means terminal **DLQ presence**, not a
MongoDB status. Evidence includes the unchanged test payload marker and broker
`x-death` retry expiry count of three. The JSON output also reports whether the
original AMQP `messageId` and an explicit `x-status: Failed` header survived.
Those diagnostic fields are not silently treated as present if the source does
not implement them.

Passing this test does not prove publisher-confirm safety, exactly-once delivery,
crash recovery, or idempotency. The current controller publishes to DLQ on a regular
consumer channel and immediately acknowledges the original. Broker/network failure
during that handoff needs a separate fault test and implementation hardening.

Only the three `reliability-notification-<run UUID>.*` queues created by the current
invocation are deleted during cleanup. No existing application queues are purged
or deleted. The DLQ test message is inspected and acknowledged first, so preserve
the terminal JSON/recorded report if you need evidence after cleanup.

An abrupt host shutdown or SIGKILL can prevent cleanup; in that case inspect the
exact run UUID before removing any leftover test queues.
