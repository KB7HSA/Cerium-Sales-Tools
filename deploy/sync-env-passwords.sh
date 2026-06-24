#!/usr/bin/env bash
# Align SQL passwords: .env SA_PASSWORD is source of truth for all consumers.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

sync_db_passwords
log "Password sync complete. Verify with: ./deploy/verify-db-password.sh"
