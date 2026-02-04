#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/moltbook-v2}"
FRONTEND_DIR="$APP_DIR/frontend"

echo "[moltbook] build frontend -> $FRONTEND_DIR"

cd "$FRONTEND_DIR"

if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

npm run build

echo "[moltbook] frontend built: $FRONTEND_DIR/dist"

