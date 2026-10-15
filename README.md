# CU_Marketplace

A Turborepo monorepo for a campus marketplace platform. It's partway through migrating
from a hand-rolled NestJS API Gateway to Kong Ingress on Kubernetes as the single entry
point and sole auth checkpoint, with service discovery over k8s DNS. The notes below cover
what's actually live right now versus what's still pending.

## Architecture

- There's no standalone gateway process anymore. The old `api-gateway` app is gone, and
  until Kong Ingress is deployed, each service has to be reached directly (see
  [Setup](#setup)). Nothing injects `x-user-id`/`x-user-role`/`x-internal-key` for you
  outside of `profile-service`'s own auth routes.
- `profile-service` owns login. Google OAuth and JWT minting live inside its `src/auth/`
  module instead of a separate gateway, making it the one service with public,
  unauthenticated HTTP routes (`/auth/google`, `/auth/google/callback`).
- 7 core microservices, each owning a single domain and its own isolated Postgres database
  (database-per-service). Services never share a schema, and cross-service calls happen
  through small client modules (`clients/*.ts`), never direct DB access. Internal-only
  endpoints use gRPC when the caller needs a synchronous answer, or RabbitMQ when it
  doesn't (see [gRPC](#grpc) and [Message queue](#message-queue-rabbitmq) below).
- Frontend is a barebones React + Vite starter, not yet wired to any pages.
- `@workspace/contracts` is a single shared package exporting only cross-cutting interfaces
  like `UserClaims`. No DTOs are shared between services; each one defines its own internal
  shapes.

### Auth flow

Login is Google OAuth only, gated to `ALLOWED_EMAIL_DOMAIN` (default `chula.ac.th`;
subdomains like `student.chula.ac.th` also work). It all lives in `profile-service`'s
`auth/` module:

1. `GET /auth/google` redirects to Google's consent screen, with a CSRF `state` token set
   in an httpOnly cookie.
2. `GET /auth/google/callback` checks that cookie, exchanges the code, and verifies the ID
   token's signature with `google-auth-library`. It rejects the login unless the email is
   verified and its domain (or a subdomain of it) matches `ALLOWED_EMAIL_DOMAIN` (the `hd`
   hint from step 1 is just a UX nudge, not trusted on its own). It then finds or creates a
   `UserProfile` by email, signs a JWT with an `iss` claim (so Kong's `jwt` plugin can pick
   the right verification credential later), and redirects the browser to
   `${FRONTEND_URL}/?token=<jwt>`.

You'll need `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` from Google Cloud Console (APIs &
Services → Credentials → OAuth client ID → Web application), with `GOOGLE_CALLBACK_URL`
registered as an authorized redirect URI. Without these, login doesn't work at all.

From there, the client sends `Authorization: Bearer <token>` on every request. The target
design has Kong's `jwt` plugin verify the token at the edge and a `pre-function` plugin
stamp `X-User-Id`/`X-User-Role`/`X-Internal-Key` onto the request before it reaches the
service, so nothing downstream needs its own auth code. Downstream services read identity
through the `@CurrentUser()` decorator, trusting those headers rather than verifying the
JWT themselves.

That part isn't deployed yet. Right now, with no gateway and no Kong running, nothing sets
those headers, so authenticated REST calls and the chat socket won't work end to end until
Kong is live.

`UserProfile.email` is unique and maps a Google email to its `userId`, created on first
login and reused after that. A deterministic hash would've been simpler, but it can't
handle an email change or an account merge without breaking existing user IDs.

## Service and port map

| Service              | HTTP Port | gRPC Port | Database              |
|-----------------------|-----------|-----------|------------------------|
| web (frontend)         | 5173      | —         | —                      |
| catalog-service        | 3001      | 4001      | `cu_catalog_db`        |
| order-service          | 3002      | 4002      | `cu_order_db`          |
| chat-service            | 3003      | 4003      | `cu_chat_db`           |
| wishlist-service        | 3004      | —         | `cu_wishlist_db`       |
| review-service          | 3005      | —         | `cu_review_db`         |
| profile-service         | 3006      | 4006      | `cu_profile_db`        |
| notification-service    | 3007      | —         | `cu_notification_db`   |

Only `catalog-service`, `order-service`, and `profile-service` run a gRPC server.
`review-service` and `chat-service` only call other services' gRPC endpoints; they don't
expose any of their own. `wishlist-service` and `notification-service` used to, but their
one gRPC method each (`EvaluateItem`, `PushNotification`) has moved to RabbitMQ (see
[Message queue](#message-queue-rabbitmq)).

## Repository structure

```
apps/
  web/                  React + Vite frontend starter
  catalog-service/        Listings, categories, storage adapter
  order-service/          Orders, calls catalog/chat/notification
  chat-service/           Conversations & messages, calls notification
  wishlist-service/       Wishlist items, auto-match, calls catalog/notification
  review-service/         Reviews, calls order/notification
  profile-service/        User profiles; also owns Google OAuth login + JWT minting (src/auth/)
  notification-service/   Notifications & preferences
libs/
  contracts/              Shared @workspace/contracts package (UserClaims, service registry, queue topology)
    proto/                 .proto files for every internal gRPC service (shared by server + client sides)
docker-compose.yml        Postgres 16 (7 isolated databases) + RabbitMQ (management UI on :15672)
init-multiple-dbs.sh       Creates all 7 databases on container init
```

## Setup

### Prerequisites

- Node.js 22.12+ (see `.nvmrc`). Older 22.x builds hit an upstream Prisma bug where its
  query compiler's ESM runtime file can't be `require()`'d; `require(esm)` only became
  stable in 22.12.
- pnpm
- Docker (for local Postgres + RabbitMQ)

### 1. Start Postgres + RabbitMQ

```bash
docker compose up -d
```

This spins up a single Postgres 16 instance on `localhost:5432` (provisioning all 7 service
databases via `init-multiple-dbs.sh`) and a RabbitMQ broker on `localhost:5672`
(management UI at `http://localhost:15672`).

### 2. Configure environment variables

Copy the repo-root `.env.example` (secrets and credentials shared by every service:
`INTERNAL_SERVICE_SECRET`, `POSTGRES_USER`/`POSTGRES_PASSWORD`,
`RABBITMQ_USER`/`RABBITMQ_PASSWORD`/`RABBITMQ_URL`) and each service's own `.env.example`
(its local overrides, like `CATALOG_DATABASE_URL`/`CATALOG_PORT` for catalog-service,
prefixed per service since each needs a different value for the same concept; these
reference `${POSTGRES_USER}`/`${POSTGRES_PASSWORD}` from the root file via `dotenv-expand`
instead of duplicating the password):

```bash
cp .env.example .env
for d in apps/*-service; do cp "$d/.env.example" "$d/.env"; done
```

Fill in real values for `POSTGRES_PASSWORD` and `RABBITMQ_PASSWORD`/`RABBITMQ_URL` in the
root `.env`; they have to match whatever `docker-compose.yml` provisions Postgres/RabbitMQ
with (see the `environment:` blocks there). Login only works once you also fill in real
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in `apps/profile-service/.env` (see
[Auth flow](#auth-flow) for where to get them).

### 3. Install dependencies

```bash
pnpm install
```

### 4. Build

```bash
pnpm build
```

Runs `turbo run build` across the workspace: builds `@workspace/contracts` first, then all
7 services (each running `prisma generate` before compiling), then the web app.

### 5. Run in development

```bash
pnpm dev
```

Starts every app in watch mode through Turborepo: each service on its assigned port (3001
through 3007) and the frontend dev server on `:5173`. `apps/web/vite.config.ts` proxies each
`/api/v1/<prefix>` straight to its service, since there's no gateway to do that yet; see the
comment there for what's still broken until Kong is deployed.

## gRPC

Internal-only endpoints that need a synchronous answer, like reserving an item or logging a
user in, run over gRPC instead of REST. Internal-only work that doesn't need an immediate
answer runs over RabbitMQ instead (see [Message queue](#message-queue-rabbitmq)). Public
endpoints that happen to be reused internally, like `GET /items/:id`, stay REST, since
browsers can't speak gRPC directly.

- Proto files live in `libs/contracts/proto/*.proto`, one per receiving service, shared by
  the server and every calling client. `notification.proto` and `wishlist.proto` are gone
  now that their one RPC each (`PushNotification`, `EvaluateItem`) moved to a queue.
  `profile.proto`'s `OAuthLogin` is dead code: now that auth lives inside `profile-service`
  itself, the OAuth callback calls `ProfilesService` in-process instead of over gRPC. It
  hasn't been cleaned up yet.
- `catalog`, `order`, and `profile` each run an HTTP server and a gRPC server side by side
  (`app.connectMicroservice(...)` plus `app.startAllMicroservices()` in `main.ts`), on the
  ports in the table above. `chat-service` and `review-service` are gRPC clients only; they
  don't expose a gRPC server of their own. `wishlist-service` and `notification-service`
  don't run gRPC at all anymore.
- The shared `x-internal-key` secret travels as gRPC metadata instead of an HTTP header.
  Each gRPC-serving app has its own `GrpcInternalAuthGuard`
  (`common/guards/grpc-internal-auth.guard.ts`), separate from the HTTP
  `InternalAuthGuard`, which early-returns on non-HTTP contexts so it doesn't crash when a
  gRPC call comes in.
- `src/clients/*.ts` files inject `ClientGrpc` through a module-level
  `ClientsModule.register(...)`, resolve the typed service in `onModuleInit()`, and call
  methods wrapped in `firstValueFrom(...)`. That's the same shape as the old axios-based
  clients, so calling code elsewhere didn't need to change.
- `pnpm docs:grpc` (needs `protoc` and `protoc-gen-doc` installed locally) regenerates a
  combined HTML doc from all `.proto` files into `libs/contracts/proto/generated/index.html`.
  It's a static snapshot, so rerun it after editing any `.proto` file. There's no gRPC
  server reflection wired in, so live tools like `grpcui`, `grpcurl`, or Postman need the
  `.proto` file passed in explicitly instead of auto-discovering the schema.

## Message queue (RabbitMQ)

Internal-only work that doesn't need a synchronous answer runs over RabbitMQ
(`docker-compose.yml`, `rabbitmq:3-management`) instead of gRPC. Queue names and the shared
retry/DLQ options helper live in `libs/contracts/src/service-registry.ts` (`QUEUES`,
`getRabbitMqUrl()`, `getRetryableQueueOptions()`), so producer and consumer always agree on
queue arguments. RabbitMQ throws a channel error if two `assertQueue` calls for the same
queue disagree.

Three queues, two different reliability levels:

| Queue | Producer → Consumer | Ack | Retry/DLQ |
|---|---|---|---|
| `notification_queue` | order/chat/review/wishlist → notification-service | auto | none — best-effort, same as the old gRPC call it replaced |
| `catalog_item_status_queue` | order-service → catalog-service | manual | yes |
| `wishlist_evaluate_queue` | catalog-service → wishlist-service | manual | yes |

- `notification_queue` is fire-and-forget (`ClientProxy.emit()` / `@EventPattern()`): a
  dropped notification just means someone misses one in-app alert, so it doesn't need
  durability beyond what a normal durable queue already gives it.
- `catalog_item_status_queue` and `wishlist_evaluate_queue` use manual ack with a retry
  queue (10s TTL, dead-letters back to the main queue) and a dead-letter queue as the
  terminal sink, inspectable through the RabbitMQ management UI. After 5 failed attempts
  (tracked via RabbitMQ's `x-death` header), a message goes straight to the DLQ instead of
  retrying again.
- These two get the extra durability because losing one of these messages is a real
  problem, not just a missed alert: a lost `catalog_item_status` event leaves an item stuck
  `Reserved` or never marked `Sold`, and a lost `wishlist_evaluate` event means that item
  silently never matches anyone's wishlist rule, since auto-match only runs once, at
  creation.

## Notes

- `@workspace/contracts` intentionally contains no DTOs: it's a single-file stub
  (`UserClaims`) so the package builds cleanly. Each service is expected to define its own
  request/response shapes internally.
- This is a foundational scaffold: business logic, validation, and UI are minimal by design
  and meant to be built out on top of this structure.
