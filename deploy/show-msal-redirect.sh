#!/usr/bin/env bash
# Show where MSAL redirectUri is stored in the running frontend container.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

require_docker
load_app_env

log "=== MSAL redirectUri storage locations ==="
echo

log "1) Runtime .env (used at docker compose BUILD time only — NOT read when users load the page):"
log "   ${PROJECT_ROOT}/.env"
log "   APP_URL=${APP_URL}"
log "   Expected baked redirectUri: ${MSAL_REDIRECT_URI}"
echo

log "2) Inside the running frontend container (what browsers actually get):"
log "   /usr/share/nginx/html/main-*.js  (compiled Angular + MSAL config)"
log "   /usr/share/nginx/html/index.html (links to main-*.js)"
echo

if ! compose ps frontend 2>/dev/null | grep -q 'Up'; then
  warn "frontend container is not running"
  exit 1
fi

main_file="$(compose exec -T frontend sh -c 'ls /usr/share/nginx/html/main-*.js 2>/dev/null | head -1' || true)"
if [[ -z "${main_file}" ]]; then
  die "No main-*.js found in frontend container — image may be broken"
fi

log "3) Main bundle in container: ${main_file}"
compose exec -T frontend sh -c "grep -oE 'redirectUri:\"[^\"]*\"' ${main_file} | sort -u" 2>/dev/null | while read -r line; do
  log "   ${line}"
done

echo
log "4) Image build metadata (when frontend image was created):"
docker inspect "$(compose images -q frontend 2>/dev/null | head -1)" --format 'Created: {{.Created}}' 2>/dev/null || true

echo
log "If the only redirectUri is redirectUri:\"\" or your IP/URL is missing:"
log "  docker compose build --no-cache frontend \\"
log "    --build-arg APP_URL=${APP_URL} \\"
log "    --build-arg AZURE_AD_CLIENT_ID=${AZURE_AD_CLIENT_ID} \\"
log "    --build-arg AZURE_AD_TENANT_ID=${AZURE_AD_TENANT_ID}"
log "  docker compose up -d frontend"
echo
log "=== end ==="
