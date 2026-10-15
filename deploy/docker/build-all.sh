#!/bin/bash
set -e
cd "$(dirname "$0")/../.."

TAG="${1:-latest}"

for svc in catalog-service order-service chat-service wishlist-service review-service profile-service notification-service; do
  docker build -f deploy/docker/Dockerfile.service --build-arg APP_NAME="$svc" -t "cu-marketplace/$svc:$TAG" .
done
docker build -f deploy/docker/Dockerfile.web -t "cu-marketplace/web:$TAG" .
