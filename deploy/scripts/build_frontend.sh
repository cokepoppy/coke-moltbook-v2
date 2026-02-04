#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/moltbook-v2}"
FRONTEND_DIR="$APP_DIR/frontend"

echo "[moltbook] build frontend -> $FRONTEND_DIR"

umask 022

cd "$FRONTEND_DIR"

if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

npm run build

if [[ -d "$FRONTEND_DIR/dist" ]]; then
  find "$FRONTEND_DIR/dist" -type d -exec chmod 755 {} + || true
  find "$FRONTEND_DIR/dist" -type f -exec chmod 644 {} + || true
fi

echo "[moltbook] frontend built: $FRONTEND_DIR/dist"
