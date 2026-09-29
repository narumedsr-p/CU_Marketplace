# CU_Marketplace

A Turborepo monorepo scaffold for a campus marketplace platform, built as an API Gateway + REST microservices architecture.

## Architecture

- **API Gateway** — single public entry point. Terminates stateless JWT auth and proxies requests to downstream services over plain HTTP. There is no dedicated Auth Service; the gateway itself issues and verifies tokens.
- **7 core microservices** — each owns a single domain and its own isolated Postgres database (database-per-service). Services never share a schema, and cross-service calls happen via small client modules (`clients/*.ts`), never direct DB access. Public-facing endpoints (also reachable through the gateway) use REST; internal-only endpoints (blocked at the gateway, service-to-service only) use gRPC — see [gRPC](#grpc) below.
- **Frontend** — a barebones React + Vite starter, not yet wired to any UI/pages.
- **Contracts** — a single shared package (`@workspace/contracts`) exporting only cross-cutting interfaces (e.g. `UserClaims`). No DTOs are shared between services; each service defines its own internal shapes.

### Auth flow

Login is Google OAuth only, gated to `ALLOWED_EMAIL_DOMAIN` (default `chula.ac.th`, subdomains like `student.chula.ac.th` also accepted):

1. `GET /auth/google` — redirects to Google's OAuth consent screen, with a CSRF `state` token set in an httpOnly cookie.
2. `GET /auth/google/callback` — verifies the `state` cookie, exchanges the code and verifies the ID token's signature via `google-auth-library`, rejects unless the email is verified *and* its domain (or a subdomain of it) matches `ALLOWED_EMAIL_DOMAIN` (the `hd` hint from step 1 alone isn't trusted), finds-or-creates a `UserProfile` by email in `profile-service` (gRPC `ProfileService.OAuthLogin`, internal-only), then signs a JWT and redirects the browser to `${FRONTEND_URL}/?token=<jwt>`.

Requires `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` from Google Cloud Console (APIs & Services → Credentials → OAuth client ID → Web application), with `GOOGLE_CALLBACK_URL` added as an authorized redirect URI — without these, no login path works in this scaffold.

From there:
1. Client sends `Authorization: Bearer <token>` on subsequent requests.
2. `GatewayAuthGuard` verifies the token and injects `x-user-id` / `x-user-role` headers onto the request before it's proxied downstream.
3. Downstream services trust those headers and read them via the `@CurrentUser()` decorator — they never verify JWTs themselves.

Identity mapping: `UserProfile.email` (unique) maps a Google email to its `userId`, created once on first login and reused on every subsequent login for that email — chosen over a deterministic hash so the mapping can change later (email changes, account merges) without breaking existing user IDs.

## Service & Port Map

| Service              | HTTP Port | gRPC Port | Database              |
|-----------------------|-----------|-----------|------------------------|
| web (frontend)         | 5173      | —         | —                      |
| api-gateway            | 3000      | —         | —                      |
| catalog-service        | 3001      | 4001      | `cu_catalog_db`        |
| order-service          | 3002      | 4002      | `cu_order_db`          |
| chat-service            | 3003      | 4003      | `cu_chat_db`           |
| wishlist-service        | 3004      | 4004      | `cu_wishlist_db`       |
| review-service          | 3005      | —         | `cu_review_db`         |
| profile-service         | 3006      | 4006      | `cu_profile_db`        |
| notification-service    | 3007      | 4007      | `cu_notification_db`   |

`review-service` has no gRPC port — it only *calls* other services' internal gRPC endpoints, it doesn't expose any of its own. `profile-service` exposes one gRPC method, `OAuthLogin`, called directly by the gateway (see below) — it doesn't call any other service.

## Repository Structure

```
apps/
  web/                  React + Vite frontend starter
  api-gateway/           Auth (JWT), guards, and proxy controllers for each service
  catalog-service/        Listings, categories, storage adapter
  order-service/          Orders, calls catalog/chat/notification
  chat-service/           Conversations & messages, calls notification
  wishlist-service/       Wishlist items, auto-match, calls catalog/notification
  review-service/         Reviews, calls order/notification
  profile-service/        User profiles; OAuthLogin gRPC method is called directly by the gateway
  notification-service/   Notifications & preferences
libs/
  contracts/              Shared @workspace/contracts package (UserClaims only)
    proto/                 .proto files for every internal gRPC service (shared by server + client sides)
docker-compose.yml        Postgres 16 with 7 isolated databases
init-multiple-dbs.sh       Creates all 7 databases on container init
```

