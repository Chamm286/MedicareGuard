#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
N8N_DB="${N8N_DB:-$HOME/.n8n/database.sqlite}"
N8N_TARGET="${N8N_TARGET:-auto}"
N8N_CONTAINER="${N8N_CONTAINER:-mg-n8n}"
N8N_DB_CONTAINER="${N8N_DB_CONTAINER:-mg-postgres}"
WORKFLOW_DIR="$ROOT/n8n/workflows"
WORKFLOW_IDS=(ransomware-containment phishing-triage vulnerability-sla compliance-evidence ecommerce-fraud-response live-attack-monitor ai-chat-analyst identity-attack impossible-travel fraud-confirmed-response)

N8N_USER_ID="${N8N_USER_ID:-}"
case "$N8N_TARGET" in
  auto)
    if command -v docker >/dev/null 2>&1 && [[ "$(docker inspect --format '{{.State.Running}}' "$N8N_CONTAINER" 2>/dev/null || true)" == "true" ]]; then
      N8N_TARGET="docker"
    elif command -v n8n >/dev/null 2>&1; then
      N8N_TARGET="local"
    else
      echo "Docker container '$N8N_CONTAINER' is not running and n8n CLI is not on PATH. Start n8n with 'docker compose up -d n8n' or set N8N_TARGET=local." >&2
      exit 1
    fi
    ;;
  local|docker) ;;
  *)
    echo "N8N_TARGET must be auto, local, or docker." >&2
    exit 1
    ;;
esac

if [[ "$N8N_TARGET" == "local" ]]; then
  if ! command -v n8n >/dev/null 2>&1; then
    echo "N8N_TARGET=local but n8n CLI is not on PATH." >&2
    exit 1
  fi
  if [[ ! -f "$N8N_DB" ]]; then
    echo "n8n database not found at $N8N_DB. Set N8N_DB to the correct path." >&2
    exit 1
  fi
  if [[ -z "$N8N_USER_ID" ]]; then
    N8N_USER_ID="$(sqlite3 "$N8N_DB" "SELECT id FROM user ORDER BY \"createdAt\" LIMIT 1;" 2>/dev/null || true)"
  fi
else
  if ! command -v docker >/dev/null 2>&1 || [[ "$(docker inspect --format '{{.State.Running}}' "$N8N_CONTAINER" 2>/dev/null || true)" != "true" ]]; then
    echo "N8N_TARGET=docker but container '$N8N_CONTAINER' is not running." >&2
    exit 1
  fi
  if [[ -z "$N8N_USER_ID" ]]; then
    N8N_USER_ID="$(docker exec "$N8N_DB_CONTAINER" sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT id FROM n8n.\"user\" WHERE \"roleSlug\" = \$\$global:owner\$\$ ORDER BY \"createdAt\" LIMIT 1;"' 2>/dev/null || true)"
  fi
fi

if [[ -z "$N8N_USER_ID" ]]; then
  echo "Could not find the n8n owner. Open n8n once to create the owner account, or set N8N_USER_ID." >&2
  exit 1
fi

if [[ "$N8N_TARGET" == "docker" ]]; then
  PG_HOST="${MG_PG_HOST:-postgres}"
  PG_PORT="${MG_PG_PORT:-5432}"
  PG_DB="${MG_PG_DATABASE:-$(docker exec "$N8N_DB_CONTAINER" printenv POSTGRES_DB 2>/dev/null || echo medicareguard)}"
  PG_USER="${MG_PG_USER:-$(docker exec "$N8N_DB_CONTAINER" printenv POSTGRES_USER 2>/dev/null || echo medicare)}"
  PG_PASSWORD="${MG_PG_PASSWORD:-$(docker exec "$N8N_DB_CONTAINER" printenv POSTGRES_PASSWORD 2>/dev/null || echo medicare)}"
  GROQ_API_KEY="${GROQ_API_KEY:-$(docker exec "$N8N_CONTAINER" printenv GROQ_API_KEY 2>/dev/null || true)}"
  MG_SMTP_HOST="${MG_SMTP_HOST:-$(docker exec "$N8N_CONTAINER" printenv MG_SMTP_HOST 2>/dev/null || true)}"
  MG_SMTP_PORT="${MG_SMTP_PORT:-$(docker exec "$N8N_CONTAINER" printenv MG_SMTP_PORT 2>/dev/null || true)}"
  MG_SMTP_SECURE="${MG_SMTP_SECURE:-$(docker exec "$N8N_CONTAINER" printenv MG_SMTP_SECURE 2>/dev/null || true)}"
  MG_SMTP_DISABLE_STARTTLS="${MG_SMTP_DISABLE_STARTTLS:-$(docker exec "$N8N_CONTAINER" printenv MG_SMTP_DISABLE_STARTTLS 2>/dev/null || true)}"
  MG_SMTP_USER="${MG_SMTP_USER:-$(docker exec "$N8N_CONTAINER" printenv MG_SMTP_USER 2>/dev/null || true)}"
  MG_SMTP_PASSWORD="${MG_SMTP_PASSWORD:-$(docker exec "$N8N_CONTAINER" printenv MG_SMTP_PASSWORD 2>/dev/null || true)}"
  MG_SMTP_FROM="${MG_SMTP_FROM:-$(docker exec "$N8N_CONTAINER" printenv MG_SMTP_FROM 2>/dev/null || true)}"
  TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-$(docker exec "$N8N_CONTAINER" printenv TELEGRAM_BOT_TOKEN 2>/dev/null || true)}"
