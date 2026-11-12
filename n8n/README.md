# n8n response workflows

MedicareGuard ships focused n8n playbooks. Workflows use **5–24 executable nodes** (the identity playbook has 18 numbered stages plus supporting AI, Telegram, and frontend approval nodes; AI chat has 5). The identity-detection workflow uses Vietnamese names and stage labels. Automation canvases use colour-coded overview and stage notes.

| Workflow | Nodes | Trigger | Primary response |
| --- | --- | --- | --- |
| Cô lập & Phục hồi Ransomware | 17 | `POST /webhook/mg-ransomware` | Cô lập EDR, chặn C2, mở sự cố P1, cảnh báo Telegram + Gmail |
| Phân tích & Xử lý Phishing | 17 | `POST /webhook/mg-phishing` | Detonate sandbox, dọn hộp thư, thu hồi phiên, cảnh báo điện thoại |
| Leo thang SLA Lỗ hổng | 19 | `POST /webhook/mg-vulnerability` + cron `0 */6 * * *` | Chấm EPSS/KEV, giao chủ sở hữu, tạo yêu cầu thay đổi, cảnh báo |
| Bằng chứng Tuân thủ Liên tục | 19 | `POST /webhook/mg-compliance` + cron `0 2 * * *` | Gói bằng chứng HIPAA/NIST/ISO, nhật ký kiểm toán bất biến |
| Giám sát Tấn công Trực tiếp & Cảnh báo Điện thoại | 18 | `POST /webhook/mg-attack-monitor` + mỗi 5 phút | Bản tin Telegram + Gmail cho tấn công critical/high mới |
| Phản hồi Gian lận Thương mại điện tử | 13 | `POST /webhook/mg-ecommerce-fraud` | Giữ đơn, mở điều tra, cảnh báo SOC |
| Chat AI phân tích SOC | 5 | `POST /webhook/mg-ai-chat` | Trả lời câu hỏi SOC từ PostgreSQL |
| Phát hiện tấn công danh tính | 23 node · Groq AI | `POST /webhook/mg-identity-attack` | Dùng API MedicareGuard để lấy lịch sử đăng nhập, lưu bằng chứng/cảnh báo/audit; phát hiện tấn công tài khoản và leo thang đặc quyền bằng Groq + MITRE ATT&CK |
| Phát hiện Di chuyển Bất khả thi | 24 node · 0 node SQL · Groq AI | `POST /webhook/mg-impossible-travel` | So sánh vị trí hai phiên, tính vận tốc, phân tích fingerprint/IP reputation, lưu cảnh báo và chờ SOC duyệt trước khi thu hồi đúng phiên |

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
- Identity workflow nodes use authenticated MedicareGuard API endpoints for account context and persistence; they do not connect directly to PostgreSQL.

## Setup

Prerequisites: a running n8n instance and `python3`. The setup script automatically uses a local n8n CLI and SQLite database when available; otherwise it uses the running Docker container `mg-n8n` and PostgreSQL container `mg-postgres`. For Docker, start the stack first with `docker compose up -d n8n`.

1. Open n8n once and create the owner account.
2. Mint a service token and add the n8n environment:

```bash
cd backend
npm run --silent token:n8n > /tmp/mg-n8n-token

export MG_API_URL=http://localhost:4000/api
export MG_API_TOKEN="$(cat /tmp/mg-n8n-token)"
# Generate once, then keep the same value in the backend/n8n environment (for Docker, .env).
export MG_IDENTITY_WEBHOOK_TOKEN="$(openssl rand -hex 32)"
export MG_CONSOLE_URL=http://localhost:3000
export N8N_BLOCK_ENV_ACCESS_IN_NODE=false
export GROQ_API_KEY="<Groq API key from https://console.groq.com/keys>"

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

cd ..
```

3. Import the PostgreSQL, Groq and optional SMTP/Telegram credentials, then publish the workflows:

```bash
bash scripts/setup-n8n.sh
```

The setup script requires `GROQ_API_KEY`, `MG_API_TOKEN`, and a dedicated `MG_IDENTITY_WEBHOOK_TOKEN` of at least 32 characters. It imports the PostgreSQL, Groq, and authenticated Identity webhook credentials, imports optional SMTP/Telegram credentials when configured, and publishes all ten shipped workflows. Generate the dedicated webhook secret with `openssl rand -hex 32` and configure the same value for backend and n8n. Do not reuse `MG_API_TOKEN`: the latter is a privileged API JWT and is not exposed to the public webhook. The Identity webhook uses n8n Header Auth and rejects requests without the dedicated Bearer token. The identity-detection workflow keeps its existing workflow ID (`identity-attack`), webhook path, and JSON filename (`identity-attrack.json`).

