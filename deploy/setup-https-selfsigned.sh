#!/usr/bin/env bash
# Generate a self-signed TLS cert and enable HTTPS for MSAL (required over http://IP).
#
# Browsers will show a certificate warning — acceptable for lab/VPN. For production
# use a real domain with Let's Encrypt (certbot).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

SSL_DIR="${SCRIPT_DIR}/ssl"
HOST=""

usage() {
  cat <<'EOF'
Usage: ./deploy/setup-https-selfsigned.sh [options]

MSAL.js requires HTTPS when the app is not served from localhost.
This script creates a self-signed certificate and switches nginx to HTTPS.

Options:
  --host HOST   IP or hostname (default: host from APP_URL in .env)
  -h, --help    Show this help

After running:
  1. Rebuild frontend: docker compose build --no-cache frontend
  2. Restart stack:    docker compose up -d
  3. Open https://HOST/ (accept browser cert warning)
  4. Add https://HOST as SPA redirect URI in Azure AD
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown option: $1" ;;
  esac
done

[[ -f "${PROJECT_ROOT}/.env" ]] || die "Missing .env — run ./deploy/setup-env.sh first"
load_env

if [[ -z "${HOST}" ]]; then
  HOST="$(printf '%s' "${APP_URL:-}" | sed -E 's#^https?://##' | cut -d/ -f1 | cut -d: -f1)"
fi
[[ -n "${HOST}" ]] || die "Could not determine host — pass --host YOUR_IP"

mkdir -p "${SSL_DIR}"
chmod 700 "${SSL_DIR}"

log "Generating self-signed certificate for: ${HOST}"

OPENSSL_CNF="$(mktemp)"
cat > "${OPENSSL_CNF}" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
CN = ${HOST}

[v3_req]
subjectAltName = @alt_names

[alt_names]
EOF

if [[ "${HOST}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "IP.1 = ${HOST}" >> "${OPENSSL_CNF}"
else
  echo "DNS.1 = ${HOST}" >> "${OPENSSL_CNF}"
fi

openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout "${SSL_DIR}/server.key" \
  -out "${SSL_DIR}/server.crt" \
  -config "${OPENSSL_CNF}" -extensions v3_req
rm -f "${OPENSSL_CNF}"
chmod 600 "${SSL_DIR}/server.key" "${SSL_DIR}/server.crt"

# Point compose at HTTPS nginx config
if grep -q '^NGINX_CONF=' "${PROJECT_ROOT}/.env" 2>/dev/null; then
  sed -i "s|^NGINX_CONF=.*|NGINX_CONF=./deploy/nginx-https.conf|" "${PROJECT_ROOT}/.env"
else
  printf '\nNGINX_CONF=./deploy/nginx-https.conf\n' >> "${PROJECT_ROOT}/.env"
fi

# Update APP_URL to https
NEW_APP_URL="https://${HOST}"
if [[ "${HTTP_PORT:-80}" != "80" ]]; then
  NEW_APP_URL="https://${HOST}:${HTTP_PORT}"
fi

if grep -q '^APP_URL=' "${PROJECT_ROOT}/.env"; then
  set_env_value "${PROJECT_ROOT}/.env" APP_URL "${NEW_APP_URL}"
else
  printf 'APP_URL=%s\n' "${NEW_APP_URL}" >> "${PROJECT_ROOT}/.env"
fi

if ! grep -q '^HTTPS_PORT=' "${PROJECT_ROOT}/.env"; then
  printf 'HTTPS_PORT=443\n' >> "${PROJECT_ROOT}/.env"
fi

log "Certificate written to ${SSL_DIR}/"
log "Updated APP_URL to ${NEW_APP_URL}"
log ""
log "Next steps:"
log "  1. sudo ufw allow 443/tcp   # if using UFW"
log "  2. docker compose build --no-cache frontend --build-arg APP_URL=${NEW_APP_URL}"
log "  3. docker compose up -d"
log "  4. Open ${NEW_APP_URL}/signin (accept self-signed cert warning)"
log "  5. Azure AD → App registration → add SPA redirect URI: ${NEW_APP_URL}"
