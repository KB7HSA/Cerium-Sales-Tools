#!/usr/bin/env bash
# Verify MSAL redirectUri baked into the frontend matches .env APP_URL.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

require_docker
load_app_env

PORT="${HTTP_PORT:-80}"
BASE="http://127.0.0.1:${PORT}"
if [[ -f "${PROJECT_ROOT}/deploy/ssl/server.crt" ]]; then
  BASE="https://127.0.0.1"
fi

log "=== MSAL / Azure AD redirect URI check ==="
echo

log ".env APP_URL:              ${APP_URL}"
log ".env AZURE_AD_CLIENT_ID:   ${AZURE_AD_CLIENT_ID:-MISSING}"
log ".env AZURE_AD_TENANT_ID:   ${AZURE_AD_TENANT_ID:-MISSING}"
echo

if [[ ! "${APP_URL}" =~ ^https?:// ]]; then
  warn "APP_URL is not an absolute URL — MSAL will fail with AADSTS90102"
fi

html="$(curl -ksS "${BASE}/")"
main_js="$(printf '%s' "${html}" | grep -oE 'src="main-[^"]+\.js"' | head -1 | cut -d'"' -f2 || true)"
if [[ -z "${main_js}" ]]; then
  die "Could not find main-*.js in index.html"
fi

bundle="$(curl -ksS "${BASE}/${main_js}")"
# Minified bundle stores redirectUri near clientId
baked_uri="$(printf '%s' "${bundle}" | grep -oE 'redirectUri:"[^"]*"' | head -1 | cut -d'"' -f2 || true)"
baked_client="$(printf '%s' "${bundle}" | grep -oE 'clientId:"[0-9a-f-]{36}"' | head -1 | cut -d'"' -f2 || true)"

if [[ -z "${baked_uri}" ]]; then
  warn "Could not find redirectUri in ${main_js}"
  warn "Rebuild frontend: docker compose build --no-cache frontend"
else
  log "Baked redirectUri:       ${baked_uri}"
  if [[ "${baked_uri}" == "${APP_URL}" ]]; then
    log "redirectUri matches .env APP_URL"
  else
    warn "MISMATCH: baked redirectUri != .env APP_URL"
    warn "Rebuild: docker compose build --no-cache frontend --build-arg APP_URL=${APP_URL}"
  fi
  if [[ ! "${baked_uri}" =~ ^https?:// ]]; then
    warn "Baked redirectUri is not a valid absolute URL (causes AADSTS90102)"
  fi
fi

if [[ -n "${baked_client}" && -n "${AZURE_AD_CLIENT_ID:-}" && "${baked_client}" != "${AZURE_AD_CLIENT_ID}" ]]; then
  warn "Baked clientId differs from .env — rebuild frontend after updating Azure IDs"
fi

echo
log "Azure Portal checklist:"
log "  1. App registration → Authentication → Platform: Single-page application"
log "  2. Redirect URI must exactly match: ${APP_URL}"
log "  3. No trailing slash unless APP_URL includes one"
log "  4. Use https:// when browsing the app (required for MSAL on non-localhost)"
echo
log "=== end check ==="
