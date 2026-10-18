#!/usr/bin/env bash
# End-to-end run against the production standalone build, on a throwaway copy of the data.
# Works under Git Bash on Windows and on Linux.
#
# Usage (from anywhere):  bash scripts/test/run-e2e.sh
#   PORT=3217 is the default; override with PORT=NNNN.
# Requires: .next/standalone/server.js (npm run build; on Windows: npx next build --webpack)

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT" || exit 1

PORT="${PORT:-3217}"
case "$PORT" in
  ''|*[!0-9]*) echo "PORT must be numeric, got: $PORT"; exit 1 ;;
esac

IS_WINDOWS=0
case "$(uname -s 2>/dev/null)" in
  MINGW*|MSYS*|CYGWIN*) IS_WINDOWS=1 ;;
esac

# Convert a POSIX path to a Windows path when cygpath exists (node on Windows needs it).
winpath() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$1"
  else
    printf '%s' "$1"
  fi
}

port_in_use() {
  (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null
}

# PIDs holding a LISTENING socket on $PORT (Windows netstat only).
listening_pids() {
  command -v netstat >/dev/null 2>&1 || return 0
  netstat -ano 2>/dev/null | tr -d '\r' \
    | grep -E "[:.]${PORT}[[:space:]]" | grep -i "LISTENING" \
    | awk '{print $NF}' | sort -u
}

STANDALONE="$ROOT/.next/standalone"
if [ ! -f "$STANDALONE/server.js" ]; then
  echo "standalone build missing: $STANDALONE/server.js"
  echo "run the production build first (npm run build; on Windows use npx next build --webpack)"
  exit 1
fi

if port_in_use; then
  echo "something already listens on port $PORT; refusing to start (stop it yourself, then re-run)"
  exit 1
fi

TMP="$(mktemp -d)"
SERVER_PID=""
E2E_RC=1

cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null
    sleep 2
  fi
  if [ "$IS_WINDOWS" = "1" ]; then
    for p in $(listening_pids); do
      echo "port $PORT still held by PID $p after kill; taskkill"
      taskkill //PID "$p" //F >/dev/null 2>&1
    done
    if [ -n "$(listening_pids)" ]; then
      echo "WARNING: something still listens on port $PORT"
    fi
  fi
  rm -rf "$TMP"
}
trap cleanup EXIT

# Fresh copy of the data, minus the real outbox log.
mkdir -p "$TMP/data"
cp -r "$ROOT/data/." "$TMP/data/" || { echo "failed to copy site/data"; exit 1; }
rm -f "$TMP/data/outbox.log"
DATA_DIR_PATH="$(winpath "$TMP/data")"

# Throwaway credentials, never printed.
ADMIN_PW="$(node -e 'process.stdout.write(require("crypto").randomBytes(12).toString("hex"))')"
printf '%s' "$ADMIN_PW" > "$TMP/pw.txt"
# Same format as hashPassword in lib/crypto.ts: salt hex, then scrypt(pw, saltHex, 64) hex.
ADMIN_HASH="$(TEST_PW="$ADMIN_PW" node -e '
const c = require("crypto");
const salt = c.randomBytes(16).toString("hex");
process.stdout.write(salt + ":" + c.scryptSync(process.env.TEST_PW, salt, 64).toString("hex"));
')"
SESSION_SECRET_VAL="$(node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))')"
unset ADMIN_PW

# Assets the standalone server serves from its own folder.
if [ ! -d "$STANDALONE/.next/static" ]; then
  mkdir -p "$STANDALONE/.next"
  cp -r "$ROOT/.next/static" "$STANDALONE/.next/static" || exit 1
fi
if [ ! -d "$STANDALONE/public" ]; then
  cp -r "$ROOT/public" "$STANDALONE/public" || exit 1
fi

export DATA_DIR="$DATA_DIR_PATH"
export NOTIFY_MODE=dry
export ADMIN_HOST="127.0.0.1:${PORT}"
export ADMIN_USER=owner
export OWNER_PHONE="+12015550142"
export SITE_URL="http://localhost:${PORT}"
export ADMIN_PASSWORD_HASH="$ADMIN_HASH"
export SESSION_SECRET="$SESSION_SECRET_VAL"

echo "starting standalone server on port $PORT"
PORT="$PORT" HOSTNAME=0.0.0.0 node "$STANDALONE/server.js" > "$TMP/server.log" 2>&1 &
SERVER_PID=$!

READY=0
for _ in $(seq 1 80); do
  if curl -sf -o /dev/null "http://localhost:${PORT}/robots.txt"; then
    READY=1
    break
  fi
  sleep 1
done
if [ "$READY" != "1" ]; then
  echo "server did not answer http://localhost:${PORT}/robots.txt within 80s; server log tail:"
  tail -30 "$TMP/server.log"
  exit 1
fi
echo "server is up"

BASE_URL="http://localhost:${PORT}" \
ADMIN_URL="http://127.0.0.1:${PORT}" \
ADMIN_PW_FILE="$(winpath "$TMP/pw.txt")" \
DATA_DIR="$DATA_DIR_PATH" \
SHOTS="$(winpath "$TMP/shots")" \
node scripts/test/e2e.cjs
E2E_RC=$?

echo "e2e exit code: $E2E_RC"
exit "$E2E_RC"
