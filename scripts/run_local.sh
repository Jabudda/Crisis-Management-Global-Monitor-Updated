#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

command -v python3 >/dev/null 2>&1 || { echo "python3 not found"; exit 1; }

: "${PROXY_PORT:=8001}"
: "${STATIC_PORT:=8000}"
: "${PROXY_ENABLED:=0}"


echo "Starting local proxy on port $PROXY_PORT..."
python3 scraper/proxy_server.py "$PROXY_PORT" &
PROXY_PID=$!

echo "Starting static server (repo root) on port $STATIC_PORT..."
python3 -m http.server "$STATIC_PORT" --bind 127.0.0.1 &
STATIC_PID=$!

cleanup() {
  printf "\nShutting down servers...\n"
  if [[ -n "$PROXY_PID" ]]; then
    kill "$PROXY_PID" 2>/dev/null || true
    wait "$PROXY_PID" 2>/dev/null || true
  fi
  kill "$STATIC_PID" 2>/dev/null || true
  wait "$STATIC_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo ""
echo "Proxy:  http://localhost:$PROXY_PORT (health: /health)"
echo "Site:   http://localhost:$STATIC_PORT/docs/" 
echo "Press Ctrl-C to stop both servers."

# Block until either process exits or Ctrl-C
wait
