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

log ".env APP_URL:                ${APP_URL}"
log "Expected MSAL redirectUri:    ${MSAL_REDIRECT_URI}"
log "Expected post-logout URI:   ${APP_URL}/signin"
log ".env AZURE_AD_CLIENT_ID:     ${AZURE_AD_CLIENT_ID:-MISSING}"
log ".env AZURE_AD_TENANT_ID:     ${AZURE_AD_TENANT_ID:-MISSING}"
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
baked_uri="$(printf '%s' "${bundle}" | grep -oE 'redirectUri:"[^"]*"' | head -1 | cut -d'"' -f2 || true)"
baked_logout="$(printf '%s' "${bundle}" | grep -oE 'postLogoutRedirectUri:"[^"]*"' | head -1 | cut -d'"' -f2 || true)"
baked_client="$(printf '%s' "${bundle}" | grep -oE 'clientId:"[0-9a-f-]{36}"' | head -1 | cut -d'"' -f2 || true)"

if [[ -z "${baked_uri}" ]]; then
  warn "Could not find redirectUri in ${main_js}"
  warn "Rebuild frontend: docker compose build --no-cache frontend"
else
  log "Baked redirectUri:         ${baked_uri}"
  if [[ "${baked_uri}" == "${MSAL_REDIRECT_URI}" ]]; then
    log "redirectUri matches expected value"
  elif [[ "${baked_uri}" == "${APP_URL}" ]]; then
    warn "redirectUri is APP_URL root — update Azure AD to use ${MSAL_REDIRECT_URI} and rebuild"
  else
    warn "MISMATCH: baked redirectUri != expected ${MSAL_REDIRECT_URI}"
    warn "Rebuild: docker compose build --no-cache frontend"
  fi
  if [[ ! "${baked_uri}" =~ ^https?:// ]]; then
    warn "Baked redirectUri is not a valid absolute URL (causes AADSTS90102)"
  fi
fi

if [[ -n "${baked_logout}" ]]; then
  log "Baked postLogoutRedirectUri: ${baked_logout}"
fi

if [[ -n "${baked_client}" && -n "${AZURE_AD_CLIENT_ID:-}" && "${baked_client}" != "${AZURE_AD_CLIENT_ID}" ]]; then
  warn "Baked clientId differs from .env — rebuild frontend after updating Azure IDs"
fi

echo
log "Azure Portal → App registration → Authentication → SPA platform:"
log "  Redirect URI (login):     ${MSAL_REDIRECT_URI}"
log "  Redirect URI (logout):    ${APP_URL}/signin  (optional)"
log "  Platform must be SPA, not Web"
log "  Client ID must match:     ${AZURE_AD_CLIENT_ID:-<set in .env>}"
echo
log "Browser test URL: ${APP_URL}/signin"
echo
log "=== end check ==="
