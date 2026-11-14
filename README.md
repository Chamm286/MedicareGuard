# MedicareGuard SOC

**A full-stack security operations platform for healthcare environments.**

MedicareGuard unifies alert triage, threat intelligence, asset exposure, incident response, firewall policy, compliance evidence and n8n-driven automation in one production-style SOC console. It ships with a 52-table PostgreSQL schema, a 575-endpoint REST API, a 28-route Next.js console and storefront, ten focused Vietnamese n8n workflows (17–24 nodes each, 13 for e-commerce fraud, 11 for fraud confirmation, 5 for AI chat) and a realistic seeded dataset for demos.

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
| **Medicare Store** | **Store Admin** |
| ![Store](docs/screenshots/store-home.png) | ![Store admin](docs/screenshots/store-admin.png) |

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
    B["Next.js 15 console + store<br/>28 routes · dark SOC UI"]
  end

  subgraph Edge
    N["nginx<br/>:8080"]
  end

  subgraph Services
    A["Express API<br/>574 endpoints"]
    W["n8n 2.41<br/>10 focused workflows"]
  end

  subgraph Data
    P[("PostgreSQL 16<br/>52 tables · 5 views")]
    M["Mailpit<br/>SMTP 1025 · UI 8025"]
  end

  B -->|REST + JWT| N
  N --> A
  N --> B
  N -->|n8n.cham164.id.vn| W
  A --> P
  W -->|Postgres + SOC API| P
  W -->|SMTP 1025| M
  W -->|Slack · EDR| X["External systems"]
  A -->|webhook dispatch| W
```

**Request flow:** the browser calls the API with a JWT, the API enforces RBAC and writes an audit record, and automation runs are dispatched to n8n webhooks. When n8n is unavailable the API records the run as `queued` so it can be replayed.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Recharts, Lucide |
| Backend | Node.js 20+, Express 4, PostgreSQL (`pg`), JWT, bcrypt, Helmet, rate limiting |
| Database | PostgreSQL 16 — 52 tables, 5 analytics views, triggers and indexes |
| Automation | n8n 2.41 — 10 focused workflows (17–24 nodes, 13 e-commerce fraud, 11 fraud confirmation, 5 AI chat), Vietnamese labels |
| Infrastructure | Docker Compose, multi-stage Dockerfiles, nginx reverse proxy |
| AI | n8n + PostgreSQL grounded analyst, optional OpenAI/Gemini provider |
| Testing | 61-check smoke suite, 21-check store security suite, TypeScript checks, Playwright screenshots |

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
| Medicare Store | Product catalogue, cart, coupons, guest/customer checkout, order tracking, customer accounts, IP/geo capture and fraud scoring |
| Store Admin | Revenue dashboard, order/risk triage, product CRUD (create/edit/archive), stock and fraud-event operations for admins |
| AI Analyst | Grounded investigations, suggested prompts, live SOC context, AI insights, conversation history |
| Reports | Executive/operational/compliance reports, PDF/CSV/JSON export, scheduled delivery |
| Users & Roles | RBAC, MFA posture, account status, directory filters, role permissions |
| Activity Logs | Immutable event stream, audit trail, severity levels, actor/resource/IP attribution |
| Settings | Profile, MFA, integrations, platform configuration, runtime health |

## Role-based access control

| Role | Level | SOC modules | Medicare Store admin | Users & Roles | Activity / audit logs |
| --- | --- | --- | --- | --- | --- |
| `admin` | 100 | Toàn bộ module vận hành, cài đặt nền tảng, tự động hóa và báo cáo | Toàn quyền: xem doanh thu, xử lý đơn, chặn IP, tạo/sửa/lưu trữ sản phẩm, tồn kho | Tạo, sửa, xóa thành viên; gán vai trò; cập nhật bộ quyền của vai trò | Đọc, lọc và xuất |
| `analyst` | 80 | Phân loại và ứng phó: cảnh báo, mối đe dọa, tài sản, sự cố, tường lửa, báo cáo, AI, tự động hóa | Xem dashboard, xử lý trạng thái đơn, chặn IP gian lận; **không** sửa sản phẩm | Xem danh bạ và quyền của vai trò (chỉ đọc) | Đọc |
| `hunter` | 60 | Săn tìm và tình báo: cảnh báo, mối đe dọa, quét tài sản, nhật ký, xuất báo cáo, AI | Không truy cập | Không truy cập | Đọc |
| `viewer` | 10 | Chỉ đọc dữ liệu vận hành và Chuyên viên AI | Không truy cập | Không truy cập | Không truy cập |

Backend enforcement:

- `requirePermission("read" | "write")` bảo vệ các API nghiệp vụ; JWT mang theo danh sách quyền của vai trò.
- `authorize("admin")` bảo vệ các thao tác quản trị người dùng, vai trò và **CRUD sản phẩm** (`POST/PATCH/DELETE /api/store/admin/products`).
- Analyst vẫn có thể `PATCH /api/store/admin/orders/:id` và các endpoint phản hồi gian lận để vận hành SOC, nhưng không thể thay đổi danh mục sản phẩm.
- UI ẩn nút thao tác với vai trò không đủ quyền, đồng thời backend trả `403` nếu gọi trực tiếp API — không phụ thuộc vào việc ẩn nút.

Khi thay đổi quyền của một vai trò, người dùng thuộc vai trò đó cần đăng nhập lại (hoặc làm mới token) để JWT nhận bộ quyền mới.

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
| Swagger / OpenAPI | http://localhost:4000/api/docs · http://localhost:4000/api/openapi.json |
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

## Production deployment (AWS EC2 · `https://cham164.id.vn`)

