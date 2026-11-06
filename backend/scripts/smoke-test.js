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

  const suiteResponse = await request("/automation/workflows", { headers });
  const suite = suiteResponse.body?.data || [];
  const suiteSummary = suiteResponse.body?.summary || {};
  const expectedNodes = {
    "ransomware-containment": 20,
    "phishing-triage": 20,
    "vulnerability-sla": 20,
    "compliance-evidence": 20,
    "live-attack-monitor": 18,
    "workflow-7-ai-incident-analysis": 16,
  };
  const actualNodes = Object.fromEntries(suite.map((workflow) => [workflow.id, workflow.nodeCount]));
  results.push({
    name: "automation suite exposes 6 workflows",
    status: suiteResponse.status,
    ok: suiteResponse.ok && suite.length === 6 && suiteSummary.active === 6,
  });
  results.push({
    name: "automation suite totals 114 nodes",
    status: suiteResponse.status,
    ok: suiteResponse.ok && suiteSummary.nodes === 114,
  });
  results.push({
    name: "automation node counts match the compact design",
    status: suiteResponse.status,
    ok: suiteResponse.ok && Object.entries(expectedNodes).every(([id, count]) => actualNodes[id] === count),
  });
  const demoWorkflow = suite.find((workflow) => workflow.id === "workflow-7-ai-incident-analysis");
  results.push({
    name: "Workflow 7 links to its n8n demo",
    status: suiteResponse.status,
    ok: suiteResponse.ok && demoWorkflow?.demoOnly === true && demoWorkflow.n8n_url.endsWith("/workflow/krxbXgYr7BgX9tCE"),
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
