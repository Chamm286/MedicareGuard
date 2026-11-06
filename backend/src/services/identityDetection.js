const crypto = require("node:crypto");

const identityAlertFingerprint = ({ userEmail, sourceIp, detections }) => {
  const normalizedDetections = [...new Set(
    (Array.isArray(detections) ? detections : [])
      .map((detection) => String(detection).trim().toLowerCase())
      .filter(Boolean),
  )].sort();
  const fingerprintInput = [
    String(userEmail || "").trim().toLowerCase(),
    String(sourceIp || "unknown").trim().toLowerCase(),
    normalizedDetections.join(","),
  ].join("\u001f");
  return crypto.createHash("sha256").update(fingerprintInput).digest("hex");
};

const identityAlertSeverity = (riskScore) => (
  riskScore >= 90 ? "critical" : riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low"
);

module.exports = { identityAlertFingerprint, identityAlertSeverity };
