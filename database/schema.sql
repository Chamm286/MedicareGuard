-- ─────────────────────────────────────────────────────────────────────────────
-- MedicareGuard SOC — PostgreSQL schema
-- 42 tables, referential integrity, updated_at triggers and analytics views.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── IAM ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(64) NOT NULL UNIQUE,
  description   TEXT,
  permissions   TEXT[] NOT NULL DEFAULT '{}',
  level         INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     VARCHAR(160) NOT NULL,
  role_id       UUID REFERENCES roles(id) ON DELETE SET NULL,
  department    VARCHAR(120),
  phone         VARCHAR(40),
  avatar_url    TEXT,
  status        VARCHAR(24) NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  mfa_enabled   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  ip_address  VARCHAR(64),
  user_agent  TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120) NOT NULL,
  key_prefix  VARCHAR(24) NOT NULL,
  key_hash    TEXT NOT NULL,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  scopes      TEXT[] NOT NULL DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  revoked     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120) NOT NULL,
  code        VARCHAR(24) UNIQUE,
  manager_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Threat surface ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(160) NOT NULL,
  type        VARCHAR(48) NOT NULL,
  category    VARCHAR(64),
  hostname    VARCHAR(160),
  ip_address  VARCHAR(64),
  mac_address VARCHAR(32),
  os          VARCHAR(80),
  owner_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  department  VARCHAR(120),
  location    VARCHAR(120),
  criticality VARCHAR(24) NOT NULL DEFAULT 'medium',
  status      VARCHAR(24) NOT NULL DEFAULT 'online',
  risk_score  INTEGER NOT NULL DEFAULT 20,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  last_seen   TIMESTAMPTZ,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS threats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200) NOT NULL,
  category        VARCHAR(64),
  severity        VARCHAR(24) NOT NULL DEFAULT 'medium',
  status          VARCHAR(24) NOT NULL DEFAULT 'active',
  source          VARCHAR(120),
  source_ip       VARCHAR(64),
  country         VARCHAR(80),
  country_code    VARCHAR(4),
  ioc_type        VARCHAR(40),
  ioc_value       TEXT,
  confidence      INTEGER NOT NULL DEFAULT 70,
  risk_score      INTEGER NOT NULL DEFAULT 50,
  description     TEXT,
  mitre_tactic    VARCHAR(120),
  mitre_technique VARCHAR(160),
  first_seen      TIMESTAMPTZ,
  last_seen       TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(240) NOT NULL,
  description     TEXT,
  severity        VARCHAR(24) NOT NULL DEFAULT 'medium',
  status          VARCHAR(24) NOT NULL DEFAULT 'open',
  source          VARCHAR(120),
  source_ip       VARCHAR(64),
  country         VARCHAR(80),
  country_code    VARCHAR(4),
  mitre_tactic    VARCHAR(120),
  mitre_technique VARCHAR(160),
  threat_id       UUID REFERENCES threats(id) ON DELETE SET NULL,
  asset_id        UUID REFERENCES assets(id) ON DELETE SET NULL,
  assignee_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  risk_score      INTEGER NOT NULL DEFAULT 50,
  confidence      INTEGER NOT NULL DEFAULT 70,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  metadata        JSONB NOT NULL DEFAULT '{}',
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS incidents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(240) NOT NULL,
  description  TEXT,
  severity     VARCHAR(24) NOT NULL DEFAULT 'medium',
  status       VARCHAR(24) NOT NULL DEFAULT 'open',
  priority     VARCHAR(24) NOT NULL DEFAULT 'P3',
  category     VARCHAR(64),
  assignee_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  reporter_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  incident_key VARCHAR(32) UNIQUE,
  sla_due_at   TIMESTAMPTZ,
  detected_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ,
  root_cause   TEXT,
  impact       TEXT,
  timeline     JSONB NOT NULL DEFAULT '[]',
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS firewall_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(160) NOT NULL,
  description      TEXT,
  direction        VARCHAR(16) NOT NULL DEFAULT 'inbound',
  action           VARCHAR(16) NOT NULL DEFAULT 'deny',
  protocol         VARCHAR(16) NOT NULL DEFAULT 'tcp',
  source_ip        VARCHAR(64),
  destination_ip   VARCHAR(64),
  source_port      VARCHAR(32),
  destination_port VARCHAR(32),
  priority         INTEGER NOT NULL DEFAULT 100,
  enabled          BOOLEAN NOT NULL DEFAULT true,
  hit_count        BIGINT NOT NULL DEFAULT 0,
  last_hit_at      TIMESTAMPTZ,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Detection & response ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vulnerabilities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(200) NOT NULL,
  severity    VARCHAR(24) NOT NULL DEFAULT 'medium',
  status      VARCHAR(24) NOT NULL DEFAULT 'open',
  cvss_score  NUMERIC(4,1) NOT NULL DEFAULT 5.0,
  cve_id      VARCHAR(32),
  asset_id    UUID REFERENCES assets(id) ON DELETE SET NULL,
  description TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS playbooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(160) NOT NULL,
  category    VARCHAR(64),
  status      VARCHAR(24) NOT NULL DEFAULT 'active',
  description TEXT,
  steps       JSONB NOT NULL DEFAULT '[]',
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS detection_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(160) NOT NULL,
  rule_type       VARCHAR(48) NOT NULL DEFAULT 'sigma',
  severity        VARCHAR(24) NOT NULL DEFAULT 'medium',
  status          VARCHAR(24) NOT NULL DEFAULT 'active',
  expression      TEXT,
  description     TEXT,
  mitre_tactic    VARCHAR(120),
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS threat_intel (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator      TEXT NOT NULL,
  indicator_type VARCHAR(40) NOT NULL DEFAULT 'ip',
  threat_actor   VARCHAR(120),
  confidence     INTEGER NOT NULL DEFAULT 70,
  severity       VARCHAR(24) NOT NULL DEFAULT 'medium',
  source         VARCHAR(120),
  country        VARCHAR(80),
  last_seen      TIMESTAMPTZ,
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(200) NOT NULL,
  status      VARCHAR(24) NOT NULL DEFAULT 'open',
  severity    VARCHAR(24) NOT NULL DEFAULT 'medium',
  owner_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  summary     TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS remediations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(200) NOT NULL,
  status      VARCHAR(24) NOT NULL DEFAULT 'pending',
  priority    VARCHAR(24) NOT NULL DEFAULT 'medium',
  owner_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  asset_id    UUID REFERENCES assets(id) ON DELETE SET NULL,
  finding_id  UUID,
  due_at      TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  description TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(160) NOT NULL,
  type           VARCHAR(48) NOT NULL DEFAULT 'vulnerability',
  status         VARCHAR(24) NOT NULL DEFAULT 'queued',
  target         VARCHAR(200),
  agent_id       UUID,
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  findings_count INTEGER NOT NULL DEFAULT 0,
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS findings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(200) NOT NULL,
  severity    VARCHAR(24) NOT NULL DEFAULT 'medium',
  status      VARCHAR(24) NOT NULL DEFAULT 'open',
  scan_id     UUID REFERENCES scans(id) ON DELETE SET NULL,
  asset_id    UUID REFERENCES assets(id) ON DELETE SET NULL,
  description TEXT,
  remediation TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Observability & audit ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level       VARCHAR(16) NOT NULL DEFAULT 'info',
  event_type  VARCHAR(64) NOT NULL DEFAULT 'system',
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_email VARCHAR(255),
  source_ip   VARCHAR(64),
  user_agent  TEXT,
  resource    VARCHAR(64),
  resource_id VARCHAR(64),
  action      VARCHAR(48),
  message     TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_email VARCHAR(255),
  action      VARCHAR(48) NOT NULL,
  resource    VARCHAR(64),
  resource_id VARCHAR(64),
  ip_address  VARCHAR(64),
  user_agent  TEXT,
  details     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  message     TEXT,
  type        VARCHAR(32) NOT NULL DEFAULT 'info',
  read        BOOLEAN NOT NULL DEFAULT false,
  link        TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS metrics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120) NOT NULL,
  value       NUMERIC NOT NULL DEFAULT 0,
  unit        VARCHAR(32),
  source      VARCHAR(80),
  tags        JSONB NOT NULL DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monitors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(160) NOT NULL,
  type             VARCHAR(48) NOT NULL DEFAULT 'uptime',
  target           VARCHAR(200),
  status           VARCHAR(24) NOT NULL DEFAULT 'up',
  interval_seconds INTEGER NOT NULL DEFAULT 60,
  last_checked_at  TIMESTAMPTZ,
  uptime_percent   NUMERIC(5,2) NOT NULL DEFAULT 100,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(120) NOT NULL,
  hostname       VARCHAR(160),
  ip_address     VARCHAR(64),
  os             VARCHAR(80),
  version        VARCHAR(32),
  status         VARCHAR(24) NOT NULL DEFAULT 'online',
  last_heartbeat TIMESTAMPTZ,
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(160) NOT NULL,
  type              VARCHAR(48) NOT NULL DEFAULT 'workstation',
  hostname          VARCHAR(160),
  ip_address        VARCHAR(64),
  os                VARCHAR(80),
  owner_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  status            VARCHAR(24) NOT NULL DEFAULT 'online',
  compliance_status VARCHAR(24) NOT NULL DEFAULT 'compliant',
  last_seen         TIMESTAMPTZ,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS network_flows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  src_ip      VARCHAR(64),
  dst_ip      VARCHAR(64),
  src_port    INTEGER,
  dst_port    INTEGER,
  protocol    VARCHAR(16),
  bytes       BIGINT NOT NULL DEFAULT 0,
  packets     BIGINT NOT NULL DEFAULT 0,
  action      VARCHAR(24) NOT NULL DEFAULT 'allow',
  verdict     VARCHAR(24) NOT NULL DEFAULT 'benign',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_sources (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(160) NOT NULL,
  type           VARCHAR(48) NOT NULL DEFAULT 'syslog',
  status         VARCHAR(24) NOT NULL DEFAULT 'connected',
  endpoint       TEXT,
  last_ingest_at TIMESTAMPTZ,
  events_count   BIGINT NOT NULL DEFAULT 0,
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject     VARCHAR(240),
  sender      VARCHAR(240),
  recipient   VARCHAR(240),
  verdict     VARCHAR(24) NOT NULL DEFAULT 'clean',
  severity    VARCHAR(24) NOT NULL DEFAULT 'low',
  status      VARCHAR(24) NOT NULL DEFAULT 'delivered',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS phishing_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(160) NOT NULL,
  status          VARCHAR(24) NOT NULL DEFAULT 'draft',
  target_group    VARCHAR(120),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  sent_count      INTEGER NOT NULL DEFAULT 0,
  clicked_count   INTEGER NOT NULL DEFAULT 0,
  reported_count  INTEGER NOT NULL DEFAULT 0,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Governance ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_controls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework   VARCHAR(48) NOT NULL,
  control_id  VARCHAR(40) NOT NULL,
  title       VARCHAR(200) NOT NULL,
  status      VARCHAR(24) NOT NULL DEFAULT 'in_progress',
  score       INTEGER NOT NULL DEFAULT 0,
  owner_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS risk_assessments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(200) NOT NULL,
  status      VARCHAR(24) NOT NULL DEFAULT 'draft',
  score       INTEGER NOT NULL DEFAULT 0,
  asset_id    UUID REFERENCES assets(id) ON DELETE SET NULL,
  owner_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  methodology VARCHAR(64),
  description TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(160) NOT NULL,
  category       VARCHAR(64),
  status         VARCHAR(24) NOT NULL DEFAULT 'draft',
  version        VARCHAR(24) NOT NULL DEFAULT '1.0',
  description    TEXT,
  content        TEXT,
  effective_date DATE,
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vendors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(160) NOT NULL,
  category      VARCHAR(64),
  risk_level    VARCHAR(24) NOT NULL DEFAULT 'medium',
  status        VARCHAR(24) NOT NULL DEFAULT 'active',
  contact_email VARCHAR(255),
  website       TEXT,
  description   TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Collaboration & content ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource    VARCHAR(64) NOT NULL,
  resource_id VARCHAR(64) NOT NULL,
  author_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  body        TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(64) NOT NULL UNIQUE,
  color       VARCHAR(16) NOT NULL DEFAULT '#3b82f6',
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(120) NOT NULL UNIQUE,
  value       JSONB NOT NULL DEFAULT '{}',
  scope       VARCHAR(48) NOT NULL DEFAULT 'global',
  description TEXT,
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tickets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject      VARCHAR(200) NOT NULL,
  status       VARCHAR(24) NOT NULL DEFAULT 'open',
  priority     VARCHAR(24) NOT NULL DEFAULT 'medium',
  requester_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assignee_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  description  TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_base (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(200) NOT NULL,
  category    VARCHAR(64),
  status      VARCHAR(24) NOT NULL DEFAULT 'published',
  content     TEXT,
  author_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(200) NOT NULL,
  type         VARCHAR(48) NOT NULL DEFAULT 'executive',
  status       VARCHAR(24) NOT NULL DEFAULT 'ready',
  format       VARCHAR(16) NOT NULL DEFAULT 'pdf',
  period_start TIMESTAMPTZ,
  period_end   TIMESTAMPTZ,
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  summary      TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── AI analyst ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  title      VARCHAR(200) NOT NULL DEFAULT 'New investigation',
  model      VARCHAR(64) NOT NULL DEFAULT 'medicareguard-analyst',
  metadata   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            VARCHAR(16) NOT NULL DEFAULT 'user',
  content         TEXT NOT NULL,
  tokens          INTEGER NOT NULL DEFAULT 0,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integrations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(120) NOT NULL,
  provider     VARCHAR(80),
  type         VARCHAR(48) NOT NULL DEFAULT 'siem',
  status       VARCHAR(24) NOT NULL DEFAULT 'connected',
  config       JSONB NOT NULL DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_detected ON alerts(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_country ON alerts(country_code);
CREATE INDEX IF NOT EXISTS idx_alerts_source_ip ON alerts(source_ip);
CREATE INDEX IF NOT EXISTS idx_threats_severity ON threats(severity);
CREATE INDEX IF NOT EXISTS idx_threats_country ON threats(country);
CREATE INDEX IF NOT EXISTS idx_threats_last_seen ON threats(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_assets_criticality ON assets(criticality);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON activity_logs(level);
CREATE INDEX IF NOT EXISTS idx_firewall_enabled ON firewall_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_network_flows_recorded ON network_flows(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id, created_at);

-- ── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'roles','users','departments','assets','threats','alerts','incidents','firewall_rules',
    'vulnerabilities','playbooks','detection_rules','threat_intel','cases','remediations',
    'scans','findings','monitors','agents','devices','data_sources','phishing_campaigns',
    'compliance_controls','risk_assessments','policies','vendors','comments','tags','settings',
    'tickets','knowledge_base','reports','ai_conversations','integrations','sessions','api_keys','activity_logs','audit_logs','notifications','metrics','network_flows','email_events','ai_messages'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

-- ── Analytics views ──────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_attacks_by_country AS
SELECT COALESCE(country, 'Unknown') AS country,
       COALESCE(country_code, 'UN') AS country_code,
       count(*)::int AS attacks,
       count(*) FILTER (WHERE severity IN ('critical','high'))::int AS high_severity,
       round(avg(risk_score))::int AS avg_risk
FROM threats
GROUP BY 1, 2
ORDER BY attacks DESC;

CREATE OR REPLACE VIEW v_top_attackers AS
SELECT source_ip,
       max(country) AS country,
       max(country_code) AS country_code,
       count(*)::int AS events,
       max(severity) AS top_severity,
       round(avg(risk_score))::int AS avg_risk,
       max(last_seen) AS last_seen
FROM threats
WHERE source_ip IS NOT NULL
GROUP BY source_ip
ORDER BY events DESC, avg_risk DESC;

CREATE OR REPLACE VIEW v_alert_severity AS
SELECT severity, count(*)::int AS total
FROM alerts GROUP BY severity;

CREATE OR REPLACE VIEW v_attack_timeline AS
SELECT date_trunc('hour', detected_at) AS bucket,
       count(*)::int AS alerts,
       count(*) FILTER (WHERE severity IN ('critical','high'))::int AS critical_high
FROM alerts
WHERE detected_at > now() - interval '7 days'
GROUP BY 1 ORDER BY 1;

CREATE OR REPLACE VIEW v_compliance_score AS
SELECT framework,
       round(avg(score))::int AS score,
       count(*)::int AS controls,
       count(*) FILTER (WHERE status = 'compliant')::int AS compliant
FROM compliance_controls
GROUP BY framework;
