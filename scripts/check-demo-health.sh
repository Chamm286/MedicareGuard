#!/usr/bin/env bash
set -euo pipefail

fail=0

check() {
  local name="$1"
  local url="$2"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$url" || true)"
  if [[ "$code" == 2* || "$code" == 3* ]]; then
    printf '  OK   %-28s %s (%s)\n' "$name" "$url" "$code"
  else
    printf '  FAIL %-28s %s (%s)\n' "$name" "$url" "${code:-no response}"
    fail=1
  fi
}

echo "MedicareGuard demo health"
check "SOC console" "http://localhost:3000/"
check "REST API" "http://localhost:4000/api/health"
check "Swagger UI" "http://localhost:4000/api/docs/"
check "OpenAPI JSON" "http://localhost:4000/api/openapi.json"
check "n8n" "http://localhost:5678/healthz"
check "pgAdmin" "http://localhost:5050/login"
check "Mailpit" "http://localhost:8025/"

if [[ -n "${WEB_TUNNEL:-}" ]]; then
  check "Public console" "${WEB_TUNNEL%/}/"
  check "Public API" "${WEB_TUNNEL%/}/api/health"
  check "Public Swagger" "${WEB_TUNNEL%/}/api/docs/"
fi
if [[ -n "${N8N_TUNNEL:-}" ]]; then
  check "Public n8n" "${N8N_TUNNEL%/}/healthz"
fi
if [[ -n "${DB_TUNNEL:-}" ]]; then
  check "Public pgAdmin" "${DB_TUNNEL%/}/login"
fi

exit "$fail"
