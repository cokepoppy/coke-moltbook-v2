#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  echo "usage: $0 <domain>"
  exit 1
fi

if ! command -v certbot >/dev/null 2>&1; then
  echo "[certbot] certbot not found"
  exit 1
fi

echo "[certbot] issuing certificate for ${DOMAIN}"
certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --register-unsafely-without-email

nginx -t
systemctl reload nginx

echo "[certbot] done"