Identity risk scoring weighs failed-login volume, unusual successful logins, privileged-access attempts, a failed-then-successful login from the same IP within 15 minutes, multiple correlated signal types, and account history. Alerts with the same account, source IP, and detection set are consolidated for 10 minutes; retries of the same execution remain idempotent. MedicareGuard API steps retry transient failures up to three times. Telegram delivery failure does not stop the approval and audit path; a rejected or unreachable Identity webhook is recorded as failed and shown in the frontend instead of being reported as queued.

The impossible-travel workflow verifies the internal webhook request using `MG_API_TOKEN` and accepts successful-login events only. Demo mode uses simulated coordinates. Live mode requires `MG_GEOIP_URL` to point to an HTTPS batch GeoIP service that accepts a JSON array of `{ "query": "IP" }` objects and returns an array with country, city and latitude/longitude fields. IP reputation uses `MG_IP_REPUTATION_URL` (defaults to `https://api.ipapi.is/?q=`). These services receive the IP addresses being checked. The Telegram node requires the MedicareGuard Telegram credential; a Telegram delivery failure is recorded while the approval path continues. After alerting, the workflow waits 70 seconds for an administrator decision in the SOC frontend; it only requests revocation of the specific suspicious session if approved. Rejected or expired requests do not revoke any session.

### Demo phát hiện di chuyển bất khả thi

The SOC console can start the workflow using an active non-admin account with at least two active sessions. Direct webhook requests must include `Authorization: Bearer <MG_API_TOKEN>` and a successful login payload:

```json
{
  "userEmail": "viewer@medicareguard.io",
  "ipAddress": "198.51.100.55",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "deviceFingerprint": "demo-device",
  "timestamp": "2026-11-06T03:00:00.000Z",
  "geoMode": "demo"
}
```

The workflow compares this event with the account's latest earlier, unrevoked session. Demo mode uses simulated San Francisco/Tokyo coordinates; live mode queries both IPs through the configured batch GeoIP provider. A session is only revoked after an administrator approves the alert in **Tự động hóa SOAR** within the 70-second approval window. The backend validates the session belongs to the supplied account and records the revocation in the audit log.

To explicitly select Docker (for example, when a local n8n CLI is also installed), run:

```bash
docker compose up -d --force-recreate n8n
N8N_TARGET=docker bash scripts/setup-n8n.sh
docker compose restart n8n
```

The recreate loads `GROQ_API_KEY` from `.env` into n8n so the setup script can import it as a credential. The Docker setup reads PostgreSQL settings from the running Compose container and uses the `postgres:5432` network address for the imported PostgreSQL credential. Override the target container names with `N8N_CONTAINER` or `N8N_DB_CONTAINER` if needed. For a local instance, set `N8N_TARGET=local` and `N8N_DB` if its SQLite database is not at `~/.n8n/database.sqlite`.

### Rebuild the workflow definitions

```bash
make n8n-build   # regenerate n8n/workflows/*.json + manifest.json
make n8n-setup   # rebuild, import, publish and activate using local n8n or Docker
```

## Demo phát hiện tấn công danh tính

Giao diện SOC có thể chạy demo bằng tài khoản không phải quản trị viên và các sự kiện giả lập. IP mẫu `203.0.113.42` được dành riêng cho tài liệu và không được kết nối. Webhook cũng nhận chuỗi sự kiện tường minh:

```json
{
  "userEmail": "viewer@medicareguard.io",
  "mode": "demo",
  "events": [
    { "type": "login_failed", "sourceIp": "203.0.113.42" },
    { "type": "login_failed", "sourceIp": "203.0.113.42" },
    { "type": "login_failed", "sourceIp": "203.0.113.42" },
    { "type": "login_failed", "sourceIp": "203.0.113.42" },
    { "type": "login_failed", "sourceIp": "203.0.113.42" },
    { "type": "login_success", "sourceIp": "203.0.113.42", "device": "demo-unrecognized-device" },
    { "type": "admin_access_denied", "sourceIp": "203.0.113.42", "targetResource": "admin/users" }
  ]
}
```

