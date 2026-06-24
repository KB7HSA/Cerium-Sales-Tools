#!/usr/bin/env bash
# Start SQL Server 2022 in Docker and load CeriumSalesTools schema (Ubuntu 24.04)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTAINER_NAME="${CONTAINER_NAME:-cerium-mssql}"
SA_PASSWORD="${SA_PASSWORD:-}"
DB_NAME="${DB_NAME:-CeriumSalesTools}"
HOST_PORT="${HOST_PORT:-1433}"

SQLCMD=(sqlcmd -S "localhost,${HOST_PORT}" -U sa -C -b)

if [[ -z "$SA_PASSWORD" ]]; then
  read -rsp "Enter SQL Server SA password (min 8 chars, upper/lower/number/symbol): " SA_PASSWORD
  echo
fi

if [[ ${#SA_PASSWORD} -lt 8 ]]; then
  echo "SA password must be at least 8 characters." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Run deploy/ubuntu/install-prerequisites.sh first." >&2
  exit 1
fi

if ! command -v sqlcmd >/dev/null 2>&1; then
  echo "sqlcmd is required. Run deploy/ubuntu/install-prerequisites.sh first." >&2
  exit 1
fi

echo "==> Pulling SQL Server 2022 image"
docker pull mcr.microsoft.com/mssql/server:2022-latest

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "==> Container $CONTAINER_NAME already exists — starting if stopped"
  docker start "$CONTAINER_NAME" >/dev/null 2>&1 || true
else
  echo "==> Creating SQL Server container: $CONTAINER_NAME"
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -e "ACCEPT_EULA=Y" \
    -e "MSSQL_SA_PASSWORD=${SA_PASSWORD}" \
    -p "${HOST_PORT}:1433" \
    -v cerium-mssql-data:/var/opt/mssql \
    mcr.microsoft.com/mssql/server:2022-latest
fi

echo "==> Waiting for SQL Server to accept connections"
for i in $(seq 1 60); do
  if "${SQLCMD[@]}" -P "$SA_PASSWORD" -Q "SELECT 1" >/dev/null 2>&1; then
    break
  fi
  if [[ "$i" -eq 60 ]]; then
    echo "SQL Server did not become ready in time." >&2
    exit 1
  fi
  sleep 2
done

run_sql_file() {
  local file="$1"
  echo "==> Applying $(basename "$file")"
  "${SQLCMD[@]}" -P "$SA_PASSWORD" -i "$file"
}

echo "==> Creating database $DB_NAME (if missing)"
"${SQLCMD[@]}" -P "$SA_PASSWORD" -Q "IF DB_ID('${DB_NAME}') IS NULL CREATE DATABASE [${DB_NAME}];"

run_sql_file "$ROOT_DIR/db/mssql-schema.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-02-20_add_template_filename.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-02-20_assessments.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-02-20_export_schema.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-02-20_fix_assessment_data.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-02-20_quote_schema_update.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-02-20_sow_documents.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-02-21_add_user_status.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-02-21_erate_form470.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-02-21_erate_settings.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-02-21_rbac_role_assignments.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-02-22_add_createdby_to_quotes.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-02-22_erate_frn_status.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-02-22_user_table_preferences.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-02-23_add_groupname_to_workitems.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-02-23_menu_configuration.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-02-24_add_ai_temperature.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-02-24_sow_types.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-02-26_labor_budget_persistence.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-02-26_sow_content_sections.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-02-27_drop_item_fk_constraints.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-03-02_add_file_type_support.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-03-02_add_header_footer_xml.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-03-02_add_use_adobe_api.sql"
run_sql_file "$ROOT_DIR/db/migrations/2026-03-02_document_conversion_types.sql"
run_sql_file "$ROOT_DIR/db/mssql-triggers.sql"

echo
echo "Database ready."
echo "  Host: localhost"
echo "  Port: ${HOST_PORT}"
echo "  Database: ${DB_NAME}"
echo "  User: sa"
echo "  Password: (the value you entered)"
echo
echo "Set DB_PASSWORD in backend/.env to this SA password."
