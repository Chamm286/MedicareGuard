# n8n response workflows

MedicareGuard ships five focused n8n playbooks. Every workflow stays between **16 and 20 executable nodes** so it is easy to explain, review and demonstrate. Each scenario flow has six stage notes plus an overview note; the monitor has four stage notes plus an overview note.

| Workflow | Nodes | Trigger | Primary response |
| --- | --- | --- | --- |
| Ransomware Containment & Recovery | 20 | `POST /webhook/mg-ransomware` | EDR isolation, C2 block, P1 case, Telegram + Gmail alert |
| Phishing Triage & Credential Reset | 20 | `POST /webhook/mg-phishing` | Sandbox detonation, mailbox purge, session revocation, phone alert |
| Vulnerability SLA Escalation | 20 | `POST /webhook/mg-vulnerability` | EPSS/KEV scoring, owner assignment, change request, phone alert |
| Continuous Compliance Evidence | 20 | `POST /webhook/mg-compliance` | HIPAA/NIST/ISO evidence pack, immutable audit trail |
| Live Attack Monitor & Phone Alerts | 17 | `POST /webhook/mg-attack-monitor` + every 5 minutes | Telegram + Gmail digest of new critical/high attacks |

## Integration flow

```text
SOC console
   │  POST /api/automation/workflows/:id/run
   ▼
Express API ── webhook ──▶ n8n
   ▲                        │
   │                        ├─ POST /api/automation/simulate/:action
   │                        ├─ PostgreSQL enrichment / containment
   │                        ├─ Telegram Bot API  (phone push)
   │                        ├─ Gmail SMTP        (inbox + audit copy)
   │                        └─ POST /api/automation/executions/:id/complete
   └──────── live status, duration, node count and metrics ◀──┘
```

- `GET /api/automation/runtime` probes n8n and reports latency.
- `POST /api/automation/simulate/:action` provides deterministic EDR, identity, sandbox, patch and evidence adapters for demos.
- `POST /api/automation/executions/:executionId/complete` finalizes the execution and updates the console activity log.

## Local setup

Prerequisites: a local n8n instance, `sqlite3`, `python3`, and a seeded MedicareGuard database.

1. Open n8n once and create the owner account.
2. Mint a service token and add the n8n environment:

```bash
cd backend
npm run --silent token:n8n > /tmp/mg-n8n-token

export MG_API_URL=http://localhost:4000/api
export MG_API_TOKEN="$(cat /tmp/mg-n8n-token)"
export MG_CONSOLE_URL=http://localhost:3000
export N8N_BLOCK_ENV_ACCESS_IN_NODE=false

# Telegram phone alerts
export TELEGRAM_BOT_TOKEN="<bot token from @BotFather>"
export TELEGRAM_CHAT_ID="<your chat or group id>"

# Gmail / Google Workspace SMTP
export MG_SMTP_HOST=smtp.gmail.com
export MG_SMTP_PORT=465
export MG_SMTP_SECURE=true
export MG_SMTP_USER="<your gmail address>"
export MG_SMTP_PASSWORD="<16-character app password>"
export MG_SMTP_FROM="<sender address>"
export MG_ALERT_EMAIL="<inbox that should receive the alert>"
```

3. Import the PostgreSQL and SMTP credentials, publish the workflows and restart n8n:

```bash
bash scripts/setup-n8n.sh
```

The setup script imports `mg-postgres-credential`, imports `mg-smtp-credential` when the SMTP variables are present, imports all five workflows under the n8n owner and publishes them. It runs the n8n CLI from `/tmp` on purpose: a project `.env` containing `N8N_ENCRYPTION_KEY` would otherwise override the key used by the running instance.

For Docker, point the database credential at the Compose service instead:

```bash
MG_PG_HOST=postgres MG_PG_PORT=5432 bash scripts/setup-n8n.sh
```

### Rebuild the workflow definitions

```bash
make n8n-build   # regenerate n8n/workflows/*.json + manifest.json
make n8n-setup   # rebuild, import, publish and activate
```

## Phone alerts

The four scenario flows check `Notifications Ready?` before their alert branch. Both channels are enabled when `TELEGRAM_BOT_TOKEN` and `MG_SMTP_USER` are set:

- **Telegram** — instant push to the on-call phone, with workflow, severity, risk score and a direct console link.
- **Gmail** — an inbox and audit-friendly copy of the same alert through the imported SMTP credential.
- **Live Attack Monitor** — runs every five minutes, aggregates up to five unnotified critical/high alerts and pushes one digest; this is the "away from the laptop" view.

Gmail requires an **App Password**, not the normal Google account password. Enable 2-Step Verification, create an App Password for Mail, and use that value for `MG_SMTP_PASSWORD`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `MG_API_URL` | Base URL used by workflow HTTP Request nodes, default `http://localhost:4000/api` |
| `MG_API_TOKEN` | MedicareGuard JWT used by workflow callbacks; mint with `npm run token:n8n` |
| `MG_CONSOLE_URL` | Console URL embedded in alert messages, default `http://localhost:3000` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from `@BotFather` |
| `TELEGRAM_CHAT_ID` | Personal chat or SOC group that receives the phone push |
| `MG_SMTP_HOST` / `MG_SMTP_PORT` / `MG_SMTP_SECURE` | SMTP server, default Gmail `smtp.gmail.com:465` with SSL |
| `MG_SMTP_USER` / `MG_SMTP_PASSWORD` | Gmail address and App Password |
| `MG_SMTP_FROM` | Sender address on the alert email |
| `MG_ALERT_EMAIL` | Recipient inbox for the alert email |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE` | Must be `false` so workflows can read `$env` values |
| `N8N_BASE_URL` / `N8N_URL` | n8n base URL used by the API, default `http://localhost:5678` |
| `N8N_DB` | Path to the n8n SQLite database used by the setup script |

## Verify

```bash
TOKEN="$(cat /tmp/mg-n8n-token)"

curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/automation/runtime
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/automation/workflows

# Dispatch a scenario flow
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/automation/workflows/ransomware-containment/run

# Dispatch the phone-alert monitor
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/automation/workflows/live-attack-monitor/run

# Inspect finalized executions
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/automation/executions?limit=10"
```

A healthy run returns `202 dispatched`, then transitions to `success` with `nodeCount: 20` for a scenario flow or `nodeCount: 17` for the monitor. When both notification channels are configured, the same run also sends a Telegram message and a Gmail email.

## Credentials

- `MedicareGuard PostgreSQL` — auto-imported as `mg-postgres-credential`; host `localhost`, port `5433`, database `medicareguard`, user/password `medicare` for the local development stack.
- `MedicareGuard SMTP` — auto-imported as `mg-smtp-credential` when the `MG_SMTP_*` variables are set.
- Telegram uses the Bot API through an HTTP Request node and does not require an n8n credential.

External EDR, identity, ticketing and email actions use the simulated adapter exposed by the SOC API. Replace those HTTP Request nodes with real connectors for a production deployment. Secrets are never committed; tokens and passwords live only in the n8n environment.
