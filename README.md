# MedicareGuard SOC

**A full-stack security operations platform for healthcare environments.**

MedicareGuard unifies alert triage, threat intelligence, asset exposure, incident response, firewall policy, compliance evidence and n8n-driven automation in one production-style SOC console. It ships with a 42-table PostgreSQL schema, a 544-endpoint REST API, a 21-route Next.js console, four 40-node n8n workflows and a realistic seeded dataset for demos.

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=nodedotjs&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white">
  <img alt="n8n" src="https://img.shields.io/badge/n8n-2.41-EA4B71?logo=n8n&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow">
</p>

---

## Why MedicareGuard

Healthcare SOC teams deal with PHI exposure, clinical downtime and regulatory evidence requirements that generic security tools do not model. MedicareGuard is built around those constraints:

- **Clinical context first** — assets, incidents and alerts carry business criticality and HIPAA/NIST/ISO control mappings.
- **Analyst-grade triage** — severity, MITRE ATT&CK mapping, risk scoring, SLA countdowns, assignment and full audit history.
- **Response automation** — every containment workflow is inspectable in the UI and importable into n8n.
- **Evidence by default** — immutable activity logs, audit trails, report schedules and compliance scoring.
- **Runs offline** — the AI analyst is grounded on live SOC data and works without an external model provider.

## Screenshots

| Command Center | Alert Queue |
| --- | --- |
| ![Dashboard](docs/screenshots/dashboard.png) | ![Alerts](docs/screenshots/alerts.png) |
| **Threat Landscape** | **AI Analyst** |
| ![Threats](docs/screenshots/threats.png) | ![AI Analyst](docs/screenshots/ai.png) |
| **SOAR Automation** | **Firewall Policy** |
| ![Automation](docs/screenshots/automation.png) | ![Firewall](docs/screenshots/firewall.png) |

<details>
<summary><strong>More screenshots</strong> — incidents, assets, vulnerabilities, reports, logs, users, settings</summary>

| Module | Preview |
| --- | --- |
| Incidents | ![Incidents](docs/screenshots/incidents.png) |
| Asset inventory | ![Assets](docs/screenshots/assets.png) |
| Vulnerabilities | ![Vulnerabilities](docs/screenshots/vulnerabilities.png) |
| Threat intelligence | ![Threat intel](docs/screenshots/threat-intel.png) |
| Response playbooks | ![Playbooks](docs/screenshots/playbooks.png) |
| Reports | ![Reports](docs/screenshots/reports.png) |
| Activity logs | ![Logs](docs/screenshots/logs.png) |
| Users & roles | ![Users](docs/screenshots/users.png) |
| Settings | ![Settings](docs/screenshots/settings.png) |

</details>

## Architecture

```mermaid
flowchart LR
  subgraph Client
    B["Next.js 15 console<br/>21 routes · dark SOC UI"]
  end

  subgraph Edge
    N["nginx<br/>:8080"]
  end

  subgraph Services
    A["Express API<br/>544 endpoints"]
    W["n8n 2.41<br/>4 × 40-node workflows"]
  end

  subgraph Data
    P[("PostgreSQL 16<br/>42 tables · 5 views")]
  end

  B -->|REST + JWT| N
  N --> A
  N --> B
  N -->|/n8n| W
  A --> P
  W -->|Postgres + SOC API| P
  W -->|Slack · SMTP · EDR| X["External systems"]
  A -->|webhook dispatch| W
```

**Request flow:** the browser calls the API with a JWT, the API enforces RBAC and writes an audit record, and automation runs are dispatched to n8n webhooks. When n8n is unavailable the API records the run as `queued` so it can be replayed.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Recharts, Lucide |
| Backend | Node.js 20+, Express 4, PostgreSQL (`pg`), JWT, bcrypt, Helmet, rate limiting |
| Database | PostgreSQL 16 — 42 tables, 5 analytics views, triggers and indexes |
| Automation | n8n 2.41 — 4 workflows × 40 executable nodes |
| Infrastructure | Docker Compose, multi-stage Dockerfiles, nginx reverse proxy |
| AI | Deterministic, telemetry-grounded analyst with optional OpenAI provider |
| Testing | 58-check integration smoke suite, TypeScript checks, Playwright screenshots |

## Feature map

