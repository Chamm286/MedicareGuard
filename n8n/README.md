# n8n response workflows

MedicareGuard ships four importable n8n workflows. Each workflow contains **30 nodes** and follows the same operational shape: ingest → enrich → correlate → decide → respond → verify → document.

| Workflow | Webhook | Trigger | Primary response |
| --- | --- | --- | --- |
| Ransomware Containment & Recovery | `POST /webhook/mg-ransomware` | Critical ransomware alert | EDR isolation, C2 block, forensic timeline |
| Phishing Triage & Credential Reset | `POST /webhook/mg-phishing` | Reported phishing message | Sandbox detonation, session revocation, MFA reset |
| Vulnerability SLA Escalation | `POST /webhook/mg-vulnerability` | New high-risk CVE | Owner assignment, change request, SLA escalation |
| Continuous Compliance Evidence | `POST /webhook/mg-compliance` | Evidence request or schedule | HIPAA/NIST/ISO evidence pack and audit trail |

## Import

1. Open n8n at `http://localhost:5678` (Docker) or your deployed instance.
2. Go to **Workflows → Import from File** and select each JSON file in this directory.
3. Open every credential-bearing node and attach your own credentials.
4. Activate the workflow. The webhook path is shown in the trigger node.

The JSON files intentionally contain placeholder credential names:

- `MedicareGuard PostgreSQL` — PostgreSQL credential pointing at the `medicareguard` database.
- `MedicareGuard Slack` — Slack OAuth/bot credential for the SOC channel.
- `MedicareGuard SMTP` — SMTP credential for executive and auditor notifications.

## Environment

The backend dispatches manual runs to `N8N_BASE_URL` (or `N8N_URL`), default `http://localhost:5678`. Set `MG_API_TOKEN` to a valid MedicareGuard JWT so workflow HTTP Request nodes can call the SOC API.

```bash
export N8N_BASE_URL=http://localhost:5678
export MG_API_TOKEN="<jwt for a service account with analyst permissions>"
```

## Verify

```bash
# Workflow catalogue from the SOC API
curl -H "Authorization: Bearer $MG_API_TOKEN" http://localhost:4000/api/automation/workflows

# Manual dispatch (returns dispatched or queued)
curl -X POST -H "Authorization: Bearer $MG_API_TOKEN" \
  http://localhost:4000/api/automation/workflows/ransomware-containment/run
```

When n8n is offline the API returns `queued`, records an `automation` activity-log entry, and leaves the workflow ready to replay once n8n is reachable.
