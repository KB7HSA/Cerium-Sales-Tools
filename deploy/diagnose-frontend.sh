#!/usr/bin/env bash
# Check that the frontend serves HTML, CSS, and JS correctly.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

require_docker
load_app_env 2>/dev/null || true
PORT="${HTTP_PORT:-80}"
BASE="http://127.0.0.1:${PORT}"
if [[ -f "${PROJECT_ROOT}/deploy/ssl/server.crt" ]]; then
  BASE="https://127.0.0.1"
fi

log "=== Frontend asset diagnostics ==="
echo

html="$(curl -ksS "${BASE}/")"
printf '%s' "${html}" | grep -q '<app-root>' && log "index.html contains <app-root>" || warn "index.html missing <app-root>"

if printf '%s' "${html}" | grep -q 'media="print".*onload='; then
  warn "index.html still uses async CSS (media=print onload) — rebuild frontend with inlineCritical:false"
else
  log "index.html uses standard stylesheet loading"
fi

css_href="$(printf '%s' "${html}" | grep -oE 'href="styles-[^"]+\.css"' | head -1 | cut -d'"' -f2 || true)"
if [[ -z "${css_href}" ]]; then
  warn "No styles-*.css link found in index.html"
else
  code="$(curl -ksS -o /tmp/cerium-style-check.css -w "%{http_code}" "${BASE}/${css_href}")"
  size="$(wc -c < /tmp/cerium-style-check.css | tr -d ' ')"
  log "stylesheet ${css_href}: HTTP ${code}, ${size} bytes"
  if [[ "${code}" != "200" ]]; then
    warn "Stylesheet failed — layout will be broken"
  elif head -c 20 /tmp/cerium-style-check.css | grep -q '<'; then
    warn "Stylesheet response looks like HTML (nginx returned index.html)"
  elif [[ "${size}" -lt 200000 ]]; then
    warn "Stylesheet only ${size} bytes (expected ~250KB+) — Tailwind did not compile"
    warn "Ensure frontend.Dockerfile copies .postcssrc.json and rebuild: docker compose build --no-cache frontend"
  elif grep -qE '\.flex\{|display:flex' /tmp/cerium-style-check.css 2>/dev/null; then
    log "Stylesheet contains layout utilities (${size} bytes)"
  else
    warn "Stylesheet may be missing Tailwind utility classes (${size} bytes)"
  fi
fi

main_js="$(printf '%s' "${html}" | grep -oE 'src="main-[^"]+\.js"' | head -1 | cut -d'"' -f2 || true)"
if [[ -n "${main_js}" ]]; then
  code="$(curl -ksS -o /dev/null -w "%{http_code}" "${BASE}/${main_js}")"
  log "main bundle ${main_js}: HTTP ${code}"
fi

rm -f /tmp/cerium-style-check.css
echo
log "=== end diagnostics ==="