else
  PG_HOST="${MG_PG_HOST:-localhost}"
  PG_PORT="${MG_PG_PORT:-5433}"
  PG_DB="${MG_PG_DATABASE:-medicareguard}"
  PG_USER="${MG_PG_USER:-medicare}"
  PG_PASSWORD="${MG_PG_PASSWORD:-medicare}"
fi

if [[ -z "${GROQ_API_KEY:-}" ]]; then
  echo "WARNING: GROQ_API_KEY is not set. The identity-attack and impossible-travel AI analysis nodes will be skipped/fail over. Set it in the environment or .env to enable Groq analysis." >&2
fi

run_n8n() {
  if [[ "$N8N_TARGET" == "docker" ]]; then
    docker exec -w /tmp "$N8N_CONTAINER" n8n "$@"
  else
    (cd /tmp && n8n "$@")
  fi
}

TMP_DIR="$(mktemp -d)"
CONTAINER_TMP_FILES=()
cleanup() {
  if [[ "$N8N_TARGET" == "docker" ]]; then
    for file in "${CONTAINER_TMP_FILES[@]}"; do
      docker exec --user 0 "$N8N_CONTAINER" rm -f "$file" >/dev/null 2>&1 || true
    done
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

import_credentials() {
  local input="$1"
  if [[ "$N8N_TARGET" == "docker" ]]; then
    local container_file="/tmp/medicareguard-$(basename "$input")"
    docker cp "$input" "$N8N_CONTAINER:$container_file"
    CONTAINER_TMP_FILES+=("$container_file")
    run_n8n import:credentials --input="$container_file" --userId="$N8N_USER_ID"
    docker exec --user 0 "$N8N_CONTAINER" rm -f "$container_file"
  else
    run_n8n import:credentials --input="$input" --userId="$N8N_USER_ID"
  fi
}

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

echo "Importing MedicareGuard PostgreSQL credential..."
import_credentials "$TMP_DIR/credential.json"

if [[ -n "${GROQ_API_KEY:-}" ]]; then
  python3 - "$TMP_DIR/groq.json" "${GROQ_API_KEY}" <<'PYCRED'
import json
import sys
path, api_key = sys.argv[1:]
credential = {
    "id": "mg-groq-credential",
    "name": "MedicareGuard Groq",
    "type": "groqApi",
    "data": {"apiKey": api_key},
}
json.dump([credential], open(path, "w"), indent=2)
PYCRED
  echo "Importing MedicareGuard Groq credential..."
  import_credentials "$TMP_DIR/groq.json"
else
  echo "Skipping Groq credential: set GROQ_API_KEY to enable AI analysis nodes."
fi

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
import_credentials "$TMP_DIR/smtp.json"
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
import_credentials "$TMP_DIR/telegram.json"
else
  echo "Skipping Telegram credential: set TELEGRAM_BOT_TOKEN to enable the Telegram node."
fi

for workflow_id in "${WORKFLOW_IDS[@]}"; do
  workflow_file="$workflow_id.json"
  if [[ "$workflow_id" == "identity-attack" ]]; then
    workflow_file="identity-attrack.json"
  fi
  file="$WORKFLOW_DIR/$workflow_file"
  if [[ ! -f "$file" ]]; then
    echo "Missing workflow definition: $file" >&2
    exit 1
  fi
  echo "Importing $workflow_id..."
  if [[ "$N8N_TARGET" == "docker" ]]; then
    workflow_input="/workflows/$workflow_file"
    if ! docker exec "$N8N_CONTAINER" test -r "$workflow_input"; then
      echo "Workflow is not readable in n8n container: $workflow_input" >&2
      exit 1
    fi
  else
    workflow_input="$file"
  fi
  run_n8n import:workflow --input="$workflow_input" --userId="$N8N_USER_ID"
  echo "Publishing $workflow_id..."
  run_n8n publish:workflow --id="$workflow_id"
done

echo "Using n8n target: $N8N_TARGET"

cat <<EOF

Imported and published ${#WORKFLOW_IDS[@]} MedicareGuard workflows.

Next steps:
  1. Ensure the n8n container has these values:
       MG_API_URL=http://mg-backend:4000/api
       N8N_AI_CHAT_URL=http://n8n:5678/webhook/mg-ai-chat
       MG_API_TOKEN=<token from: cd backend && npm run token:n8n>
  2. Restart n8n: docker compose restart n8n
  3. Verify from the host:
       curl -X POST https://n8n.cham164.id.vn/webhook/mg-ransomware \
         -H 'Content-Type: application/json' -d '{"entityId":"<alert-uuid>"}'
EOF
