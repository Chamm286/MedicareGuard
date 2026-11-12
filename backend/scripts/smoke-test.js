const crypto = require("node:crypto");
const base = process.env.API_URL || "http://localhost:4000/api";

const request = async (path, options = {}) => {
  const response = await fetch(`${base}${path}`, options);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  return { status: response.status, ok: response.ok, body };
};

const run = async () => {
  const results = [];
  const login = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@medicareguard.io", password: "Admin@123" }),
  });
  results.push({ name: "POST /auth/login", status: login.status, ok: login.ok });
  if (!login.ok) {
    console.error("Login failed", login.body);
    process.exit(1);
  }
  const token = login.body.token;
  const headers = { Authorization: `Bearer ${token}` };

  const endpoints = [
    ["GET", "/health"],
    ["GET", "/health/db"],
    ["GET", "/_meta/endpoints"],
    ["GET", "/dashboard/summary"],
    ["GET", "/alerts?limit=5"],
    ["GET", "/alerts/stats"],
    ["GET", "/threats?limit=5"],
    ["GET", "/threats/stats"],
    ["GET", "/assets?limit=5"],
    ["GET", "/assets/stats"],
    ["GET", "/incidents?limit=5"],
    ["GET", "/incidents/stats"],
    ["GET", "/firewall-rules?limit=5"],
    ["GET", "/firewall-rules/stats"],
    ["GET", "/users?limit=5"],
    ["GET", "/roles"],
    ["GET", "/roles/permissions"],
    ["GET", "/logs?limit=5"],
    ["GET", "/logs/stats"],
    ["GET", "/logs/audit?limit=5"],
    ["GET", "/stats/overview"],
    ["GET", "/stats/attacks-by-country"],
    ["GET", "/stats/top-attackers"],
    ["GET", "/stats/attack-timeline?range=7d"],
    ["GET", "/stats/severity-distribution"],
    ["GET", "/stats/threat-categories"],
    ["GET", "/stats/asset-risk"],
    ["GET", "/stats/alert-trend"],
    ["GET", "/stats/mttr"],
    ["GET", "/stats/compliance"],
    ["GET", "/stats/incident-funnel"],
    ["GET", "/stats/firewall"],
    ["GET", "/stats/threat-map"],
    ["GET", "/stats/realtime"],
    ["GET", "/stats/soc-health"],
    ["GET", "/stats/executive-summary"],
    ["GET", "/reports?limit=5"],
    ["GET", "/reports/templates"],
    ["GET", "/reports/export/csv"],
    ["GET", "/reports/export/json"],
    ["GET", "/ai/suggestions"],
    ["GET", "/ai/models"],
    ["GET", "/ai/insights"],
    ["GET", "/ai/conversations"],
    ["GET", "/_meta/resources"],
    ["GET", "/automation/workflows"],
    ["GET", "/automation/runtime"],
    ["GET", "/automation/executions"],
    ["GET", "/reports/schedules"],
    ["GET", "/vulnerabilities?limit=5"],
    ["GET", "/threat-intel?limit=5"],
    ["GET", "/playbooks?limit=5"],
    ["GET", "/compliance-controls?limit=5"],
    ["GET", "/network-flows?limit=5"],
    ["GET", "/integrations?limit=5"],
    ["GET", "/search?q=ransomware"],
  ];

  for (const [method, path] of endpoints) {
    try {
      const result = await request(path, { method, headers });
      results.push({ name: `${method} ${path}`, status: result.status, ok: result.ok });
    } catch (error) {
      results.push({ name: `${method} ${path}`, status: 0, ok: false, error: error.message });
    }
  }

  const chat = await request("/ai/chat", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Summarise the current security posture and top attackers" }),
  });
  results.push({ name: "POST /ai/chat", status: chat.status, ok: chat.ok });

  const identityContext = await request("/automation/identity/context?userEmail=viewer%40medicareguard.io", { headers });
  results.push({
    name: "identity API returns account context for n8n",
    status: identityContext.status,
    ok: identityContext.ok && identityContext.body?.data?.email === "viewer@medicareguard.io",
  });
  const recentSessions = await request("/automation/identity/sessions?userEmail=viewer%40medicareguard.io", { headers });
  results.push({
    name: "identity sessions API returns recent session history",
    status: recentSessions.status,
    ok: recentSessions.ok && Array.isArray(recentSessions.body?.data),
  });
  const invalidTravelAlert = await request("/automation/impossible-travel/alerts", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ executionId: "smoke-travel" }),
  });
  results.push({
    name: "impossible-travel alert API validates required fields",
    status: invalidTravelAlert.status,
    ok: invalidTravelAlert.status === 400,
  });
  const unapprovedTravelRevoke = await request(`/automation/impossible-travel/sessions/${crypto.randomUUID()}/revoke`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ executionId: "smoke-travel", userEmail: "viewer@medicareguard.io" }),
  });
  results.push({
    name: "impossible-travel session revoke requires an approval request",
    status: unapprovedTravelRevoke.status,
    ok: unapprovedTravelRevoke.status === 404,
  });
  const invalidIdentityEvidence = await request("/automation/identity/evidence", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ executionId: "invalid" }),
  });
  results.push({
    name: "identity evidence API validates required fields",
    status: invalidIdentityEvidence.status,
    ok: invalidIdentityEvidence.status === 400,
  });
  const invalidIdentityAlert = await request("/automation/identity/alerts", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ executionId: "invalid" }),
  });
  results.push({
    name: "identity alert API validates required fields",
    status: invalidIdentityAlert.status,
    ok: invalidIdentityAlert.status === 400,
  });
  const invalidIdentityAudit = await request("/automation/identity/audit", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ executionId: "invalid" }),
  });
  results.push({
    name: "identity audit API validates required fields",
    status: invalidIdentityAudit.status,
    ok: invalidIdentityAudit.status === 400,
  });

  const approvalExecutionId = `smoke-approval-${crypto.randomUUID()}`;
  const approvalPath = `/automation/executions/${approvalExecutionId}/approval`;
  const approvalRequest = await request(`${approvalPath}-request`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ workflowId: "identity-attack", userEmail: "viewer@medicareguard.io", riskScore: 85 }),
  });
  results.push({
    name: "identity workflow records a pending frontend approval",
    status: approvalRequest.status,
    ok: approvalRequest.status === 202 && approvalRequest.body?.data?.decision === "pending",
  });
  const approvalPending = await request(approvalPath, { headers });
  results.push({
    name: "identity workflow exposes the pending approval state",
    status: approvalPending.status,
    ok: approvalPending.ok && approvalPending.body?.data?.decision === "pending",
  });
  const approvalDecision = await request(approvalPath, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "approved" }),
  });
  results.push({
    name: "admin can approve an identity workflow from the frontend API",
    status: approvalDecision.status,
    ok: approvalDecision.ok && approvalDecision.body?.data?.decision === "approved",
  });
  const approvalResolved = await request(approvalPath, { headers });
  results.push({
    name: "n8n polling endpoint returns the admin decision",
    status: approvalResolved.status,
    ok: approvalResolved.ok && approvalResolved.body?.data?.decision === "approved",
  });
  const duplicateApproval = await request(approvalPath, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "rejected" }),
  });
  results.push({
    name: "identity approval decision is one-time",
    status: duplicateApproval.status,
    ok: duplicateApproval.status === 409,
  });
  const approvalComplete = await request(`/automation/executions/${approvalExecutionId}/complete`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ workflowId: "identity-attack", status: "success", message: "Approval API smoke test completed" }),
  });
  results.push({
    name: "identity approval smoke execution is finalized",
    status: approvalComplete.status,
    ok: approvalComplete.ok && approvalComplete.body?.data?.status === "success",
  });

  const suiteResponse = await request("/automation/workflows", { headers });
  const suite = suiteResponse.body?.data || [];
  const suiteSummary = suiteResponse.body?.summary || {};
  const enabledWorkflowCount = suite.filter((workflow) => workflow.enabled).length;
  const expectedNodes = {
    "ransomware-containment": 17,
    "phishing-triage": 17,
    "vulnerability-sla": 19,
    "compliance-evidence": 19,
    "ecommerce-fraud-response": 13,
    "live-attack-monitor": 18,
    "identity-attack": 23,
    "impossible-travel": 24,
  };
  const actualNodes = Object.fromEntries(suite.map((workflow) => [workflow.id, workflow.nodeCount]));
  results.push({
    name: "automation suite exposes 8 workflows",
    status: suiteResponse.status,
    ok: suiteResponse.ok && suite.length === 8 && suiteSummary.active === enabledWorkflowCount,
  });
  const identityWorkflow = suite.find((workflow) => workflow.id === "identity-attack");
  results.push({
    name: "identity workflow is localized and uses Groq",
    status: suiteResponse.status,
    ok: Boolean(identityWorkflow && identityWorkflow.name === "Phát hiện tấn công danh tính" && identityWorkflow.integrations.includes("Groq AI")),
  });
  results.push({
    name: "automation suite totals 150 nodes",
    status: suiteResponse.status,
    ok: suiteResponse.ok && suiteSummary.nodes === 150,
  });
  results.push({
    name: "automation node counts match the compact design",
    status: suiteResponse.status,
    ok: suiteResponse.ok && Object.entries(expectedNodes).every(([id, count]) => actualNodes[id] === count),
  });
  const identityDefinition = require("../../n8n/workflows/identity-attrack.json");
  const identityExecutableNodes = identityDefinition.nodes.filter((node) => node.type !== "n8n-nodes-base.stickyNote");
  const identityWebhook = identityDefinition.nodes.find((node) => node.type === "n8n-nodes-base.webhook");
  results.push({
    name: "identity webhook requires Header Auth and workflow has no PostgreSQL nodes",
    status: suiteResponse.status,
    ok: identityExecutableNodes.length > 15
      && identityExecutableNodes.every((node) => node.type !== "n8n-nodes-base.postgres")
      && identityWebhook?.parameters.authentication === "headerAuth"
      && identityWebhook.credentials?.httpHeaderAuth?.id === "mg-identity-webhook-credential",
  });
  const travelWorkflow = suite.find((workflow) => workflow.id === "impossible-travel");
  const travelDefinition = require("../../n8n/workflows/impossible-travel.json");
  const travelExecutableNodes = travelDefinition.nodes.filter((node) => node.type !== "n8n-nodes-base.stickyNote");
  results.push({
    name: "impossible-travel workflow has 24 executable nodes and no SQL nodes",
    status: suiteResponse.status,
    ok: Boolean(travelWorkflow && travelWorkflow.nodeCount === 24)
      && travelExecutableNodes.length === 24
      && travelExecutableNodes.every((node) => node.type !== "n8n-nodes-base.postgres")
      && travelDefinition.connections["20 · Mô hình chat Groq"]?.ai_languageModel?.[0]?.[0]?.node === "19 · Chuyên gia AI phân tích danh tính",
  });

  const meta = await request("/_meta/endpoints", { headers });
  const total = meta.body.total;

  const failed = results.filter((result) => !result.ok);
  results.forEach((result) => {
    console.log(`${result.ok ? "✓" : "✗"} ${result.status}  ${result.name}${result.error ? ` — ${result.error}` : ""}`);
  });
  console.log(`\nEndpoints discovered: ${total}`);
  console.log(`Checks: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
