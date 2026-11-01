# NFR 2.3 — Chat end-to-end latency under 1 second

## Measurement and scope

`chat.k6.js` opens **two separate authenticated Socket.IO connections through Kong**.
It alternates buyer → seller and seller → buyer, timestamps immediately before the
`message:send` frame, and stops the timer only on the **opposite connection's**
matching `message:new` event. Room, sender, unique content and message ID are checked.
The sender's echo and server acknowledgement are not delivery proof. Both clients
share the same k6 clock, so server/client clock skew is not subtracted.

This tests persisted server text-chat delivery via MongoDB, the current notification
publish path and Socket.IO over direct WebSocket transport. It does not measure DOM
rendering, image attachments, Google OAuth, polling-to-WebSocket upgrade, reconnect,
multiple distinct account pairs, or remote mobile/WAN latency. Localhost is a normal
local network baseline with no artificial impairment, not evidence for all real networks.

The helper `protocol.mjs` implements only the Engine.IO v4 / Socket.IO v5 text frames
needed by this gateway: handshake, heartbeat, default-namespace events and acks.
It uses supported `k6/websockets`, not a plain WebSocket echo or REST-only substitute.
See [Socket.IO protocol](https://github.com/socketio/socket.io-protocol) and
[k6 WebSocket API](https://grafana.com/docs/k6/latest/javascript-api/k6-websockets/).

## Four measured rounds

Use **one VU, one room, two test accounts, two sockets**. Increase aggregate messages
per second, not VUs. Reusing the same two JWTs across many VUs creates many sessions
of the same users; the gateway broadcasts to every session and that is not independent
user-pair load. A realistic many-pair test requires a separately provisioned account pool.

| Round | MESSAGE_RATE (total messages/s) | DURATION_SECONDS | Expected messages |
| --- | --- | --- | --- |
| 1 | 1 | 300 | 300 |
| 2 | 5 | 300 | 1,500 |
| 3 | 10 | 300 | 3,000 |
| 4 | 20 | 300 | 6,000 |

Rate is the **sum of both directions**, not per side. This is an exploratory message
throughput profile, not a claim that one person normally types 20 messages/second or
that the system has 20 users. Agree a multi-user target separately if required.
Unlike the Item Status bounded iteration test, this holds connections and schedules
messages throughout the requested time window. It is open-loop: slow/missing replies
do not pause the next scheduled send. Exact count thresholds detect generator under-send.
The sender uses absolute deadlines from the run origin, not repeating relative timers:
small callback delays do not accumulate over five minutes. If a whole send slot is
missed, it is counted and skipped, not burst-sent later to hide generator overload.

## Safety

- Only run against the approved test cluster with two test accounts and
  `ALLOW_TEST_WRITES=1`. Each run creates **one listing and one room**, then real messages
  and notifications. Four measured rounds create 10,800 messages plus notification
  side effects. The smoke run adds its own listing, room and messages.
- Nothing is auto-deleted. The fixture title starts `k6-chat-`; item and room IDs are
  logged without credentials. No orders, handovers or status changes are performed.
- Close normal/Incognito app tabs after copying tokens so their sockets do not add
  unrecorded sessions. Do not run Search/Item Status load concurrently.
- Keep current resource/replica/quota configuration fixed for all measured rounds.
  The test does not apply any deployment changes. Record database sizes/configuration.
- No status observer or SQL connection is needed; stop the old Item Status observer
  with Ctrl+C if no longer used.
- Token expiry is checked before fixture writes, allowing the whole window plus 90s.
  k6 authenticates with Authorization headers instead of URL tokens to avoid putting
  JWTs into gateway access-log URLs. Never use `--http-debug` or `--verbose` with credentials.

## Run from the repository root

Copy fresh JWTs from two different test accounts (same method as Item Status):

```bash
read -rsp "Seller JWT: " SELLER_TOKEN
export SELLER_TOKEN
printf '\n'
read -rsp "Buyer JWT: " BUYER_TOKEN
export BUYER_TOKEN
printf '\n'
```

Start with **one message/second for 60 seconds**:

```bash
docker run --rm --network host \
  -v "$PWD/tests/performance/chat:/scripts:ro" \
  -e SELLER_TOKEN -e BUYER_TOKEN -e ALLOW_TEST_WRITES=1 \
  -e MESSAGE_RATE=1 -e DURATION_SECONDS=60 \
  grafana/k6 run /scripts/chat.k6.js
```

Mount the whole folder read-only: the script imports `protocol.mjs`, so **do not use
`run - < chat.k6.js`**, which loses the sibling file path inside Docker.

After smoke passes, first measured round:

```bash
docker run --rm --network host \
  -v "$PWD/tests/performance/chat:/scripts:ro" \
  -e SELLER_TOKEN -e BUYER_TOKEN -e ALLOW_TEST_WRITES=1 \
  -e MESSAGE_RATE=1 -e DURATION_SECONDS=300 \
  grafana/k6 run /scripts/chat.k6.js
```

Then change only `MESSAGE_RATE=5`, `10`, `20` one round at a time. Keep
`DURATION_SECONDS=300` and VU count at one. Pause between rounds until the system
returns to baseline. Record the k6 image version/digest and CPU/RAM during each run.
Stop increasing on the first failed threshold; Ctrl+C if the host becomes unresponsive.
With native k6, use `ALLOW_TEST_WRITES=1 MESSAGE_RATE=1 DURATION_SECONDS=60 k6 run
tests/performance/chat/chat.k6.js` from the root, with tokens exported first.

## Same duration, different total message counts

Use `TOTAL_MESSAGES` **instead of** `MESSAGE_RATE` to distribute an exact number of
messages evenly across a fixed window. Do not pass both settings. The strict delivery,
latency and pacing thresholds are unchanged; this does not permit catch-up bursts.

| TOTAL_MESSAGES | DURATION_SECONDS | Effective total messages/s |
| --- | --- | --- |
| 1000 | 300 | approximately 3.33 |
| 1500 | 300 | 5 |

1,000 messages over the full five-minute window:

```bash
docker run --rm --network host \
  -v "$PWD/tests/performance/chat:/scripts:ro" \
  -e SELLER_TOKEN -e BUYER_TOKEN -e ALLOW_TEST_WRITES=1 \
  -e TOTAL_MESSAGES=1000 -e DURATION_SECONDS=300 \
  grafana/k6 run /scripts/chat.k6.js
```

For 1,500 messages over the same window, change only `TOTAL_MESSAGES=1500`.
Run one at a time with the same configuration and fresh-enough JWTs. Each creates
one new test listing/room plus the requested messages and notification side effects.
The earlier 1,000-message run lasted 100 seconds; it is not a five-minute result.
Keep its historical duration unchanged and store the new run separately.

With the duration fixed, changing message count also changes rate. This compares
different offered loads over equal time, not an isolated effect of total message count.
Max/average latency need not grow monotonically across runs; repeat runs and record
resource/network conditions rather than assuming a larger total must always be slower.

## Results

- `chat_e2e_ms`: **successfully received** end-to-end latency, max **strictly < 1000 ms**.
- `chat_delivery_success` and `chat_within_budget`: 100%; missed deliveries are included
  as failures in the denominator, never silently removed.
- `chat_messages_sent`, `chat_messages_received`, `chat_messages_resolved`: all equal
  `TOTAL_MESSAGES` when provided, otherwise `MESSAGE_RATE × DURATION_SECONDS`.
  Successful acks do not increment received counts.
- `chat_ready_connections`: exactly 2; connection/protocol errors and duplicates: 0.
- `chat_pacing_missed_slots`: 0; `chat_scheduling_lag_ms` reports actual send scheduling
  delay separately from message E2E latency. A pacing failure invalidates the planned
  load, even when every message actually sent reaches the recipient within 1 second.
- HTTP failures and dropped iterations: 0; checks: 100%.
- `chat_observation_ms` includes failed/missing observations. A delivery missing after
  5 seconds is recorded as failed with its elapsed wait (a **censored observation**),
  not a fabricated successful delivery latency. A received message at 1000 ms or later
  fails the timing NFR even if it arrives before the timeout.

Do not use `http_req_duration`, `ws_ping` or sender acknowledgement latency as NFR 2.3.
Handshake/setup time is separate from message latency. Exact pacing/count thresholds
prevent a short or incomplete run from being claimed as a full-window pass.
Report local network conditions, per-direction latency, counts/errors, message rate,
the one-room/two-account scope and duration. Do not claim real Internet latency or
independent concurrent user-pair capacity from this setup.

## Offline validation

```bash
node --experimental-vm-modules tests/performance/chat/chat.test.mjs
```

Mocks do not contact the cluster or write business data. They exercise protocol framing,
correlation, opposite-side delivery, missing/late messages, duplicates and preflight guards.
