# MedicareGuard Data Flow Audit

## Shared contract
- Frontend calls REST API at `/api/*` with JWT.
- Backend persists to PostgreSQL (`medicareguard`).
- n8n receives webhooks at `/webhook/mg-*` and calls back `/api/automation/executions/:id/complete`.
- Automation runs are recorded in `activity_logs`.

## Major flows
| UI action | Frontend API | Backend | n8n webhook | Database |
|---|---|---|---|---|
| Login | POST /auth/login | users/roles | - | users, sessions |
| Dashboard summary | GET /dashboard/summary | stats | - | alerts, incidents, assets |
| Run automation workflow | POST /automation/workflows/:id/run | automationRuntime | /webhook/mg-* | activity_logs, alerts/assets/etc. |
| Demo attack | POST /demo/attack | demo.js | /webhook/mg-ransomware or /webhook/mg-phishing | alerts, activity_logs |
| Store checkout | POST /store/checkout | store.js | /webhook/mg-ecommerce-fraud (high risk) | store_orders, store_payments, alerts |
| SePay payment | GET /store/orders/:id | store.js | SePay webhook -> /store/payments/sepay/webhook | store_orders, store_payments |
| AI chat | POST /ai/chat | ai.js | - | ai_conversations, ai_messages |
| Firewall block | POST /firewall-rules or automation network-contain | firewall.js / automationRuntime | - | firewall_rules |
| Hunting hypothesis | POST /cases | generic CRUD | - | cases |

## n8n workflows
- ransomware-containment: /webhook/mg-ransomware
- phishing-triage: /webhook/mg-phishing
- vulnerability-sla: /webhook/mg-vulnerability (if configured)
- compliance-evidence: /webhook/mg-compliance (if configured)
- ecommerce-fraud-response: /webhook/mg-ecommerce-fraud
- live-attack-monitor: /webhook/mg-live-attack or schedule

## Notes
- High-risk automation actions are simulated in backend for demo safety.
- Real email delivery uses Mailpit by default; real SMTP/Telegram require credentials.
