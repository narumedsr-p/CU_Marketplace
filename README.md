# CU_Marketplace

A Turborepo monorepo scaffold for a campus marketplace platform, built as an API Gateway + REST microservices architecture.

## Architecture

- **API Gateway** — single public entry point. Terminates stateless JWT auth and proxies requests to downstream services over plain HTTP. There is no dedicated Auth Service; the gateway itself issues and verifies tokens.
- **7 core microservices** — each owns a single domain and its own isolated Postgres database (database-per-service). Services never share a schema, and cross-service calls happen over REST via small HTTP client modules (`clients/*.ts`), never direct DB access.
- **Frontend** — a barebones React + Vite starter, not yet wired to any UI/pages.
- **Contracts** — a single shared package (`@workspace/contracts`) exporting only cross-cutting interfaces (e.g. `UserClaims`). No DTOs are shared between services; each service defines its own internal shapes.

### Auth flow

1. Client calls `GET /auth/callback` on the gateway (public route) and receives a signed dummy JWT with mock student claims.
2. Client sends `Authorization: Bearer <token>` on subsequent requests.
3. `GatewayAuthGuard` verifies the token and injects `x-user-id` / `x-user-role` headers onto the request before it's proxied downstream.
4. Downstream services trust those headers and read them via the `@CurrentUser()` decorator — they never verify JWTs themselves.

## Service & Port Map

| Service              | Port | Database              |
|-----------------------|------|------------------------|
| web (frontend)         | 5173 | —                      |
| api-gateway            | 3000 | —                      |
| catalog-service        | 3001 | `cu_catalog_db`        |
| order-service          | 3002 | `cu_order_db`          |
| chat-service            | 3003 | `cu_chat_db`           |
| wishlist-service        | 3004 | `cu_wishlist_db`       |
| review-service          | 3005 | `cu_review_db`         |
| moderation-service      | 3006 | `cu_moderation_db`     |
| notification-service    | 3007 | `cu_notification_db`   |

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
  moderation-service/     Reports, audit logs, calls catalog/order/chat/notification
  notification-service/   Notifications & preferences
libs/
  contracts/              Shared @workspace/contracts package (UserClaims only)
docker-compose.yml        Postgres 16 with 7 isolated databases
init-multiple-dbs.sh       Creates all 7 databases on container init
```

## Setup

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for local Postgres)

### 1. Start the database

```bash
docker compose up -d
```

This spins up a single Postgres 16 instance on `localhost:5432` and provisions all 7 service databases via `init-multiple-dbs.sh`.

### 2. Configure environment variables

Each service has a `.env.example` — copy it to `.env` inside that service's directory:

```bash
for d in apps/*-service; do cp "$d/.env.example" "$d/.env"; done
```

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

## Notes

- Services communicate over plain HTTP using small client modules in `src/clients/`; there is no message broker or service mesh in this scaffold.
- `@workspace/contracts` intentionally contains no DTOs — it's a single-file stub (`UserClaims`) so the package builds cleanly. Each service is expected to define its own request/response shapes internally.
- This is a foundational scaffold: business logic, validation, and UI are minimal by design and meant to be built out on top of this structure.