The public stack runs on a single EC2 instance behind a host-level Nginx with Let's Encrypt TLS. Docker Compose provides PostgreSQL, the API, the Next.js console, Mailpit and n8n.

| Public endpoint | Upstream |
| --- | --- |
| `https://cham164.id.vn/` | `mg-frontend:3000` |
| `https://cham164.id.vn/api/` | `mg-backend:4000` |
| `https://n8n.cham164.id.vn/` | `mg-n8n:5678` (Nginx Basic Auth) |
| `https://mail.cham164.id.vn/` (optional) | `mg-mailpit:8025` (Nginx Basic Auth) |

Production `.env` essentials:

```dotenv
NODE_ENV=production
CORS_ORIGINS=https://cham164.id.vn,https://www.cham164.id.vn
NEXT_PUBLIC_API_URL=https://cham164.id.vn/api

N8N_HOST=n8n.cham164.id.vn
N8N_PROTOCOL=https
N8N_EDITOR_BASE_URL=https://n8n.cham164.id.vn/
WEBHOOK_URL=https://n8n.cham164.id.vn/
MG_CONSOLE_URL=https://cham164.id.vn
MG_N8N_UI_URL=https://n8n.cham164.id.vn

MG_SMTP_HOST=mg-mailpit
MG_SMTP_PORT=1025
MG_SMTP_SECURE=false
MG_SMTP_DISABLE_STARTTLS=true
MG_SMTP_USER=mailpit
MG_SMTP_PASSWORD=mailpit
MG_SMTP_FROM=alerts@medicareguard.io
MG_ALERT_EMAIL=soc@medicareguard.io
```

`NEXT_PUBLIC_API_URL` is embedded at **build time**. After changing it, rebuild the frontend image (`docker compose build --no-cache frontend`) instead of only restarting the container.

Mailpit is part of `docker-compose.yml` (`mg-mailpit`, SMTP `1025`, UI `8025`). Ports are bound to `127.0.0.1`, so the UI is reachable through Nginx or an SSH tunnel:

```bash
ssh -L 8025:127.0.0.1:8025 ubuntu@3.27.93.119
# then open http://localhost:8025
```

The n8n container is also bound to `127.0.0.1:5678`; never expose `5678` in the EC2 Security Group. Publish it through `n8n.cham164.id.vn` with TLS and Basic Auth instead.

### DBeaver through an SSH tunnel (PostgreSQL is never public)

PostgreSQL is published as `127.0.0.1:5433:5432` only, so DBeaver must reach it via an SSH tunnel. Keep the EC2 Security Group closed on `5432`/`5433`.

Option A — tunnel created inside DBeaver (recommended):

- Connection → PostgreSQL
- Host: `127.0.0.1`, Port: `5433`, Database: `medicareguard`, user `medicare`, password `medicare`
- SSH tab: enabled, host `3.27.93.119`, port `22`, user `ubuntu`, key `~/.ssh/medicareguard.pem`
- Test connection → `SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';` returns `52` (plus 5 views).

Option B — manual tunnel:

```bash
ssh -N -L 5434:127.0.0.1:5433 ubuntu@3.27.93.119
# DBeaver: host 127.0.0.1, port 5434, DB medicareguard, user medicare
```

