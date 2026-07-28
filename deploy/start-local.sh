#!/usr/bin/env bash
# Start the full local stack on this machine (SQL + API + Angular).
# Prerequisites: ./deploy/setup-local-dev.sh (once)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is not running."
  exit 1
fi

if [[ ! -f backend/.env ]]; then
  echo "ERROR: missing backend/.env — run: npm run setup:local"
  exit 1
fi

echo "Starting SQL Server..."
docker compose -f docker-compose.dev.yml up -d

echo "Starting backend on :3000..."
(cd backend && npm run dev) &
BACKEND_PID=$!

echo "Starting frontend on :4200..."
npm start &
FRONTEND_PID=$!

cleanup() {
  kill "${BACKEND_PID}" "${FRONTEND_PID}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo
echo "Local stack starting:"
echo "  Frontend  http://127.0.0.1:4200"
echo "  Backend   http://127.0.0.1:3000/api/health"
echo "  SQL       localhost:1433"
echo
echo "Press Ctrl+C to stop API + frontend (SQL keeps running)."
wait
