#!/usr/bin/env bash
# Diagnose SQL Server container startup / healthcheck failures.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

require_docker
load_env

log "=== SQL Server diagnostics ==="
echo

log "Host .env SA_PASSWORD is set: $([[ -n "${SA_PASSWORD:-}" ]] && echo yes || echo NO)"
echo

log "Container status:"
compose ps sqlserver 2>/dev/null || true
echo

log "Last 40 lines of sqlserver logs:"
compose logs --tail 40 sqlserver 2>/dev/null || true
echo

if compose ps sqlserver 2>/dev/null | grep -qE 'Up|unhealthy'; then
  log "MSSQL_SA_PASSWORD inside container (first 3 chars only):"
  compose exec -T sqlserver bash -c 'echo "${MSSQL_SA_PASSWORD:0:3}***"' 2>/dev/null || warn "Could not read container env"
  echo

  log "Manual healthcheck:"
  if compose exec -T sqlserver bash /healthcheck.sh; then
    log "Healthcheck script succeeded"
  else
    warn "Healthcheck script failed"
    echo
    warn "If SQL Server was previously initialized with a different password, reset the volume:"
    echo "  docker compose down"
    echo "  docker volume rm cerium-sales_sqldata"
    echo "  ./deploy/deploy.sh"
  fi
else
  warn "sqlserver container is not running — check logs above for OOM or config errors"
  echo
  warn "SQL Server requires at least 2 GB RAM. Check: free -h"
fi

echo
log "=== end diagnostics ==="