The `public` schema holds 52 base tables + 5 views; n8n keeps its own tables in the `n8n` schema.

Re-deploy after a code or environment change:

```bash
git pull --ff-only
docker compose build --no-cache frontend backend
docker compose up -d --remove-orphans
docker compose logs -f --tail=100 backend n8n
```

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
- Swagger UI: http://localhost:4000/api/docs
- n8n (optional): `docker compose up -d n8n`

Useful commands:

```bash
make test          # 61-check API smoke suite (574 endpoints)
cd backend && npm run test:security   # 21-check e-commerce security suite
make typecheck     # frontend TypeScript check
make screenshots   # recapture docs/screenshots with Playwright
make n8n-build     # regenerate the focused n8n workflows
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
export TELEGRAM_BOT_TOKEN="<bot token>"
export TELEGRAM_CHAT_ID="<chat id>"
export MG_SMTP_HOST=smtp.gmail.com
export MG_SMTP_USER="<gmail address>"
export MG_SMTP_PASSWORD="<gmail app password>"
export MG_ALERT_EMAIL="<where to receive alerts>"
export MG_SMTP_FROM="<sender address>"

# 2. From the repository root, import the credential and workflows
bash scripts/setup-n8n.sh

# 3. Restart n8n and dispatch a run
curl -X POST http://localhost:4000/api/automation/workflows/phishing-triage/run \
  -H "Authorization: Bearer $MG_API_TOKEN"
```

Verify the phone and inbox channels after adding credentials:

```bash
bash scripts/check-alerts.sh          # authenticate only
bash scripts/check-alerts.sh --send   # send Telegram + Gmail test alerts
```

Full details, credential overrides and verification commands are in [`n8n/README.md`](n8n/README.md).

## CI/CD Pipeline for MedicareGuard SOC

