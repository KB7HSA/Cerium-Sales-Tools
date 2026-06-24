#!/usr/bin/env bash
# SQL Server Docker healthcheck — reads MSSQL_SA_PASSWORD safely (no compose shell escaping).
set -euo pipefail
exec /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "${MSSQL_SA_PASSWORD}" -C \
  -Q "SELECT 1" -b -o /dev/null
