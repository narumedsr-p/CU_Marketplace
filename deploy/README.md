# Deploy

Runs CU Marketplace on Kubernetes behind Kong Ingress, replacing the old hand-rolled
`api-gateway`. See the migration plan for why; this file just covers how to run it.

This is for testing the real deployment (kind locally, k3s on EC2), not day-to-day coding.
For that, `docker compose up -d` + `pnpm dev` already includes a plain Kong container
(config in `deploy/kong/local.yml`) with the same auth setup, no k8s or Docker builds of
the app images required; see the root README's [Setup](../README.md#setup).

## Layout

```
deploy/
  docker/      Dockerfiles (shared across all 7 NestJS services + one for the web frontend)
  k8s/         Deployment + Service per app, plus Postgres/Mongo/RabbitMQ as StatefulSets (with PVCs)
  kong/        Helm values + Kong's routing/auth config (Ingress, jwt plugin, consumer)
  secrets.env  The one file every secret value comes from
  apply.sh     Fills in secrets.env and applies everything, in the right order
```

Postgres, Mongo, and RabbitMQ run inside k8s, backed by PersistentVolumeClaims, so data
survives pod restarts. The same manifests run on a local `kind` cluster and on `k3s` (the
EC2 target); only `secrets.env` changes between the two.

Every secret value (JWT secret, DB passwords, Google OAuth credentials) lives in
`secrets.env` exactly once. `deploy/k8s/setup-dev.yaml` and `deploy/kong/kong.yaml` both
reference the same values (`${JWT_SECRET}`, `${POSTGRES_PASSWORD}`, and so on) instead of
hardcoding them twice, since Kong's JWT credential has to match whatever `profile-service`
signs tokens with. `apply.sh` fills those placeholders in with `envsubst` before calling
`kubectl apply`, so the values only ever get typed once.

`apply.sh` only falls back to `secrets.env` when the current kubectl context looks like a
local `kind` cluster (its name starts with `kind-`). Anywhere else, it refuses to run unless
you pass a secrets file explicitly, so dev placeholders can't end up on a real deployment
just because someone forgot the argument.

For day-to-day coding without a cluster, `docker compose up -d` + `pnpm dev` still works
as before.

## Running it locally with kind

### 1. Build the images

Run this from the repo root: turbo prune needs the full workspace as build context.

```bash
./deploy/docker/build-all.sh
```

That builds all 7 services plus the web image in one go (tagged `:latest` by default; pass
a different tag as the first argument, e.g. `./deploy/docker/build-all.sh v1.2.3`). To build
a single service by hand instead:

```bash
docker build -f deploy/docker/Dockerfile.service --build-arg APP_NAME=catalog-service -t cu-marketplace/catalog-service:latest .
```

`:latest` is a placeholder. Once there's a real CI/registry pipeline on ECR, tag each build
properly (the git SHA works well) and update the `image:` lines in `deploy/k8s/*.yaml` to
match.

### 2. Create the cluster and deploy

```bash
kind create cluster
kind load docker-image cu-marketplace/catalog-service:latest cu-marketplace/order-service:latest \
  cu-marketplace/chat-service:latest cu-marketplace/wishlist-service:latest \
  cu-marketplace/review-service:latest cu-marketplace/profile-service:latest \
  cu-marketplace/notification-service:latest cu-marketplace/web:latest

./deploy/apply.sh
```

`apply.sh` reads `deploy/secrets.env`, substitutes those values into
`deploy/k8s/setup-dev.yaml` and `deploy/kong/kong.yaml`, and applies everything in order:
the namespace and Secret first, then Postgres/Mongo/RabbitMQ (StatefulSets) and the 8 app
Deployments, then the Kong Helm install, then Kong's routing and auth config.

Kong's proxy listens on NodePort `30080` (see `values.yaml`). `kind` doesn't expose
NodePorts to the host on its own, so port-forward it in a separate terminal:

```bash
kubectl port-forward -n cu-marketplace svc/kong-gateway-proxy 30080:80
```

Leave that running; it's what makes `localhost:30080` reachable below.

### 3. Verify the auth design

```bash
# No token -> Kong's jwt plugin rejects it before the request ever reaches catalog-service
curl -i http://localhost:30080/api/v1/catalog/anything        # expect 401

# A valid token (signed with the JWT_SECRET/JWT_ISSUER from deploy/secrets.env)
# passes Kong and reaches catalog-service with X-User-Id/X-User-Role/X-Internal-Key set
curl -i http://localhost:30080/api/v1/catalog/anything -H "Authorization: Bearer <token>"
```

## Deploying to EC2

The images, manifests, and Helm install don't change; only the cluster and the secrets do.
Run `k3s` instead of `kind`, and make a real, untracked copy of `secrets.env` (never commit
it) with real passwords, a real `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, and real callback
and frontend URLs. `apply.sh` takes that file as an optional argument. `k3s` ships with the
`local-path` StorageClass by default, which is enough for the PVCs; no external volume
provisioner is needed.

On the EC2 instance:

```bash
# install k3s (single node is enough for this setup)
curl -sfL https://get.k3s.io | sh -
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# build directly on the instance for now (swap for a registry pull once there's a
# real CI/registry pipeline on ECR, see the build step above)
./deploy/docker/build-all.sh

cp deploy/secrets.env deploy/secrets.prod.env   # fill this in with real values, don't commit it
./deploy/apply.sh deploy/secrets.prod.env
```

Then open Kong's NodePort (`30080`, see `values.yaml`) in the EC2 instance's security
group so traffic can reach it from outside.

This sequence hasn't been run against a real EC2 instance yet; treat it as a starting point
and adjust if something doesn't match your instance's setup.

## Redeploying after a change

`apply.sh` covers config changes: edit anything in `k8s/` or `kong/` and rerun it.
`kubectl apply` and `helm upgrade --install` only touch what actually changed.

Code changes need more than that. The image tag stays `:latest`, so the Deployment's YAML
never changes text, and `kubectl apply` sees no diff to act on, even after you rebuild the
image with new code inside it. Rebuild, reload the image into the cluster, and restart the
pod by hand:

```bash
./deploy/docker/build-all.sh
kind load docker-image cu-marketplace/catalog-service:latest
kubectl rollout restart deployment -n cu-marketplace catalog-service
```

Swap in whichever service you actually changed. Running `./deploy/apply.sh` afterward
doesn't hurt, but it won't do this part for you.

To redeploy every service at once instead of picking one:

```bash
./deploy/docker/build-all.sh

kind load docker-image cu-marketplace/catalog-service:latest cu-marketplace/order-service:latest \
  cu-marketplace/chat-service:latest cu-marketplace/wishlist-service:latest \
  cu-marketplace/review-service:latest cu-marketplace/profile-service:latest \
  cu-marketplace/notification-service:latest cu-marketplace/web:latest

kubectl rollout restart deployment -n cu-marketplace \
  catalog-service order-service chat-service wishlist-service \
  review-service profile-service notification-service web
```

That list leaves out Postgres, Mongo, and RabbitMQ on purpose: their code never changes,
so there's nothing in them to redeploy.

## Status

`Dockerfile.service` is validated: it built and ran `profile-service` standalone.
Everything else is still pending: building the other six service images, standing up a kind
cluster, and installing Kong. The host ran out of disk space mid-build, and Docker Desktop
needs that fixed before any of this can be tested.