GitHub Actions tự động build Docker image và push lên Docker Hub mỗi khi có
`push`/`pull_request` vào nhánh `develop` hoặc `main`. Cấu hình nằm tại
[`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml).

- **Trigger:** `push` và `pull_request` vào `develop`, `main`.
- **Build song song:** dùng `strategy.matrix` để build 2 image cùng lúc.
- **Cache:** `docker/build-push-action` với `cache-from/cache-to: type=gha,mode=max`
  (scope riêng cho từng image) giúp các lần build sau nhanh hơn.
- **Tag tự động** (`docker/metadata-action`):
  - tên nhánh: `develop`, `main`
  - commit SHA ngắn: `sha-abc1234`
  - `latest`: chỉ khi push lên `main`
- **Pull request:** chỉ build để kiểm tra, **không push** (PR từ fork không có secrets).

### Docker images được build

| Image | Context | Dockerfile |
| --- | --- | --- |
| `medicareguard-soc-frontend` | `./frontend` | `frontend/Dockerfile` |
| `medicareguard-soc-backend` | `.` (repo root) | `backend/Dockerfile` |

Docker Hub: **https://hub.docker.com/u/chamniee**

```bash
docker pull chamniee/medicareguard-soc-frontend:develop
docker pull chamniee/medicareguard-soc-backend:develop
```

> Tag `latest` chỉ xuất hiện sau khi push lên nhánh `main`.

### Secrets & Variables cần thiết

Vào **GitHub → Repo → Settings → Secrets and variables → Actions**:

| Loại | Tên | Mô tả |
| --- | --- | --- |
| Secret | `DOCKERHUB_TOKEN` | Personal Access Token Docker Hub (quyền **Read & Write**) |
| Variable | `DOCKERHUB_USERNAME` | Username Docker Hub, dùng làm namespace image |

> **Bảo mật:** tuyệt đối không commit file `.env` / token lên GitHub. Repo đã
> `.gitignore` các file `.env*` (trừ `.env.example`). Chỉ dùng GitHub Secrets.

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

The API exposes 574 routes covering:

- `auth`, `users`, `roles`, `system`, `search`
- `alerts`, `incidents`, `threats`, `assets`, `vulnerabilities`, `firewall-rules`
- `logs`, `dashboard`, `stats`, `reports`, `ai`, `automation`
- `store` — products, cart, coupons, checkout, orders, reviews, customer auth and store admin
- generic CRUD for 34 supporting resources (playbooks, indicators, controls, integrations, comments, exports)

See `GET /api/_meta/resources` for the full resource registry.

## SePay payment gateway (Medicare Store)

Medicare Store supports four payment methods: `cod`, `bank_transfer`, `card` and `sepay`. The SePay flow generates a VietQR image from the order total and confirms the order automatically when SePay calls the webhook.

### 1. Prepare the SePay account

1. Create a merchant account at <https://sepay.vn> and link the receiving bank account.
2. Open **Cấu hình → Cửa hàng** (or **Tài khoản ngân hàng**) and note the **số tài khoản**, **mã ngân hàng** (e.g. `MBBank`, `Vietcombank`, `TPBank`) and **tên chủ tài khoản**.
3. Open **Cấu hình → Webhook** (or **API/Webhook**) and create a webhook secret. SePay sends it as `Authorization: Bearer <secret>`.
4. Optional: use the SePay sandbox/test bank account first; no real money is transferred in test mode.

### 2. Configure the backend

Add the following to `.env`, then recreate the backend container:

```dotenv
SEPAY_ACCOUNT_NUMBER=0123456789
SEPAY_BANK_CODE=MBBank
SEPAY_ACCOUNT_NAME=NGUYEN VAN A
SEPAY_WEBHOOK_SECRET=<webhook-secret>
```

```bash
docker compose up -d --force-recreate backend
```

When these values are missing, checkout still works but the order page shows the message `Cấu hình SEPAY_ACCOUNT_NUMBER và SEPAY_BANK_CODE để tạo mã QR thanh toán.`

### 3. Configure the SePay webhook

| Field | Value |
| --- | --- |
| URL | `https://cham164.id.vn/api/store/payments/sepay/webhook` |
| Method | `POST` |
| Auth | `Bearer <SEPAY_WEBHOOK_SECRET>` |
| Events | Money in / transfer received |

The handler matches the order number inside the transfer content. Order numbers use the format `MG-YYYYMMDD-XXXX` (generated at checkout) and must be preserved verbatim in the bank transfer description. The amount must match the order total within ±1 VND; a mismatch is stored as a `payment_mismatch` security event and rejected.

### 4. Test the flow

```bash
# Create an order with payment_method=sepay in the store UI, then simulate SePay:
curl -X POST https://cham164.id.vn/api/store/payments/sepay/webhook \
  -H 'Authorization: Bearer <SEPAY_WEBHOOK_SECRET>' \
  -H 'Content-Type: application/json' \
  -d '{"content":"MG-20261114-1234","transferAmount":250000,"referenceCode":"SEPAY-TEST-1"}'

# Expected: {"ok":true,"matched":true,"orderNumber":"MG-20261114-1234"}
```

A successful webhook sets `store_orders.payment_status = 'paid'`, moves the order to `processing` (unless it is `on_hold` for fraud review), and marks the payment row as `captured`. Confirm in the console at **Store → Orders** and in the SePay dashboard webhook log.

### Store admin operations

| Method | Endpoint | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/store/admin/stats` | admin, analyst | Doanh thu, đơn mở, khách hàng, top sản phẩm, sự kiện gian lận |
| `GET` | `/api/store/admin/orders` | admin, analyst | Danh sách đơn có tìm kiếm, lọc trạng thái và phân trang |
| `GET` | `/api/store/admin/orders/:id` | admin, analyst | Chi tiết đơn, item, payment và security event |
| `PATCH` | `/api/store/admin/orders/:id` | admin, analyst | Phê duyệt, tạm giữ hoặc hủy đơn |
| `GET` | `/api/store/admin/products` | admin, analyst | Toàn bộ sản phẩm (kể cả nháp/lưu trữ), lọc `q`, `status`, phân trang |
| `POST` | `/api/store/admin/products` | admin | Tạo sản phẩm mới |
| `PATCH` | `/api/store/admin/products/:id` | admin | Sửa giá, tồn kho, ảnh, trạng thái, mô tả |
| `DELETE` | `/api/store/admin/products/:id` | admin | Lưu trữ mềm sản phẩm (`status = 'archived'`) |
| `POST` | `/api/store/admin/orders/:id/record-fraud-response` | admin, analyst | Ghi nhận kết quả phản hồi gian lận từ n8n |
| `POST` | `/api/store/admin/orders/:id/fraud-confirmed` | admin, analyst | Xác nhận gian lận, hủy đơn và gửi IP sang n8n để chặn |

The Store Admin UI (`/store/admin`) has three tabs: **Tổng quan** (doanh thu 7 ngày, top sản phẩm, sự kiện gian lận), **Đơn hàng** (lọc rủi ro, chi tiết, phê duyệt/hủy/chặn IP) and **Sản phẩm** (tạo/sửa/lưu trữ, tồn kho). Product mutation buttons are only rendered for `admin`; the API also enforces `authorize("admin")`.

## n8n workflows

| Workflow | Webhook | Outcome |
| --- | --- | --- |
| Cô lập & Phục hồi Ransomware | `/webhook/mg-ransomware` | Cô lập máy trạm, chặn C2, mở sự cố P1, lưu bằng chứng |
| Phân tích & Xử lý Phishing | `/webhook/mg-phishing` | Detonate URL, thu hồi phiên, đặt lại MFA, báo SOC |
| Leo thang SLA Lỗ hổng | `/webhook/mg-vulnerability` | Làm giàu CVE, giao chủ sở hữu, tạo yêu cầu thay đổi, leo thang SLA |
| Bằng chứng Tuân thủ Liên tục | `/webhook/mg-compliance` | Thu thập bằng chứng HIPAA/NIST/ISO và ghi nhật ký kiểm toán |
| Phản hồi Gian lận Thương mại điện tử | `/webhook/mg-ecommerce-fraud` | Xác minh IP/quốc gia, tạm giữ đơn rủi ro, cảnh báo SOC và Telegram/Gmail |
| Giám sát Tấn công Trực tiếp & Cảnh báo Điện thoại | `/webhook/mg-attack-monitor` | Quét cảnh báo critical/high mỗi 5 phút và đẩy Telegram + Gmail |
| Phát hiện Tấn công Danh tính | `/webhook/mg-identity-attack` | Phân tích hành vi đăng nhập bất thường, MFA fatigue và leo thang đặc quyền |
| Phát hiện Di chuyển Bất khả thi | `/webhook/mg-impossible-travel` | So khớp vị trí/thiết bị, phát hiện impossible travel và yêu cầu phê duyệt |
| Xác nhận Gian lận & Chặn IP | `/webhook/mg-fraud-confirmed` | Admin xác nhận đơn gian lận, chặn IP, gửi thông báo và ghi nhận phản hồi |
| Chat AI Phân tích SOC | `/webhook/mg-ai-chat` | Trả lời câu hỏi điều tra dựa trên ngữ cảnh SOC và dữ liệu PostgreSQL |

Each playbook contains **11–24 executable nodes** (**23** for identity attack, **24** for impossible travel, **18** for the monitor, **13** for e-commerce fraud, **11** for fraud confirmation, **5** for AI chat) so it stays readable in class and in the n8n canvas, with Vietnamese node labels and colour-coded sticky notes. The authoritative node count for import lives in [`n8n/workflows/manifest.json`](n8n/workflows/manifest.json). Every response flow includes **independent Telegram and Gmail branches** — Telegram works with a bot token and chat ID alone, Gmail is optional — and the scheduled **Live Attack Monitor** pushes a phone digest every five minutes. The run is dispatched by the API, enriched through the simulated EDR/identity/sandbox/patch adapters, written to PostgreSQL and finalized back into the console.

Setup, credential overrides, environment variables and verification commands are documented in [`n8n/README.md`](n8n/README.md).

## Chi tiết từng node n8n (demo cho thầy)

Mỗi workflow đều bắt đầu bằng webhook, kiểm tra dữ liệu, tải bản ghi từ PostgreSQL, làm giàu qua các adapter giả lập, chấm điểm rủi ro, mở sự cố/ticket, gửi Telegram/Gmail độc lập, cập nhật bản ghi và finalize về API MedicareGuard. Node `🏁 Kết thúc phiên chạy` gọi `POST /api/automation/executions/:executionId/complete` để console hiển thị duration, node count và metrics.

### 1. Cô lập & Phục hồi Ransomware — `/webhook/mg-ransomware` (17 node)

| Node | Nhiệm vụ |
| --- | --- |
| 📥 Cảnh báo Ransomware | Nhận webhook từ API và chuẩn hóa `entityId`, `executionId`, thời gian bắt đầu |
| 🔍 Kiểm tra dữ liệu | Validate alert id; ném lỗi nếu thiếu `entityId` |
| 🗄️ Tải cảnh báo | SELECT alert + asset từ PostgreSQL |
| 🧪 Làm giàu – Telemetry EDR | Gọi adapter EDR telemetry để lấy tiến trình mã hóa, hash, host |
| 🧮 Chấm điểm rủi ro | Tính risk score từ severity, criticality, CVSS/EPSS và telemetry |
| ⚠️ Rủi ro cao? | If risk ≥ 70: đi nhánh xử lý; ngược lại vẫn ghi nhận |
| 🚨 Mở sự cố P1 | INSERT/UPDATE incident P1 cho ransomware |
| 🎫 Mở ticket chuẩn | Tạo ticket chuẩn ứng phó |
| 📱 Telegram sẵn sàng? | Kiểm tra `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID` |
| 📱 Gửi Telegram | Đẩy cảnh báo SOC về điện thoại |
| 📧 Gmail sẵn sàng? | Kiểm tra SMTP host/user/password |
| 📧 Gửi Gmail (SMTP) | Gửi bản lưu email cho kiểm toán |
| 🔒 Cô lập máy trạm (EDR) | Gọi adapter EDR isolate để cô lập host |
| 🚫 Chặn máy chủ C2 | Gọi adapter network contain để chặn IP/domain C2 |
| ✅ Xác minh cô lập | Gọi adapter verify để xác nhận host đã offline |
| 📝 Cập nhật bản ghi | UPDATE alert/incident status và metadata |
| 🏁 Kết thúc phiên chạy | POST finalize execution về API |

### 2. Phân tích & Xử lý Phishing — `/webhook/mg-phishing` (17 node)

| Node | Nhiệm vụ |
| --- | --- |
| 📥 Báo cáo Phishing | Nhận webhook và chuẩn hóa dữ liệu alert |
| 🔍 Kiểm tra dữ liệu | Validate alert id |
| 🗄️ Tải cảnh báo | SELECT alert phishing từ PostgreSQL |
| 🧪 Làm giàu – Sandbox | Detonate URL/file trong sandbox giả lập |
| 🧮 Chấm điểm rủi ro | Tính risk score từ severity, criticality và kết quả sandbox |
| ⚠️ Rủi ro cao? | If risk ≥ 70: đi nhánh xử lý |
| 🚨 Mở sự cố P1 | Mở incident phishing |
| 🎫 Mở ticket chuẩn | Tạo ticket phishing |
| 📱 Telegram sẵn sàng? / 📱 Gửi Telegram | Kiểm tra và gửi cảnh báo điện thoại |
| 📧 Gmail sẵn sàng? / 📧 Gửi Gmail (SMTP) | Kiểm tra và gửi email audit |
| 🧹 Cách ly thư khớp | Quarantine email phishing trong mailbox |
| 🔑 Thu hồi phiên & đặt lại mật khẩu | Revoke session và reset MFA/password |
| ✅ Xác minh thu hồi danh tính | Verify identity recovery |
| 📝 Cập nhật bản ghi | UPDATE alert status |
| 🏁 Kết thúc phiên chạy | Finalize execution |

### 3. Leo thang SLA Lỗ hổng — `/webhook/mg-vulnerability` (19 node)

| Node | Nhiệm vụ |
| --- | --- |
| 📥 Lỗ hổng mới | Nhận webhook vulnerability |
| 🔍 Kiểm tra dữ liệu | Validate vulnerability id |
| 🗄️ Tải lỗ hổng | SELECT vulnerability + asset |
| 📊 Làm giàu – EPSS/KEV | Enrich CVE với EPSS/KEV và asset context |
| 🧮 Chấm điểm rủi ro | Tính risk score từ CVSS, EPSS, KEV, criticality |
| ⚠️ Rủi ro cao? | If risk ≥ 70: đi nhánh xử lý |
| 🚨 Mở sự cố vá lỗi | Mở incident patching |
| 🎫 Mở ticket vá lỗi | Tạo ticket remediation |
| 📱 Telegram sẵn sàng? / 📱 Gửi Telegram | Kiểm tra và gửi cảnh báo Telegram |
| 📧 Gmail sẵn sàng? / 📧 Gửi Gmail (SMTP) | Kiểm tra và gửi email audit |
| 📋 Tạo yêu cầu thay đổi | Tạo change request cho patch |
| 🛠️ Điều phối vá lỗi | Orchestrate patch deployment |
| ✅ Xác minh bản vá | Verify patch thành công |
| 📝 Cập nhật bản ghi | UPDATE vulnerability status |
| 🏁 Kết thúc phiên chạy | Finalize execution |
| ⏰ Lịch mỗi 6 giờ | Schedule trigger `0 */6 * * *` |
| 🔎 Chọn lỗ hổng ưu tiên | Chọn vulnerability open có CVSS cao nhất khi chạy theo lịch |

### 4. Bằng chứng Tuân thủ Liên tục — `/webhook/mg-compliance` (19 node)

| Node | Nhiệm vụ |
| --- | --- |
| 📥 Yêu cầu bằng chứng | Nhận webhook compliance control |
| 🔍 Kiểm tra dữ liệu | Validate control id |
| 🗄️ Tải kiểm soát | SELECT compliance control |
| 🗂️ Làm giàu – Bằng chứng danh tính | Thu thập evidence identity |
| 🧮 Chấm điểm rủi ro | Tính risk score = 100 - compliance score |
| ⚠️ Rủi ro cao? | If risk ≥ 70: đi nhánh xử lý |
| 🚨 Mở sự cố thiếu kiểm soát | Mở incident control gap |
| 🎫 Mở nhiệm vụ bằng chứng | Tạo evidence task |
| 📱 Telegram sẵn sàng? / 📱 Gửi Telegram | Kiểm tra và gửi cảnh báo Telegram |
| 📧 Gmail sẵn sàng? / 📧 Gửi Gmail (SMTP) | Kiểm tra và gửi email audit |
| 📦 Đóng gói bằng chứng | Evidence pack |
| 🔐 Lưu trữ bất biến | Persist evidence bất biến |
| ✅ Xác minh toàn vẹn | Verify integrity/hash |
| 📝 Cập nhật bản ghi | UPDATE compliance control |
| 🏁 Kết thúc phiên chạy | Finalize execution |
| ⏰ Lịch hằng đêm 02:00 | Schedule trigger `0 2 * * *` |
| 🔎 Chọn kiểm soát ưu tiên | Chọn control có score thấp nhất khi chạy theo lịch |

### 5. Phản hồi Gian lận Thương mại điện tử — `/webhook/mg-ecommerce-fraud` (13 node)

| Node | Nhiệm vụ |
| --- | --- |
| 📥 Cảnh báo gian lận đơn hàng | Nhận webhook fraud alert |
| 🔍 Kiểm tra dữ liệu | Validate orderId/alertId |
| 🗄️ Tải đơn hàng | SELECT order + risk score + fraud flags |
| 🧮 Chấm điểm & Soạn cảnh báo | Tính risk score cuối cùng, velocity, severity và soạn Telegram/Gmail |
| ⚠️ Rủi ro cao? | If risk ≥ 50: tạm giữ đơn; ngược lại cho qua |
| 🔒 Tạm giữ đơn hàng | UPDATE store_orders status = on_hold |
| ✅ Đơn trong ngưỡng | Nhánh đơn an toàn |
| 📱 Telegram sẵn sàng? / 📱 Gửi Telegram | Kiểm tra và gửi cảnh báo Telegram |
| 📧 Gmail sẵn sàng? / 📧 Gửi Gmail (SMTP) | Kiểm tra và gửi email audit |
| 📝 Ghi nhận phản hồi | UPDATE alert/store_security_events metadata |
| 🏁 Kết thúc phiên chạy | Finalize execution |

### 6. Giám sát Tấn công Trực tiếp & Cảnh báo Điện thoại — `/webhook/mg-attack-monitor` (18 node)

| Node | Nhiệm vụ |
| --- | --- |
| Webhook — Nhịp giám sát | Nhận webhook manual run |
| ⏰ Lịch mỗi 5 phút | Schedule trigger `*/5 * * * *` |
| 🧭 Chuẩn hóa dữ liệu | Chuẩn hóa executionId, startedAt |
| 🗄️ Tải tấn công gần đây | SELECT critical/high alerts chưa gửi trong 24h |
| ✉️ Soạn tin cảnh báo | Soạn Telegram/Gmail digest |
| ❓ Có tấn công mới? | If count > 0: đi nhánh gửi cảnh báo |
| 👥 Tải người nhận | Lấy email admin/analyst |
| 📱 Telegram sẵn sàng? / 📱 Gửi Telegram | Kiểm tra và gửi Telegram |
| 📧 Gmail sẵn sàng? / 📧 Gửi Gmail (SMTP) | Kiểm tra và gửi Gmail |
| 🔔 Thông báo trong ứng dụng | Tạo notification trong SOC |
| 🧾 Kiểm tra Telegram đã gửi | Chỉ coi là đã gửi nếu Telegram node thành công |
| ✅ Telegram đã gửi? | If Telegram success: đánh dấu đã gửi; nếu fail thì retry ở lần sau |
| 📝 Đánh dấu đã gửi | UPDATE alerts metadata `phoneNotifiedAt` |
| 📈 Tổng hợp số liệu | Metrics attack_count, channels, lookback |
| 🏁 Kết thúc phiên chạy | Finalize execution |
| 😴 Không có tấn công mới | Nhánh no-op |

### 7. Chat AI phân tích SOC — `/webhook/mg-ai-chat` (5 node)

| Node | Nhiệm vụ |
| --- | --- |
| 💬 Webhook Chat AI | Nhận câu hỏi từ backend `/api/ai/chat` |
| 🔍 Kiểm tra câu hỏi | Chuẩn hóa message, intent, conversationId |
| 🗄️ Tải ngữ cảnh SOC | Truy vấn PostgreSQL: alerts, incidents, attackers, countries, assets, compliance, firewall |
| 🧠 Soạn câu trả lời từ Database | Tạo reply tiếng Việt dựa trên dữ liệu thực |
| 📤 Trả lời Chat | Trả JSON `{ reply, intent, provider, model, latencyMs }` |

Setup, credential overrides, environment variables và verification commands are documented in [`n8n/README.md`](n8n/README.md).

## Database

`database/schema.sql` defines 52 tables and 5 analytics views, including:

- Identity and access: `users`, `roles`, `sessions`, `password_resets`
- Detection: `alerts`, `alert_comments`, `threats`, `indicators`, `vulnerabilities`
- Response: `incidents`, `incident_timeline`, `playbooks`, `playbook_steps`, `firewall_rules`
- Exposure: `assets`, `asset_vulnerabilities`, `network_flows`, `compliance_controls`
- Operations: `activity_logs`, `audit_logs`, `reports`, `report_schedules`, `integrations`, `settings`
- Commerce: `store_customers`, `store_products`, `store_coupons`, `store_carts`, `store_cart_items`, `store_orders`, `store_order_items`, `store_payments`, `store_reviews`, `store_security_events`

Views power the dashboard, severity mix, attack geography, top attackers and firewalls. Every operational table carries indexes for tenantless SOC-scale querying, and triggers maintain `updated_at` timestamps.

## Repository structure

```
.
├── backend/               Express API, services, middleware and scripts
│   ├── scripts/           migrate, seed, service-token, 61-check smoke and 21-check security suites
│   └── src/
│       ├── config/        env, database, resource and automation registries
│       ├── middleware/    JWT authentication, RBAC and error handling
│       ├── routes/        auth, alerts, threats, assets, incidents, reports, AI, automation
│       └── services/      AI analyst, automation runtime and audit logging
├── database/schema.sql    52 tables, 5 views, indexes and triggers
├── frontend/              Next.js 15 App Router console
│   ├── app/(app)/         dashboard and all operational modules
│   ├── components/        shell, tables, charts, threat map, command palette
│   └── lib/               API client, auth, navigation and formatting
├── n8n/                   10 importable Vietnamese workflows + setup guide
├── nginx/                 reverse proxy for console, API and n8n
├── docs/screenshots/      Playwright captures of every module
├── docker-compose.yml     PostgreSQL, Mailpit, backend, frontend, n8n and nginx
└── Makefile               developer workflow
```

## Security notes

- JWTs expire after 12 hours by default; sessions are stored hashed and can be revoked.
- Passwords use bcrypt with configurable rounds; login and API routes are rate limited.
- Helmet, CORS allow-listing and parameterised SQL are enabled throughout.
- Activity and audit logs capture actor, resource, IP and user agent for every mutation.
- `.env` is ignored by Git; only `.env.example` is committed.
- n8n webhooks are optionally protected by a shared header token: set `MG_N8N_WEBHOOK_TOKEN` in both the backend and n8n environments; the backend then sends `Authorization: Bearer <token>` on every dispatch (`dispatchFraudWorkflow`, `dispatchFraudConfirmedWorkflow`, `maybeN8n`). Configure the corresponding Header Auth credential in n8n to enforce it. When unset, dispatch remains backward compatible.
- Before production: rotate `JWT_SECRET`, `N8N_ENCRYPTION_KEY`, database and n8n passwords, terminate TLS, and replace demo seeded credentials.
- The AI analyst defaults to deterministic, data-grounded responses. Adding `OPENAI_API_KEY` enables an external model provider, but the platform does not require it.

## Testing

```bash
cd backend && npm test
```

```
Endpoints discovered: 574
Checks: 61/61 passed
```

Store security suite:

```bash
cd backend && npm run test:security
```

```
21/21 security checks passed.
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
