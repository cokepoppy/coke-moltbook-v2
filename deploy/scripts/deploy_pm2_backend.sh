#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/moltbook-v2}"
BACKEND_DIR="$APP_DIR/backend"
API_DIR="$BACKEND_DIR/apps/api"
PM2_NAME="${PM2_NAME:-moltbook-api}"
PORT="${PORT:-3030}"

echo "[moltbook] deploy backend -> $BACKEND_DIR (pm2: $PM2_NAME, port: $PORT)"

has_cmd() { command -v "$1" >/dev/null 2>&1; }

if ! has_cmd node; then
  echo "[moltbook] node is required"
  exit 1
fi

if ! has_cmd pnpm; then
  echo "[moltbook] pnpm missing; installing pnpm@8.15.5 globally"
  npm i -g pnpm@8.15.5
fi

cd "$BACKEND_DIR"
pnpm install

if [[ ! -f "$API_DIR/.env" ]]; then
  echo "[moltbook] creating $API_DIR/.env (edit DB creds if needed)"
  cp "$API_DIR/.env.example" "$API_DIR/.env"
  # Safe defaults for VPS
  sed -i \
    -e "s/^PORT=.*/PORT=$PORT/" \
    -e "s/^DB_HOST=.*/DB_HOST=127.0.0.1/" \
    -e "s/^DB_PORT=.*/DB_PORT=3306/" \
    "$API_DIR/.env" || true
  {
    echo ""
    echo "# production extras"
    echo "PUBLIC_BASE_URL=https://moltbook.coke-twitter.com"
    echo "CORS_ORIGINS=https://moltbook.coke-twitter.com"
    echo "ALLOWED_HOSTS=moltbook.coke-twitter.com,localhost:$PORT,127.0.0.1:$PORT"
    echo ""
    echo "# IMPORTANT: set a strong pepper (>=16 chars)"
    echo "API_KEY_PEPPER=change-me-in-production-please"
  } >>"$API_DIR/.env"
fi

echo "[moltbook] building backend"
pnpm --filter @moltbook/shared build
pnpm --filter @moltbook/api build

echo "[moltbook] migrating db (requires MySQL creds in $API_DIR/.env)"
pnpm --filter @moltbook/api db:migrate

echo "[moltbook] starting pm2 process: $PM2_NAME"
pm2 describe "$PM2_NAME" >/dev/null 2>&1 && pm2 delete "$PM2_NAME" || true
pm2 start "$API_DIR/dist/index.js" --name "$PM2_NAME" --cwd "$API_DIR" --time
pm2 save

echo "[moltbook] done"

