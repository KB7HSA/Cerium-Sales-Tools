#!/usr/bin/env bash
# Allow HTTP traffic through UFW (Ubuntu firewall).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

[[ "${EUID:-$(id -u)}" -eq 0 ]] || die "Run as root: sudo ./deploy/configure-firewall.sh"

load_env 2>/dev/null || true
PORT="${HTTP_PORT:-80}"

if ! command -v ufw >/dev/null 2>&1; then
  die "ufw is not installed"
fi

ufw allow OpenSSH
ufw allow "${PORT}/tcp"
if [[ -n "${HTTPS_PORT:-}" && "${HTTPS_PORT}" != "0" ]] || [[ -f "${PROJECT_ROOT}/deploy/ssl/server.crt" ]]; then
  ufw allow "${HTTPS_PORT:-443}/tcp"
  log "Firewall configured — ports ${PORT}/tcp and ${HTTPS_PORT:-443}/tcp are open"
else
  log "Firewall configured — port ${PORT}/tcp is open"
fi
ufw --force enable

log "Firewall enabled"
ufw status
