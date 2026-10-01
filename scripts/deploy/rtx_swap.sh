#!/usr/bin/env bash
# Rollback-safe ChipKili container swap on the RTX (production). Usage: rtx_swap.sh v2
# Build first:  cd /mnt/d/aigade-prod/chipkili/src && docker build -t chipkili:<tag> .
set -euo pipefail
TAG="${1:?usage: rtx_swap.sh <image tag, e.g. v2>}"
ROOT=/mnt/d/aigade-prod/chipkili
docker image inspect "chipkili:${TAG}" >/dev/null
PREV=$(docker inspect chipkili --format '{{.Config.Image}}' 2>/dev/null || echo none)
echo "previous: ${PREV} -> chipkili:${TAG}"
docker stop chipkili >/dev/null 2>&1 || true
docker rm chipkili >/dev/null 2>&1 || true
chmod -R a+rwX "${ROOT}/data"  # the container user must be able to write data on the D: drive
docker run -d --name chipkili --restart unless-stopped --network aigade_prod \
  --env-file "${ROOT}/.env.prod" -v "${ROOT}/data:/data" \
  -l traefik.enable=true \
  -l traefik.http.routers.chipkili.entrypoints=web \
  -l 'traefik.http.routers.chipkili.rule=Host(`chipkili.com`) || Host(`www.chipkili.com`) || Host(`admin.chipkili.com`)' \
  -l traefik.http.services.chipkili.loadbalancer.server.port=3000 \
  "chipkili:${TAG}" >/dev/null
sleep 6
docker ps --format '{{.Names}} {{.Image}} {{.Status}}' | grep '^chipkili ' || { echo "container not up - roll back with: $0 ${PREV#chipkili:}"; exit 1; }
