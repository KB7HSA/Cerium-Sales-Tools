#!/usr/bin/env bash
# Full Ubuntu 24.04 installer for Cerium Sales Tools
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

bash "$ROOT_DIR/deploy/ubuntu/install-prerequisites.sh"

read -rp "Set up local SQL Server in Docker? [Y/n] " SETUP_DB
SETUP_DB="${SETUP_DB:-Y}"
if [[ "$SETUP_DB" =~ ^[Yy]$ ]]; then
  bash "$ROOT_DIR/deploy/ubuntu/setup-database-docker.sh"
fi

if [[ ! -f "$ROOT_DIR/backend/.env" ]]; then
  cp "$ROOT_DIR/deploy/ubuntu/env.production.example" "$ROOT_DIR/backend/.env"
  echo "Created backend/.env — edit it before continuing."
  echo "Press Enter when backend/.env is configured..."
  read -r
fi

bash "$ROOT_DIR/deploy/ubuntu/build-and-deploy.sh"

echo
echo "Installation finished. See deploy/ubuntu/README.md for TLS and Azure AD steps."