Workflow chỉ phân tích dữ liệu sự kiện được gửi vào; không thử đăng nhập và không thay đổi quyền tài khoản. Gọi webhook trực tiếp phải kèm `Authorization: Bearer "$MG_IDENTITY_WEBHOOK_TOKEN"`; không đưa token này vào mã frontend. Khi điểm rủi ro từ 70 trở lên, workflow tạo cảnh báo rồi tạm dừng tại **Chờ quản trị viên duyệt**. Quản trị viên duyệt/từ chối trong bảng **Tự động hóa SOAR** trên frontend; n8n kiểm tra quyết định định kỳ, ghi audit log rồi hoàn tất execution.

## Phone alerts

Every scenario flow checks **Telegram Ready?** and **Gmail Ready?** independently, so one channel can work without the other:

- **Telegram** — enabled by `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`; instant push to the on-call phone with workflow, severity, risk score and a direct console link.
- **Gmail** — enabled by `MG_SMTP_HOST` + `MG_SMTP_USER` + `MG_SMTP_PASSWORD`; inbox and audit-friendly copy through the imported SMTP credential.
- **Live Attack Monitor** — runs every five minutes, aggregates up to five unnotified critical/high alerts and pushes one digest; this is the "away from the laptop" view.

If Gmail is not configured, Telegram still fires and the flow continues. If Telegram is not configured, Gmail still fires. The live monitor only marks alerts as notified after Telegram delivery succeeds, so a missing bot token retries on the next five-minute run.

### Telegram bot in 30 seconds

1. Open Telegram, start **@BotFather**, send `/newbot`, choose a name and username.
2. Copy the bot token into `TELEGRAM_BOT_TOKEN`.
3. Send any message to your new bot, then put your numeric chat ID in `TELEGRAM_CHAT_ID`.
4. Run `bash scripts/check-alerts.sh --send` and confirm the message arrives.

A chat ID alone cannot send messages; Telegram always requires the bot token.

### Gmail App Password

Gmail requires an **App Password**, not the normal Google account password. Enable 2-Step Verification, create an App Password for Mail, and use that value for `MG_SMTP_PASSWORD`.

### Verify channels

```bash
# Reads ~/n8n-safe/n8n.env by default; override with N8N_ENV_FILE=/path/to/env
bash scripts/check-alerts.sh          # login/connectivity only
bash scripts/check-alerts.sh --send   # send a Telegram and Gmail test alert
```

The check never prints the token or app password. A successful run reports the Telegram bot username and the Gmail sender. Use `--send` once to confirm delivery to the phone and inbox.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `MG_API_URL` | Base URL used by workflow HTTP Request nodes, default `http://localhost:4000/api` |
| `MG_API_TOKEN` | MedicareGuard JWT used by workflow callbacks; mint with `npm run token:n8n` |
| `MG_IDENTITY_WEBHOOK_TOKEN` | Dedicated random Bearer secret required by the Identity webhook; use `openssl rand -hex 32`, separate from `MG_API_TOKEN` |
| `MG_CONSOLE_URL` | Console URL embedded in alert messages, default `http://localhost:3000` |
| `MG_N8N_UI_URL` | URL giao diện n8n được liên kết trong cảnh báo chờ duyệt, mặc định `http://localhost:5678` |
| `GROQ_API_KEY` | Tạo credential Groq cần cho bước AI phân tích danh tính |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from `@BotFather` |
| `TELEGRAM_CHAT_ID` | Personal chat or SOC group that receives the phone push |
| `MG_SMTP_HOST` / `MG_SMTP_PORT` / `MG_SMTP_SECURE` | SMTP server, default Gmail `smtp.gmail.com:465` with SSL |
| `MG_SMTP_USER` / `MG_SMTP_PASSWORD` | Gmail address and App Password |
| `MG_SMTP_DISABLE_STARTTLS` | Skip STARTTLS on plain SMTP relays such as a local Mailpit sink |
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

A healthy run returns `202 dispatched`, then transitions to `success` with `nodeCount: 17` for a scenario flow or `nodeCount: 16` for the monitor. When both notification channels are configured, the same run also sends a Telegram message and a Gmail email.

## Credentials

- `MedicareGuard PostgreSQL` — auto-imported as `mg-postgres-credential`; host `localhost`, port `5433`, database `medicareguard`, user/password `medicare` for the local development stack.
- `MedicareGuard SMTP` — auto-imported as `mg-smtp-credential` when the `MG_SMTP_*` variables are set.
- Telegram uses the Bot API through an HTTP Request node and does not require an n8n credential.

External EDR, identity, ticketing and email actions use the simulated adapter exposed by the SOC API. Replace those HTTP Request nodes with real connectors for a production deployment. Secrets are never committed; tokens and passwords live only in the n8n environment.
