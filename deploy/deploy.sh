#!/usr/bin/env bash
# Main deployment script for Ubuntu 24.04.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

INSTALL_DOCKER=false
SKIP_BUILD=false
INIT_DB=true
STOP_ONLY=false

usage() {
  cat <<'EOF'
Cerium Sales Tools — Ubuntu 24.04 deployment

Usage: ./deploy/deploy.sh [options]

Options:
  --install-docker   Install Docker Engine before deploying (requires sudo)
  --skip-build       Start containers without rebuilding images
  --skip-db-init     Skip database schema/migration step
  --stop             Stop and remove containers (keeps SQL data volume)
  -h, --help         Show this help

Quick start on a fresh Ubuntu 24.04 server:
  git clone <repo-url> cerium-sales && cd cerium-sales
  sudo ./deploy/install-docker.sh
  ./deploy/setup-env.sh
  ./deploy/deploy.sh

EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install-docker) INSTALL_DOCKER=true; shift ;;
    --skip-build) SKIP_BUILD=true; shift ;;
    --skip-db-init) INIT_DB=false; shift ;;
    --stop) STOP_ONLY=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown option: $1" ;;
  esac
done

require_linux

chmod +x "${SCRIPT_DIR}"/*.sh 2>/dev/null || true

if [[ "${STOP_ONLY}" == true ]]; then
  require_docker
  log "Stopping application stack..."
  compose down
  log "Stopped. SQL data volume preserved."
  exit 0
fi

if [[ "${INSTALL_DOCKER}" == true ]]; then
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    bash "${SCRIPT_DIR}/install-docker.sh"
  else
    sudo bash "${SCRIPT_DIR}/install-docker.sh"
  fi
fi

require_docker

if [[ ! -f "${PROJECT_ROOT}/.env" ]]; then
  log "No .env found — running setup-env.sh"
  bash "${SCRIPT_DIR}/setup-env.sh"
fi

bash "${SCRIPT_DIR}/sync-env-passwords.sh"
load_env

if [[ "${INIT_DB}" == true ]]; then
  bash "${SCRIPT_DIR}/init-database.sh"
fi

if [[ "${SKIP_BUILD}" == false ]]; then
  log "Building Docker images (APP_URL=${APP_URL})..."
  compose build --build-arg "APP_URL=${APP_URL}"
fi

log "Starting application stack..."
if ! compose up -d; then
  die "Stack failed to start. Run: ./deploy/diagnose-sqlserver.sh
Common fixes:
  - Ensure the host has at least 2 GB RAM for SQL Server (free -h)
  - If SA_PASSWORD was changed after first deploy, reset the data volume:
      docker compose down && docker volume rm cerium-sales_sqldata
    then re-run ./deploy/deploy.sh
  - Align env files: ./deploy/sync-env-passwords.sh
  - Check password consistency: ./deploy/verify-db-password.sh
  - Ensure you pulled the latest docker-compose.yml (healthcheck uses /healthcheck.sh)
  - MSAL requires HTTPS when using an IP/hostname (not localhost): ./deploy/setup-https-selfsigned.sh"
fi

bash "${SCRIPT_DIR}/verify-db-password.sh" || warn "Password verification reported issues — run ./deploy/diagnose-sqlserver.sh"

log "Waiting for backend health check..."
attempt=0
health_ok=false
while (( attempt < 30 )); do
  if curl -sf "http://127.0.0.1:${HTTP_PORT:-80}/api/health" >/dev/null 2>&1; then
    health_ok=true
    break
  fi
  attempt=$((attempt + 1))
  sleep 3
done
[[ "${health_ok}" == true ]] || warn "Backend health check did not pass yet — check: docker compose logs backend"

echo
log "============================================"
log " Deployment complete"
log "============================================"
log " Application:  ${APP_URL}"
log " Health check:   ${APP_URL}/api/health"
log ""
log " Useful commands:"
log "   docker compose logs -f          # stream logs"
log "   docker compose ps               # container status"
log "   ./deploy/deploy.sh --stop       # stop stack"
log "   ./deploy/init-database.sh --force  # re-apply SQL scripts"
log "   ./deploy/verify-db-password.sh   # check SQL password alignment"
log "   ./deploy/sync-env-passwords.sh   # sync DB_PASSWORD from SA_PASSWORD"
log "============================================"

if curl -sf "${APP_URL}/api/health" 2>/dev/null | head -c 200; then
  echo
  log "Health check response received"
else
  warn "Could not reach ${APP_URL}/api/health from this host — verify firewall allows port ${HTTP_PORT:-80}"
fi
