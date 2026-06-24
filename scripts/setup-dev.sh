#!/usr/bin/env bash
# Local development environment setup for Cerium Sales Tools (Tailadmin)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: '$1' is required but not installed." >&2
    exit 1
  fi
}

echo "==> Cerium Sales Tools — development setup"
require_cmd node
require_cmd npm

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  echo "ERROR: Node.js 20+ is required (found $(node --version))." >&2
  exit 1
fi

echo "==> Installing frontend dependencies"
npm install

echo "==> Installing backend dependencies"
(cd backend && npm install)

if [[ ! -f backend/.env ]]; then
  echo "==> Creating backend/.env from .env.example"
  cp backend/.env.example backend/.env
  echo
  echo "IMPORTANT: Edit backend/.env with your database credentials and Azure AD IDs."
  echo "  - DB_HOST / DB_USER / DB_PASSWORD / DB_NAME"
  echo "  - AZURE_AD_TENANT_ID / AZURE_AD_CLIENT_ID (must match frontend MSAL config)"
  echo
fi

echo "==> Building backend TypeScript"
(cd backend && npm run build)

echo
echo "Setup complete."
echo
echo "Start development servers (two terminals):"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: npm start"
echo
echo "Verify:"
echo "  curl http://localhost:3000/api/health"
echo "  open http://localhost:4200"
echo
echo "Optional database connectivity test:"
echo "  cd backend && npx ts-node test-db-connection.ts"
