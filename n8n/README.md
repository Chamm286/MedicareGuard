# n8n response workflows

MedicareGuard ships four production-style n8n playbooks. Each workflow has **40 executable nodes**, **9 sticky notes** and follows the same eight-column operating model: ingest → enrich → correlate → decide → respond → verify → document → notify.

| Workflow | Webhook | Trigger | Primary response |
| --- | --- | --- | --- |
| Ransomware Containment & Recovery | `POST /webhook/mg-ransomware` | Critical ransomware alert | EDR isolation, C2 block, forensic timeline, P1 case |
| Phishing Triage & Credential Reset | `POST /webhook/mg-phishing` | Reported phishing message | Sandbox detonation, mailbox quarantine, session revocation, MFA reset |
| Vulnerability SLA Escalation | `POST /webhook/mg-vulnerability` | New high-risk CVE | EPSS/KEV correlation, owner assignment, change request, SLA escalation |
| Continuous Compliance Evidence | `POST /webhook/mg-compliance` | Evidence request or schedule | HIPAA/NIST/ISO evidence pack, immutable audit trail |

The workflows call back into the SOC API, so the console shows live execution state instead of a fire-and-forget dispatch.

## Integration flow

```text
SOC console
   │  POST /api/automation/workflows/:id/run
   ▼
Express API ── webhook ──▶ n8n
   ▲                        │
   │                        ├─ POST /api/automation/simulate/:action
   │                        ├─ PostgreSQL enrichment and containment writes
   │                        └─ POST /api/automation/executions/:id/complete
   └──────── live status, duration, node count and metrics ◀──┘
```

- `GET /api/automation/runtime` probes n8n and reports latency.
- `POST /api/automation/simulate/:action` provides deterministic EDR, identity, sandbox, patch and evidence adapters for demos.
- `POST /api/automation/executions/:executionId/complete` finalizes the execution, updates the activity log and exposes the result in the UI.

## Local setup

Prerequisites: a local n8n instance, `sqlite3`, `python3`, and a seeded MedicareGuard database.

1. Open n8n once and create the owner account.
2. Mint a service token and export the n8n environment:

```bash
cd backend
npm run --silent token:n8n > /tmp/mg-n8n-token
export MG_API_URL=http://localhost:4000/api
export MG_API_TOKEN="$(cat /tmp/mg-n8n-token)"
export N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```

3. Start n8n with those variables in its environment.
4. Import the PostgreSQL credential, publish the workflows and restart n8n:

```bash
bash scripts/setup-n8n.sh
```

The setup script imports `mg-postgres-credential`, imports all four workflows under the n8n owner and publishes them. It runs the n8n CLI from `/tmp` on purpose: a project `.env` containing `N8N_ENCRYPTION_KEY` would otherwise override the key used by the running instance.

For Docker, point the credential at the Compose service instead:

```bash
MG_PG_HOST=postgres MG_PG_PORT=5432 bash scripts/setup-n8n.sh
```

### Rebuild the workflow definitions

```bash
make n8n-build   # regenerate n8n/workflows/*.json + manifest.json
make n8n-setup   # rebuild, import, publish and activate
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `MG_API_URL` | Base URL used by workflow HTTP Request nodes, default `http://localhost:4000/api` |
| `MG_API_TOKEN` | MedicareGuard JWT used by workflow callbacks; mint with `npm run token:n8n` |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE` | Must be `false` so the workflows can read `$env.MG_API_URL` and `$env.MG_API_TOKEN` |
| `N8N_BASE_URL` / `N8N_URL` | n8n base URL used by the API, default `http://localhost:5678` |
| `N8N_DB` | Path to the n8n SQLite database used by the setup script |

## Verify

```bash
TOKEN="$(cat /tmp/mg-n8n-token)"

# Runtime probe and workflow catalogue
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/automation/runtime
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/automation/workflows

# Dispatch a workflow from the SOC API
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/automation/workflows/ransomware-containment/run

# Inspect finalized executions
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/automation/executions?limit=10"
```

A healthy run returns `202 dispatched`, then transitions to `success` with `nodeCount: 40` after the workflow calls the completion endpoint.

## Credentials

- `MedicareGuard PostgreSQL` — auto-imported as `mg-postgres-credential`; host `localhost`, port `5433`, database `medicareguard`, user/password `medicare` for the local development stack.
- External EDR, identity, ticketing and email actions use the simulated adapter exposed by the SOC API. Replace those HTTP Request nodes with real connectors for a production deployment.

Workflow JSON, the generated `manifest.json` and the PostgreSQL credential are the only assets needed to reproduce the automation suite. Secrets are never committed; `MG_API_TOKEN` lives only in the n8n environment.