| Module | Capabilities |
| --- | --- |
| Command Center | Posture score, live attack map, severity mix, SLA risk, automation health, recent activity |
| Alert Queue | Filtering, severity/status tabs, assignment, risk bars, MITRE mapping, CSV export, detail timeline |
| Incidents | P1–P4 priorities, SLA countdowns, containment state, linked alerts, response timeline |
| Threat Landscape | Geo attack origins, campaigns, indicators, severity distribution, MITRE coverage |
| Threat Intelligence | IOC registry, confidence/risk scoring, source tracking, enrichment actions |
| Vulnerabilities | CVE register, CVSS/EPSS context, affected assets, remediation status, SLA tracking |
| Asset Inventory | Business criticality, ownership, risk score, OS/IP/hostname, exposure hotspots |
| Firewall Policy | Allow/deny rules, hit counts, simulation, apply actions, direction/protocol filters |
| Response Playbooks | Repeatable procedures for DDoS, malware, identity, exfiltration, phishing and ransomware |
| SOAR Automation | Workflow catalogue, node/stage metadata, execution history, enable toggles, manual runs |
| AI Analyst | Grounded investigations, suggested prompts, live SOC context, AI insights, conversation history |
| Reports | Executive/operational/compliance reports, PDF/CSV/JSON export, scheduled delivery |
| Users & Roles | RBAC, MFA posture, account status, directory filters, role permissions |
| Activity Logs | Immutable event stream, audit trail, severity levels, actor/resource/IP attribution |
| Settings | Profile, MFA, integrations, platform configuration, runtime health |

## Role-based access control

| Role | Level | Access |
| --- | --- | --- |
| `admin` | 100 | Full platform access, users, roles, settings and every operational module |
| `analyst` | 80 | Triage and respond: alerts, threats, assets, incidents, firewall, reports, AI |
| `hunter` | 60 | Detection and intel: alerts, threats, scans, logs, reports export, AI |
| `viewer` | 10 | Read-only access to operational data plus the AI analyst |

Permissions are enforced by `requirePermission` middleware and embedded in the JWT. The UI adapts module actions to the active role.

## Quick start (Docker)

```bash
git clone https://github.com/Chamm286/MedicareGuard.git
cd MedicareGuard
cp .env.example .env

# Change JWT_SECRET, N8N_ENCRYPTION_KEY and the n8n password before exposing this stack.
docker compose up -d --build
```

| Service | URL |
| --- | --- |
| SOC console | http://localhost:3000 |
| REST API | http://localhost:4000/api |
| API health | http://localhost:4000/api/health |
| n8n | http://localhost:5678 |
| nginx entrypoint (optional) | http://localhost:8080 (`docker compose --profile proxy up -d`) |

The backend applies the schema and seeds demo data on first start (`SEED_ON_START=true`).

### Demo accounts

| Email | Password | Role |
| --- | --- | --- |
| `admin@medicareguard.io` | `Admin@123` | Admin |
| `analyst@medicareguard.io` | `Analyst@123` | Analyst |
| `hunter@medicareguard.io` | `Hunter@123` | Threat hunter |
| `viewer@medicareguard.io` | `Viewer@123` | Viewer |

> These credentials are for local demos only. Rotate them before any shared deployment.

## Local development

Prerequisites: Node.js 20+, npm, Docker.

```bash
cp .env.example .env

# Start PostgreSQL only (host port 5433)
docker compose up -d postgres

# Point host processes at the exposed port
export DATABASE_URL=postgresql://medicare:medicare@localhost:5433/medicareguard
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5433

make install
make db-migrate
make db-seed
make dev
```

- Console: http://localhost:3000
- API: http://localhost:4000/api
- n8n (optional): `docker compose up -d n8n`

Useful commands:

```bash
make test          # 58-check API smoke suite (544 endpoints)
make typecheck     # frontend TypeScript check
make screenshots   # recapture docs/screenshots with Playwright
make n8n-build     # regenerate the four 40-node n8n workflows
make n8n-token     # mint a 30-day JWT for n8n callbacks
make n8n-setup     # import, publish and activate the workflows
make docker-reset  # stop stack and delete volumes
```

### Live n8n integration

The console dispatches runs to n8n webhooks; the workflows enrich the case through the SOC API and PostgreSQL, then call `POST /api/automation/executions/:id/complete` so the UI shows the final status, duration and node count.

```bash
# 1. Mint a token and expose it to n8n
cd backend && npm run --silent token:n8n > /tmp/mg-n8n-token
export MG_API_URL=http://localhost:4000/api
export MG_API_TOKEN="$(cat /tmp/mg-n8n-token)"
export N8N_BLOCK_ENV_ACCESS_IN_NODE=false

# 2. From the repository root, import the credential and workflows
bash scripts/setup-n8n.sh

# 3. Restart n8n and dispatch a run
curl -X POST http://localhost:4000/api/automation/workflows/phishing-triage/run \
  -H "Authorization: Bearer $MG_API_TOKEN"
```

Full details, credential overrides and verification commands are in [`n8n/README.md`](n8n/README.md).

## API

All routes are prefixed with `/api`. Authentication uses a bearer JWT.

```bash
# Sign in
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@medicareguard.io","password":"Admin@123"}' | jq -r .token)

# Read the live dashboard summary
curl -s http://localhost:4000/api/dashboard/summary -H "Authorization: Bearer $TOKEN"

# List automation workflows
curl -s http://localhost:4000/api/automation/workflows -H "Authorization: Bearer $TOKEN"

# Trigger a response workflow
curl -s -X POST http://localhost:4000/api/automation/workflows/ransomware-containment/run \
  -H "Authorization: Bearer $TOKEN"
```

