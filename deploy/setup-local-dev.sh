#!/usr/bin/env bash
# Bootstrap a local development environment (Angular + Express + SQL Server in Docker).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

export COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.dev.yml"

log "Setting up local development environment..."

if ! command -v docker >/dev/null 2>&1; then
  die "Docker is required. Run: sudo ./deploy/install-docker.sh"
fi

if ! docker info >/dev/null 2>&1; then
  die "Docker daemon is not reachable. Start it or fix /var/run/docker.sock permissions."
fi

if [[ ! -f "${PROJECT_ROOT}/.env" ]]; then
  cp "${PROJECT_ROOT}/.env.example" "${PROJECT_ROOT}/.env"
  chmod 600 "${PROJECT_ROOT}/.env"
  log "Created ${PROJECT_ROOT}/.env from .env.example"
fi

if [[ ! -f "${PROJECT_ROOT}/backend/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "${PROJECT_ROOT}/.env"
  set +a
  cat > "${PROJECT_ROOT}/backend/.env" <<EOF
NODE_ENV=development
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
CORS_ORIGIN=http://localhost:4200
LOG_LEVEL=debug

DB_HOST=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=${SA_PASSWORD}
DB_NAME=${DB_NAME:-CeriumSalesTools}
DB_ENCRYPT=false
DB_TRUST_CERT=true
DB_POOL_MIN=2
DB_POOL_MAX=10

AZURE_AD_TENANT_ID=${AZURE_AD_TENANT_ID}
AZURE_AD_CLIENT_ID=${AZURE_AD_CLIENT_ID}
EOF
  chmod 600 "${PROJECT_ROOT}/backend/.env"
  log "Created ${PROJECT_ROOT}/backend/.env"
fi

load_env

log "Installing frontend dependencies..."
(cd "${PROJECT_ROOT}" && npm ci)

log "Installing backend dependencies..."
(cd "${PROJECT_ROOT}/backend" && npm ci)

bash "${SCRIPT_DIR}/init-database.sh"

cat <<EOF

Local development is ready.

  Terminal 1 — backend:
    npm run backend:dev

  Terminal 2 — frontend:
    npm start

  URLs:
    Frontend   http://localhost:4200
    Backend    http://localhost:3000/api/health
    SQL Server localhost:1433 (sa / value in .env)

  Database helpers:
    npm run db:up
    npm run db:down
    npm run db:logs

EOF
