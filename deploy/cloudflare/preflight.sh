#!/usr/bin/env bash
set -euo pipefail

fail=0
if [ -f deploy/cloudflare/.env ]; then
  set -a
  # shellcheck disable=SC1091
  source deploy/cloudflare/.env
  set +a
fi
check() {
  local label="$1"
  local command="$2"
  if command -v "$command" >/dev/null 2>&1; then
    echo "OK   $label: $command"
  else
    echo "MISS $label: $command"
    fail=1
  fi
}

echo "MedicareGuard Cloudflare preflight"
echo "----------------------------------"
check "Node.js" node
check "npm" npm
check "Docker" docker
check "cloudflared" cloudflared

if command -v wrangler >/dev/null 2>&1; then
  WRANGLER="wrangler"
  echo "OK   wrangler: wrangler"
elif npx --yes wrangler@latest --version >/dev/null 2>&1; then
  WRANGLER="npx --yes wrangler@latest"
  echo "OK   wrangler: npx wrangler@latest"
else
  WRANGLER=""
  echo "MISS wrangler: install wrangler or use npx"
  fail=1
fi

echo
if [ -n "$WRANGLER" ]; then
  if $WRANGLER whoami 2>&1 | grep -qi "not authenticated"; then
    echo "MISS Cloudflare login: run 'npx wrangler login'"
    fail=1
  else
    echo "OK   Cloudflare login"
  fi
else
  echo "MISS Cloudflare login: install wrangler or use 'npx wrangler login'"
  fail=1
fi

echo
for name in APP_DOMAIN API_DOMAIN N8N_DOMAIN DB_DOMAIN; do
  if [ -n "${!name:-}" ]; then
    echo "OK   $name=${!name}"
  else
    echo "MISS $name"
    fail=1
  fi
done

echo
for url in "http://localhost:3000/store" "http://localhost:4000/api/health" "http://localhost:5678/healthz"; do
  if curl -fsS --max-time 5 "$url" >/dev/null 2>&1; then
    echo "OK   $url"
  else
    echo "MISS $url"
    fail=1
  fi
done

echo
if [ "$fail" -ne 0 ]; then
  echo "Preflight chưa đạt. Sửa các mục MISS ở trên."
  exit 1
fi

echo "Preflight đạt. Có thể chạy cloudflared tunnel và deploy frontend."
