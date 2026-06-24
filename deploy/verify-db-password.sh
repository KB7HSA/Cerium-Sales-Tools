#!/usr/bin/env bash
# Report mismatches between SA_PASSWORD, DB_PASSWORD, and container env vars.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

require_docker
load_env

log "=== SQL password verification ==="
echo

if verify_db_passwords; then
  log "=== verification passed ==="
  exit 0
fi

echo
log "=== verification failed ==="
exit 1
