#!/usr/bin/env bash
# Audit SQL migrations for ALTER TABLE safety and filename sort order.
# Run from repository root: ./deploy/audit-migrations.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MIGRATIONS_DIR="${PROJECT_ROOT}/db/migrations"

if [[ ! -d "${MIGRATIONS_DIR}" ]]; then
  echo "ERROR: ${MIGRATIONS_DIR} not found" >&2
  exit 1
fi

mapfile -t files < <(find "${MIGRATIONS_DIR}" -maxdepth 1 -name '*.sql' -printf '%f\n' | sort)
issues=0

echo "=============================================="
echo " Migration audit ($(date +%Y-%m-%d))"
echo "=============================================="
echo
echo "Sorted execution order (${#files[@]} files):"
for i in "${!files[@]}"; do
  printf '  %2d. %s\n' "$((i + 1))" "${files[$i]}"
done
echo

echo "ALTER TABLE / unsafe dependency checks:"
echo "----------------------------------------------"

for file in "${files[@]}"; do
  path="${MIGRATIONS_DIR}/${file}"
  mapfile -t alter_tables < <(grep -oE 'ALTER TABLE dbo\.[A-Za-z0-9_]+' "${path}" 2>/dev/null | sed 's/ALTER TABLE dbo\.//' | sort -u)
  for table in "${alter_tables[@]:-}"; do
    [[ -z "${table}" ]] && continue
    if grep -q "CREATE TABLE dbo.${table}" "${path}"; then
      continue
    fi
    if ! grep -q "IF EXISTS (SELECT \\* FROM sys.tables WHERE name = '${table}'" "${path}"; then
      echo "  WARN: ${file} alters dbo.${table} without table EXISTS guard"
      issues=$((issues + 1))
    fi
  done

  mapfile -t dml_tables < <(grep -oE '(DELETE FROM|INSERT INTO) dbo\.[A-Za-z0-9_]+' "${path}" 2>/dev/null | sed -E 's/(DELETE FROM|INSERT INTO) dbo\.//' | sort -u)
  for table in "${dml_tables[@]:-}"; do
    [[ -z "${table}" ]] && continue
    if grep -q "CREATE TABLE dbo.${table}" "${path}"; then
      continue
    fi
    if ! grep -q "IF EXISTS (SELECT \\* FROM sys.tables WHERE name = '${table}'" "${path}"; then
      echo "  WARN: ${file} modifies dbo.${table} without table EXISTS guard"
      issues=$((issues + 1))
    fi
  done
done

echo
echo "Known ensure-table migrations:"
echo "----------------------------------------------"
for pattern in '_00_' '_00_create' '_00_schema' 'quote_workitems' 'erate_form470.sql'; do
  matches=($(printf '%s\n' "${files[@]}" | grep "${pattern}" || true))
  for m in "${matches[@]}"; do
    [[ -n "${m}" ]] && echo "  OK: ${m}"
  done
done

echo
if (( issues == 0 )); then
  echo "PASS: No unguarded ALTER/DML issues detected."
else
  echo "NOTE: ${issues} warning(s) — CREATE+seed migrations may appear; review any pure ALTER scripts."
fi
exit 0
