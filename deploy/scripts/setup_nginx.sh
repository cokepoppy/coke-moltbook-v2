#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  echo "usage: $0 <domain>"
  exit 1
fi

APP_DIR="${APP_DIR:-/opt/moltbook-v2}"
FRONTEND_DIST="$APP_DIR/frontend/dist"
API_UPSTREAM_PORT="${API_UPSTREAM_PORT:-3030}"

CONF_AVAIL="/etc/nginx/sites-available/moltbook_${DOMAIN}.conf"
CONF_ENABLED="/etc/nginx/sites-enabled/moltbook_${DOMAIN}.conf"

if [[ ! -d "$FRONTEND_DIST" ]]; then
  echo "[nginx] missing frontend dist: $FRONTEND_DIST"
  echo "[nginx] run: bash deploy/scripts/build_frontend.sh"
  exit 1
fi

echo "[nginx] writing $CONF_AVAIL"
cat >"$CONF_AVAIL" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    access_log /var/log/nginx/${DOMAIN}.access.log;
    error_log  /var/log/nginx/${DOMAIN}.error.log;

    root ${FRONTEND_DIST};
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:${API_UPSTREAM_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

ln -sf "$CONF_AVAIL" "$CONF_ENABLED"

nginx -t
systemctl reload nginx

echo "[nginx] http configured for ${DOMAIN}"
echo "[nginx] (optional) issue https: bash deploy/scripts/issue_certbot.sh ${DOMAIN}"