## Setup

### Prerequisites

- Node.js 22.12+ (see `.nvmrc`) — older 22.x builds hit an upstream Prisma bug where its query compiler's ESM runtime file can't be `require()`'d; `require(esm)` only became stable in 22.12
- pnpm
- Docker (for local Postgres)

### 1. Start the database

```bash
docker compose up -d
```

This spins up a single Postgres 16 instance on `localhost:5432` and provisions all 7 service databases via `init-multiple-dbs.sh`.

### 2. Configure environment variables

Copy the repo-root `.env.example` (shared secrets, e.g. `INTERNAL_SERVICE_SECRET`) and each service's own `.env.example` (its local overrides — `DATABASE_URL`, `PORT`, etc.):

```bash
cp .env.example .env
for d in apps/*-service apps/api-gateway; do cp "$d/.env.example" "$d/.env"; done
```

Login only works once you fill in real `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in `apps/api-gateway/.env` — see [Auth flow](#auth-flow) for where to get them.

### 3. Install dependencies

```bash
pnpm install
```

### 4. Build

```bash
pnpm build
```

Runs `turbo run build` across the workspace — builds `@workspace/contracts` first, then all 7 services and the gateway (each running `prisma generate` before compiling), then the web app.

### 5. Run in development

```bash
pnpm dev
```

Starts every app in watch mode via Turborepo. The gateway listens on `:3000`, each service on its assigned port (`3001`–`3007`), and the frontend dev server on `:5173`.

## gRPC

Every internal-only endpoint (blocked from public access at the gateway — reserving/suspending items, cancelling orders, pushing notifications, blocking chat rooms, evaluating wishlist matches, etc.) runs over gRPC instead of REST. Public endpoints that happen to be reused internally (e.g. `GET /items/:id`) stay REST, since browsers can't speak gRPC directly.

- **Proto files**: `libs/contracts/proto/*.proto` — one file per receiving service, shared by both the server and every calling client.
- **Hybrid bootstrap**: each of `catalog`, `order`, `wishlist`, `notification`, `profile` runs an HTTP server (public REST via the gateway) *and* a gRPC server (`app.connectMicroservice(...)` + `app.startAllMicroservices()` in `main.ts`) side by side, on the ports in the table above. `chat-service` and `review-service` are gRPC clients only — they don't expose a gRPC server of their own.
- **Exception — gateway-to-service gRPC**: `profile-service`'s `OAuthLogin` is the one gRPC method called by the gateway itself rather than by another microservice, since it must run before a JWT exists (during the OAuth callback). It was never reachable over HTTP through the public proxy in the first place, so moving it to gRPC removes that surface entirely instead of relying on a path block-list.
- **Auth**: the shared `x-internal-key` secret travels as gRPC metadata instead of an HTTP header. Each gRPC-serving app has its own `GrpcInternalAuthGuard` (`common/guards/grpc-internal-auth.guard.ts`), separate from the HTTP `InternalAuthGuard` — the HTTP guard early-returns on non-HTTP contexts so it doesn't crash when a gRPC call comes in.
- **Client pattern**: `src/clients/*.ts` files inject `ClientGrpc` via a module-level `ClientsModule.register(...)`, resolve the typed service in `onModuleInit()`, and call methods wrapped in `firstValueFrom(...)` — the same shape as the old axios-based clients, so calling code elsewhere didn't need to change.
- **Docs**: `pnpm docs:grpc` (needs `protoc` + `protoc-gen-doc` installed locally) regenerates a single combined HTML doc from all `.proto` files into `libs/contracts/proto/generated/index.html`, served by the gateway at `/api/v1/docs-grpc`. It's a static snapshot — rerun the command after editing any `.proto` file. There's no gRPC server reflection wired in, so live tools (`grpcui`, `grpcurl`, Postman) need the `.proto` file passed in explicitly rather than auto-discovering the schema.

## Notes

- Public/internal-reused endpoints communicate over plain HTTP using the same `src/clients/*.ts` modules; there is no message broker or service mesh in this scaffold.
- `@workspace/contracts` intentionally contains no DTOs — it's a single-file stub (`UserClaims`) so the package builds cleanly. Each service is expected to define its own request/response shapes internally.
- This is a foundational scaffold: business logic, validation, and UI are minimal by design and meant to be built out on top of this structure.
