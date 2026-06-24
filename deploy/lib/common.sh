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

# Read a single KEY=value from an env file without sourcing (safe for $ # and spaces).
read_env_value() {
  local file="$1" key="$2"
  local line val
  [[ -f "${file}" ]] || return 1
  line="$(grep -E "^[[:space:]]*${key}=" "${file}" 2>/dev/null | head -1)" || return 1
  val="${line#*=}"
  val="${val#"${val%%[![:space:]]*}"}"
  if [[ "${val}" == \"*\" && "${val}" == *\" ]]; then
    val="${val:1:${#val}-2}"
    val="${val//\\\"/\"}"
    val="${val//\\\\/\\}"
  elif [[ "${val}" == \'*\' && "${val}" == *\' ]]; then
    val="${val:1:${#val}-2}"
  fi
  [[ -n "${val}" ]] || return 1
  printf '%s' "${val}"
}

# Write a value safe for .env (double-quoted, escaped).
escape_env_value() {
  local v="$1"
  v="${v//\\/\\\\}"
  v="${v//\"/\\\"}"
  v="${v//\$/\\$}"
  printf '%s' "\"${v}\""
}

set_env_value() {
  local file="$1" key="$2" value="$3"
  local escaped tmp
  escaped="$(escape_env_value "${value}")"
  if [[ -f "${file}" ]] && grep -qE "^[[:space:]]*${key}=" "${file}"; then
    tmp="$(mktemp)"
    while IFS= read -r line || [[ -n "${line}" ]]; do
      if [[ "${line}" =~ ^[[:space:]]*${key}= ]]; then
        printf '%s=%s\n' "${key}" "${escaped}"
      else
        printf '%s\n' "${line}"
      fi
    done < "${file}" > "${tmp}"
    mv "${tmp}" "${file}"
  else
    printf '%s=%s\n' "${key}" "${escaped}" >> "${file}"
  fi
}

password_fingerprint() {
  printf '%s' "$1" | sha256sum | awk '{print substr($1,1,12)}'
}

load_env() {
  local env_file="${PROJECT_ROOT}/.env"
  [[ -f "${env_file}" ]] || die "Missing ${env_file} — run ./deploy/setup-env.sh first"
  SA_PASSWORD="$(read_env_value "${env_file}" SA_PASSWORD)" || die "SA_PASSWORD is not set in .env"
  export SA_PASSWORD
  # shellcheck disable=SC1091
  set -a
  source "${env_file}"
  set +a
  export SA_PASSWORD="$(read_env_value "${env_file}" SA_PASSWORD)"
  [[ -n "${SA_PASSWORD}" ]] || die "SA_PASSWORD is not set in .env"
  APP_URL="$(read_env_value "${env_file}" APP_URL 2>/dev/null || true)"
  APP_URL="$(normalize_app_url "${APP_URL:-http://localhost}")"
  export APP_URL
  AZURE_AD_CLIENT_ID="$(read_env_value "${env_file}" AZURE_AD_CLIENT_ID 2>/dev/null || true)"
  AZURE_AD_TENANT_ID="$(read_env_value "${env_file}" AZURE_AD_TENANT_ID 2>/dev/null || true)"
  export AZURE_AD_CLIENT_ID AZURE_AD_TENANT_ID
}

# Align backend/.env DB_PASSWORD with root .env SA_PASSWORD; re-quote SA_PASSWORD in .env.
sync_db_passwords() {
  local env_file="${PROJECT_ROOT}/.env"
  local backend_env="${PROJECT_ROOT}/backend/.env"
  local sa_pw

  [[ -f "${env_file}" ]] || die "Missing ${env_file} — run ./deploy/setup-env.sh first"
  sa_pw="$(read_env_value "${env_file}" SA_PASSWORD)" || die "SA_PASSWORD is not set in .env"

  set_env_value "${env_file}" SA_PASSWORD "${sa_pw}"
  chmod 600 "${env_file}" 2>/dev/null || true

  if [[ -f "${backend_env}" ]]; then
    set_env_value "${backend_env}" DB_PASSWORD "${sa_pw}"
    chmod 600 "${backend_env}" 2>/dev/null || true
    log "Synced DB_PASSWORD in backend/.env from .env SA_PASSWORD"
  else
    warn "backend/.env not found — only updated .env SA_PASSWORD quoting"
  fi
}

# Compare SQL passwords across env files and running containers. Returns 1 on mismatch.
verify_db_passwords() {
  local env_file="${PROJECT_ROOT}/.env"
  local backend_env="${PROJECT_ROOT}/backend/.env"
  local root_sa backend_pw container_sa container_db
  local mismatches=0
  local fp_root fp_backend fp_container_sa fp_container_db

  [[ -f "${env_file}" ]] || { warn "Missing ${env_file}"; return 1; }
  root_sa="$(read_env_value "${env_file}" SA_PASSWORD)" || {
    warn ".env SA_PASSWORD is missing or empty"
    return 1
  }
  fp_root="$(password_fingerprint "${root_sa}")"
  log "Root .env SA_PASSWORD: set (len=${#root_sa}, fp=${fp_root})"

  if [[ -f "${backend_env}" ]]; then
    backend_pw="$(read_env_value "${backend_env}" DB_PASSWORD)" || backend_pw=""
    if [[ -z "${backend_pw}" ]]; then
      warn "backend/.env DB_PASSWORD is missing or empty"
      mismatches=$((mismatches + 1))
    elif [[ "${backend_pw}" != "${root_sa}" ]]; then
      fp_backend="$(password_fingerprint "${backend_pw}")"
      warn "MISMATCH: backend/.env DB_PASSWORD (fp=${fp_backend}) != .env SA_PASSWORD (fp=${fp_root})"
      mismatches=$((mismatches + 1))
    else
      log "backend/.env DB_PASSWORD matches root .env"
    fi
  else
    warn "backend/.env not found (compose still passes DB_PASSWORD from SA_PASSWORD)"
  fi

  if compose ps sqlserver 2>/dev/null | grep -qE 'Up|unhealthy'; then
    container_sa="$(compose exec -T sqlserver bash -c 'printf "%s" "${MSSQL_SA_PASSWORD:-}"' 2>/dev/null || true)"
    if [[ -z "${container_sa}" ]]; then
      warn "Could not read MSSQL_SA_PASSWORD from sqlserver container"
    elif [[ "${container_sa}" != "${root_sa}" ]]; then
      fp_container_sa="$(password_fingerprint "${container_sa}")"
      warn "MISMATCH: sqlserver MSSQL_SA_PASSWORD (fp=${fp_container_sa}) != .env SA_PASSWORD (fp=${fp_root})"
      warn "  Recreate containers after syncing: docker compose up -d --force-recreate sqlserver"
      mismatches=$((mismatches + 1))
    else
      log "sqlserver container MSSQL_SA_PASSWORD matches root .env"
    fi
  fi

  if compose ps backend 2>/dev/null | grep -q 'Up'; then
    container_db="$(compose exec -T backend bash -c 'printf "%s" "${DB_PASSWORD:-}"' 2>/dev/null || true)"
    if [[ -n "${container_db}" && "${container_db}" != "${root_sa}" ]]; then
      fp_container_db="$(password_fingerprint "${container_db}")"
      warn "MISMATCH: backend container DB_PASSWORD (fp=${fp_container_db}) != .env SA_PASSWORD (fp=${fp_root})"
      warn "  Recreate backend: docker compose up -d --force-recreate backend"
      mismatches=$((mismatches + 1))
    elif [[ -n "${container_db}" ]]; then
      log "backend container DB_PASSWORD matches root .env"
    fi
  fi

  if compose ps sqlserver 2>/dev/null | grep -qE 'Up|unhealthy'; then
    log "Testing SQL login with .env SA_PASSWORD..."
    if sqlcmd_exec -Q "SELECT 1" >/dev/null 2>&1; then
      log "SQL login succeeded"
      if ! database_exists; then
        warn "Database '${DB_NAME:-CeriumSalesTools}' does not exist — run: ./deploy/init-database.sh"
        mismatches=$((mismatches + 1))
      else
        log "Database '${DB_NAME:-CeriumSalesTools}' exists"
      fi
    else
      warn "SQL login FAILED with .env SA_PASSWORD"
      warn "  Env vars may match but the data volume was initialized with a different password."
      warn "  Reset: docker compose down && docker volume rm cerium-sales_sqldata && ./deploy/deploy.sh"
      mismatches=$((mismatches + 1))
    fi
  else
    warn "sqlserver not running — skipped live SQL login test"
  fi

  if (( mismatches > 0 )); then
    warn "Found ${mismatches} password issue(s). Run: ./deploy/sync-env-passwords.sh"
    return 1
  fi
  log "All checked SQL password values match"
  return 0
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

# Returns 0 if the application database exists (login to master, not app DB).
database_exists() {
  local db_name="${1:-${DB_NAME:-CeriumSalesTools}}"
  local result
  result="$(sqlcmd_exec -d master -h -1 -W -Q "SET NOCOUNT ON; SELECT CASE WHEN DB_ID(N'${db_name}') IS NOT NULL THEN 1 ELSE 0 END" 2>/dev/null | tr -d '[:space:]' || true)"
  [[ "${result}" == "1" ]]
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
