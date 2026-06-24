#!/usr/bin/env bash
# Shared helpers for Cerium Sales Tools deployment scripts.

set -euo pipefail

# Resolve paths from this file's location (deploy/lib/). Callers set SCRIPT_DIR
# to deploy/ before sourcing; do not overwrite it here.
_COMMON_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${_COMMON_LIB_DIR}/../.." && pwd)"

log()  { printf '[%s] %s\n' "$(date +'%H:%M:%S')" "$*"; }
warn() { printf '[%s] WARN: %s\n' "$(date +'%H:%M:%S')" "$*" >&2; }
die()  { printf '[%s] ERROR: %s\n' "$(date +'%H:%M:%S')" "$*" >&2; exit 1; }

require_linux() {
  [[ "$(uname -s)" == "Linux" ]] || die "These scripts are intended for Linux (Ubuntu 24.04)."
}

require_docker() {
  command -v docker >/dev/null 2>&1 || die "Docker is not installed. Run: sudo ./deploy/install-docker.sh"
  docker compose version >/dev/null 2>&1 || die "Docker Compose plugin is not available."
}

load_env() {
  [[ -f "${PROJECT_ROOT}/.env" ]] || die "Missing ${PROJECT_ROOT}/.env — run ./deploy/setup-env.sh first"
  # shellcheck disable=SC1091
  set -a
  source "${PROJECT_ROOT}/.env"
  set +a
  [[ -n "${SA_PASSWORD:-}" ]] || die "SA_PASSWORD is not set in .env"
}

compose() {
  docker compose -f "${PROJECT_ROOT}/docker-compose.yml" --project-directory "${PROJECT_ROOT}" "$@"
}

sqlcmd_exec() {
  compose exec -T sqlserver /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "${SA_PASSWORD}" -C "$@"
}

wait_for_sqlserver() {
  local attempt=0
  local max_attempts="${1:-60}"
  log "Waiting for SQL Server to accept connections..."
  while (( attempt < max_attempts )); do
    if sqlcmd_exec -Q "SELECT 1" >/dev/null 2>&1; then
      log "SQL Server is ready"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 5
  done
  die "SQL Server did not become ready within $((max_attempts * 5)) seconds"
}

generate_sa_password() {
  # SQL Server requires upper, lower, digit, and symbol. Avoid shell metacharacters
  # ($`"\\!& etc.) that break Docker healthchecks and compose interpolation.
  openssl rand -base64 32 | tr -dc 'A-Za-z0-9@#%_' | head -c 20
  echo 'Aa1@'
}

normalize_app_url() {
  local url="${1%/}"
  if [[ ! "$url" =~ ^https?:// ]]; then
    url="http://${url}"
  fi
  printf '%s' "$url"
}
