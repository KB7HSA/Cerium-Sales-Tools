#!/usr/bin/env bash
# Build frontend + backend and install systemd/nginx on Ubuntu 24.04
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_USER="${APP_USER:-${SUDO_USER:-$USER}}"
APP_DIR="${APP_DIR:-$ROOT_DIR}"
SERVICE_NAME="cerium-backend"
NGINX_SITE="cerium-sales-tools"

if [[ ! -f "$APP_DIR/backend/.env" ]]; then
  echo "Missing $APP_DIR/backend/.env — copy deploy/ubuntu/env.production.example and configure it." >&2
  exit 1
fi

echo "==> Installing npm dependencies"
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && npm ci"
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR/backend' && npm ci"

echo "==> Building frontend (production)"
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && npm run build"

echo "==> Building backend"
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR/backend' && npm run build"

echo "==> Installing systemd service"
install -m 0644 "$APP_DIR/deploy/ubuntu/cerium-backend.service" "/etc/systemd/system/${SERVICE_NAME}.service"
sed -i "s|__APP_DIR__|${APP_DIR}|g" "/etc/systemd/system/${SERVICE_NAME}.service"
sed -i "s|__APP_USER__|${APP_USER}|g" "/etc/systemd/system/${SERVICE_NAME}.service"

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

echo "==> Configuring nginx"
install -m 0644 "$APP_DIR/deploy/ubuntu/nginx-cerium.conf" "/etc/nginx/sites-available/${NGINX_SITE}"
sed -i "s|__APP_DIR__|${APP_DIR}|g" "/etc/nginx/sites-available/${NGINX_SITE}"
ln -sf "/etc/nginx/sites-available/${NGINX_SITE}" "/etc/nginx/sites-enabled/${NGINX_SITE}"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx

echo "==> Deployment complete"
systemctl --no-pager status "$SERVICE_NAME" | head -15
echo
echo "Test: curl http://localhost/api/health"
