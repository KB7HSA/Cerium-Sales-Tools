#!/usr/bin/env bash
# Apply database schema, triggers, and migrations to the SQL Server container.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

require_docker
load_env

MARKER="${PROJECT_ROOT}/.db-initialized"
FORCE=false
ALLOW_MIGRATION_ERRORS=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=true; shift ;;
    --strict) ALLOW_MIGRATION_ERRORS=false; shift ;;
    -h|--help)
      echo "Usage: ./deploy/init-database.sh [--force] [--strict]"
      echo "  --force   Re-run all SQL scripts even if already initialized"
      echo "  --strict  Fail on any migration error (default: continue with warning)"
      exit 0
      ;;
    *) die "Unknown option: $1" ;;
  esac
done

if [[ -f "${MARKER}" && "${FORCE}" == false ]]; then
  log "Database already initialized (${MARKER}). Use --force to re-run."
  exit 0
fi

log "Starting SQL Server container..."
compose up -d sqlserver
wait_for_sqlserver

run_sql_file() {
  local container_path="$1"
  local label="$2"
  local use_db="${3:-false}"
  log "Applying ${label}..."
  if [[ "${use_db}" == "true" ]]; then
    sqlcmd_db -b -i "${container_path}" || return 1
  else
    sqlcmd_exec -b -i "${container_path}" || return 1
  fi
}

run_sql_file "/db/mssql-schema.sql" "schema (mssql-schema.sql)" false || die "Schema failed"
run_sql_file "/db/mssql-triggers.sql" "triggers (mssql-triggers.sql)" true || die "Triggers failed"

if compose exec -T sqlserver test -f /db/add-offering-addons-table.sql; then
  run_sql_file "/db/add-offering-addons-table.sql" "add-on table" true \
    || warn "add-offering-addons-table.sql had errors"
fi

# Create tables before ALTER migrations that depend on them.
PRIORITY_MIGRATIONS=(
  "2026-03-02_document_conversion_types.sql"
)

apply_migration() {
  local base="$1"
  local path="/db/migrations/${base}"
  if ! compose exec -T sqlserver test -f "${path}"; then
    return 0
  fi
  if run_sql_file "${path}" "migration (${base})" true; then
    return 0
  fi
  if [[ "${ALLOW_MIGRATION_ERRORS}" == true ]]; then
    warn "Migration ${base} reported errors (continuing)"
    return 0
  fi
  die "Failed while applying migration ${base}"
}

for base in "${PRIORITY_MIGRATIONS[@]}"; do
  apply_migration "${base}"
done

shopt -s nullglob
mapfile -t migration_files < <(printf '%s\n' "${PROJECT_ROOT}"/db/migrations/*.sql | sort)
for migration in "${migration_files[@]}"; do
  base="$(basename "${migration}")"
  skip=false
  for p in "${PRIORITY_MIGRATIONS[@]}"; do
    [[ "${base}" == "${p}" ]] && skip=true && break
  done
  [[ "${skip}" == true ]] && continue
  apply_migration "${base}"
done
shopt -u nullglob

date -u +"%Y-%m-%dT%H:%M:%SZ" > "${MARKER}"
log "Database initialization complete"
