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

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=true; shift ;;
    -h|--help)
      echo "Usage: ./deploy/init-database.sh [--force]"
      echo "  --force  Re-run all SQL scripts even if already initialized"
      exit 0
      ;;
    *) die "Unknown option: $1" ;;
  esac
done

if [[ -f "${MARKER}" && "${FORCE}" == false ]]; then
  compose up -d sqlserver 2>/dev/null || true
  wait_for_sqlserver 12 2>/dev/null || true
  if database_exists; then
    log "Database already initialized (${MARKER}). Use --force to re-run."
    exit 0
  fi
  warn "Marker ${MARKER} exists but database '${DB_NAME:-CeriumSalesTools}' is missing — re-initializing"
fi

log "Starting SQL Server container..."
compose up -d sqlserver
wait_for_sqlserver

run_sql_file() {
  local container_path="$1"
  local label="$2"
  log "Applying ${label}..."
  sqlcmd_exec -b -i "${container_path}" || die "Failed while applying ${label}"
}

run_sql_file "/db/mssql-schema.sql" "schema (mssql-schema.sql)"
run_sql_file "/db/mssql-triggers.sql" "triggers (mssql-triggers.sql)"

if compose exec -T sqlserver test -f /db/add-offering-addons-table.sql; then
  run_sql_file "/db/add-offering-addons-table.sql" "add-on table (add-offering-addons-table.sql)"
fi

shopt -s nullglob
migration_files=("${PROJECT_ROOT}"/db/migrations/*.sql)
IFS=$'\n' migration_files=($(printf '%s\n' "${migration_files[@]}" | sort))
unset IFS

for migration in "${migration_files[@]}"; do
  base="$(basename "${migration}")"
  run_sql_file "/db/migrations/${base}" "migration (${base})"
done
shopt -u nullglob

date -u +"%Y-%m-%dT%H:%M:%SZ" > "${MARKER}"
log "Database initialization complete"
