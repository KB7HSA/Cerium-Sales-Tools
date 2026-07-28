#!/usr/bin/env bash
# Pull latest code and redeploy without re-initializing the database.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

if [[ -d .git ]]; then
  git pull --ff-only
fi

exec "${SCRIPT_DIR}/deploy.sh" --skip-db-init "$@"