The API exposes 544 routes covering:

- `auth`, `users`, `roles`, `system`, `search`
- `alerts`, `incidents`, `threats`, `assets`, `vulnerabilities`, `firewall-rules`
- `logs`, `dashboard`, `stats`, `reports`, `ai`, `automation`
- generic CRUD for 34 supporting resources (playbooks, indicators, controls, integrations, comments, exports)

See `GET /api/_meta/resources` for the full resource registry.

## n8n workflows

| Workflow | Webhook | Outcome |
| --- | --- | --- |
| Ransomware Containment & Recovery | `/webhook/mg-ransomware` | Isolate endpoint, block C2, open P1 case, preserve evidence |
| Phishing Triage & Credential Reset | `/webhook/mg-phishing` | Detonate URL, revoke sessions, reset MFA, notify SOC |
| Vulnerability SLA Escalation | `/webhook/mg-vulnerability` | Enrich CVE, assign owner, create change request, escalate SLA |
| Continuous Compliance Evidence | `/webhook/mg-compliance` | Collect HIPAA/NIST/ISO evidence and write audit trail |

Each playbook contains 40 executable nodes and 9 sticky notes across ingest, enrichment, correlation, decision, response, verification, documentation and notification stages. The run is dispatched by the API, enriched through the simulated EDR/identity/sandbox/patch adapters, written to PostgreSQL and finalized back into the console.

Setup, credential overrides, environment variables and verification commands are documented in [`n8n/README.md`](n8n/README.md).

## Database

`database/schema.sql` defines 42 tables and 5 analytics views, including:

- Identity and access: `users`, `roles`, `sessions`, `password_resets`
- Detection: `alerts`, `alert_comments`, `threats`, `indicators`, `vulnerabilities`
- Response: `incidents`, `incident_timeline`, `playbooks`, `playbook_steps`, `firewall_rules`
- Exposure: `assets`, `asset_vulnerabilities`, `network_flows`, `compliance_controls`
- Operations: `activity_logs`, `audit_logs`, `reports`, `report_schedules`, `integrations`, `settings`

Views power the dashboard, severity mix, attack geography, top attackers and firewalls. Every operational table carries indexes for tenantless SOC-scale querying, and triggers maintain `updated_at` timestamps.

## Repository structure

```
.
├── backend/               Express API, services, middleware and scripts
│   ├── scripts/           migrate, seed, service-token and 58-check smoke suite
│   └── src/
│       ├── config/        env, database, resource and automation registries
│       ├── middleware/    JWT authentication, RBAC and error handling
│       ├── routes/        auth, alerts, threats, assets, incidents, reports, AI, automation
│       └── services/      AI analyst, automation runtime and audit logging
├── database/schema.sql    42 tables, 5 views, indexes and triggers
├── frontend/              Next.js 15 App Router console
│   ├── app/(app)/         dashboard and all operational modules
│   ├── components/        shell, tables, charts, threat map, command palette
│   └── lib/               API client, auth, navigation and formatting
├── n8n/                   4 importable 40-node workflows + setup guide
├── nginx/                 reverse proxy for console, API and n8n
├── docs/screenshots/      Playwright captures of every module
├── docker-compose.yml     PostgreSQL, backend, frontend, n8n and nginx
└── Makefile               developer workflow
```

## Security notes

- JWTs expire after 12 hours by default; sessions are stored hashed and can be revoked.
- Passwords use bcrypt with configurable rounds; login and API routes are rate limited.
- Helmet, CORS allow-listing and parameterised SQL are enabled throughout.
- Activity and audit logs capture actor, resource, IP and user agent for every mutation.
- `.env` is ignored by Git; only `.env.example` is committed.
- Before production: rotate `JWT_SECRET`, `N8N_ENCRYPTION_KEY`, database and n8n passwords, terminate TLS, and replace demo seeded credentials.
- The AI analyst defaults to deterministic, data-grounded responses. Adding `OPENAI_API_KEY` enables an external model provider, but the platform does not require it.

## Testing

```bash
cd backend && npm test
```

```
Endpoints discovered: 544
Checks: 58/58 passed
```

Frontend:

```bash
cd frontend
npx tsc --noEmit
npm run build
```

Screenshots (requires Playwright + Chromium):

```bash
npm install
npx playwright install chromium
make screenshots
```

## Roadmap

- [ ] Multi-tenant workspaces and per-tenant data isolation
- [ ] SAML/OIDC single sign-on and SCIM provisioning
- [ ] Sigma/YARA rule ingestion and detection-as-code
- [ ] Native EDR and SIEM connectors
- [ ] Live n8n execution streaming over WebSockets
- [ ] Immutable evidence store with object-lock retention

## License

Released under the [MIT License](LICENSE).
