# Deploy

`kind` locally, `k3s` on a real box — same images, same manifests, same
`deploy/secrets.prod.env` on both (so OAuth and everything else stays identical no
matter which cluster you're pointed at). For regular coding, skip all this: `docker
compose up -d` + `pnpm dev` already works, see the root README's
[Setup](../README.md#setup).

## First-time setup (kind)

```bash
./deploy/docker/build-all.sh

kind create cluster
kind load docker-image cu-marketplace/catalog-service:latest cu-marketplace/order-service:latest \
  cu-marketplace/chat-service:latest cu-marketplace/wishlist-service:latest \
  cu-marketplace/review-service:latest cu-marketplace/profile-service:latest \
  cu-marketplace/notification-service:latest cu-marketplace/web:latest

./deploy/apply.sh deploy/secrets.prod.env
kubectl port-forward -n cu-marketplace svc/kong-gateway-proxy 30080:80   # own terminal, keep running
```

No `secrets.prod.env` yet? `cp deploy/secrets.env deploy/secrets.prod.env` and fill in
real values — never commit this file.

Google login: in `deploy/secrets.prod.env` set `GOOGLE_CALLBACK_URL` and
`FRONTEND_URL` to `localhost:30080`, then add
`http://localhost:30080/auth/google/callback` to the OAuth client's Authorized
redirect URIs in Google Cloud Console.

**Create the tables** (first time only, or on a fresh database — skip this and sign-in
fails with `service_unavailable`):

```bash
kubectl port-forward -n cu-marketplace svc/postgres 15432:5432   # another terminal, keep running
```

```bash
export CATALOG_DATABASE_URL="postgresql://postgres:devpassword@127.0.0.1:15432/cu_catalog_db?schema=public"
export ORDER_DATABASE_URL="postgresql://postgres:devpassword@127.0.0.1:15432/cu_order_db?schema=public"
export WISHLIST_DATABASE_URL="postgresql://postgres:devpassword@127.0.0.1:15432/cu_wishlist_db?schema=public"
export REVIEW_DATABASE_URL="postgresql://postgres:devpassword@127.0.0.1:15432/cu_review_db?schema=public"
export PROFILE_DATABASE_URL="postgresql://postgres:devpassword@127.0.0.1:15432/cu_profile_db?schema=public"

for svc in catalog-service order-service wishlist-service review-service profile-service; do
  pnpm --filter "$svc" exec prisma migrate deploy || break
done
```

**Set up Garage** (photo storage, first time only):

```bash
kubectl exec -n cu-marketplace garage-0 -- /garage node id -q
# copy the id before the @, then:
kubectl exec -n cu-marketplace garage-0 -- /garage layout assign -z dc1 -c 2GB <node-id>
kubectl exec -n cu-marketplace garage-0 -- /garage layout apply --version 1
kubectl exec -n cu-marketplace garage-0 -- /garage bucket create cu-marketplace-images
kubectl exec -n cu-marketplace garage-0 -- /garage key import <GARAGE_ACCESS_KEY> <GARAGE_SECRET_KEY> -n catalog-uploader --yes
kubectl exec -n cu-marketplace garage-0 -- /garage bucket allow --read --write cu-marketplace-images --key catalog-uploader
```

`<GARAGE_ACCESS_KEY>`/`<GARAGE_SECRET_KEY>` must match your secrets file exactly
(`GK` + 24 hex chars / 64 hex chars — `openssl rand -hex 12` / `openssl rand -hex 32`).

## k3s (real box)

```bash
curl -sfL https://get.k3s.io | sh -
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

./deploy/docker/build-all.sh
docker save cu-marketplace/catalog-service:latest cu-marketplace/order-service:latest \
  cu-marketplace/chat-service:latest cu-marketplace/wishlist-service:latest \
  cu-marketplace/review-service:latest cu-marketplace/profile-service:latest \
  cu-marketplace/notification-service:latest cu-marketplace/web:latest \
  | sudo k3s ctr images import -

cp deploy/secrets.env deploy/secrets.prod.env   # fill in real passwords/OAuth values, never commit this
./deploy/apply.sh deploy/secrets.prod.env
```

Open NodePort `30080` in the box's firewall. Set `GOOGLE_CALLBACK_URL`/`FRONTEND_URL`
in `secrets.prod.env` to the box's real address, then register the callback URL in
Google Cloud Console same as above. Tables and Garage setup: same commands as kind,
just port-forward to this box instead of localhost. Not yet run against a real EC2 box
— treat as a starting point.

## After a change — what to type

### Only `k8s/*.yaml` or `kong/*.yaml` changed

```bash
./deploy/apply.sh deploy/secrets.prod.env
```

### App code changed (image tag stays `:latest`, so you must reload it yourself)

```bash
./deploy/docker/build-all.sh

# kind:
kind load docker-image cu-marketplace/catalog-service:latest   # whichever service you touched
kubectl rollout restart deployment -n cu-marketplace catalog-service

# k3s:
docker save cu-marketplace/catalog-service:latest | sudo k3s ctr images import -
kubectl rollout restart deployment -n cu-marketplace catalog-service
```

Touched more than one service (e.g. the shared `contracts` package)? `build-all.sh`
already rebuilt all 8 images — load/import and restart all of them the same way, then
restart everything at once instead of one at a time:

```bash
kubectl rollout restart deployment -n cu-marketplace \
  catalog-service order-service chat-service wishlist-service \
  review-service profile-service notification-service web
```

### `secrets.prod.env` changed

Pods only read secrets at startup, so update the Secret, then restart everything that
reads it:

```bash
./deploy/apply.sh deploy/secrets.prod.env

kubectl rollout restart deployment -n cu-marketplace \
  catalog-service order-service chat-service wishlist-service \
  review-service profile-service notification-service kong-gateway
```

`web` is left out on purpose — it doesn't read `app-secrets`. Changing `JWT_SECRET`
logs everyone out (every old token stops working). Changing `GOOGLE_CALLBACK_URL`
needs a matching update in Google Cloud Console too; `FRONTEND_URL` doesn't.

## Seed demo data

```bash
kubectl exec -i -n cu-marketplace postgres-0 -- psql -U postgres < scripts/dev-seed.sql
```

Safe to run anytime, as many times as you want — every insert is `ON CONFLICT DO
NOTHING`. Wait until every pod shows `Running` (`kubectl get pods -n cu-marketplace`)
first. Only regenerate the file (`node scripts/generate-seed.mjs`) if you actually want
different demo data — it's deterministic, so a plain re-run produces the same file.
