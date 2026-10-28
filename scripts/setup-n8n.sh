#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
N8N_DB="${N8N_DB:-$HOME/.n8n/database.sqlite}"
WORKFLOW_DIR="$ROOT/n8n/workflows"
WORKFLOW_IDS=(ransomware-containment phishing-triage vulnerability-sla compliance-evidence ecommerce-fraud-response live-attack-monitor)

if ! command -v n8n >/dev/null 2>&1; then
  echo "n8n CLI not found. Install n8n or add it to PATH." >&2
  exit 1
fi
if [[ ! -f "$N8N_DB" ]]; then
  echo "n8n database not found at $N8N_DB. Set N8N_DB to the correct path." >&2
  exit 1
fi

N8N_USER_ID="${N8N_USER_ID:-$(sqlite3 "$N8N_DB" "SELECT id FROM user ORDER BY \"createdAt\" LIMIT 1;" 2>/dev/null || true)}"
if [[ -z "$N8N_USER_ID" ]]; then
  echo "No n8n owner found. Open n8n once to create the owner account, or set N8N_USER_ID." >&2
  exit 1
fi

PG_HOST="${MG_PG_HOST:-localhost}"
PG_PORT="${MG_PG_PORT:-5433}"
PG_DB="${MG_PG_DATABASE:-medicareguard}"
PG_USER="${MG_PG_USER:-medicare}"
PG_PASSWORD="${MG_PG_PASSWORD:-medicare}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

python3 - "$TMP_DIR/credential.json" "$PG_HOST" "$PG_PORT" "$PG_DB" "$PG_USER" "$PG_PASSWORD" <<'PY'
import json
import sys
path, host, port, database, user, password = sys.argv[1:]
credential = {
    "id": "mg-postgres-credential",
    "name": "MedicareGuard PostgreSQL",
    "type": "postgres",
    "data": {
        "host": host,
        "database": database,
        "user": user,
        "password": password,
        "port": int(port),
        "ssl": "disable",
        "maxConnections": 20,
        "allowUnauthorizedCerts": False,
    },
}
json.dump([credential], open(path, "w"), indent=2)
PY

echo "Importing MedicareGuard PostgreSQL credential for n8n user $N8N_USER_ID..."
(cd /tmp && n8n import:credentials --input="$TMP_DIR/credential.json" --userId="$N8N_USER_ID")

if [[ -n "${MG_SMTP_HOST:-}" && -n "${MG_SMTP_USER:-}" && -n "${MG_SMTP_PASSWORD:-}" ]]; then
  python3 - "$TMP_DIR/smtp.json" "${MG_SMTP_USER}" "${MG_SMTP_PASSWORD}" "${MG_SMTP_HOST}" "${MG_SMTP_PORT:-465}" "${MG_SMTP_SECURE:-true}" "${MG_SMTP_DISABLE_STARTTLS:-false}" <<'PYCRED'
import json
import sys
path, user, password, host, port, secure, disable_starttls = sys.argv[1:]
credential = {
    "id": "mg-smtp-credential",
    "name": "MedicareGuard SMTP",
    "type": "smtp",
    "data": {
        "user": user,
        "password": password,
        "host": host,
        "port": int(port),
        "secure": secure.lower() == "true",
        "disableStartTls": disable_starttls.lower() == "true",
    },
}
json.dump([credential], open(path, "w"), indent=2)
PYCRED
  echo "Importing MedicareGuard SMTP credential..."
  (cd /tmp && n8n import:credentials --input="$TMP_DIR/smtp.json" --userId="$N8N_USER_ID")
else
  echo "Skipping SMTP credential: set MG_SMTP_HOST, MG_SMTP_USER and MG_SMTP_PASSWORD to enable Gmail alerts."
fi

if [[ -n "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  python3 - "$TMP_DIR/telegram.json" "${TELEGRAM_BOT_TOKEN}" <<'PYCRED'
import json
import sys
path, token = sys.argv[1:]
credential = {
    "id": "mg-telegram-credential",
    "name": "MedicareGuard Telegram",
    "type": "telegramApi",
    "data": {"accessToken": token},
}
json.dump([credential], open(path, "w"), indent=2)
PYCRED
  echo "Importing MedicareGuard Telegram credential..."
  (cd /tmp && n8n import:credentials --input="$TMP_DIR/telegram.json" --userId="$N8N_USER_ID")
else
  echo "Skipping Telegram credential: set TELEGRAM_BOT_TOKEN to enable the Telegram node."
fi

for workflow_id in "${WORKFLOW_IDS[@]}"; do
  file="$WORKFLOW_DIR/$workflow_id.json"
  if [[ ! -f "$file" ]]; then
    echo "Missing workflow definition: $file" >&2
    exit 1
  fi
  echo "Importing $workflow_id..."
  (cd /tmp && n8n import:workflow --input="$file" --userId="$N8N_USER_ID")
  echo "Publishing $workflow_id..."
  (cd /tmp && n8n publish:workflow --id="$workflow_id")
done

cat <<EOF

Imported and published ${#WORKFLOW_IDS[@]} MedicareGuard workflows.

Next steps:
  1. Add these values to the environment used to start n8n:
       MG_API_URL=http://localhost:4000/api
       MG_API_TOKEN=<token from: cd backend && npm run token:n8n>
  2. Restart n8n.
  3. Verify: curl -X POST http://localhost:5678/webhook/mg-ransomware -H 'Content-Type: application/json' -d '{"entityId":"<alert-uuid>"}'
EOF
