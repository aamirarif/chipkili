#!/usr/bin/env bash
# Rollback-safe ChipKili swap on the VPS failover MIRROR. Usage: vps_swap.sh v2
# Routing: /opt/aigade/traefik/dynamic/chipkili.yml (file provider) + VPS tunnel hostnames (used only during failover).
set -euo pipefail
TAG="${1:?usage: vps_swap.sh <image tag, e.g. v2>}"
ROOT=/opt/chipkili
docker image inspect "chipkili:${TAG}" >/dev/null
PREV=$(docker inspect chipkili --format '{{.Config.Image}}' 2>/dev/null || echo none)
echo "previous: ${PREV} -> chipkili:${TAG}"
docker stop chipkili >/dev/null 2>&1 || true
docker rm chipkili >/dev/null 2>&1 || true
chmod -R a+rwX "${ROOT}/data"
docker run -d --name chipkili --restart unless-stopped --network traefik_traefik_default \
  --env-file "${ROOT}/.env.prod" -v "${ROOT}/data:/data" "chipkili:${TAG}" >/dev/null
sleep 6
docker ps --format '{{.Names}} {{.Image}} {{.Status}}' | grep '^chipkili ' || { echo "container not up - roll back with: $0 ${PREV#chipkili:}"; exit 1; }
