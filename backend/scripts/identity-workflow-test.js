const assert = require("node:assert/strict");
const workflow = require("../../n8n/workflows/identity-attrack.json");
const { identityAlertFingerprint, identityAlertSeverity } = require("../src/services/identityDetection");

const byName = (name) => {
  const found = workflow.nodes.find((node) => node.name.startsWith(name));
  assert.ok(found, `Missing workflow node: ${name}`);
  return found;
};

const webhook = byName("01 · Tiếp nhận sự kiện");
assert.equal(webhook.parameters.authentication, "headerAuth");
assert.equal(webhook.credentials?.httpHeaderAuth?.id, "mg-identity-webhook-credential");

const scoreNode = byName("09 · Tính điểm rủi ro");
const calculateRisk = (input) => {
  const execute = new Function("$", scoreNode.parameters.jsCode);
  return execute((nodeName) => ({
    first: () => ({ json: input[nodeName] }),
  }))[0].json;
};
const failedEvents = Array.from({ length: 5 }, (_, index) => ({
  sourceIp: "198.51.100.20",
  timestamp: new Date(Date.now() - (5 - index) * 60_000).toISOString(),
}));
const correlatedLogin = {
  type: "login_success",
  sourceIp: "198.51.100.20",
  timestamp: new Date().toISOString(),
};
const correlatedAttack = calculateRisk({
  "08 · Phát hiện truy cập vượt quyền": {
    failedLoginCount: failedEvents.length,
    failedEvents,
    unusualLogins: [correlatedLogin],
    bruteForceDetected: true,
    unusualLoginDetected: true,
    privilegeEscalationDetected: true,
    history: { successful_logins_30d: 2 },
  },
});
assert.equal(correlatedAttack.correlatedLogin, true);
assert.equal(correlatedAttack.factors.failedThenSuccessfulFromSameIp, 15);
assert.equal(correlatedAttack.riskScore, 100);
assert.equal(correlatedAttack.severity, "critical");

const failedOnly = calculateRisk({
  "08 · Phát hiện truy cập vượt quyền": {
    failedLoginCount: 5,
    failedEvents,
    unusualLogins: [],
    bruteForceDetected: true,
    unusualLoginDetected: false,
    privilegeEscalationDetected: false,
    history: { successful_logins_30d: 4 },
  },
});
assert.equal(failedOnly.riskScore, 40);
assert.equal(failedOnly.severity, "medium");

const fingerprintInput = {
  userEmail: "Viewer@MedicareGuard.io",
  sourceIp: "198.51.100.20",
  detections: ["bruteForce", "privilegeEscalation"],
};
const fingerprint = identityAlertFingerprint(fingerprintInput);
assert.equal(
  fingerprint,
  identityAlertFingerprint({ ...fingerprintInput, userEmail: "viewer@medicareguard.io", detections: ["privilegeEscalation", "bruteForce", "bruteForce"] }),
);
assert.notEqual(fingerprint, identityAlertFingerprint({ ...fingerprintInput, sourceIp: "198.51.100.21" }));
assert.notEqual(fingerprint, identityAlertFingerprint({ ...fingerprintInput, detections: ["bruteForce"] }));

assert.equal(identityAlertSeverity(95), "critical");
assert.equal(identityAlertSeverity(70), "high");
assert.equal(identityAlertSeverity(40), "medium");
assert.equal(identityAlertSeverity(39), "low");

for (const prefix of ["04 · API MedicareGuard", "13 · API MedicareGuard", "14 · API MedicareGuard", "Ghi nhận yêu cầu duyệt"]) {
  const node = byName(prefix);
  assert.equal(node.retryOnFail, true, `${node.name} retries transient errors`);
  assert.equal(node.maxTries, 3);
}
assert.equal(byName("15 · Gửi thông báo Telegram").onError, "continueRegularOutput");
assert.match(byName("17 · API MedicareGuard").parameters.jsonBody, /alertId: .*riskScore.*>= 70 \?/);
assert.match(byName("18 · Hoàn tất thực thi").parameters.jsonBody, /alert_created: .*riskScore.*>= 70/);

console.log("Identity workflow security, risk scoring, deduplication and recovery checks passed.");
