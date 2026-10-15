#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -z "$1" ]; then
  CONTEXT="$(kubectl config current-context 2>/dev/null || echo "")"
  case "$CONTEXT" in
    kind-*) ;;
    *)
      echo "error: no secrets file given, and the current kubectl context ('$CONTEXT') doesn't look like a local kind cluster." >&2
      echo "Pass one explicitly so dev secrets never end up on a real deployment, e.g.:" >&2
      echo "  ./deploy/apply.sh deploy/secrets.prod.env" >&2
      exit 1
      ;;
  esac
fi

ENV_FILE="${1:-$SCRIPT_DIR/secrets.env}"
case "$ENV_FILE" in
  /*) ;;
  *) ENV_FILE="$(pwd)/$ENV_FILE" ;;
esac

cd "$SCRIPT_DIR"
set -a
source "$ENV_FILE"
set +a

envsubst < k8s/setup-dev.yaml | kubectl apply -f -
for f in k8s/*.yaml; do
  [ "$(basename "$f")" = "setup-dev.yaml" ] && continue
  envsubst < "$f" | kubectl apply -f -
done

helm repo add kong https://charts.konghq.com >/dev/null 2>&1 || true
helm repo update kong >/dev/null
helm upgrade --install kong kong/ingress -n cu-marketplace -f kong/values.yaml

envsubst < kong/kong.yaml | kubectl apply -f -
