--
-- PostgreSQL database dump
--

\restrict TvDcYtIWO5m46iiiJmKqsC3Ms12qywTCuVn42V15gjDd4c5NnllwS8itroNfeJq

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: medicare
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO medicare;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    level character varying(16) DEFAULT 'info'::character varying NOT NULL,
    event_type character varying(64) DEFAULT 'system'::character varying NOT NULL,
    actor_id uuid,
    actor_email character varying(255),
    source_ip character varying(64),
    user_agent text,
    resource character varying(64),
    resource_id character varying(64),
    action character varying(48),
    message text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.activity_logs OWNER TO medicare;

--
-- Name: agents; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(120) NOT NULL,
    hostname character varying(160),
    ip_address character varying(64),
    os character varying(80),
    version character varying(32),
    status character varying(24) DEFAULT 'online'::character varying NOT NULL,
    last_heartbeat timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.agents OWNER TO medicare;

--
-- Name: ai_conversations; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.ai_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    title character varying(200) DEFAULT 'New investigation'::character varying NOT NULL,
    model character varying(64) DEFAULT 'medicareguard-analyst'::character varying NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_conversations OWNER TO medicare;

--
-- Name: ai_messages; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.ai_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid,
    role character varying(16) DEFAULT 'user'::character varying NOT NULL,
    content text NOT NULL,
    tokens integer DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_messages OWNER TO medicare;

--
-- Name: alerts; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(240) NOT NULL,
    description text,
    severity character varying(24) DEFAULT 'medium'::character varying NOT NULL,
    status character varying(24) DEFAULT 'open'::character varying NOT NULL,
    source character varying(120),
    source_ip character varying(64),
    country character varying(80),
    country_code character varying(4),
    mitre_tactic character varying(120),
    mitre_technique character varying(160),
    threat_id uuid,
    asset_id uuid,
    assignee_id uuid,
    risk_score integer DEFAULT 50 NOT NULL,
    confidence integer DEFAULT 70 NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.alerts OWNER TO medicare;

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(120) NOT NULL,
    key_prefix character varying(24) NOT NULL,
    key_hash text NOT NULL,
    user_id uuid,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    last_used_at timestamp with time zone,
    expires_at timestamp with time zone,
    revoked boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.api_keys OWNER TO medicare;

--
-- Name: assets; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(160) NOT NULL,
    type character varying(48) NOT NULL,
    category character varying(64),
    hostname character varying(160),
    ip_address character varying(64),
    mac_address character varying(32),
    os character varying(80),
    owner_id uuid,
    department character varying(120),
    location character varying(120),
    criticality character varying(24) DEFAULT 'medium'::character varying NOT NULL,
    status character varying(24) DEFAULT 'online'::character varying NOT NULL,
    risk_score integer DEFAULT 20 NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    last_seen timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.assets OWNER TO medicare;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    actor_email character varying(255),
    action character varying(48) NOT NULL,
    resource character varying(64),
    resource_id character varying(64),
    ip_address character varying(64),
    user_agent text,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO medicare;

--
-- Name: cases; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    status character varying(24) DEFAULT 'open'::character varying NOT NULL,
    severity character varying(24) DEFAULT 'medium'::character varying NOT NULL,
    owner_id uuid,
    incident_id uuid,
    summary text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cases OWNER TO medicare;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource character varying(64) NOT NULL,
    resource_id character varying(64) NOT NULL,
    author_id uuid,
    body text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.comments OWNER TO medicare;

--
-- Name: compliance_controls; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.compliance_controls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    framework character varying(48) NOT NULL,
    control_id character varying(40) NOT NULL,
    title character varying(200) NOT NULL,
    status character varying(24) DEFAULT 'in_progress'::character varying NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    owner_id uuid,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.compliance_controls OWNER TO medicare;

--
-- Name: data_sources; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.data_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(160) NOT NULL,
    type character varying(48) DEFAULT 'syslog'::character varying NOT NULL,
    status character varying(24) DEFAULT 'connected'::character varying NOT NULL,
    endpoint text,
    last_ingest_at timestamp with time zone,
    events_count bigint DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.data_sources OWNER TO medicare;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(120) NOT NULL,
    code character varying(24),
    manager_id uuid,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.departments OWNER TO medicare;

--
-- Name: detection_rules; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.detection_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(160) NOT NULL,
    rule_type character varying(48) DEFAULT 'sigma'::character varying NOT NULL,
    severity character varying(24) DEFAULT 'medium'::character varying NOT NULL,
    status character varying(24) DEFAULT 'active'::character varying NOT NULL,
    expression text,
    description text,
    mitre_tactic character varying(120),
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.detection_rules OWNER TO medicare;

--
-- Name: devices; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(160) NOT NULL,
    type character varying(48) DEFAULT 'workstation'::character varying NOT NULL,
    hostname character varying(160),
    ip_address character varying(64),
    os character varying(80),
    owner_id uuid,
    status character varying(24) DEFAULT 'online'::character varying NOT NULL,
    compliance_status character varying(24) DEFAULT 'compliant'::character varying NOT NULL,
    last_seen timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.devices OWNER TO medicare;

--
-- Name: email_events; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.email_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject character varying(240),
    sender character varying(240),
    recipient character varying(240),
    verdict character varying(24) DEFAULT 'clean'::character varying NOT NULL,
    severity character varying(24) DEFAULT 'low'::character varying NOT NULL,
    status character varying(24) DEFAULT 'delivered'::character varying NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_events OWNER TO medicare;

--
-- Name: findings; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.findings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    severity character varying(24) DEFAULT 'medium'::character varying NOT NULL,
    status character varying(24) DEFAULT 'open'::character varying NOT NULL,
    scan_id uuid,
    asset_id uuid,
    description text,
    remediation text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.findings OWNER TO medicare;

--
-- Name: firewall_rules; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.firewall_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(160) NOT NULL,
    description text,
    direction character varying(16) DEFAULT 'inbound'::character varying NOT NULL,
    action character varying(16) DEFAULT 'deny'::character varying NOT NULL,
    protocol character varying(16) DEFAULT 'tcp'::character varying NOT NULL,
    source_ip character varying(64),
    destination_ip character varying(64),
    source_port character varying(32),
    destination_port character varying(32),
    priority integer DEFAULT 100 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    hit_count bigint DEFAULT 0 NOT NULL,
    last_hit_at timestamp with time zone,
    created_by uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.firewall_rules OWNER TO medicare;

--
-- Name: incidents; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(240) NOT NULL,
    description text,
    severity character varying(24) DEFAULT 'medium'::character varying NOT NULL,
    status character varying(24) DEFAULT 'open'::character varying NOT NULL,
    priority character varying(24) DEFAULT 'P3'::character varying NOT NULL,
    category character varying(64),
    assignee_id uuid,
    reporter_id uuid,
    incident_key character varying(32),
    sla_due_at timestamp with time zone,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    root_cause text,
    impact text,
    timeline jsonb DEFAULT '[]'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.incidents OWNER TO medicare;

--
-- Name: integrations; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(120) NOT NULL,
    provider character varying(80),
    type character varying(48) DEFAULT 'siem'::character varying NOT NULL,
    status character varying(24) DEFAULT 'connected'::character varying NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_sync_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.integrations OWNER TO medicare;

--
-- Name: knowledge_base; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.knowledge_base (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    category character varying(64),
    status character varying(24) DEFAULT 'published'::character varying NOT NULL,
    content text,
    author_id uuid,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.knowledge_base OWNER TO medicare;

--
-- Name: metrics; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(120) NOT NULL,
    value numeric DEFAULT 0 NOT NULL,
    unit character varying(32),
    source character varying(80),
    tags jsonb DEFAULT '{}'::jsonb NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.metrics OWNER TO medicare;

--
-- Name: monitors; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.monitors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(160) NOT NULL,
    type character varying(48) DEFAULT 'uptime'::character varying NOT NULL,
    target character varying(200),
    status character varying(24) DEFAULT 'up'::character varying NOT NULL,
    interval_seconds integer DEFAULT 60 NOT NULL,
    last_checked_at timestamp with time zone,
    uptime_percent numeric(5,2) DEFAULT 100 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.monitors OWNER TO medicare;

--
-- Name: network_flows; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.network_flows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    src_ip character varying(64),
    dst_ip character varying(64),
    src_port integer,
    dst_port integer,
    protocol character varying(16),
    bytes bigint DEFAULT 0 NOT NULL,
    packets bigint DEFAULT 0 NOT NULL,
    action character varying(24) DEFAULT 'allow'::character varying NOT NULL,
    verdict character varying(24) DEFAULT 'benign'::character varying NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.network_flows OWNER TO medicare;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    title character varying(200) NOT NULL,
    message text,
    type character varying(32) DEFAULT 'info'::character varying NOT NULL,
    read boolean DEFAULT false NOT NULL,
    link text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO medicare;

--
-- Name: phishing_campaigns; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.phishing_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(160) NOT NULL,
    status character varying(24) DEFAULT 'draft'::character varying NOT NULL,
    target_group character varying(120),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    sent_count integer DEFAULT 0 NOT NULL,
    clicked_count integer DEFAULT 0 NOT NULL,
    reported_count integer DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.phishing_campaigns OWNER TO medicare;

--
-- Name: playbooks; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.playbooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(160) NOT NULL,
    category character varying(64),
    status character varying(24) DEFAULT 'active'::character varying NOT NULL,
    description text,
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.playbooks OWNER TO medicare;

--
-- Name: policies; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(160) NOT NULL,
    category character varying(64),
    status character varying(24) DEFAULT 'draft'::character varying NOT NULL,
    version character varying(24) DEFAULT '1.0'::character varying NOT NULL,
    description text,
    content text,
    effective_date date,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.policies OWNER TO medicare;

--
-- Name: remediations; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.remediations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    status character varying(24) DEFAULT 'pending'::character varying NOT NULL,
    priority character varying(24) DEFAULT 'medium'::character varying NOT NULL,
    owner_id uuid,
    asset_id uuid,
    finding_id uuid,
    due_at timestamp with time zone,
    completed_at timestamp with time zone,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.remediations OWNER TO medicare;

--
-- Name: reports; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    type character varying(48) DEFAULT 'executive'::character varying NOT NULL,
    status character varying(24) DEFAULT 'ready'::character varying NOT NULL,
    format character varying(16) DEFAULT 'pdf'::character varying NOT NULL,
    period_start timestamp with time zone,
    period_end timestamp with time zone,
    created_by uuid,
    summary text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.reports OWNER TO medicare;

--
-- Name: risk_assessments; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.risk_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    status character varying(24) DEFAULT 'draft'::character varying NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    asset_id uuid,
    owner_id uuid,
    methodology character varying(64),
    description text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.risk_assessments OWNER TO medicare;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(64) NOT NULL,
    description text,
    permissions text[] DEFAULT '{}'::text[] NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.roles OWNER TO medicare;

--
-- Name: scans; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(160) NOT NULL,
    type character varying(48) DEFAULT 'vulnerability'::character varying NOT NULL,
    status character varying(24) DEFAULT 'queued'::character varying NOT NULL,
    target character varying(200),
    agent_id uuid,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    findings_count integer DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.scans OWNER TO medicare;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    token_hash text NOT NULL,
    ip_address character varying(64),
    user_agent text,
    expires_at timestamp with time zone NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sessions OWNER TO medicare;

--
-- Name: settings; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(120) NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    scope character varying(48) DEFAULT 'global'::character varying NOT NULL,
    description text,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.settings OWNER TO medicare;

--
-- Name: tags; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(64) NOT NULL,
    color character varying(16) DEFAULT '#3b82f6'::character varying NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tags OWNER TO medicare;

--
-- Name: threat_intel; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.threat_intel (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    indicator text NOT NULL,
    indicator_type character varying(40) DEFAULT 'ip'::character varying NOT NULL,
    threat_actor character varying(120),
    confidence integer DEFAULT 70 NOT NULL,
    severity character varying(24) DEFAULT 'medium'::character varying NOT NULL,
    source character varying(120),
    country character varying(80),
    last_seen timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.threat_intel OWNER TO medicare;

--
-- Name: threats; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.threats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    category character varying(64),
    severity character varying(24) DEFAULT 'medium'::character varying NOT NULL,
    status character varying(24) DEFAULT 'active'::character varying NOT NULL,
    source character varying(120),
    source_ip character varying(64),
    country character varying(80),
    country_code character varying(4),
    ioc_type character varying(40),
    ioc_value text,
    confidence integer DEFAULT 70 NOT NULL,
    risk_score integer DEFAULT 50 NOT NULL,
    description text,
    mitre_tactic character varying(120),
    mitre_technique character varying(160),
    first_seen timestamp with time zone,
    last_seen timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.threats OWNER TO medicare;

--
-- Name: tickets; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject character varying(200) NOT NULL,
    status character varying(24) DEFAULT 'open'::character varying NOT NULL,
    priority character varying(24) DEFAULT 'medium'::character varying NOT NULL,
    requester_id uuid,
    assignee_id uuid,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tickets OWNER TO medicare;

--
-- Name: users; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    full_name character varying(160) NOT NULL,
    role_id uuid,
    department character varying(120),
    phone character varying(40),
    avatar_url text,
    status character varying(24) DEFAULT 'active'::character varying NOT NULL,
    last_login_at timestamp with time zone,
    mfa_enabled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO medicare;

--
-- Name: v_alert_severity; Type: VIEW; Schema: public; Owner: medicare
--

CREATE VIEW public.v_alert_severity AS
 SELECT severity,
    (count(*))::integer AS total
   FROM public.alerts
  GROUP BY severity;


ALTER VIEW public.v_alert_severity OWNER TO medicare;

--
-- Name: v_attack_timeline; Type: VIEW; Schema: public; Owner: medicare
--

CREATE VIEW public.v_attack_timeline AS
 SELECT date_trunc('hour'::text, detected_at) AS bucket,
    (count(*))::integer AS alerts,
    (count(*) FILTER (WHERE ((severity)::text = ANY ((ARRAY['critical'::character varying, 'high'::character varying])::text[]))))::integer AS critical_high
   FROM public.alerts
  WHERE (detected_at > (now() - '7 days'::interval))
  GROUP BY (date_trunc('hour'::text, detected_at))
  ORDER BY (date_trunc('hour'::text, detected_at));


ALTER VIEW public.v_attack_timeline OWNER TO medicare;

--
-- Name: v_attacks_by_country; Type: VIEW; Schema: public; Owner: medicare
--

CREATE VIEW public.v_attacks_by_country AS
 SELECT COALESCE(country, 'Unknown'::character varying) AS country,
    COALESCE(country_code, 'UN'::character varying) AS country_code,
    (count(*))::integer AS attacks,
    (count(*) FILTER (WHERE ((severity)::text = ANY ((ARRAY['critical'::character varying, 'high'::character varying])::text[]))))::integer AS high_severity,
    (round(avg(risk_score)))::integer AS avg_risk
   FROM public.threats
  GROUP BY COALESCE(country, 'Unknown'::character varying), COALESCE(country_code, 'UN'::character varying)
  ORDER BY ((count(*))::integer) DESC;


ALTER VIEW public.v_attacks_by_country OWNER TO medicare;

--
-- Name: v_compliance_score; Type: VIEW; Schema: public; Owner: medicare
--

CREATE VIEW public.v_compliance_score AS
 SELECT framework,
    (round(avg(score)))::integer AS score,
    (count(*))::integer AS controls,
    (count(*) FILTER (WHERE ((status)::text = 'compliant'::text)))::integer AS compliant
   FROM public.compliance_controls
  GROUP BY framework;


ALTER VIEW public.v_compliance_score OWNER TO medicare;

--
-- Name: v_top_attackers; Type: VIEW; Schema: public; Owner: medicare
--

CREATE VIEW public.v_top_attackers AS
 SELECT source_ip,
    max((country)::text) AS country,
    max((country_code)::text) AS country_code,
    (count(*))::integer AS events,
    max((severity)::text) AS top_severity,
    (round(avg(risk_score)))::integer AS avg_risk,
    max(last_seen) AS last_seen
   FROM public.threats
  WHERE (source_ip IS NOT NULL)
  GROUP BY source_ip
  ORDER BY ((count(*))::integer) DESC, ((round(avg(risk_score)))::integer) DESC;


ALTER VIEW public.v_top_attackers OWNER TO medicare;

--
-- Name: vendors; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(160) NOT NULL,
    category character varying(64),
    risk_level character varying(24) DEFAULT 'medium'::character varying NOT NULL,
    status character varying(24) DEFAULT 'active'::character varying NOT NULL,
    contact_email character varying(255),
    website text,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vendors OWNER TO medicare;

--
-- Name: vulnerabilities; Type: TABLE; Schema: public; Owner: medicare
--

CREATE TABLE public.vulnerabilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    severity character varying(24) DEFAULT 'medium'::character varying NOT NULL,
    status character varying(24) DEFAULT 'open'::character varying NOT NULL,
    cvss_score numeric(4,1) DEFAULT 5.0 NOT NULL,
    cve_id character varying(32),
    asset_id uuid,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vulnerabilities OWNER TO medicare;

--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.activity_logs (id, level, event_type, actor_id, actor_email, source_ip, user_agent, resource, resource_id, action, message, metadata, created_at, updated_at) FROM stdin;
7ffdb91d-a0ca-461f-b9b2-f2d9b505e24b	info	integration	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	82.174.192.142	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	c08a7ac4-bfd8-4d3d-813a-7866a38a4a22	update	Vulnerability remediation assigned	{"eventType": "integration"}	2026-10-25 22:01:35.475+07	2026-10-29 09:01:35.476705+07
a52de996-b2e5-4ddd-9a69-93704727fa01	info	asset	9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	176.31.219.91	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	0f2fba3e-d077-4c2e-b346-6ba223325c85	create	Detection rule updated	{"eventType": "asset"}	2026-10-28 16:01:35.475+07	2026-10-29 09:01:35.477319+07
12e27212-cf18-44ac-8363-b27d4b7b17db	debug	ai	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	194.243.194.246	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	9e7a0a0e-4df2-43cb-b993-0f35c6ca7e52	create	Threat intel feed refreshed	{"eventType": "ai"}	2026-10-23 19:01:35.475+07	2026-10-29 09:01:35.477606+07
493a4def-8460-4c38-8fe4-0e1b3869a993	error	firewall	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	109.101.181.214	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	8fd0df1b-d80b-46ac-9143-eb713f33274f	block	Detection rule updated	{"eventType": "firewall"}	2026-10-23 20:01:35.475+07	2026-10-29 09:01:35.477848+07
d69ede91-843e-4411-8c4f-5baabab92d34	info	ai	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	31.50.28.78	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	ef8bade8-7c23-4d29-a92b-10d115639a76	block	AI investigation completed	{"eventType": "ai"}	2026-10-20 15:01:35.475+07	2026-10-29 09:01:35.478092+07
c3e7e3a9-67ae-466c-aa0d-e8c97b1d34b9	info	incident	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	41.80.41.171	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	e83e4547-df9b-42cc-8f32-bed55dc4af6d	export	Report exported	{"eventType": "incident"}	2026-10-23 00:01:35.475+07	2026-10-29 09:01:35.478346+07
3f42e335-1bd0-47bf-9a15-3a347a919003	info	incident	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	82.56.249.189	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	76166247-5031-4eca-9a29-fbc1da1c825e	create	Report exported	{"eventType": "incident"}	2026-10-24 17:01:35.475+07	2026-10-29 09:01:35.4786+07
d569ccca-3c6a-431e-b08b-666b9f4a9562	error	alert	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	103.171.67.72	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	63efa3ba-a8fd-4022-87de-a12ac4b3a0f1	update	Alert triaged by analyst	{"eventType": "alert"}	2026-10-28 10:01:35.475+07	2026-10-29 09:01:35.478824+07
31a13ca3-1d9b-4f4e-8c0d-5eb0c750f353	error	ai	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	203.175.194.153	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	1861c46c-66e6-476f-8421-e917295ed947	export	Incident status changed	{"eventType": "ai"}	2026-10-24 20:01:35.475+07	2026-10-29 09:01:35.479101+07
8b4dc983-f663-4cee-9ff8-7ca7fb7aff64	info	integration	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	31.187.214.108	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	14803716-72c4-480f-a4e0-58b403c02e4c	logout	Threat intel feed refreshed	{"eventType": "integration"}	2026-10-22 00:01:35.475+07	2026-10-29 09:01:35.479326+07
b532c197-c8e4-4c2f-a9f0-5f453c099275	debug	asset	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	181.133.56.13	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	5d2723eb-b3b8-44cb-bbdb-77ec7ac1b84e	create	User session revoked	{"eventType": "asset"}	2026-10-20 02:01:35.475+07	2026-10-29 09:01:35.479517+07
5cd7bffb-f0bf-4ad5-aadd-d791065abb3c	warn	alert	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	37.144.166.244	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	e0a8b914-ae10-45fe-9295-69c52efa0550	export	Report exported	{"eventType": "alert"}	2026-10-21 13:01:35.475+07	2026-10-29 09:01:35.479728+07
69b297ce-da6d-4288-97da-73c0e9644400	warn	asset	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	37.236.94.74	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	f3f69544-9fa4-47e3-b4ee-cf9609e90736	create	Vulnerability remediation assigned	{"eventType": "asset"}	2026-10-26 19:01:35.475+07	2026-10-29 09:01:35.479957+07
9e8eacd7-a7b7-4a67-a2a2-e007bbafe37c	debug	ai	9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	37.52.131.58	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	5dd7adbd-2256-4a7d-8029-211aa36397c9	triage	Alert triaged by analyst	{"eventType": "ai"}	2026-10-23 10:01:35.475+07	2026-10-29 09:01:35.480161+07
18ae407f-3d9c-4ac1-b8a5-8ed06a31bb73	info	auth	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	194.156.223.11	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	c98cb53d-d69c-460d-861e-aaf363b059bd	update	Detection rule updated	{"eventType": "auth"}	2026-10-27 07:01:35.475+07	2026-10-29 09:01:35.480345+07
cb95a9c3-ce1d-4f3a-8c52-bd9b532e24a7	info	auth	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	194.217.150.199	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	7d2bec8e-1604-4f33-85e7-6d6292430e6b	triage	AI investigation completed	{"eventType": "auth"}	2026-10-23 15:01:35.475+07	2026-10-29 09:01:35.480576+07
66d82e73-911c-44cb-88e4-6923c217cd13	error	system	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	194.249.249.239	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	2d1791bc-ac3e-4f79-a49d-e311f2971758	delete	Vulnerability remediation assigned	{"eventType": "system"}	2026-10-21 03:01:35.475+07	2026-10-29 09:01:35.480829+07
5c54f5b9-699b-4430-8073-cbefffee50b1	info	incident	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	89.244.2.208	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	dc23312f-877c-4b5f-8180-730adb5da0b0	update	Detection rule updated	{"eventType": "incident"}	2026-10-27 05:01:35.475+07	2026-10-29 09:01:35.481088+07
748f07ab-6658-4f53-8457-b3bf688d2b72	debug	alert	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	62.17.63.173	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	b92b3ecb-f860-4eab-935a-6fa5b15c0bd2	scan	User session revoked	{"eventType": "alert"}	2026-10-24 15:01:35.475+07	2026-10-29 09:01:35.481348+07
2bd4b153-3154-4e28-a736-a9869bb29301	info	alert	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	212.114.202.193	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	c23c7626-227d-4100-ab2e-56a3ef7d35d1	triage	Vulnerability remediation assigned	{"eventType": "alert"}	2026-10-24 00:01:35.475+07	2026-10-29 09:01:35.48158+07
67cd24b8-2c86-4ff1-97a5-16e33d3d3967	error	integration	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	181.114.100.59	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	2ab2c15c-5d0a-4b62-8e21-a90073f7647b	scan	Asset scan completed	{"eventType": "integration"}	2026-10-27 17:01:35.475+07	2026-10-29 09:01:35.481797+07
082f0dde-c309-4403-a83d-0ff12377f548	info	alert	9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	82.78.12.31	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	fdc67c25-e6dc-4d81-932d-ff758888bc57	block	Asset scan completed	{"eventType": "alert"}	2026-10-21 22:01:35.475+07	2026-10-29 09:01:35.482057+07
1b155773-7cb2-4be7-9a77-fb2d50c24be6	debug	firewall	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	80.130.250.202	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	e126a20a-a40b-4f09-901c-177ae28fc2d6	delete	Incident status changed	{"eventType": "firewall"}	2026-10-27 15:01:35.475+07	2026-10-29 09:01:35.482379+07
cb299f95-096e-4468-8e74-80bd5c8c2319	info	ai	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	45.250.216.33	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	9a995052-54e7-4e84-9192-240d35f2d82f	triage	Vulnerability remediation assigned	{"eventType": "ai"}	2026-10-21 07:01:35.475+07	2026-10-29 09:01:35.482716+07
68bc68a9-568c-4107-85f0-8d90f0ae4660	warn	firewall	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	62.40.58.147	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	fcd31903-32d3-4075-b3ac-b60ce4e88e3e	login	Report exported	{"eventType": "firewall"}	2026-10-25 09:01:35.475+07	2026-10-29 09:01:35.482963+07
36111698-51c3-444b-92f1-ee796939baae	debug	ai	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	91.34.179.142	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	98094d82-a5a6-443d-b40a-3247ec385fe8	block	Vulnerability remediation assigned	{"eventType": "ai"}	2026-10-21 05:01:35.475+07	2026-10-29 09:01:35.483184+07
e4a22a61-9e52-470c-8d3c-5cf7c597da31	error	asset	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	185.86.6.139	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	ed0207fe-c7a8-46bd-82e6-0a9d154b41ba	login	AI investigation completed	{"eventType": "asset"}	2026-10-20 06:01:35.475+07	2026-10-29 09:01:35.483389+07
631b2c59-2b9a-4d6e-83b6-ced3047e077f	info	auth	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	5.138.226.153	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	ba5fc6d3-666c-4e42-8882-9fc584ba4f39	scan	Incident status changed	{"eventType": "auth"}	2026-10-27 03:01:35.475+07	2026-10-29 09:01:35.483621+07
cf85f017-6270-4a3b-b96a-5382a4c5a753	debug	alert	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	103.238.211.12	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	6ff4f188-ac18-4bb1-a141-bf37fd1af51f	logout	Firewall rule deployed to edge	{"eventType": "alert"}	2026-10-25 15:01:35.475+07	2026-10-29 09:01:35.483814+07
18c38041-7fc3-44e2-ba03-9da4cb79c2d7	info	alert	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	91.181.97.197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	b2babba9-1dfc-494f-b9e7-3a14b3ac98cb	create	AI investigation completed	{"eventType": "alert"}	2026-10-23 03:01:35.475+07	2026-10-29 09:01:35.48405+07
a63379c4-75a9-4260-a104-e58b58d14ffb	info	alert	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	37.155.103.239	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	c29da787-8fd8-4c3c-acea-0a21a5a79d07	scan	Asset scan completed	{"eventType": "alert"}	2026-10-25 21:01:35.475+07	2026-10-29 09:01:35.484245+07
7e8648df-7b90-41a2-856e-748edf622caa	info	incident	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	212.97.240.158	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	55f0717f-58fa-4b35-bc5f-ffb026765a1c	delete	Detection rule updated	{"eventType": "incident"}	2026-10-23 15:01:35.475+07	2026-10-29 09:01:35.48443+07
37bed1a0-effc-4de0-8735-6c1db232f6da	warn	incident	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	109.224.209.73	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	20939154-65b7-491d-b580-f5eb58742fe2	delete	Suspicious login blocked	{"eventType": "incident"}	2026-10-22 20:01:35.475+07	2026-10-29 09:01:35.484637+07
bed188d8-43c9-4d2c-9c4a-54872830fbb9	info	ai	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	212.98.21.223	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	63c9ed20-7639-43a4-9e0a-9c79ad3b5a74	triage	Alert triaged by analyst	{"eventType": "ai"}	2026-10-23 05:01:35.476+07	2026-10-29 09:01:35.484834+07
1d2d626e-1eca-4bf4-b034-7c4c81741e1f	debug	asset	9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	77.121.115.20	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	559aa16b-dee0-409b-8bc8-3192f006713c	logout	Threat intel feed refreshed	{"eventType": "asset"}	2026-10-27 03:01:35.476+07	2026-10-29 09:01:35.485087+07
e4c7bafb-d071-4183-a24d-8c0e8002d7f1	warn	incident	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	176.254.32.209	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	060016e6-b9ae-43ce-9d73-3a151d6e65b4	export	AI investigation completed	{"eventType": "incident"}	2026-10-21 18:01:35.476+07	2026-10-29 09:01:35.485328+07
01e8d805-70d1-4564-8dd2-5346ba5a8e82	info	alert	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	212.152.24.18	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	f2ecc7da-4b7a-4006-951b-54ab7538c789	update	AI investigation completed	{"eventType": "alert"}	2026-10-19 23:01:35.476+07	2026-10-29 09:01:35.48553+07
2fb59cf7-ab27-4d12-bc4f-35ae56323089	info	system	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	37.189.149.145	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	882160d1-0bdd-451a-88d0-e6418d686bc9	logout	Alert triaged by analyst	{"eventType": "system"}	2026-10-25 11:01:35.476+07	2026-10-29 09:01:35.485733+07
2a159967-69ee-444d-ba11-fd79e2d14a08	error	incident	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	41.124.110.162	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	ed735ebe-6c35-4374-b9fe-d6af5e02d9e0	update	Vulnerability remediation assigned	{"eventType": "incident"}	2026-10-23 12:01:35.476+07	2026-10-29 09:01:35.486004+07
72f68c4b-8923-466e-bba4-3586f8dd105d	warn	asset	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	176.0.87.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	b7d71440-21e5-4b74-b9cd-3e8e79205dc4	block	Asset scan completed	{"eventType": "asset"}	2026-10-24 10:01:35.476+07	2026-10-29 09:01:35.486296+07
45acd77e-a02e-4558-a6dc-3e117d0ca1d8	info	asset	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	45.94.150.113	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	386ece80-471e-4ce7-9c86-fe4aa08289a9	block	Suspicious login blocked	{"eventType": "asset"}	2026-10-21 10:01:35.476+07	2026-10-29 09:01:35.48656+07
126a3388-c33d-4814-bdd7-1375ab2aafdc	info	integration	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	181.20.179.230	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	558c1e35-cac2-459e-a1d7-904b616104d2	block	Suspicious login blocked	{"eventType": "integration"}	2026-10-21 22:01:35.476+07	2026-10-29 09:01:35.486822+07
d77d1406-f244-4dea-b920-bb7d1c6361e7	info	asset	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	62.10.28.70	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	5b9e7c40-382b-4aac-a485-30d7acfe4a86	block	Report exported	{"eventType": "asset"}	2026-10-26 05:01:35.476+07	2026-10-29 09:01:35.487025+07
872412d3-5a50-4168-bdbb-e22c596e25c3	info	auth	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	41.75.134.196	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	53d1d008-76f6-4b29-a1dc-be1f290926ee	scan	Firewall rule deployed to edge	{"eventType": "auth"}	2026-10-20 11:01:35.476+07	2026-10-29 09:01:35.48724+07
df3fb2a1-02ef-404b-b10f-3c9b58c0093e	info	asset	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	181.206.251.214	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	f2aa1630-0abb-47f5-8895-10ee05d0c123	block	Vulnerability remediation assigned	{"eventType": "asset"}	2026-10-27 23:01:35.476+07	2026-10-29 09:01:35.487471+07
448b0baa-7e32-4cf1-98d1-b339be4cfd7c	error	system	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	185.201.83.80	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	9e845c6d-222d-492e-80e6-17de1ddbf97b	update	SIEM integration synced	{"eventType": "system"}	2026-10-21 06:01:35.476+07	2026-10-29 09:01:35.487719+07
cc9e624e-e0c5-4081-a6fa-ac494a902311	info	alert	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	203.99.58.249	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	f607671a-ab7a-40e2-bf3d-9cfdc4988ab1	scan	Vulnerability remediation assigned	{"eventType": "alert"}	2026-10-29 07:01:35.476+07	2026-10-29 09:01:35.487956+07
cd9c7b14-ccbb-4112-bac4-80e4601b2058	debug	firewall	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	89.203.28.204	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	62c14a28-879d-4770-b19c-a0818ba028ad	scan	Threat intel feed refreshed	{"eventType": "firewall"}	2026-10-23 17:01:35.476+07	2026-10-29 09:01:35.488209+07
db3df6f9-738a-443e-abcb-87e7b9cfd965	debug	system	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	103.180.87.79	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	61b159e5-a7aa-4383-8913-41e9fd1a396f	logout	Asset scan completed	{"eventType": "system"}	2026-10-20 19:01:35.476+07	2026-10-29 09:01:35.488427+07
6dabb4bd-2a1e-4492-bdb9-e247b8edd3fd	info	incident	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	203.118.184.131	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	35b3292c-27cc-4fd7-b9b7-db74463b4a9f	scan	Report exported	{"eventType": "incident"}	2026-10-24 22:01:35.476+07	2026-10-29 09:01:35.488641+07
4c62e237-1b22-4837-a994-fc5dac6eb669	error	system	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	37.212.218.204	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	3df98285-8a34-4121-80d6-3d28f66cb5aa	export	User session revoked	{"eventType": "system"}	2026-10-24 21:01:35.476+07	2026-10-29 09:01:35.488852+07
9c4e6994-34ef-43a5-bbd6-1d69b72de22e	warn	auth	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	45.219.190.37	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	0dcbf8db-e1eb-4257-81ec-a6b20352646a	block	Threat intel feed refreshed	{"eventType": "auth"}	2026-10-28 00:01:35.476+07	2026-10-29 09:01:35.489122+07
6bddd540-18cc-41fe-9913-b65dae8d1612	error	alert	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	77.106.211.132	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	78d25860-be12-4b4e-93af-822eff978035	login	Report exported	{"eventType": "alert"}	2026-10-21 06:01:35.476+07	2026-10-29 09:01:35.489444+07
da36d62d-3ac4-4e5e-8b41-05063e23fcfd	info	asset	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	109.48.157.150	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	95324498-2ad1-4cd2-8c39-649ac37a02c9	create	User session revoked	{"eventType": "asset"}	2026-10-28 08:01:35.476+07	2026-10-29 09:01:35.489764+07
61deea43-0afd-4fcf-862e-aa5bd78ea9b1	error	integration	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	37.252.107.18	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	39f83571-95aa-45c0-8f5c-78a8335e04c0	scan	SIEM integration synced	{"eventType": "integration"}	2026-10-22 23:01:35.476+07	2026-10-29 09:01:35.49005+07
f4764c87-0019-4e9f-9604-63896769c0a8	info	firewall	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	80.185.243.26	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	418947d7-76b0-4c10-a5a9-7f4429cb5e64	login	Vulnerability remediation assigned	{"eventType": "firewall"}	2026-10-20 10:01:35.476+07	2026-10-29 09:01:35.490279+07
ab0f86e1-223e-467d-9ce5-c7af1b5e7d20	warn	asset	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	37.198.163.118	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	b09a4439-398a-454b-88ce-1112b833341a	update	Incident status changed	{"eventType": "asset"}	2026-10-27 06:01:35.476+07	2026-10-29 09:01:35.490506+07
c430a740-8e64-4dcb-a57d-40eabada24ad	debug	auth	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	41.66.101.244	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	ed633240-bce9-491c-9f6d-813e5a9fb249	export	Suspicious login blocked	{"eventType": "auth"}	2026-10-26 08:01:35.476+07	2026-10-29 09:01:35.490722+07
46b6956f-5297-4c35-8b85-9e33b2fb28e7	info	auth	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	82.39.30.244	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	fc1c8d2b-3401-431a-935b-5adf5bcf65f9	export	AI investigation completed	{"eventType": "auth"}	2026-10-20 18:01:35.476+07	2026-10-29 09:01:35.490949+07
57b98d43-2298-4a31-b3e5-15473fd7af48	info	integration	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	80.217.210.71	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	2a980e03-278b-447f-8fe1-90cf266b8178	delete	Vulnerability remediation assigned	{"eventType": "integration"}	2026-10-26 00:01:35.476+07	2026-10-29 09:01:35.491196+07
95c5c721-0380-4656-81f0-4df0819af827	warn	auth	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	80.91.239.247	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	2d136ff0-a498-4d12-877e-b98814395421	triage	User session revoked	{"eventType": "auth"}	2026-10-22 19:01:35.476+07	2026-10-29 09:01:35.49141+07
b9163438-4215-4a86-83d3-bbb2adec327d	info	ai	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	181.184.214.237	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	b0b5eb7d-f486-49e3-85d9-4ccd20a6b141	block	SIEM integration synced	{"eventType": "ai"}	2026-10-22 01:01:35.476+07	2026-10-29 09:01:35.491615+07
2bb3583c-9ae9-4b33-9ea5-625fd8f2e3ce	info	firewall	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	185.179.223.203	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	ced1cfe3-2bd6-424a-89f5-37b8b4960ff4	block	User session revoked	{"eventType": "firewall"}	2026-10-20 20:01:35.476+07	2026-10-29 09:01:35.491848+07
720a9752-8319-40ba-88e5-2afd3cc191f3	info	alert	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	45.30.168.119	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	4f2314b9-fe9d-43b7-b1a1-13a70e0328d1	create	Asset scan completed	{"eventType": "alert"}	2026-10-22 00:01:35.476+07	2026-10-29 09:01:35.49207+07
518b67d0-dacd-4738-800d-0284acb3872a	warn	incident	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	31.180.132.216	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	83ff94fe-f50b-44f9-88b7-07b4342904d6	create	Firewall rule deployed to edge	{"eventType": "incident"}	2026-10-28 09:01:35.476+07	2026-10-29 09:01:35.492284+07
f0e967f2-2e18-4950-9ed5-f7902008a2ab	debug	ai	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	203.170.71.157	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	3186a4bd-6df3-4e59-ba79-20cbad15c1a4	export	Suspicious login blocked	{"eventType": "ai"}	2026-10-21 02:01:35.476+07	2026-10-29 09:01:35.4925+07
616d6b7b-33a8-45c3-bd41-4921b6bb2ab7	warn	alert	9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	181.39.234.166	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	82cc5642-da1e-44b6-ab2c-b4dd2442a530	scan	Detection rule updated	{"eventType": "alert"}	2026-10-28 10:01:35.476+07	2026-10-29 09:01:35.49271+07
9eaca891-59e3-4f46-8e74-82f5ce667f05	info	system	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	82.42.23.55	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	6516323b-2367-4f89-9a09-c6239c265b2a	export	Vulnerability remediation assigned	{"eventType": "system"}	2026-10-24 15:01:35.476+07	2026-10-29 09:01:35.492897+07
76f100b9-50ed-4fab-a296-ef5f67884166	info	alert	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	212.107.194.251	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	ac6e338b-589a-4fc7-9d32-1c6fd9b8a395	update	Report exported	{"eventType": "alert"}	2026-10-27 22:01:35.476+07	2026-10-29 09:01:35.493127+07
5749d284-dd52-4a2d-a317-4b5c87877b2e	error	incident	9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	181.123.65.32	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	395b8c28-dc0c-42cb-add2-39e40201c3ec	login	User session revoked	{"eventType": "incident"}	2026-10-28 16:01:35.476+07	2026-10-29 09:01:35.49333+07
e8bd00ed-8c1e-44b2-9b58-3da2b614c0fb	warn	alert	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	80.223.141.253	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	b79181bc-19f8-44e5-8a54-44874791078d	update	Suspicious login blocked	{"eventType": "alert"}	2026-10-24 03:01:35.476+07	2026-10-29 09:01:35.493524+07
86fefa18-e187-4cbc-8c01-410ea68a8515	debug	integration	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	91.81.213.34	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	5644ea68-722a-4cc6-a52a-a340c456d349	triage	Threat intel feed refreshed	{"eventType": "integration"}	2026-10-29 01:01:35.476+07	2026-10-29 09:01:35.49373+07
7a329f1c-8321-4a31-8c40-f69205767835	warn	system	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	77.110.250.3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	725202fb-9021-4ef3-b706-e5cc3dc203d5	update	Suspicious login blocked	{"eventType": "system"}	2026-10-22 13:01:35.476+07	2026-10-29 09:01:35.493948+07
b67a20aa-ab91-4fd6-8c73-ec61d9011e41	debug	alert	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	102.36.183.65	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	4e7682ed-32f9-4d8d-9bbe-2cecd7495232	block	Firewall rule deployed to edge	{"eventType": "alert"}	2026-10-19 11:01:35.476+07	2026-10-29 09:01:35.494177+07
cf59bf72-342d-47ae-b113-fcf5bd06dbd1	info	integration	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	212.202.253.177	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	c84ebc2d-c695-4d98-97c8-4fafa0127e35	export	Report exported	{"eventType": "integration"}	2026-10-21 00:01:35.476+07	2026-10-29 09:01:35.494442+07
55df8b2f-20d8-493a-8650-87d88afb40d1	warn	system	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	203.213.119.228	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	5fcdcf58-fa6a-403a-85b7-a260d1cb52f8	logout	Firewall rule deployed to edge	{"eventType": "system"}	2026-10-29 03:01:35.476+07	2026-10-29 09:01:35.494693+07
46f59888-f102-4739-996f-e77253849311	info	asset	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	185.229.14.100	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	7699c557-2d96-475e-a12e-989e1a13fb7e	block	User session revoked	{"eventType": "asset"}	2026-10-26 13:01:35.476+07	2026-10-29 09:01:35.494921+07
371d3360-40cf-47ac-8180-9259ad9a2f00	info	firewall	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	77.76.215.146	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	d442f43f-05f4-401c-b8eb-1a7ae20b5059	scan	Asset scan completed	{"eventType": "firewall"}	2026-10-26 13:01:35.476+07	2026-10-29 09:01:35.495132+07
09908cc0-357f-43bd-aa85-bb32b0275a4e	warn	ai	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	176.176.83.211	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	08c2d815-20f1-4016-91d9-789839fb2373	update	Threat intel feed refreshed	{"eventType": "ai"}	2026-10-28 19:01:35.476+07	2026-10-29 09:01:35.495337+07
30700b1d-54b7-44d0-9af8-122815958d29	info	ai	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	31.86.110.85	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	95427aed-dc35-456e-8a31-1ee10f7e41a8	login	SIEM integration synced	{"eventType": "ai"}	2026-10-23 07:01:35.476+07	2026-10-29 09:01:35.495547+07
89aacf36-5308-4d96-9887-309eb6a14f41	debug	firewall	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	91.83.116.109	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	504ce957-0c58-4d93-8af6-231ec18fd69e	login	AI investigation completed	{"eventType": "firewall"}	2026-10-22 01:01:35.476+07	2026-10-29 09:01:35.49575+07
cb802888-fa12-4291-8790-ac8d580f7865	info	integration	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	176.1.60.218	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	0fac0a83-24ef-41bb-81ec-46834170b205	create	Asset scan completed	{"eventType": "integration"}	2026-10-20 08:01:35.476+07	2026-10-29 09:01:35.495967+07
1cca5f69-9f7e-4acc-96d6-dab008bfcd47	info	alert	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	203.183.216.170	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	f20fe3bd-3cea-4ac2-8bbb-806484ff78c4	triage	Incident status changed	{"eventType": "alert"}	2026-10-26 07:01:35.476+07	2026-10-29 09:01:35.496173+07
b90f80e8-27d5-433d-abe8-6ee4f931b2f4	info	system	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	194.190.109.56	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	5ff71816-2ff7-4d07-adfa-c2fb8eac9707	login	Asset scan completed	{"eventType": "system"}	2026-10-28 22:01:35.476+07	2026-10-29 09:01:35.49642+07
7d084384-4fd3-4fd6-8f09-de6847700bb8	warn	system	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	77.107.58.187	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	311acfab-8f23-4098-b342-c9212eb62daa	scan	Asset scan completed	{"eventType": "system"}	2026-10-21 23:01:35.476+07	2026-10-29 09:01:35.49666+07
5ba01f93-28de-48d7-8459-b11c94b80405	info	firewall	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	203.94.240.47	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	ebdae2f8-db9e-46be-8f1d-2dabb9971454	create	Firewall rule deployed to edge	{"eventType": "firewall"}	2026-10-25 00:01:35.476+07	2026-10-29 09:01:35.496857+07
f337695d-5e83-4996-b1c1-6715289c0a64	error	incident	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	109.219.57.105	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	8917931c-0707-4d86-b639-b75aa119a882	delete	Report exported	{"eventType": "incident"}	2026-10-28 17:01:35.476+07	2026-10-29 09:01:35.497064+07
e88e5f01-f052-415d-934c-2be36050d474	info	alert	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	194.126.176.53	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	3cbeaf0b-4d9a-4ee1-83be-ee787d2c1839	scan	Threat intel feed refreshed	{"eventType": "alert"}	2026-10-28 08:01:35.476+07	2026-10-29 09:01:35.497298+07
e29a102d-a8ad-494f-af79-e53298cebd02	info	integration	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	103.65.252.95	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	0d6731a5-713d-43aa-b39b-8be6af75b452	export	Vulnerability remediation assigned	{"eventType": "integration"}	2026-10-23 01:01:35.476+07	2026-10-29 09:01:35.497487+07
77557222-91e0-4b17-b941-db011f499916	info	system	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	41.167.91.63	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	9767990f-5a33-42be-b201-a8e4bb97a04f	delete	Vulnerability remediation assigned	{"eventType": "system"}	2026-10-23 22:01:35.476+07	2026-10-29 09:01:35.497691+07
4880b063-4200-4ad3-b958-69822cba9c36	info	system	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	45.17.220.230	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	447c7d42-3c65-4b4b-a4b8-7e540666d9d1	delete	Asset scan completed	{"eventType": "system"}	2026-10-22 16:01:35.476+07	2026-10-29 09:01:35.497886+07
6503d08d-eb36-4961-aaca-714baa17f32a	info	asset	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	102.37.106.223	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	29e9044a-24af-4811-baea-3500e82528d2	delete	Asset scan completed	{"eventType": "asset"}	2026-10-26 00:01:35.476+07	2026-10-29 09:01:35.498148+07
f43419c9-b246-4ccf-adf0-7dc314c352c3	info	auth	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	37.20.142.196	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	f747c6a3-90fb-4a47-b263-1a4b8e7d80c4	delete	SIEM integration synced	{"eventType": "auth"}	2026-10-22 16:01:35.476+07	2026-10-29 09:01:35.498393+07
064d91ee-6bc6-4162-82c5-1c7b5629efa1	error	integration	9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	102.248.240.168	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	c03f4707-d873-4c2f-9f70-387e6746eb6d	logout	Incident status changed	{"eventType": "integration"}	2026-10-22 14:01:35.476+07	2026-10-29 09:01:35.498638+07
4197997a-5a70-4373-8bd1-9d3390567468	info	integration	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	45.226.252.70	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	0c47e1e2-0da3-420a-a6bb-a14816da86ef	block	Suspicious login blocked	{"eventType": "integration"}	2026-10-26 14:01:35.476+07	2026-10-29 09:01:35.498873+07
e948de21-e01d-4dd7-9d55-2bfd34b97bb1	info	integration	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	181.113.225.83	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	7549696f-5e1b-46f1-a262-5946be6fd3c1	block	Firewall rule deployed to edge	{"eventType": "integration"}	2026-10-24 18:01:35.476+07	2026-10-29 09:01:35.499106+07
7995dd46-4d52-4178-bcf5-307a4540870b	error	auth	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	82.150.69.161	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	fddd2427-4d68-4722-a31b-760d9b5f14b6	triage	Firewall rule deployed to edge	{"eventType": "auth"}	2026-10-22 12:01:35.476+07	2026-10-29 09:01:35.499359+07
700511c0-d178-4241-9a20-ca37e186e5eb	error	system	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	45.252.124.238	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	702331b1-8361-48d5-907b-3003e31e2308	block	Report exported	{"eventType": "system"}	2026-10-23 07:01:35.476+07	2026-10-29 09:01:35.499605+07
8a33a794-1ac2-41fa-a558-f7ba67261296	warn	system	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	5.192.210.7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	eb11f91a-0f6c-43ad-96b2-a6854af8c527	triage	Incident status changed	{"eventType": "system"}	2026-10-20 01:01:35.476+07	2026-10-29 09:01:35.499835+07
0201161a-0399-4989-b586-5f23c5b7a1b9	info	incident	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	41.72.178.169	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	592a0226-13e0-4aa4-a470-3388bc40e998	delete	Asset scan completed	{"eventType": "incident"}	2026-10-23 04:01:35.476+07	2026-10-29 09:01:35.500101+07
6f060494-318b-464f-9fee-ca3500e3094a	info	incident	9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	82.37.133.155	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	e85a0523-10e5-42f1-af15-e7d2df52f39c	export	Firewall rule deployed to edge	{"eventType": "incident"}	2026-10-20 04:01:35.476+07	2026-10-29 09:01:35.500336+07
67c2040d-995c-4884-8906-b73f11eb67e6	error	ai	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	77.236.148.170	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	a826221b-748b-4047-947a-70b7c2bd1ec3	update	Threat intel feed refreshed	{"eventType": "ai"}	2026-10-25 21:01:35.476+07	2026-10-29 09:01:35.500592+07
783cd0dd-aa14-4551-8c83-9e5278146e45	info	incident	9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	185.41.73.133	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	5990ea2e-f3cf-4e60-976e-d2c73e9918f8	scan	Incident status changed	{"eventType": "incident"}	2026-10-26 17:01:35.476+07	2026-10-29 09:01:35.500829+07
7192a150-7396-4bd3-b6c4-63b86cfc7878	info	firewall	9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	194.30.181.29	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	2954e0ba-cd9c-45a8-88b2-075d9812709b	block	Threat intel feed refreshed	{"eventType": "firewall"}	2026-10-24 12:01:35.476+07	2026-10-29 09:01:35.501128+07
01d87f7b-e476-4976-9d33-1c7ecfb04eb2	info	firewall	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	203.29.64.218	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	5f190c24-77b1-4339-a179-1b4dc365dfba	create	Threat intel feed refreshed	{"eventType": "firewall"}	2026-10-26 06:01:35.476+07	2026-10-29 09:01:35.501386+07
d285e064-455b-49cb-b0ac-f8ae0d0ebfab	debug	integration	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	89.135.70.97	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	51358d59-ef5d-4683-bec6-fb5b56d6d4c3	scan	Firewall rule deployed to edge	{"eventType": "integration"}	2026-10-19 14:01:35.476+07	2026-10-29 09:01:35.501625+07
1b26b7e6-0272-4881-a74c-5352aa97ac55	warn	system	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	212.0.93.216	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	25ce6d49-8ebd-4616-8c1b-f5682250f3fd	triage	Suspicious login blocked	{"eventType": "system"}	2026-10-24 18:01:35.476+07	2026-10-29 09:01:35.501848+07
e103c676-01a5-4999-ade1-85339c3eb7c8	info	asset	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	181.59.185.121	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	10978779-29e5-483a-8b2d-a42545546458	triage	Threat intel feed refreshed	{"eventType": "asset"}	2026-10-20 22:01:35.476+07	2026-10-29 09:01:35.502087+07
d63edaaa-209a-4412-876c-1c6b0068ae8a	debug	integration	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	37.19.23.145	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	75570772-f0d3-465b-9e66-3f8512eb7b71	export	SIEM integration synced	{"eventType": "integration"}	2026-10-27 19:01:35.476+07	2026-10-29 09:01:35.502311+07
b319804a-2ba0-4329-b66e-73471123b039	info	system	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	82.93.111.93	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	bcbebf27-8253-45bd-b52d-58696c862b98	login	SIEM integration synced	{"eventType": "system"}	2026-10-23 05:01:35.476+07	2026-10-29 09:01:35.502562+07
c6403eb7-8495-415a-ba95-e7c19ec39d27	debug	firewall	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	194.117.51.80	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	567cf02f-d23f-4581-a434-dcdd9cad79d7	block	Threat intel feed refreshed	{"eventType": "firewall"}	2026-10-25 23:01:35.476+07	2026-10-29 09:01:35.502788+07
fed6edcc-41ad-49f2-9381-fbefbe5c28e9	info	auth	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	80.65.147.233	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	5e2e0439-0962-437e-af66-825de5491a3d	block	User session revoked	{"eventType": "auth"}	2026-10-26 14:01:35.476+07	2026-10-29 09:01:35.503074+07
bcb4917f-238f-447f-af75-a4227c71990a	debug	integration	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	77.82.21.13	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	38592a1b-4b3f-497c-8360-17d62a2ab82d	block	Asset scan completed	{"eventType": "integration"}	2026-10-20 15:01:35.476+07	2026-10-29 09:01:35.503318+07
86c4e974-dd78-4717-b9b6-0ce82aba502b	info	firewall	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	212.130.61.156	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	e28c3bca-eed1-418a-9cf7-4991003139eb	login	Firewall rule deployed to edge	{"eventType": "firewall"}	2026-10-26 23:01:35.476+07	2026-10-29 09:01:35.503564+07
455954af-bbe6-46e0-b2aa-0112fcb50191	info	alert	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	103.43.50.7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	78d6fdc0-ba6a-4bde-8894-ab274d9e1a62	login	Asset scan completed	{"eventType": "alert"}	2026-10-28 23:01:35.476+07	2026-10-29 09:01:35.503804+07
db4477f6-2afc-4b71-bb3c-9e3554a632b1	info	system	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	109.128.106.179	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	9017d251-cf56-4c6b-9bd6-6d213c886b57	export	User session revoked	{"eventType": "system"}	2026-10-20 21:01:35.476+07	2026-10-29 09:01:35.504108+07
ba8876bf-659d-4aa6-9903-9d7378b3a93a	warn	auth	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	185.119.60.139	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	fb7a4a9d-4d9c-494f-87ff-417851ea820b	export	AI investigation completed	{"eventType": "auth"}	2026-10-27 18:01:35.476+07	2026-10-29 09:01:35.504394+07
656fc0d5-fb86-4785-8694-3aa48e192847	error	ai	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	109.73.23.148	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	6d5f77a8-f89a-43d2-afef-76f4441f56da	export	Threat intel feed refreshed	{"eventType": "ai"}	2026-10-23 12:01:35.476+07	2026-10-29 09:01:35.504634+07
85c36955-2fb3-4ac2-bd63-1e39f3cb72f9	info	system	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	194.202.188.27	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	953df67b-b1dd-41bc-ad9d-d240239482e6	scan	AI investigation completed	{"eventType": "system"}	2026-10-21 16:01:35.476+07	2026-10-29 09:01:35.504855+07
9f1121fb-95c8-4640-9d4d-a9e3057dcc16	info	integration	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	89.111.195.70	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	bab6d5ba-7a32-48a5-9568-fef3fba41a95	create	AI investigation completed	{"eventType": "integration"}	2026-10-20 13:01:35.476+07	2026-10-29 09:01:35.50509+07
bfd4f1a4-a368-48df-b04f-65d8177b50a8	info	firewall	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	194.120.79.54	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	53dfa621-727a-490e-8772-9a69b4bb27c1	scan	Alert triaged by analyst	{"eventType": "firewall"}	2026-10-27 07:01:35.476+07	2026-10-29 09:01:35.505378+07
43d134a6-e00e-4cfe-84f8-47e8f4f86508	debug	alert	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	89.103.134.75	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	99ab62ba-07b4-4948-9a3a-5bf764c8df35	export	Suspicious login blocked	{"eventType": "alert"}	2026-10-28 05:01:35.476+07	2026-10-29 09:01:35.505611+07
1e60eddd-65af-476b-8687-2f6435230c71	debug	ai	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	80.218.37.184	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	60629518-04e1-47c6-9721-c13eb14f95f4	export	Suspicious login blocked	{"eventType": "ai"}	2026-10-27 18:01:35.476+07	2026-10-29 09:01:35.505837+07
a84211b9-0f84-45af-a514-3eef054f7ce8	info	system	9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	80.178.168.226	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	91d33b0e-33e2-40e2-bb52-b5245361f9ce	triage	Incident status changed	{"eventType": "system"}	2026-10-23 12:01:35.476+07	2026-10-29 09:01:35.506093+07
9b36d809-b5db-4e67-a865-e39c3b8724c3	info	integration	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	5.255.119.242	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	87dbf699-fcef-479d-80a5-dda40b0379eb	login	User session revoked	{"eventType": "integration"}	2026-10-28 06:01:35.476+07	2026-10-29 09:01:35.506322+07
62c9cfa1-b24d-4aa9-9000-7781e7394e8b	info	asset	9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	62.224.75.203	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	d02d4782-b5ce-4c5d-ab75-c9f014ff6280	delete	Incident status changed	{"eventType": "asset"}	2026-10-25 15:01:35.476+07	2026-10-29 09:01:35.50654+07
e62a9eab-24c7-426e-8ece-4cbe53f5f3e1	warn	auth	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	103.176.63.130	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	e4f3309d-5135-463b-b00d-0628e20275a5	scan	SIEM integration synced	{"eventType": "auth"}	2026-10-26 23:01:35.476+07	2026-10-29 09:01:35.506731+07
f05f4430-eb9e-46ed-be3c-4439d43246ba	info	incident	9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	80.129.12.119	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	78bd149b-7164-4c73-bdb6-5798457b0d45	update	AI investigation completed	{"eventType": "incident"}	2026-10-29 04:01:35.476+07	2026-10-29 09:01:35.50692+07
400c2480-56c3-4ddd-8957-46fa1f76f3aa	info	asset	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	176.159.92.188	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	65f9cdfe-70d8-43b6-877d-f5b6ffbd2761	update	Asset scan completed	{"eventType": "asset"}	2026-10-23 17:01:35.476+07	2026-10-29 09:01:35.507124+07
f2be632c-f47a-4622-b939-399643871b53	debug	ai	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	109.20.234.4	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	a0ce5abc-f7df-4d63-9070-48589cb20bc9	logout	Report exported	{"eventType": "ai"}	2026-10-23 21:01:35.476+07	2026-10-29 09:01:35.507348+07
9b43fc47-98d1-49a4-89e1-445e3c1a2103	info	incident	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	62.164.142.30	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	e8ad8653-f1d9-46f8-9ca6-26b3b0c41920	block	Threat intel feed refreshed	{"eventType": "incident"}	2026-10-21 07:01:35.476+07	2026-10-29 09:01:35.507559+07
e6be94fd-c676-48db-88dc-8e031f23725c	error	alert	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	176.26.107.135	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	05dd68db-d926-4df7-95b9-d4964426e930	delete	Alert triaged by analyst	{"eventType": "alert"}	2026-10-24 15:01:35.476+07	2026-10-29 09:01:35.507772+07
24fb9ed3-cf4e-4af8-a818-2f8aa7f8f12c	info	system	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	181.99.111.168	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	227d47b2-494b-4fec-9b47-212e394f060a	create	Alert triaged by analyst	{"eventType": "system"}	2026-10-23 10:01:35.476+07	2026-10-29 09:01:35.507991+07
d61d47c6-9d58-4239-b709-87bbc0ff578c	warn	integration	9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	185.121.131.215	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	12335a0a-69b8-4096-af7c-0af89ed6f653	scan	Asset scan completed	{"eventType": "integration"}	2026-10-22 00:01:35.476+07	2026-10-29 09:01:35.50821+07
853582b7-37a1-4c1e-8190-7958331c8f1e	error	ai	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	185.209.27.183	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	7fda6a25-7fc1-405a-8e45-a1c6c95df818	create	AI investigation completed	{"eventType": "ai"}	2026-10-22 12:01:35.476+07	2026-10-29 09:01:35.508843+07
dbbb401b-7b72-45d5-b480-8c0a35efd4cd	info	firewall	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	176.100.66.93	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	9caba0cf-9163-4214-a0f6-2fb45b96db4a	login	Incident status changed	{"eventType": "firewall"}	2026-10-27 17:01:35.476+07	2026-10-29 09:01:35.509101+07
137c897c-ae29-44c1-a4d0-1a47491749cc	info	incident	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	89.42.112.95	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	885549e5-d2cc-4c53-a129-b7cdd6dd9927	export	AI investigation completed	{"eventType": "incident"}	2026-10-28 03:01:35.476+07	2026-10-29 09:01:35.509311+07
d60295ca-3934-4101-ab81-ecbd74a1e2a9	info	ai	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	103.54.113.150	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	119f5383-1ab9-4406-9428-84977bba28a1	delete	SIEM integration synced	{"eventType": "ai"}	2026-10-21 14:01:35.476+07	2026-10-29 09:01:35.509509+07
a14285a5-f585-4d6b-9ce2-4f77861471ff	debug	firewall	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	82.3.65.246	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	bc2f6131-31ae-4fef-a4cf-c2d4af78f64f	scan	SIEM integration synced	{"eventType": "firewall"}	2026-10-28 00:01:35.476+07	2026-10-29 09:01:35.509707+07
f98ce863-0a9f-4ad4-810b-fb7ce38c7fb9	info	ai	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	194.218.126.185	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	a40187a8-1fdf-4ec7-839e-79f39dcda3b5	triage	Detection rule updated	{"eventType": "ai"}	2026-10-26 20:01:35.476+07	2026-10-29 09:01:35.509889+07
15bf605b-5945-41df-827c-404b52f59a93	error	asset	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	176.186.134.181	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	2fc7a268-8f48-4701-b34a-d6e2be309fd6	logout	User session revoked	{"eventType": "asset"}	2026-10-25 20:01:35.476+07	2026-10-29 09:01:35.510101+07
37956f57-0b34-47d2-bc0c-8b9c46e335d4	info	system	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	37.184.201.97	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	baf144f2-a134-4f44-be86-e6c33b91818e	export	Suspicious login blocked	{"eventType": "system"}	2026-10-29 09:01:35.476+07	2026-10-29 09:01:35.510327+07
6ba1eff1-c36e-4812-934f-aab4b095e289	info	ai	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	41.66.151.160	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	146316ea-ab63-44e6-837d-516b5221ef1a	triage	Report exported	{"eventType": "ai"}	2026-10-22 18:01:35.476+07	2026-10-29 09:01:35.510572+07
a8c542bf-3d3a-4394-9464-40359d0b2e10	debug	system	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	194.83.61.159	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	e5344104-137d-4d66-8683-eb592be2668b	logout	Alert triaged by analyst	{"eventType": "system"}	2026-10-19 11:01:35.476+07	2026-10-29 09:01:35.510815+07
f7de5c1f-1d9f-4966-af4f-e866e3b67ce9	info	auth	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	212.94.132.106	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	3c4f84b2-d4f9-4879-b5ef-c25f0d1b9dea	triage	AI investigation completed	{"eventType": "auth"}	2026-10-26 10:01:35.476+07	2026-10-29 09:01:35.51107+07
04c21471-f85d-4a0f-8b07-d8711c50cf19	error	firewall	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	185.204.5.2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	a51444b2-d6b3-4700-a8ae-b8a6eb1a02b1	logout	Detection rule updated	{"eventType": "firewall"}	2026-10-19 16:01:35.476+07	2026-10-29 09:01:35.511284+07
c0e4a14c-d1c1-4de4-9622-fc326a049101	info	ai	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	41.237.214.203	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	5aa0f0c4-a865-4cd5-aa77-26c747fb1616	block	Threat intel feed refreshed	{"eventType": "ai"}	2026-10-24 07:01:35.476+07	2026-10-29 09:01:35.511489+07
79ca6b88-1e2c-40eb-8c9a-02339ab89112	debug	auth	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	31.221.165.116	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	48b334ad-017c-4922-bbb6-04918e4c2936	triage	User session revoked	{"eventType": "auth"}	2026-10-27 15:01:35.476+07	2026-10-29 09:01:35.511694+07
fcf011db-d089-4187-a63c-af00b3f774f0	debug	asset	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	181.53.168.103	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	420c47e8-04c5-43cd-b2d9-fa23a56bcd0b	create	Suspicious login blocked	{"eventType": "asset"}	2026-10-21 02:01:35.476+07	2026-10-29 09:01:35.511893+07
11052bdf-c54b-4d0f-bf8f-32aa8829386f	debug	integration	9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	102.236.8.194	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	5a958bf0-0666-4bf0-9fb3-341c30f6f383	block	Asset scan completed	{"eventType": "integration"}	2026-10-20 03:01:35.476+07	2026-10-29 09:01:35.512101+07
f83ceb7a-683a-475a-a506-2323d70df760	info	incident	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	41.132.50.86	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	554f3115-f34b-43a4-8d08-b6668b8234be	export	Alert triaged by analyst	{"eventType": "incident"}	2026-10-26 10:01:35.476+07	2026-10-29 09:01:35.512303+07
1f9c0148-0f32-4c94-af7a-7fd71a7c8e7f	info	system	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	102.61.203.90	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	4c7b2f18-fc24-45b2-a96c-ac521595e53e	export	Firewall rule deployed to edge	{"eventType": "system"}	2026-10-27 19:01:35.476+07	2026-10-29 09:01:35.512489+07
fa822412-0fa8-422b-882b-83a315544577	info	asset	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	80.14.128.188	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	f56f22d0-03d2-4b57-92d8-d33cb4bd7b9d	scan	Alert triaged by analyst	{"eventType": "asset"}	2026-10-21 11:01:35.476+07	2026-10-29 09:01:35.512693+07
c4aa20b2-bd2e-4761-8136-3ac39ed24d72	info	firewall	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	41.63.193.109	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	905aa2cf-f252-459d-a8b8-ca2e1d98ed72	export	Firewall rule deployed to edge	{"eventType": "firewall"}	2026-10-25 06:01:35.476+07	2026-10-29 09:01:35.512869+07
d21bbc45-e1c0-4aee-87b8-efd238ef66e2	info	integration	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	77.243.6.157	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	22e2375c-eb88-433d-beaf-f7f58626e164	delete	Incident status changed	{"eventType": "integration"}	2026-10-27 02:01:35.476+07	2026-10-29 09:01:35.513054+07
e300537e-7407-4f67-bafc-5f31b32c247c	info	asset	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	102.255.65.222	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	a98fd3ee-a04b-4940-8cdb-9d6a08c7fdde	block	Report exported	{"eventType": "asset"}	2026-10-21 10:01:35.476+07	2026-10-29 09:01:35.513275+07
59d93150-e977-41db-804f-127b473cb298	info	alert	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	62.143.5.93	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	9fe3cdec-71b2-4e3b-93a4-c884ba8b8253	block	Incident status changed	{"eventType": "alert"}	2026-10-23 10:01:35.476+07	2026-10-29 09:01:35.513502+07
6f76b6c8-f2c3-4660-bbc6-017a1b7272da	info	auth	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	80.248.52.251	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	5c359679-b5b3-45f5-8a3e-9111a54f0e5f	delete	Alert triaged by analyst	{"eventType": "auth"}	2026-10-24 06:01:35.476+07	2026-10-29 09:01:35.513718+07
551892cc-afd9-4ff4-9924-4445e7f905e3	info	asset	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	91.145.102.245	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	a5d8174e-04ac-4463-97bc-1e125667cd6e	triage	SIEM integration synced	{"eventType": "asset"}	2026-10-27 07:01:35.476+07	2026-10-29 09:01:35.513897+07
8069368e-0dae-4036-8124-a18902414141	error	firewall	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	181.104.115.60	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	7cda35c7-9d3b-4d0a-8f11-9a02fa7e0bac	delete	Detection rule updated	{"eventType": "firewall"}	2026-10-23 23:01:35.476+07	2026-10-29 09:01:35.514165+07
a540c848-f9ea-4c70-b4e8-c42cff6d053e	warn	auth	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	31.144.41.149	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	7253dc0d-df46-4860-9a7e-ecd4a1481996	logout	Threat intel feed refreshed	{"eventType": "auth"}	2026-10-19 20:01:35.476+07	2026-10-29 09:01:35.514402+07
a19a3f28-45ca-4b06-9177-855c2d2698b4	info	integration	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	80.238.188.157	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	83e47454-5b7a-4b05-a18a-be7e0ccac8ad	block	Asset scan completed	{"eventType": "integration"}	2026-10-26 15:01:35.476+07	2026-10-29 09:01:35.51463+07
730bf7c7-426f-4585-ad15-816ff4a203d0	info	ai	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	89.195.116.190	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	463eb2dd-520e-4be0-bc17-4e4d2988795e	export	Firewall rule deployed to edge	{"eventType": "ai"}	2026-10-28 05:01:35.476+07	2026-10-29 09:01:35.514903+07
fede8077-9a2d-41a9-8a4f-1ea701ac4e62	info	integration	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	77.108.120.189	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	18adb4e7-8312-40af-ab5c-3bbe823ccb32	update	Firewall rule deployed to edge	{"eventType": "integration"}	2026-10-25 13:01:35.476+07	2026-10-29 09:01:35.515172+07
244efc5e-f208-4d6f-943e-dcf6faceff20	info	alert	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	41.16.169.43	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	19031033-5eee-4869-8c67-64135db157f9	update	User session revoked	{"eventType": "alert"}	2026-10-25 05:01:35.476+07	2026-10-29 09:01:35.51543+07
5f228f78-6f76-4332-97ce-17d9417b480f	error	firewall	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	91.219.131.88	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	2c471fd4-3e90-4eee-bbfd-5abbbf51a9af	login	Vulnerability remediation assigned	{"eventType": "firewall"}	2026-10-20 01:01:35.476+07	2026-10-29 09:01:35.515659+07
fd890d29-5ce4-4ef2-ae8b-c04fa40b256a	debug	integration	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	31.227.16.147	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	8f394912-b3d1-408c-bb1e-36460920da19	export	SIEM integration synced	{"eventType": "integration"}	2026-10-27 23:01:35.476+07	2026-10-29 09:01:35.51588+07
47732d2a-6e2d-4c50-b021-6aadbcc2480c	info	ai	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	203.184.230.32	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	a0c3cf83-6927-473a-a329-896d22879a15	block	Vulnerability remediation assigned	{"eventType": "ai"}	2026-10-19 20:01:35.476+07	2026-10-29 09:01:35.516115+07
db72e387-cea0-40ed-923f-7d009a71e073	error	system	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	80.168.224.204	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	ececb96c-5184-436c-97e7-c19c2c626a80	scan	Incident status changed	{"eventType": "system"}	2026-10-28 07:01:35.476+07	2026-10-29 09:01:35.5164+07
e433c95c-cebe-4839-a364-19e3e65fa83e	info	ai	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	45.96.240.20	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	3b814c56-6010-424f-81f7-c65e0729ec39	login	Firewall rule deployed to edge	{"eventType": "ai"}	2026-10-26 08:01:35.476+07	2026-10-29 09:01:35.516637+07
488e895a-1ffb-4d51-9c87-9b72d34474c3	info	integration	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	82.189.227.94	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	fb5e7550-9e2a-4bb6-b99b-5a884cd719f3	update	Asset scan completed	{"eventType": "integration"}	2026-10-26 04:01:35.476+07	2026-10-29 09:01:35.516857+07
981466f0-3891-4b64-9705-1a3287a710c7	error	firewall	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	194.22.110.240	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	205debc7-7737-42cf-ac00-8b7ef2fa6512	triage	AI investigation completed	{"eventType": "firewall"}	2026-10-23 16:01:35.476+07	2026-10-29 09:01:35.517114+07
dbbe9c4b-cbb5-4521-9cc1-7cba0dbf8261	error	integration	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	62.92.252.233	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	fc076899-223f-4a8d-9ca7-654da3c5237b	block	Suspicious login blocked	{"eventType": "integration"}	2026-10-25 11:01:35.476+07	2026-10-29 09:01:35.517364+07
f1212dc2-57b5-484b-a477-cff0bce26a30	debug	alert	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	77.93.39.176	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	5a78799d-a653-4d9e-b96f-4639974a9290	block	Suspicious login blocked	{"eventType": "alert"}	2026-10-20 21:01:35.476+07	2026-10-29 09:01:35.517589+07
fef9aa55-4a62-4b88-84d9-478257a99c53	info	alert	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	103.27.210.146	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	cf3cae27-189c-430e-8283-9eba1886d081	create	User session revoked	{"eventType": "alert"}	2026-10-24 23:01:35.476+07	2026-10-29 09:01:35.517801+07
52a965ff-ba3d-468b-9a32-ff1ad217ef9e	info	firewall	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	203.134.21.234	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	3e2e9dd6-b856-4e75-834c-72c5ff61005e	logout	Firewall rule deployed to edge	{"eventType": "firewall"}	2026-10-25 18:01:35.476+07	2026-10-29 09:01:35.518048+07
f06c793f-0bc1-43be-a80d-c2fdf30eff97	info	asset	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	185.140.51.253	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	ca2f5367-bafc-4bdf-8ad1-51569004fa38	login	SIEM integration synced	{"eventType": "asset"}	2026-10-21 23:01:35.476+07	2026-10-29 09:01:35.518303+07
0d69ded7-ebe9-4640-839d-cf690f262af6	info	alert	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	181.1.211.155	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	37b6210a-3309-4192-9711-aa07f6deeaa4	delete	User session revoked	{"eventType": "alert"}	2026-10-21 10:01:35.476+07	2026-10-29 09:01:35.518523+07
f33ed92f-f93c-4084-b0e8-0b7aab146bb4	info	asset	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	5.119.4.237	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	336654a4-1197-40dd-ae2f-66f958e06b5a	login	Alert triaged by analyst	{"eventType": "asset"}	2026-10-26 05:01:35.476+07	2026-10-29 09:01:35.518742+07
8da1b1e7-f2c4-4f8e-9d5e-fd7f84a6069f	warn	asset	9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	212.216.51.191	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	7142b25e-38e0-4bbe-96b5-cd599a2b9b48	logout	User session revoked	{"eventType": "asset"}	2026-10-20 10:01:35.476+07	2026-10-29 09:01:35.518973+07
d83a3ad6-ce7c-4686-a9cc-7ccc6d2ac0bd	info	ai	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	194.77.186.173	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	299e44b6-2482-486d-a256-3819358b0ef8	triage	Incident status changed	{"eventType": "ai"}	2026-10-28 08:01:35.476+07	2026-10-29 09:01:35.519231+07
6a48eed0-2ca2-4481-ac4b-3242d1df4ef3	debug	incident	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	103.4.217.77	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	d6f67815-0fed-4691-8ced-8f4e709722f2	export	Suspicious login blocked	{"eventType": "incident"}	2026-10-24 04:01:35.476+07	2026-10-29 09:01:35.519449+07
a2a3a035-09bb-4e4f-a5bf-13443c6e2e5c	warn	integration	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	203.54.201.56	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	9905201c-8ea1-4aed-aa59-bd13c2f60d98	logout	Incident status changed	{"eventType": "integration"}	2026-10-26 11:01:35.476+07	2026-10-29 09:01:35.519677+07
005ac2bc-81b6-42a1-88a4-1ec35792f1f5	error	system	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	194.216.66.119	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	c238182b-5804-44a7-a6e2-4ebf92d5c80f	delete	AI investigation completed	{"eventType": "system"}	2026-10-28 20:01:35.476+07	2026-10-29 09:01:35.519905+07
b2cf8aa4-a6a6-447f-96ee-8831297eef0f	info	asset	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	109.120.197.145	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	89a33970-f6e7-4094-98a5-50e0e94d2305	update	Threat intel feed refreshed	{"eventType": "asset"}	2026-10-20 19:01:35.476+07	2026-10-29 09:01:35.520143+07
4997307a-67ca-44ba-80e6-7b200ee25bbd	error	asset	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	176.39.83.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	90f8692e-f876-4f9b-b091-f9798f35d74a	update	Incident status changed	{"eventType": "asset"}	2026-10-28 00:01:35.476+07	2026-10-29 09:01:35.520366+07
4db022a4-d8ad-4a20-8611-25b733e2dd61	info	firewall	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	109.78.22.41	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	748e44ed-1c05-4e91-bf0f-7dfa10700f5a	create	Vulnerability remediation assigned	{"eventType": "firewall"}	2026-10-19 18:01:35.476+07	2026-10-29 09:01:35.520593+07
6008935d-3401-4435-b28f-731211566bf5	info	system	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	102.0.67.31	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	832d13c1-55e9-4262-ab41-c2fd91f60175	update	User session revoked	{"eventType": "system"}	2026-10-20 08:01:35.476+07	2026-10-29 09:01:35.520815+07
d70bf896-fcd0-4348-afd5-913305d0c58e	debug	integration	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	82.217.138.178	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	cfeeff18-4d68-403d-ad29-252bb0756db0	create	Detection rule updated	{"eventType": "integration"}	2026-10-28 03:01:35.476+07	2026-10-29 09:01:35.521041+07
e6beced1-e9ab-4e23-bf1f-9d53ce387a61	error	integration	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	203.121.95.77	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	6ca225f4-23fa-4bb5-a3e9-23a2a8187387	login	Detection rule updated	{"eventType": "integration"}	2026-10-24 00:01:35.476+07	2026-10-29 09:01:35.521282+07
a221d245-f0ae-4a58-a407-d81b6c6bb73f	error	ai	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	181.140.203.60	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	a8b70934-3dd6-4cc9-9349-951bc6eb46b5	scan	Incident status changed	{"eventType": "ai"}	2026-10-27 15:01:35.476+07	2026-10-29 09:01:35.521502+07
98a0d4d6-1d8f-4096-9e28-275ba11fcba7	info	asset	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	185.82.102.58	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	61eeadc6-c1de-4bfd-9fc8-a42f3d79ddf5	block	Incident status changed	{"eventType": "asset"}	2026-10-25 18:01:35.476+07	2026-10-29 09:01:35.521709+07
21c07afa-20a2-4d16-93d5-a8019b4e39bd	info	auth	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	37.9.185.40	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	d59b40c4-14d9-4cb9-bccb-35cbc8e8d248	create	Report exported	{"eventType": "auth"}	2026-10-22 16:01:35.476+07	2026-10-29 09:01:35.521944+07
557a355d-e780-4a44-aa91-ad23ab16081f	info	firewall	9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	102.58.229.37	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	8ce301a0-db3c-4c3a-b031-913a918a5dd4	scan	Detection rule updated	{"eventType": "firewall"}	2026-10-29 04:01:35.476+07	2026-10-29 09:01:35.522164+07
3a18ae10-8e1c-404f-9a00-b3d16b9f6e03	warn	firewall	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	102.100.182.5	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	13ac6d30-4110-4047-a55b-ed2941e01d2e	logout	Report exported	{"eventType": "firewall"}	2026-10-20 13:01:35.476+07	2026-10-29 09:01:35.522406+07
b9ac7811-ba3a-436a-8d1a-b74f659ca4b5	debug	firewall	9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	91.226.251.188	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	d86b2fc8-1d84-4341-a6f5-b9804e547b7b	create	SIEM integration synced	{"eventType": "firewall"}	2026-10-21 21:01:35.476+07	2026-10-29 09:01:35.522624+07
e59568d2-c966-4785-bc60-0b56648358da	debug	integration	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	80.51.24.154	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	10c7069f-d000-4c94-bf85-991ecbff9fd0	block	Asset scan completed	{"eventType": "integration"}	2026-10-20 03:01:35.476+07	2026-10-29 09:01:35.522888+07
016de122-cb0b-4eff-a417-4f07bfff48ce	debug	ai	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	77.178.104.237	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	84c8e302-533e-4d90-bbe5-118de8e1a1a7	delete	User session revoked	{"eventType": "ai"}	2026-10-27 12:01:35.476+07	2026-10-29 09:01:35.523169+07
22f454df-d5ca-4a28-a7b3-f17c41dd2edc	warn	ai	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	194.242.211.199	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	92f47717-5dc8-45a9-83aa-c83de1c71ee1	update	AI investigation completed	{"eventType": "ai"}	2026-10-19 22:01:35.476+07	2026-10-29 09:01:35.523422+07
e1e8667b-563f-4fc6-8b78-c28c6ace23a1	info	ai	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	185.189.150.190	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	8efa8788-6cde-424b-97c3-12298ad88868	login	Firewall rule deployed to edge	{"eventType": "ai"}	2026-10-21 06:01:35.476+07	2026-10-29 09:01:35.523692+07
161d86db-b665-4b2a-95ec-99ffa543d8e7	debug	system	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	89.138.79.198	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	5d5a36a0-fdc3-4918-9810-eeb3e3206c49	block	Alert triaged by analyst	{"eventType": "system"}	2026-10-28 07:01:35.476+07	2026-10-29 09:01:35.523962+07
d9ea0d88-3129-4307-82da-d57b4e6a086f	error	incident	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	185.231.42.74	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	e2db9a25-4998-4d5b-8796-e54d022c597d	logout	Firewall rule deployed to edge	{"eventType": "incident"}	2026-10-28 15:01:35.476+07	2026-10-29 09:01:35.52419+07
0251b642-cbed-49c8-a22e-3602c71187ae	info	auth	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	62.61.208.124	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	5947e0a3-046c-4b4a-b6aa-a714d93ea85b	update	Vulnerability remediation assigned	{"eventType": "auth"}	2026-10-23 23:01:35.476+07	2026-10-29 09:01:35.524437+07
adeeb9d4-4c89-45c0-ab4e-08910c935526	info	alert	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	185.59.122.226	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	fe04c4e7-7c99-4a5f-a3a9-9d3eaf6cf81b	login	Suspicious login blocked	{"eventType": "alert"}	2026-10-23 09:01:35.476+07	2026-10-29 09:01:35.524673+07
4a753e17-eb4d-4c84-9430-4d4d14e1c460	warn	system	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	80.110.204.54	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	7c13e53e-7641-4e00-b546-c590f9987a82	delete	Report exported	{"eventType": "system"}	2026-10-22 09:01:35.476+07	2026-10-29 09:01:35.524896+07
d96a2135-c38b-49a3-91fe-2ada8eec3654	info	alert	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	194.217.56.121	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	9c49a8ea-fd98-40e7-ba65-4e96be94a0d6	logout	Threat intel feed refreshed	{"eventType": "alert"}	2026-10-28 09:01:35.476+07	2026-10-29 09:01:35.525113+07
1f4c70e1-a8eb-47d9-ac8d-6c4b0149ac6c	info	system	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	41.174.1.215	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	aa0e963d-62df-4b7d-8c00-ce6298e2437e	create	Suspicious login blocked	{"eventType": "system"}	2026-10-21 12:01:35.476+07	2026-10-29 09:01:35.525309+07
ca0e0277-b896-41f7-bd92-d8830b94e658	error	alert	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	41.163.247.8	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	13899677-e821-4959-b653-9fb0929485cc	logout	AI investigation completed	{"eventType": "alert"}	2026-10-23 09:01:35.476+07	2026-10-29 09:01:35.525521+07
2e9ef3f4-ee6a-41b1-9d17-6a0154170aff	info	auth	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	62.19.58.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	f3922b61-ac71-4d86-8fae-f720e3b36da5	login	Threat intel feed refreshed	{"eventType": "auth"}	2026-10-19 14:01:35.476+07	2026-10-29 09:01:35.525725+07
e28194d3-0693-47ee-8988-a8cf6d789b84	debug	system	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	5.35.142.254	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	threats	e900bb8b-b833-4103-bb19-7e233a85375b	update	SIEM integration synced	{"eventType": "system"}	2026-10-27 06:01:35.476+07	2026-10-29 09:01:35.52595+07
a2200ace-f3cb-4559-8721-0101d483dde1	info	asset	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	37.32.17.181	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	firewall_rules	f6d3d795-c93d-4ca5-8b15-62e1fdfd61c4	create	SIEM integration synced	{"eventType": "asset"}	2026-10-23 15:01:35.476+07	2026-10-29 09:01:35.526192+07
0498949c-4745-4d10-9efb-fa61c01d4688	error	auth	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	109.154.167.92	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	7dfa0bbc-22e9-452c-80b0-62b1211f9fd5	update	Alert triaged by analyst	{"eventType": "auth"}	2026-10-29 05:01:35.476+07	2026-10-29 09:01:35.526398+07
f10c1cf7-0d81-4c6d-b3f8-acc5487665d1	info	asset	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	212.209.94.209	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	d9044df8-526a-4cd0-8797-7582edfb2363	update	SIEM integration synced	{"eventType": "asset"}	2026-10-26 16:01:35.476+07	2026-10-29 09:01:35.526621+07
bd5eb9bb-712e-474e-ab4e-248193d0420f	info	asset	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	41.145.67.25	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	reports	3a066121-e75d-4d2a-8aa6-69356a7d66e8	block	Report exported	{"eventType": "asset"}	2026-10-23 14:01:35.476+07	2026-10-29 09:01:35.526816+07
2b94063d-dbfd-48fc-afb4-e1e6da3ea0e6	error	system	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	103.111.62.105	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	52bde0f5-fd81-4499-9e07-477eee6828ee	login	Detection rule updated	{"eventType": "system"}	2026-10-21 17:01:35.476+07	2026-10-29 09:01:35.527037+07
f466175a-8baf-42ed-a39c-892e7d7a59eb	warn	incident	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	103.99.71.77	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	incidents	3ea4f7bc-209b-400f-b9e9-6fc03c05fbb9	export	User session revoked	{"eventType": "incident"}	2026-10-21 17:01:35.476+07	2026-10-29 09:01:35.527293+07
53fee0de-df2e-4145-bdf4-66fa16768b38	error	system	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	212.238.137.126	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	f3684cb7-03a2-43f3-b3ae-e69d360914cd	create	Suspicious login blocked	{"eventType": "system"}	2026-10-24 10:01:35.476+07	2026-10-29 09:01:35.527561+07
f3d9919e-27d0-47c8-bd00-9c3654be1a90	info	alert	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	91.34.219.130	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	alerts	be058d0e-0025-4ce6-9285-5a8300cce2c6	create	Detection rule updated	{"eventType": "alert"}	2026-10-21 05:01:35.476+07	2026-10-29 09:01:35.527808+07
fdbad877-51f5-4466-bec5-8b57fc2faf43	info	incident	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	45.132.17.224	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	assets	09201744-e798-44d4-a43e-92606918377f	update	User session revoked	{"eventType": "incident"}	2026-10-23 17:01:35.476+07	2026-10-29 09:01:35.528033+07
82a9d233-16a1-412c-8ddd-f5c3a2c6b48e	info	firewall	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	203.38.198.40	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MedicareGuard/1.0	users	b0101676-03b8-4ddb-839a-7bc37afbdf13	update	User session revoked	{"eventType": "firewall"}	2026-10-28 22:01:35.476+07	2026-10-29 09:01:35.528265+07
15c02c50-9100-498e-b788-b56eee866b6d	error	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	automation@medicareguard.io	41.117.208.23	n8n/2.41.5	automation_workflow	compliance-evidence	run	Workflow dispatched to n8n: Continuous Compliance Evidence	{"mode": "manual", "status": "failed", "nodeCount": 30, "durationMs": 3754, "workflowId": "compliance-evidence", "executionId": "dc1b9739-4048-4718-89e8-5f052ebb0296", "workflowName": "Continuous Compliance Evidence"}	2026-10-21 20:01:35.528+07	2026-10-29 09:01:35.528973+07
82995340-5b56-4f71-8928-3a9313424a55	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	102.3.249.6	n8n/2.41.5	automation_workflow	ransomware-containment	run	Workflow dispatched to n8n: Ransomware Containment & Recovery	{"mode": "webhook", "status": "success", "nodeCount": 30, "durationMs": 1103, "workflowId": "ransomware-containment", "executionId": "3c34c916-1adb-4e46-b76b-9581a83d9f3d", "workflowName": "Ransomware Containment & Recovery"}	2026-10-27 02:01:35.528+07	2026-10-29 09:01:35.529241+07
512eaf20-2d3e-4369-8c00-30f5aeae2188	warn	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	automation@medicareguard.io	82.250.4.162	n8n/2.41.5	automation_workflow	compliance-evidence	run	Workflow queued (n8n offline): Continuous Compliance Evidence	{"mode": "webhook", "status": "queued", "nodeCount": 30, "durationMs": 3538, "workflowId": "compliance-evidence", "executionId": "cd8ccd65-8acf-4c5c-bf32-bcf031466f85", "workflowName": "Continuous Compliance Evidence"}	2026-10-20 12:01:35.528+07	2026-10-29 09:01:35.529463+07
8ff0d84d-e9c2-4e64-b1ab-6ffcbe371940	warn	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	45.138.244.195	n8n/2.41.5	automation_workflow	vulnerability-sla	run	Workflow queued (n8n offline): Vulnerability SLA Escalation	{"mode": "schedule", "status": "queued", "nodeCount": 30, "durationMs": 1898, "workflowId": "vulnerability-sla", "executionId": "d6e0348d-b5b5-47fa-9cb2-ae2b436e25df", "workflowName": "Vulnerability SLA Escalation"}	2026-10-23 20:01:35.528+07	2026-10-29 09:01:35.529703+07
79e4d3bc-718f-4105-8a33-4a3a3912ff6e	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	109.14.154.2	n8n/2.41.5	automation_workflow	ransomware-containment	run	Workflow dispatched to n8n: Ransomware Containment & Recovery	{"mode": "schedule", "status": "success", "nodeCount": 30, "durationMs": 3272, "workflowId": "ransomware-containment", "executionId": "d9b02b04-0bc1-4309-ae41-c31bbea8744f", "workflowName": "Ransomware Containment & Recovery"}	2026-10-25 01:01:35.528+07	2026-10-29 09:01:35.529947+07
a9713d3d-2899-420d-b714-7e76a98bd400	warn	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	185.113.40.220	n8n/2.41.5	automation_workflow	compliance-evidence	run	Workflow queued (n8n offline): Continuous Compliance Evidence	{"mode": "schedule", "status": "queued", "nodeCount": 30, "durationMs": 1724, "workflowId": "compliance-evidence", "executionId": "8d1ef090-067b-4e9d-89cc-9bbec3b24b53", "workflowName": "Continuous Compliance Evidence"}	2026-10-19 19:01:35.528+07	2026-10-29 09:01:35.530171+07
7d5a0f4f-341d-410e-a0b3-3c428f0a86d2	warn	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	automation@medicareguard.io	45.58.72.216	n8n/2.41.5	automation_workflow	phishing-triage	run	Workflow queued (n8n offline): Phishing Triage & Credential Reset	{"mode": "webhook", "status": "queued", "nodeCount": 30, "durationMs": 3303, "workflowId": "phishing-triage", "executionId": "66e80634-66e3-485f-a3c9-b812adebf7ee", "workflowName": "Phishing Triage & Credential Reset"}	2026-10-22 16:01:35.528+07	2026-10-29 09:01:35.53038+07
2444b65a-5907-4e34-b075-a852f8ca3982	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	automation@medicareguard.io	89.117.140.208	n8n/2.41.5	automation_workflow	vulnerability-sla	run	Workflow dispatched to n8n: Vulnerability SLA Escalation	{"mode": "webhook", "status": "success", "nodeCount": 30, "durationMs": 1142, "workflowId": "vulnerability-sla", "executionId": "212df5f6-1cce-4cc1-9ea9-90d670b0b489", "workflowName": "Vulnerability SLA Escalation"}	2026-10-24 19:01:35.528+07	2026-10-29 09:01:35.530572+07
5ef79898-2322-43a3-8297-8faf544c372d	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	automation@medicareguard.io	62.112.242.223	n8n/2.41.5	automation_workflow	ransomware-containment	run	Workflow dispatched to n8n: Ransomware Containment & Recovery	{"mode": "manual", "status": "success", "nodeCount": 30, "durationMs": 2923, "workflowId": "ransomware-containment", "executionId": "245cf0f6-ddc3-4860-af9e-c37c7dd87278", "workflowName": "Ransomware Containment & Recovery"}	2026-10-26 22:01:35.528+07	2026-10-29 09:01:35.530773+07
bf064ec2-ad23-4e43-a132-1d495d4162f8	warn	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	automation@medicareguard.io	203.142.195.178	n8n/2.41.5	automation_workflow	compliance-evidence	run	Workflow queued (n8n offline): Continuous Compliance Evidence	{"mode": "schedule", "status": "queued", "nodeCount": 30, "durationMs": 908, "workflowId": "compliance-evidence", "executionId": "c63fad65-b98d-4188-bd2f-1095aa8e7b23", "workflowName": "Continuous Compliance Evidence"}	2026-10-26 02:01:35.528+07	2026-10-29 09:01:35.531018+07
6d4e509b-167a-460b-bf38-af054930d9c6	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	31.45.210.136	n8n/2.41.5	automation_workflow	vulnerability-sla	run	Workflow dispatched to n8n: Vulnerability SLA Escalation	{"mode": "manual", "status": "success", "nodeCount": 30, "durationMs": 2075, "workflowId": "vulnerability-sla", "executionId": "bf6e8087-68fc-4a3d-8bbb-43146606b338", "workflowName": "Vulnerability SLA Escalation"}	2026-10-20 08:01:35.528+07	2026-10-29 09:01:35.531274+07
c924b60c-c920-4437-af80-87b3f141e941	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	82.171.130.184	n8n/2.41.5	automation_workflow	vulnerability-sla	run	Workflow dispatched to n8n: Vulnerability SLA Escalation	{"mode": "webhook", "status": "success", "nodeCount": 30, "durationMs": 2235, "workflowId": "vulnerability-sla", "executionId": "635d37b4-05b0-45d0-b22e-a3f5cffd5a4c", "workflowName": "Vulnerability SLA Escalation"}	2026-10-21 07:01:35.528+07	2026-10-29 09:01:35.531478+07
a22dc70e-655c-4253-84f2-c07ac18cbbb4	warn	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	automation@medicareguard.io	102.194.117.89	n8n/2.41.5	automation_workflow	ransomware-containment	run	Workflow queued (n8n offline): Ransomware Containment & Recovery	{"mode": "manual", "status": "queued", "nodeCount": 30, "durationMs": 1343, "workflowId": "ransomware-containment", "executionId": "a2f043ea-a250-4804-87b3-e15f35154c10", "workflowName": "Ransomware Containment & Recovery"}	2026-10-25 11:01:35.528+07	2026-10-29 09:01:35.531685+07
fc80b5a0-5a4b-4878-ab62-f1dff9542b4a	error	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	automation@medicareguard.io	212.207.126.29	n8n/2.41.5	automation_workflow	ransomware-containment	run	Workflow dispatched to n8n: Ransomware Containment & Recovery	{"mode": "webhook", "status": "failed", "nodeCount": 30, "durationMs": 4091, "workflowId": "ransomware-containment", "executionId": "b3cd00e3-90d2-4473-8088-40c28ca4f63d", "workflowName": "Ransomware Containment & Recovery"}	2026-10-24 13:01:35.528+07	2026-10-29 09:01:35.531897+07
d96766fd-5e4e-4631-8957-769378dbac1b	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	176.125.201.42	n8n/2.41.5	automation_workflow	ransomware-containment	run	Workflow dispatched to n8n: Ransomware Containment & Recovery	{"mode": "manual", "status": "dispatched", "nodeCount": 30, "durationMs": 3257, "workflowId": "ransomware-containment", "executionId": "703ae1d5-f56c-40e1-bdec-d08a80bd1cd0", "workflowName": "Ransomware Containment & Recovery"}	2026-10-28 22:01:35.528+07	2026-10-29 09:01:35.532119+07
cc07b75d-2128-4b6e-8b87-d3243ff6ad1e	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	82.149.103.99	n8n/2.41.5	automation_workflow	vulnerability-sla	run	Workflow dispatched to n8n: Vulnerability SLA Escalation	{"mode": "schedule", "status": "dispatched", "nodeCount": 30, "durationMs": 1478, "workflowId": "vulnerability-sla", "executionId": "7b71314b-5a89-40a0-ab69-20bf1f2c0c2f", "workflowName": "Vulnerability SLA Escalation"}	2026-10-25 03:01:35.528+07	2026-10-29 09:01:35.532304+07
78a7b83c-7abc-47e4-a0dc-f454fce75c70	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	41.104.134.162	n8n/2.41.5	automation_workflow	vulnerability-sla	run	Workflow dispatched to n8n: Vulnerability SLA Escalation	{"mode": "manual", "status": "success", "nodeCount": 30, "durationMs": 3113, "workflowId": "vulnerability-sla", "executionId": "1a061060-409b-4f43-88ab-45b4bfe01491", "workflowName": "Vulnerability SLA Escalation"}	2026-10-20 08:01:35.528+07	2026-10-29 09:01:35.532567+07
88cc8d02-f653-4cdb-a199-048bead40ef2	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	automation@medicareguard.io	103.226.149.245	n8n/2.41.5	automation_workflow	compliance-evidence	run	Workflow dispatched to n8n: Continuous Compliance Evidence	{"mode": "webhook", "status": "success", "nodeCount": 30, "durationMs": 1422, "workflowId": "compliance-evidence", "executionId": "3ea00143-8b5c-4c69-b277-05480252ac8d", "workflowName": "Continuous Compliance Evidence"}	2026-10-20 08:01:35.528+07	2026-10-29 09:01:35.532862+07
c0b30a69-f058-408e-ba5d-3ea871c13781	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	91.245.195.112	n8n/2.41.5	automation_workflow	vulnerability-sla	run	Workflow dispatched to n8n: Vulnerability SLA Escalation	{"mode": "schedule", "status": "success", "nodeCount": 30, "durationMs": 2437, "workflowId": "vulnerability-sla", "executionId": "149c527b-c5bc-4c6a-af24-0fe8de8a01b7", "workflowName": "Vulnerability SLA Escalation"}	2026-10-24 09:01:35.528+07	2026-10-29 09:01:35.533171+07
baf4000e-6e4b-432e-9998-35882013b5e6	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	automation@medicareguard.io	77.54.71.111	n8n/2.41.5	automation_workflow	vulnerability-sla	run	Workflow dispatched to n8n: Vulnerability SLA Escalation	{"mode": "manual", "status": "dispatched", "nodeCount": 30, "durationMs": 1627, "workflowId": "vulnerability-sla", "executionId": "86a4ad4e-8f78-4a72-b6df-fe58b012c0d6", "workflowName": "Vulnerability SLA Escalation"}	2026-10-27 13:01:35.528+07	2026-10-29 09:01:35.533417+07
f3d5b917-50be-4560-a882-ee0711ea9d35	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	automation@medicareguard.io	31.60.20.161	n8n/2.41.5	automation_workflow	vulnerability-sla	run	Workflow dispatched to n8n: Vulnerability SLA Escalation	{"mode": "schedule", "status": "dispatched", "nodeCount": 30, "durationMs": 2802, "workflowId": "vulnerability-sla", "executionId": "2ebb972a-936a-4b59-aadd-ccc62e1fb7ea", "workflowName": "Vulnerability SLA Escalation"}	2026-10-20 16:01:35.528+07	2026-10-29 09:01:35.533647+07
eaf097e3-a46c-4996-8af4-00bf1d36588a	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	automation@medicareguard.io	80.187.158.150	n8n/2.41.5	automation_workflow	phishing-triage	run	Workflow dispatched to n8n: Phishing Triage & Credential Reset	{"mode": "manual", "status": "success", "nodeCount": 30, "durationMs": 3305, "workflowId": "phishing-triage", "executionId": "0610fa06-d6c4-4673-95f2-eaea3709ef43", "workflowName": "Phishing Triage & Credential Reset"}	2026-10-20 01:01:35.528+07	2026-10-29 09:01:35.533898+07
de6a57b3-88d0-4bc0-8c6d-f68f487a1591	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	automation@medicareguard.io	41.156.44.129	n8n/2.41.5	automation_workflow	vulnerability-sla	run	Workflow dispatched to n8n: Vulnerability SLA Escalation	{"mode": "manual", "status": "success", "nodeCount": 30, "durationMs": 2542, "workflowId": "vulnerability-sla", "executionId": "015bcbe3-5e17-46ba-83a5-486dae8266f6", "workflowName": "Vulnerability SLA Escalation"}	2026-10-22 17:01:35.528+07	2026-10-29 09:01:35.534175+07
9af6ca8a-a571-4a16-82e2-66d5cf5eb717	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	45.139.183.143	n8n/2.41.5	automation_workflow	ransomware-containment	run	Workflow dispatched to n8n: Ransomware Containment & Recovery	{"mode": "manual", "status": "dispatched", "nodeCount": 30, "durationMs": 3540, "workflowId": "ransomware-containment", "executionId": "c2c6a648-d9a9-4495-b5e5-7202b2de8b09", "workflowName": "Ransomware Containment & Recovery"}	2026-10-21 18:01:35.528+07	2026-10-29 09:01:35.534496+07
c84eb8dd-5450-4f88-b90a-ed2e59e94cf6	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	automation@medicareguard.io	181.49.140.94	n8n/2.41.5	automation_workflow	ransomware-containment	run	Workflow dispatched to n8n: Ransomware Containment & Recovery	{"mode": "webhook", "status": "dispatched", "nodeCount": 30, "durationMs": 3668, "workflowId": "ransomware-containment", "executionId": "d36758a9-0b1a-42de-8e37-2f3e1d84f131", "workflowName": "Ransomware Containment & Recovery"}	2026-10-23 21:01:35.528+07	2026-10-29 09:01:35.534733+07
0f299ed8-c10b-4cbf-8435-83de713e61f7	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	89.70.5.225	n8n/2.41.5	automation_workflow	ransomware-containment	run	Workflow dispatched to n8n: Ransomware Containment & Recovery	{"mode": "webhook", "status": "dispatched", "nodeCount": 30, "durationMs": 2306, "workflowId": "ransomware-containment", "executionId": "feafffa6-fcee-432e-a75d-65a70d0d50e0", "workflowName": "Ransomware Containment & Recovery"}	2026-10-21 10:01:35.528+07	2026-10-29 09:01:35.535016+07
7f10a5f4-f444-4565-a5fa-5a7956b39ef7	error	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	31.59.165.13	n8n/2.41.5	automation_workflow	ransomware-containment	run	Workflow dispatched to n8n: Ransomware Containment & Recovery	{"mode": "schedule", "status": "failed", "nodeCount": 30, "durationMs": 3627, "workflowId": "ransomware-containment", "executionId": "10c666ca-41fe-42be-be46-e08cd7fe0910", "workflowName": "Ransomware Containment & Recovery"}	2026-10-21 09:01:35.528+07	2026-10-29 09:01:35.535262+07
da2c0e52-4ef1-4c8b-8ae1-23dde4cb9227	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	automation@medicareguard.io	41.242.229.241	n8n/2.41.5	automation_workflow	ransomware-containment	run	Workflow dispatched to n8n: Ransomware Containment & Recovery	{"mode": "webhook", "status": "success", "nodeCount": 30, "durationMs": 1481, "workflowId": "ransomware-containment", "executionId": "b8c9b42d-f9c2-49de-95bf-ee223847c87d", "workflowName": "Ransomware Containment & Recovery"}	2026-10-23 15:01:35.528+07	2026-10-29 09:01:35.535492+07
86f81ced-3382-4dea-9f4c-b84f3244907c	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	automation@medicareguard.io	102.185.177.136	n8n/2.41.5	automation_workflow	phishing-triage	run	Workflow dispatched to n8n: Phishing Triage & Credential Reset	{"mode": "schedule", "status": "dispatched", "nodeCount": 30, "durationMs": 3514, "workflowId": "phishing-triage", "executionId": "705082c7-70ec-448e-9e4b-67fec6a18e6c", "workflowName": "Phishing Triage & Credential Reset"}	2026-10-28 11:01:35.528+07	2026-10-29 09:01:35.535706+07
dfcffd36-f688-4387-98b7-3e497c1b433f	warn	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	212.146.212.191	n8n/2.41.5	automation_workflow	compliance-evidence	run	Workflow queued (n8n offline): Continuous Compliance Evidence	{"mode": "manual", "status": "queued", "nodeCount": 30, "durationMs": 3000, "workflowId": "compliance-evidence", "executionId": "8be0bb4b-799e-414e-a9b9-26d1c5136081", "workflowName": "Continuous Compliance Evidence"}	2026-10-26 03:01:35.528+07	2026-10-29 09:01:35.535961+07
7816e9b4-a37e-4890-a714-0629fc950e95	info	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	automation@medicareguard.io	77.188.246.106	n8n/2.41.5	automation_workflow	phishing-triage	run	Workflow dispatched to n8n: Phishing Triage & Credential Reset	{"mode": "manual", "status": "success", "nodeCount": 30, "durationMs": 958, "workflowId": "phishing-triage", "executionId": "77a9ee3a-0f16-4e80-8f2f-c26814faef7d", "workflowName": "Phishing Triage & Credential Reset"}	2026-10-22 04:01:35.528+07	2026-10-29 09:01:35.536198+07
eae8b7b0-1de4-44ae-8a08-3548c14d34f1	warn	automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	77.220.42.122	n8n/2.41.5	automation_workflow	phishing-triage	run	Workflow queued (n8n offline): Phishing Triage & Credential Reset	{"mode": "webhook", "status": "queued", "nodeCount": 30, "durationMs": 2338, "workflowId": "phishing-triage", "executionId": "5cbacc1a-8a54-4ff3-b44b-747a9423ec8c", "workflowName": "Phishing Triage & Credential Reset"}	2026-10-25 16:01:35.528+07	2026-10-29 09:01:35.536415+07
c3ab9da4-0b4f-47a0-b989-e9935372c342	info	system	\N	\N	\N	\N	\N	\N	startup	API started with 544 endpoints	{"env": "development"}	2026-10-29 09:01:35.917352+07	2026-10-29 09:01:35.917352+07
51666500-b74a-463d-970e-8adbabc92ee7	info	system	\N	\N	\N	\N	\N	\N	startup	API started with 544 endpoints	{"env": "development"}	2026-10-29 11:22:40.163201+07	2026-10-29 11:22:40.163201+07
68d2a805-43f1-4a5d-bd6d-23a7d6513122	info	auth	\N	\N	192.168.65.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15	users	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	login	admin@medicareguard.io signed in	{}	2026-10-29 11:23:32.705167+07	2026-10-29 11:23:32.705167+07
92746f6a-0b48-4554-812b-8b14758a7d54	info	auth	\N	\N	192.168.65.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15	users	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	login	admin@medicareguard.io signed in	{}	2026-10-29 23:43:49.073118+07	2026-10-29 23:43:49.073118+07
\.


--
-- Data for Name: agents; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.agents (id, name, hostname, ip_address, os, version, status, last_heartbeat, metadata, created_at, updated_at) FROM stdin;
acccdd1d-03dc-45c1-962b-ee61eae6d169	EDR · Patient Portal	portal.medicareguard.io	10.10.1.10	Ubuntu 24.04	7.4.2	online	2026-10-29 03:01:35.591+07	{}	2026-10-29 09:01:35.591996+07	2026-10-29 09:01:35.591996+07
cc569435-279a-4aa5-baa3-05c6729d4a5d	EDR · EHR Database	ehr-db-01.medicareguard.io	10.10.2.11	PostgreSQL 16	7.4.2	online	2026-10-28 21:01:35.591+07	{}	2026-10-29 09:01:35.592535+07	2026-10-29 09:01:35.592535+07
81818ea9-c2b7-4273-b1b7-a34d7e19dbe1	EDR · Appointment API	api.medicareguard.io	10.10.1.20	Node.js 20	7.4.2	online	2026-10-29 09:01:35.591+07	{}	2026-10-29 09:01:35.592748+07	2026-10-29 09:01:35.592748+07
c4609167-7af9-42f8-a2e5-afeccc0356ac	EDR · Billing Service	billing.medicareguard.io	10.10.1.30	Java 21	7.4.2	online	2026-10-29 09:01:35.591+07	{}	2026-10-29 09:01:35.592935+07	2026-10-29 09:01:35.592935+07
e4cba917-09cf-4bcb-9e74-78d0c25e10e1	EDR · Kubernetes Cluster	eks-prod.medicareguard.io	10.10.3.0	EKS 1.30	7.4.2	online	2026-10-29 00:01:35.591+07	{}	2026-10-29 09:01:35.593195+07	2026-10-29 09:01:35.593195+07
9c32645a-03c2-48ce-8df1-f7b354a60d0f	EDR · VPN Gateway	vpn.medicareguard.io	10.10.0.5	FortiOS 7.4	7.4.2	degraded	2026-10-29 01:01:35.591+07	{}	2026-10-29 09:01:35.593453+07	2026-10-29 09:01:35.593453+07
18d25029-a2fe-4aad-9096-044303a5394a	EDR · Medical IoT Gateway	iot-gw-01.medicareguard.io	10.20.4.10	Embedded Linux	7.4.2	online	2026-10-29 00:01:35.591+07	{}	2026-10-29 09:01:35.593715+07	2026-10-29 09:01:35.593715+07
1ca74397-d8b5-4a7e-8ea8-c14448f7f7d3	EDR · Imaging PACS	pacs-01.medicareguard.io	10.20.5.21	Windows Server 2022	7.4.2	online	2026-10-29 04:01:35.591+07	{}	2026-10-29 09:01:35.593953+07	2026-10-29 09:01:35.593953+07
fbfdc2f0-eba4-4b63-b402-4cf9798f6188	EDR · Pharmacy Database	pharmacy-db.medicareguard.io	10.10.2.14	MySQL 8.4	7.4.2	online	2026-10-29 02:01:35.591+07	{}	2026-10-29 09:01:35.594196+07	2026-10-29 09:01:35.594196+07
7ab4c9fe-cb4a-48a0-8499-3b3776113a05	EDR · Admin Workstation	adm-ws-14.medicareguard.io	10.30.1.14	macOS 15	7.4.2	online	2026-10-29 02:01:35.591+07	{}	2026-10-29 09:01:35.594413+07	2026-10-29 09:01:35.594413+07
1acc98f7-d42e-4b16-ab3f-0f3f539ebc33	EDR · CI/CD Runner	runner-07.medicareguard.io	10.10.6.7	Ubuntu 24.04	7.4.2	online	2026-10-28 21:01:35.591+07	{}	2026-10-29 09:01:35.594644+07	2026-10-29 09:01:35.594644+07
e7fcac6b-47ed-4017-ad20-567398244834	EDR · Email Gateway	mail.medicareguard.io	10.10.0.25	Proofpoint	7.4.2	degraded	2026-10-28 23:01:35.591+07	{}	2026-10-29 09:01:35.594848+07	2026-10-29 09:01:35.594848+07
\.


--
-- Data for Name: ai_conversations; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.ai_conversations (id, user_id, title, model, metadata, created_at, updated_at) FROM stdin;
bdf3298f-24ec-4860-a0a4-d54e3be37b7a	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	Triage critical ransomware alert	medicareguard-analyst	{}	2026-10-29 09:01:35.671825+07	2026-10-29 09:01:35.671825+07
fa3dd02b-b5a8-40ed-80de-3a4445e775f3	92d776fe-9846-4fa0-b8eb-d4b5318321a0	Top attack origins this week	medicareguard-analyst	{}	2026-10-29 09:01:35.672231+07	2026-10-29 09:01:35.672231+07
6630b776-09a6-44dd-95aa-38ac995f2112	b7643562-4a3b-4bdc-87f5-ed48f78b9511	Compliance gaps for HIPAA	medicareguard-analyst	{}	2026-10-29 09:01:35.672465+07	2026-10-29 09:01:35.672465+07
\.


--
-- Data for Name: ai_messages; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.ai_messages (id, conversation_id, role, content, tokens, metadata, created_at, updated_at) FROM stdin;
b330bc3a-a5f1-43f0-aa69-a3e452e9f891	bdf3298f-24ec-4860-a0a4-d54e3be37b7a	user	Phân tích cảnh báo ransomware nghiêm trọng nhất và đề xuất cách xử lý.	28	{}	2026-10-29 09:01:35.672726+07	2026-10-29 09:01:35.672726+07
99af5ea8-a566-473b-b9ce-0e4c4279df6c	bdf3298f-24ec-4860-a0a4-d54e3be37b7a	assistant	Cảnh báo ransomware nghiêm trọng cần được cô lập trong 15 phút đầu. Khuyến nghị: cô lập máy chủ bị ảnh hưởng, thu thập forensic image, chặn IP nguồn tại firewall và xoay vòng credential.	58	{}	2026-10-29 09:01:35.673284+07	2026-10-29 09:01:35.673284+07
e2f3518d-7dc9-49df-8330-ac49a534c34e	fa3dd02b-b5a8-40ed-80de-3a4445e775f3	user	Who are the top attackers this week?	12	{}	2026-10-29 09:01:35.67351+07	2026-10-29 09:01:35.67351+07
9c726fa0-992c-4448-b3a1-0ed5ac242c63	fa3dd02b-b5a8-40ed-80de-3a4445e775f3	assistant	The top source IPs are concentrated in CN, RU and IR. I recommend blocking risk ≥ 80 IPs and monitoring the rest for 24 hours.	34	{}	2026-10-29 09:01:35.673711+07	2026-10-29 09:01:35.673711+07
e4f42abd-f573-4bdb-b0df-e98b50161fb0	6630b776-09a6-44dd-95aa-38ac995f2112	user	Which HIPAA controls need attention?	10	{}	2026-10-29 09:01:35.673946+07	2026-10-29 09:01:35.673946+07
9c33390d-c696-42a2-941d-b22d6f75f71f	6630b776-09a6-44dd-95aa-38ac995f2112	assistant	The HIPAA incident procedure control is in progress at 79%. Assign an owner and close the evidence gaps within 30 days.	32	{}	2026-10-29 09:01:35.674142+07	2026-10-29 09:01:35.674142+07
\.


--
-- Data for Name: alerts; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.alerts (id, title, description, severity, status, source, source_ip, country, country_code, mitre_tactic, mitre_technique, threat_id, asset_id, assignee_id, risk_score, confidence, tags, metadata, detected_at, resolved_at, created_at, updated_at) FROM stdin;
a8f12fe6-520e-4485-8562-7f64d3c7ca4a	Unauthorised API key usage detected	Detection triggered on Medical IoT Gateway (10.20.4.10). Source 82.90.202.165 attributed to Ukraine. Correlation confidence 86%.	medium	resolved	Firewall	82.90.202.165	Ukraine	UA	TA0001 Initial Access	T1195 Supply Chain Compromise	db5b975e-8811-40d6-8c48-4f9faf80e5e5	61d416ee-8bd2-4eb1-b7b8-9bcc722886fa	b7643562-4a3b-4bdc-87f5-ed48f78b9511	57	91	{supply-chain,resolved}	{"assetName": "Medical IoT Gateway", "threatActor": "Play", "detectionRule": "MG-1435"}	2026-10-22 15:01:35.412+07	2026-10-23 20:01:35.412+07	2026-10-29 09:01:35.413909+07	2026-10-29 09:01:35.413909+07
fd88d852-143e-4393-ab2b-e19226db5b07	WAF blocked SQL injection attempt	Detection triggered on EHR Database (10.10.2.11). Source 31.172.143.94 attributed to Indonesia. Correlation confidence 98%.	high	investigating	Email Gateway	103.75.29.85	Indonesia	ID	TA0040 Impact	T1498 Network Denial of Service	4692d51c-2468-46f0-9747-1e442ba5045c	920f61f5-9de0-4850-9cd1-99e0ba05365f	dcd2d08a-7310-414d-ae20-09165cb0c384	68	86	{ddos,investigating}	{"assetName": "EHR Database", "threatActor": "Kimsuky", "detectionRule": "MG-2657"}	2026-10-26 16:01:35.412+07	\N	2026-10-29 09:01:35.415261+07	2026-10-29 09:01:35.415261+07
943a5842-3fb7-4ac9-a162-0e46937f98e1	Impossible travel sign-in detected	Detection triggered on Telehealth Gateway (10.10.1.44). Source 91.98.124.201 attributed to Germany. Correlation confidence 68%.	low	open	IDS	91.98.124.201	Germany	DE	TA0040 Impact	T1486 Data Encrypted for Impact	875d77bf-f81d-4650-8880-178e22ee6728	2e96141d-1615-4b65-9224-7fa73fb6d0c4	\N	34	58	{ransomware,open}	{"assetName": "Telehealth Gateway", "threatActor": "Kimsuky", "detectionRule": "MG-6188"}	2026-10-19 09:01:35.412+07	\N	2026-10-29 09:01:35.415715+07	2026-10-29 09:01:35.415715+07
5652f091-5950-41a6-bd83-cf6e689d2566	Ransomware note dropped on file share	Detection triggered on EHR Database (10.10.2.11). Source 176.117.101.20 attributed to North Korea. Correlation confidence 67%.	critical	investigating	Firewall	176.117.101.20	North Korea	KP	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	22d38993-8ff8-4ea8-b7d5-374ed61e9288	920f61f5-9de0-4850-9cd1-99e0ba05365f	473353d6-ee2a-4345-adae-ca12b0fbee38	93	89	{data-exfiltration,investigating}	{"assetName": "EHR Database", "threatActor": "Play", "detectionRule": "MG-1917"}	2026-10-24 08:01:35.412+07	\N	2026-10-29 09:01:35.416132+07	2026-10-29 09:01:35.416132+07
f6296dab-540f-4fe3-928c-16eebd4890b7	Malicious PowerShell encoded command	Detection triggered on Kubernetes Cluster (10.10.3.0). Source 82.76.234.157 attributed to Russia. Correlation confidence 67%.	high	resolved	Cloud Trail	82.188.42.90	Russia	RU	TA0009 Collection	T1530 Data from Cloud Storage	95879c27-d3fc-4365-95a3-c9572bc671f2	9cf5cbb5-d702-4a86-8c4e-fd5a8db2ed5b	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	62	81	{insider-threat,resolved}	{"assetName": "Kubernetes Cluster", "threatActor": "Volt Typhoon", "detectionRule": "MG-1753"}	2026-10-20 05:01:35.412+07	2026-10-20 16:01:35.412+07	2026-10-29 09:01:35.416544+07	2026-10-29 09:01:35.416544+07
edc68c15-bed3-47bf-ad9f-e59c09e5accf	Data exfiltration to unknown cloud storage	Detection triggered on Admin Workstation (10.30.1.14). Source 203.160.127.215 attributed to Iran. Correlation confidence 88%.	high	resolved	Cloud Trail	203.160.127.215	Iran	IR	TA0040 Impact	T1496 Resource Hijacking	735f0705-801e-4b32-8f08-cf4b80c9b361	20484773-319b-430f-bf71-adbab8001006	ebd7404f-d9cc-41ad-9c75-384026a7aff9	80	56	{cryptojacking,resolved}	{"assetName": "Admin Workstation", "threatActor": "Mirai", "detectionRule": "MG-4503"}	2026-10-27 16:01:35.412+07	2026-10-30 13:01:35.412+07	2026-10-29 09:01:35.416948+07	2026-10-29 09:01:35.416948+07
53186fb8-f06a-45d2-b73e-14c0a1e32827	Anomalous database dump from EHR	Detection triggered on Appointment API (10.10.1.20). Source 91.69.194.52 attributed to Iran. Correlation confidence 98%.	medium	investigating	SIEM	91.69.194.52	Iran	IR	TA0011 Command and Control	T1071 Application Layer Protocol	ea6101ae-6e04-4397-88e7-25a0155b743f	b741c818-a15a-4fd4-b5ce-d92e9235e852	b8e0c918-6a79-47fb-9dfe-861f198c5550	62	73	{c2,investigating}	{"assetName": "Appointment API", "threatActor": "Anonymous Sudan", "detectionRule": "MG-4626"}	2026-10-22 10:01:35.412+07	\N	2026-10-29 09:01:35.417336+07	2026-10-29 09:01:35.417336+07
c2c1893d-1314-4d10-bfde-2940c64c6126	Data exfiltration to unknown cloud storage	Detection triggered on EHR Database (10.10.2.11). Source 185.235.188.67 attributed to United States. Correlation confidence 93%.	high	resolved	IDS	185.235.188.67	United States	US	TA0006 Credential Access	T1110 Brute Force	c635c6f4-2ecd-417b-a60a-78a5f0ea4ab1	920f61f5-9de0-4850-9cd1-99e0ba05365f	0b5e95ce-3f2b-4299-9e98-b4885de1043e	83	70	{brute-force,resolved}	{"assetName": "EHR Database", "threatActor": "Volt Typhoon", "detectionRule": "MG-5698"}	2026-10-24 15:01:35.412+07	2026-10-25 09:01:35.412+07	2026-10-29 09:01:35.417659+07	2026-10-29 09:01:35.417659+07
3eb6bcc4-b959-4bb6-9831-7e077c18a3ef	Data exfiltration to unknown cloud storage	Detection triggered on EHR Database (10.10.2.11). Source 194.48.37.229 attributed to Vietnam. Correlation confidence 77%.	critical	investigating	IDS	194.48.37.229	Vietnam	VN	TA0002 Execution	T1204 User Execution	e30ece18-ecc1-4daf-989f-857de041c5e9	920f61f5-9de0-4850-9cd1-99e0ba05365f	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	95	59	{malware,investigating}	{"assetName": "EHR Database", "threatActor": "LockBit", "detectionRule": "MG-6066"}	2026-10-20 04:01:35.412+07	\N	2026-10-29 09:01:35.417958+07	2026-10-29 09:01:35.417958+07
1f61cb5b-ee9e-489f-975e-f2c5a49b1efa	Credential stuffing burst on login endpoint	Detection triggered on DNS Resolver (10.10.0.53). Source 37.179.8.81 attributed to United States. Correlation confidence 86%.	medium	resolved	SIEM	37.179.8.81	United States	US	TA0002 Execution	T1204 User Execution	77022662-ff41-4734-a96b-d1c7edcee46d	f8433530-5580-415e-9f16-41634a70bd47	\N	47	72	{malware,resolved}	{"assetName": "DNS Resolver", "threatActor": "BlackCat", "detectionRule": "MG-2534"}	2026-10-21 05:01:35.412+07	2026-10-22 05:01:35.412+07	2026-10-29 09:01:35.418259+07	2026-10-29 09:01:35.418259+07
f3db1937-c4c8-4058-b309-1ef287c33f7f	Web shell uploaded to application server	Detection triggered on Identity Provider (10.10.8.20). Source 212.112.62.138 attributed to Singapore. Correlation confidence 77%.	medium	resolved	IDS	212.112.62.138	Singapore	SG	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	376c9641-d150-43f7-b1ce-e2083d1f6488	d369c839-7416-482f-ba27-4ce4906c7712	b7d93566-607b-41f4-933f-612190e9288b	50	90	{data-exfiltration,resolved}	{"assetName": "Identity Provider", "threatActor": "Volt Typhoon", "detectionRule": "MG-6831"}	2026-10-25 07:01:35.413+07	2026-10-27 02:01:35.413+07	2026-10-29 09:01:35.418581+07	2026-10-29 09:01:35.418581+07
9de966b5-c212-4075-aead-01c28b137bdd	Unusual privileged account activity	Detection triggered on CI/CD Runner (10.10.6.7). Source 102.35.83.112 attributed to India. Correlation confidence 81%.	high	open	Email Gateway	102.35.83.112	India	IN	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	b4d357a5-d88f-4ec5-84ee-15f41e5559c8	e3a86baf-d72f-4d71-8d47-34768a15f739	b7d93566-607b-41f4-933f-612190e9288b	79	58	{data-exfiltration,open}	{"assetName": "CI/CD Runner", "threatActor": "RedLine", "detectionRule": "MG-6469"}	2026-10-24 11:01:35.413+07	\N	2026-10-29 09:01:35.418996+07	2026-10-29 09:01:35.418996+07
a3263b3a-269f-40e1-a78a-9ba18de51fb4	WAF blocked SQL injection attempt	Detection triggered on Mobile API (10.10.1.50). Source 103.81.169.220 attributed to Iran. Correlation confidence 61%.	high	false_positive	IDS	103.81.169.220	Iran	IR	TA0040 Impact	T1486 Data Encrypted for Impact	5255b5db-ce04-4f87-adee-5ab4fc74049a	43b2d473-a21f-4654-99a4-99de37812bd7	b7d93566-607b-41f4-933f-612190e9288b	71	81	{ransomware,false_positive}	{"assetName": "Mobile API", "threatActor": "Volt Typhoon", "detectionRule": "MG-4923"}	2026-10-25 13:01:35.413+07	2026-10-28 11:01:35.413+07	2026-10-29 09:01:35.41938+07	2026-10-29 09:01:35.41938+07
d93a5248-a5bf-4645-b12a-46c29fddeee4	Malicious PowerShell encoded command	Detection triggered on Identity Provider (10.10.8.20). Source 203.125.201.170 attributed to Nigeria. Correlation confidence 70%.	low	false_positive	Email Gateway	203.125.201.170	Nigeria	NG	TA0006 Credential Access	T1110 Brute Force	32ed708b-485b-4e58-bc0a-da16ef8f1800	d369c839-7416-482f-ba27-4ce4906c7712	\N	21	82	{brute-force,false_positive}	{"assetName": "Identity Provider", "threatActor": "Qakbot", "detectionRule": "MG-8323"}	2026-10-20 22:01:35.413+07	2026-10-23 11:01:35.413+07	2026-10-29 09:01:35.419765+07	2026-10-29 09:01:35.419765+07
dbe97a3a-0c24-4c44-9a6b-8f61fba86e36	Unusual privileged account activity	Detection triggered on Mobile API (10.10.1.50). Source 176.16.112.75 attributed to France. Correlation confidence 74%.	high	open	Firewall	176.16.112.75	France	FR	TA0011 Command and Control	T1071 Application Layer Protocol	45f58fa6-37da-4c7c-b41c-395781be1ec6	43b2d473-a21f-4654-99a4-99de37812bd7	b7643562-4a3b-4bdc-87f5-ed48f78b9511	64	82	{c2,open}	{"assetName": "Mobile API", "threatActor": "Qakbot", "detectionRule": "MG-5276"}	2026-10-20 22:01:35.413+07	\N	2026-10-29 09:01:35.420111+07	2026-10-29 09:01:35.420111+07
99ba23e1-fa59-4d58-b17e-5aa9905d5794	DNS tunnelling to suspicious domain	Detection triggered on Patient Portal (10.10.1.10). Source 185.50.93.235 attributed to Netherlands. Correlation confidence 89%.	medium	resolved	IDS	80.45.17.165	Netherlands	NL	TA0006 Credential Access	T1110 Brute Force	f0d817b3-7c1e-4d24-a554-eb7a972a4e15	bcdb679c-53d2-48f1-ad99-e1b949aeeb57	92d776fe-9846-4fa0-b8eb-d4b5318321a0	65	92	{brute-force,resolved}	{"assetName": "Patient Portal", "threatActor": "Lazarus Group", "detectionRule": "MG-7536"}	2026-10-23 06:01:35.413+07	2026-10-23 21:01:35.413+07	2026-10-29 09:01:35.420434+07	2026-10-29 09:01:35.420434+07
8e5a6680-c1bb-4468-be54-bbfb2206c36f	Suspicious outbound C2 beacon detected	Detection triggered on Imaging PACS (10.20.5.21). Source 212.172.52.214 attributed to United Kingdom. Correlation confidence 61%.	medium	resolved	IDS	102.240.78.141	United Kingdom	GB	TA0011 Command and Control	T1071 Application Layer Protocol	65731344-d8bb-4c7a-b066-a7fb72512f98	b5ecd570-bfb9-455d-a802-c3031d7de183	dcd2d08a-7310-414d-ae20-09165cb0c384	61	77	{c2,resolved}	{"assetName": "Imaging PACS", "threatActor": "Anonymous Sudan", "detectionRule": "MG-9995"}	2026-10-19 23:01:35.413+07	2026-10-21 15:01:35.413+07	2026-10-29 09:01:35.420802+07	2026-10-29 09:01:35.420802+07
c8ffac4c-2838-41e9-95db-3843effc43f9	WAF blocked SQL injection attempt	Detection triggered on Backup Vault (10.10.7.4). Source 91.69.194.52 attributed to Iran. Correlation confidence 67%.	medium	investigating	Firewall	91.69.194.52	Iran	IR	TA0011 Command and Control	T1071 Application Layer Protocol	ea6101ae-6e04-4397-88e7-25a0155b743f	578335bf-e75d-4878-89dc-12dc1f443613	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	46	80	{c2,investigating}	{"assetName": "Backup Vault", "threatActor": "Anonymous Sudan", "detectionRule": "MG-1067"}	2026-10-28 13:01:35.413+07	\N	2026-10-29 09:01:35.421146+07	2026-10-29 09:01:35.421146+07
d037ee13-47dd-4b56-81e3-30fee4025bcc	Anomalous database dump from EHR	Detection triggered on Pharmacy Database (10.10.2.14). Source 77.35.40.181 attributed to Turkey. Correlation confidence 83%.	medium	contained	SIEM	77.35.40.181	Turkey	TR	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	7c6950aa-5e7e-49ba-a242-26179f27aded	2a35cce6-c390-4c27-9c0d-84d30320c2cd	473353d6-ee2a-4345-adae-ca12b0fbee38	62	80	{data-exfiltration,contained}	{"assetName": "Pharmacy Database", "threatActor": "Medusa", "detectionRule": "MG-2185"}	2026-10-27 08:01:35.413+07	\N	2026-10-29 09:01:35.422109+07	2026-10-29 09:01:35.422109+07
6369dc17-fe84-4442-b824-41790d8e393d	Anomalous database dump from EHR	Detection triggered on Kubernetes Cluster (10.10.3.0). Source 37.87.176.139 attributed to United States. Correlation confidence 99%.	high	investigating	IDS	37.87.176.139	United States	US	TA0040 Impact	T1498 Network Denial of Service	f3908e6a-db5d-4562-9179-5309e37959de	9cf5cbb5-d702-4a86-8c4e-fd5a8db2ed5b	473353d6-ee2a-4345-adae-ca12b0fbee38	79	77	{ddos,investigating}	{"assetName": "Kubernetes Cluster", "threatActor": "Akira", "detectionRule": "MG-6578"}	2026-10-22 04:01:35.413+07	\N	2026-10-29 09:01:35.422471+07	2026-10-29 09:01:35.422471+07
b7c7be1b-b5b7-4863-a629-69d6c1f18f60	Ransomware note dropped on file share	Detection triggered on EHR Database (10.10.2.11). Source 45.175.186.105 attributed to Ukraine. Correlation confidence 61%.	high	false_positive	Cloud Trail	45.175.186.105	Ukraine	UA	TA0006 Credential Access	T1110 Brute Force	7953f4ff-ae28-4b1f-9cde-3191902e0d02	920f61f5-9de0-4850-9cd1-99e0ba05365f	\N	66	73	{brute-force,false_positive}	{"assetName": "EHR Database", "threatActor": "Medusa", "detectionRule": "MG-5937"}	2026-10-29 02:01:35.413+07	2026-10-29 03:01:35.413+07	2026-10-29 09:01:35.422794+07	2026-10-29 09:01:35.422794+07
3b65abaf-028a-4d5b-9183-2246d07c1a17	DNS tunnelling to suspicious domain	Detection triggered on Appointment API (10.10.1.20). Source 82.76.234.157 attributed to Russia. Correlation confidence 97%.	high	open	Firewall	82.76.234.157	Russia	RU	TA0009 Collection	T1530 Data from Cloud Storage	95879c27-d3fc-4365-95a3-c9572bc671f2	b741c818-a15a-4fd4-b5ce-d92e9235e852	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	61	97	{insider-threat,open}	{"assetName": "Appointment API", "threatActor": "Volt Typhoon", "detectionRule": "MG-6997"}	2026-10-18 17:01:35.413+07	\N	2026-10-29 09:01:35.423133+07	2026-10-29 09:01:35.423133+07
1fd29587-5c16-4cea-a77b-01b46e277619	Unauthorised API key usage detected	Detection triggered on Email Gateway (10.10.0.25). Source 102.173.76.34 attributed to Japan. Correlation confidence 75%.	critical	investigating	AI Anomaly Engine	176.183.85.56	Japan	JP	TA0001 Initial Access	T1190 Exploit Public-Facing Application	61e38802-554e-42b8-bb43-5adadc01ea5c	90f757b2-99a1-4342-bc1d-16a5a09b35eb	\N	86	72	{web-attack,investigating}	{"assetName": "Email Gateway", "threatActor": "Scattered Spider", "detectionRule": "MG-9875"}	2026-10-24 05:01:35.413+07	\N	2026-10-29 09:01:35.423457+07	2026-10-29 09:01:35.423457+07
db5b55fd-aca0-41f7-ae95-332f233b4517	WAF blocked SQL injection attempt	Detection triggered on Backup Vault (10.10.7.4). Source 37.51.172.200 attributed to Nigeria. Correlation confidence 60%.	medium	investigating	Email Gateway	185.142.107.129	Nigeria	NG	TA0011 Command and Control	T1071 Application Layer Protocol	1f2cae3e-655e-42ae-95f1-7af9ea350c76	578335bf-e75d-4878-89dc-12dc1f443613	b7643562-4a3b-4bdc-87f5-ed48f78b9511	62	68	{c2,investigating}	{"assetName": "Backup Vault", "threatActor": "Akira", "detectionRule": "MG-4338"}	2026-10-24 05:01:35.413+07	\N	2026-10-29 09:01:35.423766+07	2026-10-29 09:01:35.423766+07
c2572d74-4b12-4c3a-ac55-e2fe5117c1b8	Multiple failed logins followed by success	Detection triggered on Pharmacy Database (10.10.2.14). Source 203.160.127.215 attributed to Iran. Correlation confidence 72%.	medium	investigating	Email Gateway	203.160.127.215	Iran	IR	TA0040 Impact	T1496 Resource Hijacking	735f0705-801e-4b32-8f08-cf4b80c9b361	2a35cce6-c390-4c27-9c0d-84d30320c2cd	0b5e95ce-3f2b-4299-9e98-b4885de1043e	55	89	{cryptojacking,investigating}	{"assetName": "Pharmacy Database", "threatActor": "Mirai", "detectionRule": "MG-9299"}	2026-10-23 18:01:35.413+07	\N	2026-10-29 09:01:35.424052+07	2026-10-29 09:01:35.424052+07
1cdcba55-bc0a-43fc-a520-3a8b150b58e5	WAF blocked SQL injection attempt	Detection triggered on CI/CD Runner (10.10.6.7). Source 212.91.160.161 attributed to Romania. Correlation confidence 72%.	medium	false_positive	SIEM	212.91.160.161	Romania	RO	TA0001 Initial Access	T1566 Phishing	0207baf9-932b-4d1a-88e3-6215fa5ae037	e3a86baf-d72f-4d71-8d47-34768a15f739	b8e0c918-6a79-47fb-9dfe-861f198c5550	46	90	{phishing,false_positive}	{"assetName": "CI/CD Runner", "threatActor": "Scattered Spider", "detectionRule": "MG-8894"}	2026-10-26 08:01:35.413+07	2026-10-27 05:01:35.413+07	2026-10-29 09:01:35.424412+07	2026-10-29 09:01:35.424412+07
367d2535-9499-4404-852a-7092cc07efd6	Unusual privileged account activity	Detection triggered on Backup Vault (10.10.7.4). Source 82.128.212.79 attributed to Turkey. Correlation confidence 92%.	medium	resolved	EDR	82.128.212.79	Turkey	TR	TA0001 Initial Access	T1195 Supply Chain Compromise	db27d234-3376-4ce6-8e0a-c1933a4820c4	578335bf-e75d-4878-89dc-12dc1f443613	b8e0c918-6a79-47fb-9dfe-861f198c5550	48	56	{supply-chain,resolved}	{"assetName": "Backup Vault", "threatActor": "RedLine", "detectionRule": "MG-3924"}	2026-10-21 10:01:35.413+07	2026-10-24 03:01:35.413+07	2026-10-29 09:01:35.424746+07	2026-10-29 09:01:35.424746+07
2369975e-4519-4847-a6e0-410b8a52519c	Phishing email delivered to executive inbox	Detection triggered on DNS Resolver (10.10.0.53). Source 203.125.201.170 attributed to Nigeria. Correlation confidence 81%.	high	open	Cloud Trail	203.125.201.170	Nigeria	NG	TA0006 Credential Access	T1110 Brute Force	32ed708b-485b-4e58-bc0a-da16ef8f1800	f8433530-5580-415e-9f16-41634a70bd47	b7d93566-607b-41f4-933f-612190e9288b	62	60	{brute-force,open}	{"assetName": "DNS Resolver", "threatActor": "Qakbot", "detectionRule": "MG-3792"}	2026-10-28 11:01:35.413+07	\N	2026-10-29 09:01:35.425099+07	2026-10-29 09:01:35.425099+07
1c0f5b0a-1b5b-4348-a2af-aa05055ff869	Credential stuffing burst on login endpoint	Detection triggered on Mobile API (10.10.1.50). Source 5.173.25.30 attributed to Vietnam. Correlation confidence 88%.	low	investigating	Firewall	5.173.25.30	Vietnam	VN	TA0040 Impact	T1486 Data Encrypted for Impact	179d0c40-b534-462a-91bb-cfd3d007cf78	43b2d473-a21f-4654-99a4-99de37812bd7	dcd2d08a-7310-414d-ae20-09165cb0c384	21	65	{ransomware,investigating}	{"assetName": "Mobile API", "threatActor": "Play", "detectionRule": "MG-4621"}	2026-10-27 05:01:35.413+07	\N	2026-10-29 09:01:35.425433+07	2026-10-29 09:01:35.425433+07
7067c3aa-e589-47e8-bc6f-87765a9f6497	Multiple failed logins followed by success	Detection triggered on Telehealth Gateway (10.10.1.44). Source 41.112.33.191 attributed to Iran. Correlation confidence 85%.	low	resolved	IDS	185.166.107.251	Iran	IR	TA0001 Initial Access	T1195 Supply Chain Compromise	4dcdcd3e-9c12-4822-b431-96952b1205b6	2e96141d-1615-4b65-9224-7fa73fb6d0c4	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	29	59	{supply-chain,resolved}	{"assetName": "Telehealth Gateway", "threatActor": "Kimsuky", "detectionRule": "MG-9323"}	2026-10-21 01:01:35.413+07	2026-10-22 03:01:35.413+07	2026-10-29 09:01:35.425739+07	2026-10-29 09:01:35.425739+07
3c577b59-49e4-4f1c-adf1-9b820ab8faf6	Ransomware note dropped on file share	Detection triggered on Admin Workstation (10.30.1.14). Source 176.117.101.20 attributed to North Korea. Correlation confidence 61%.	medium	investigating	SIEM	176.117.101.20	North Korea	KP	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	22d38993-8ff8-4ea8-b7d5-374ed61e9288	20484773-319b-430f-bf71-adbab8001006	\N	57	79	{data-exfiltration,investigating}	{"assetName": "Admin Workstation", "threatActor": "Play", "detectionRule": "MG-3470"}	2026-10-19 10:01:35.413+07	\N	2026-10-29 09:01:35.426067+07	2026-10-29 09:01:35.426067+07
776a3a49-1626-470c-bf14-100d2c05b22c	Multiple failed logins followed by success	Detection triggered on Pharmacy Database (10.10.2.14). Source 80.104.163.112 attributed to Russia. Correlation confidence 71%.	medium	investigating	EDR	80.104.163.112	Russia	RU	TA0001 Initial Access	T1203 Exploitation for Client Execution	c12ffa96-6100-4fcc-ae68-6fd14ef2ee61	2a35cce6-c390-4c27-9c0d-84d30320c2cd	473353d6-ee2a-4345-adae-ca12b0fbee38	61	74	{zero-day,investigating}	{"assetName": "Pharmacy Database", "threatActor": "Turla", "detectionRule": "MG-2114"}	2026-10-18 13:01:35.413+07	\N	2026-10-29 09:01:35.426398+07	2026-10-29 09:01:35.426398+07
6625e2da-fe2c-4aea-b72f-22c87c88ea3c	Unusual privileged account activity	Detection triggered on Appointment API (10.10.1.20). Source 41.112.33.191 attributed to Iran. Correlation confidence 61%.	medium	resolved	SIEM	102.79.52.194	Iran	IR	TA0001 Initial Access	T1195 Supply Chain Compromise	4dcdcd3e-9c12-4822-b431-96952b1205b6	b741c818-a15a-4fd4-b5ce-d92e9235e852	\N	41	68	{supply-chain,resolved}	{"assetName": "Appointment API", "threatActor": "Kimsuky", "detectionRule": "MG-2733"}	2026-10-27 17:01:35.413+07	2026-10-29 19:01:35.413+07	2026-10-29 09:01:35.426743+07	2026-10-29 09:01:35.426743+07
5a29fb7f-85f2-4e20-8d08-fcc09869da0b	Multiple failed logins followed by success	Detection triggered on VPN Gateway (10.10.0.5). Source 89.23.13.200 attributed to Romania. Correlation confidence 97%.	medium	contained	Firewall	89.23.13.200	Romania	RO	TA0040 Impact	T1498 Network Denial of Service	8f5f405a-f609-4d76-a349-4a96eafa592a	33177851-14ab-4ead-ba2a-7445d2b5ba38	92d776fe-9846-4fa0-b8eb-d4b5318321a0	64	68	{ddos,contained}	{"assetName": "VPN Gateway", "threatActor": "Sandworm", "detectionRule": "MG-7616"}	2026-10-25 07:01:35.413+07	\N	2026-10-29 09:01:35.427063+07	2026-10-29 09:01:35.427063+07
49248028-e690-4339-aa32-105c94e667f7	Unusual privileged account activity	Detection triggered on Identity Provider (10.10.8.20). Source 176.147.87.248 attributed to Nigeria. Correlation confidence 89%.	medium	resolved	EDR	176.147.87.248	Nigeria	NG	TA0001 Initial Access	T1190 Exploit Public-Facing Application	ffb5a0dc-d170-4ff1-8bfb-7799ab3617ee	d369c839-7416-482f-ba27-4ce4906c7712	\N	62	65	{web-attack,resolved}	{"assetName": "Identity Provider", "threatActor": "Lazarus Group", "detectionRule": "MG-3214"}	2026-10-27 03:01:35.413+07	2026-10-27 17:01:35.413+07	2026-10-29 09:01:35.427363+07	2026-10-29 09:01:35.427363+07
93c39090-4395-49f9-8642-eb2b9fe90bcc	Credential stuffing burst on login endpoint	Detection triggered on Billing Service (10.10.1.30). Source 82.205.112.66 attributed to Netherlands. Correlation confidence 88%.	medium	open	Cloud Trail	185.138.177.218	Netherlands	NL	TA0040 Impact	T1498 Network Denial of Service	e7472452-efcd-4651-8727-8549382111f0	c7fa215a-4985-4506-8c4e-b868df428c13	0b5e95ce-3f2b-4299-9e98-b4885de1043e	37	76	{ddos,open}	{"assetName": "Billing Service", "threatActor": "Kimsuky", "detectionRule": "MG-4884"}	2026-10-28 07:01:35.413+07	\N	2026-10-29 09:01:35.427653+07	2026-10-29 09:01:35.427653+07
5aea15c5-89c7-4711-8d09-49be77ff2ad9	Data exfiltration to unknown cloud storage	Detection triggered on Identity Provider (10.10.8.20). Source 37.179.8.81 attributed to United States. Correlation confidence 88%.	low	false_positive	EDR	194.175.5.149	United States	US	TA0002 Execution	T1204 User Execution	77022662-ff41-4734-a96b-d1c7edcee46d	d369c839-7416-482f-ba27-4ce4906c7712	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	16	60	{malware,false_positive}	{"assetName": "Identity Provider", "threatActor": "BlackCat", "detectionRule": "MG-7593"}	2026-10-21 06:01:35.413+07	2026-10-22 11:01:35.413+07	2026-10-29 09:01:35.427991+07	2026-10-29 09:01:35.427991+07
2f89d273-6474-4c5e-90c1-ae6a4b6bb850	DNS tunnelling to suspicious domain	Detection triggered on Telehealth Gateway (10.10.1.44). Source 80.104.163.112 attributed to Russia. Correlation confidence 74%.	low	resolved	SIEM	80.104.163.112	Russia	RU	TA0001 Initial Access	T1203 Exploitation for Client Execution	c12ffa96-6100-4fcc-ae68-6fd14ef2ee61	2e96141d-1615-4b65-9224-7fa73fb6d0c4	dcd2d08a-7310-414d-ae20-09165cb0c384	10	77	{zero-day,resolved}	{"assetName": "Telehealth Gateway", "threatActor": "Turla", "detectionRule": "MG-8822"}	2026-10-26 05:01:35.413+07	2026-10-28 07:01:35.413+07	2026-10-29 09:01:35.42833+07	2026-10-29 09:01:35.42833+07
081752fe-997c-4c55-8cda-59969a37bfbd	Unauthorised API key usage detected	Detection triggered on SIEM Ingestor (10.10.8.9). Source 41.18.147.63 attributed to Ukraine. Correlation confidence 97%.	high	resolved	IDS	41.18.147.63	Ukraine	UA	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	9af3a12a-dd1d-4027-bc02-5afad11ab5c0	1d817fd7-6205-4dab-86c6-48beafa0ad78	473353d6-ee2a-4345-adae-ca12b0fbee38	67	59	{data-exfiltration,resolved}	{"assetName": "SIEM Ingestor", "threatActor": "FIN7", "detectionRule": "MG-7520"}	2026-10-22 16:01:35.413+07	2026-10-23 23:01:35.413+07	2026-10-29 09:01:35.428656+07	2026-10-29 09:01:35.428656+07
4d4718c6-2fa9-4223-b3e3-45d8628dee98	Anomalous database dump from EHR	Detection triggered on Email Gateway (10.10.0.25). Source 77.35.40.181 attributed to Turkey. Correlation confidence 71%.	high	false_positive	IDS	77.35.40.181	Turkey	TR	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	7c6950aa-5e7e-49ba-a242-26179f27aded	90f757b2-99a1-4342-bc1d-16a5a09b35eb	\N	67	89	{data-exfiltration,false_positive}	{"assetName": "Email Gateway", "threatActor": "Medusa", "detectionRule": "MG-7595"}	2026-10-28 15:01:35.413+07	2026-10-31 13:01:35.413+07	2026-10-29 09:01:35.428972+07	2026-10-29 09:01:35.428972+07
5b4c8d3b-eb43-4f31-a396-d968ac8546b1	Web shell uploaded to application server	Detection triggered on EHR Database (10.10.2.11). Source 212.224.188.213 attributed to Brazil. Correlation confidence 94%.	high	resolved	Email Gateway	212.224.188.213	Brazil	BR	TA0002 Execution	T1204 User Execution	5d5b6be5-2a59-4ce1-b1a1-11d7f1f5e787	920f61f5-9de0-4850-9cd1-99e0ba05365f	\N	72	57	{malware,resolved}	{"assetName": "EHR Database", "threatActor": "Qakbot", "detectionRule": "MG-7200"}	2026-10-24 10:01:35.413+07	2026-10-26 07:01:35.413+07	2026-10-29 09:01:35.429283+07	2026-10-29 09:01:35.429283+07
b63c6129-9308-4339-86ed-ac47a44568bd	Data exfiltration to unknown cloud storage	Detection triggered on Medical IoT Gateway (10.20.4.10). Source 41.43.42.190 attributed to Singapore. Correlation confidence 70%.	medium	open	EDR	41.43.42.190	Singapore	SG	TA0001 Initial Access	T1566 Phishing	14d6f1b4-5ab7-4783-8f84-4fd6bd2ec837	61d416ee-8bd2-4eb1-b7b8-9bcc722886fa	\N	54	81	{phishing,open}	{"assetName": "Medical IoT Gateway", "threatActor": "RedLine", "detectionRule": "MG-7661"}	2026-10-24 01:01:35.413+07	\N	2026-10-29 09:01:35.429592+07	2026-10-29 09:01:35.429592+07
66800468-f1a5-471b-aa8f-613b6674ad01	EDR blocked lateral movement attempt	Detection triggered on Mobile API (10.10.1.50). Source 77.165.136.67 attributed to Germany. Correlation confidence 90%.	high	false_positive	EDR	77.165.136.67	Germany	DE	TA0040 Impact	T1498 Network Denial of Service	e288dae9-fb91-454c-afb3-ba078e8b7448	43b2d473-a21f-4654-99a4-99de37812bd7	b7d93566-607b-41f4-933f-612190e9288b	71	78	{ddos,false_positive}	{"assetName": "Mobile API", "threatActor": "Play", "detectionRule": "MG-7071"}	2026-10-27 05:01:35.413+07	2026-10-29 11:01:35.413+07	2026-10-29 09:01:35.429899+07	2026-10-29 09:01:35.429899+07
f2164f49-f1c6-44ed-9e5b-ba6d3f8b40a5	Phishing email delivered to executive inbox	Detection triggered on Appointment API (10.10.1.20). Source 45.175.186.105 attributed to Ukraine. Correlation confidence 77%.	high	open	Cloud Trail	45.175.186.105	Ukraine	UA	TA0006 Credential Access	T1110 Brute Force	7953f4ff-ae28-4b1f-9cde-3191902e0d02	b741c818-a15a-4fd4-b5ce-d92e9235e852	dcd2d08a-7310-414d-ae20-09165cb0c384	60	61	{brute-force,open}	{"assetName": "Appointment API", "threatActor": "Medusa", "detectionRule": "MG-5914"}	2026-10-21 05:01:35.413+07	\N	2026-10-29 09:01:35.430198+07	2026-10-29 09:01:35.430198+07
5ca336a2-defc-4944-96ef-2d2a01f79c06	Malicious PowerShell encoded command	Detection triggered on DNS Resolver (10.10.0.53). Source 185.67.173.117 attributed to North Korea. Correlation confidence 90%.	low	open	Firewall	185.67.173.117	North Korea	KP	TA0001 Initial Access	T1566 Phishing	984c6266-0c50-4940-b708-0d243cd16002	f8433530-5580-415e-9f16-41634a70bd47	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	39	95	{phishing,open}	{"assetName": "DNS Resolver", "threatActor": "Scattered Spider", "detectionRule": "MG-7483"}	2026-10-19 09:01:35.413+07	\N	2026-10-29 09:01:35.430529+07	2026-10-29 09:01:35.430529+07
87429081-6a30-454a-b1fd-cd94f12e1e75	Web shell uploaded to application server	Detection triggered on Billing Service (10.10.1.30). Source 212.91.160.161 attributed to Romania. Correlation confidence 68%.	medium	resolved	Firewall	212.91.160.161	Romania	RO	TA0001 Initial Access	T1566 Phishing	0207baf9-932b-4d1a-88e3-6215fa5ae037	c7fa215a-4985-4506-8c4e-b868df428c13	b8e0c918-6a79-47fb-9dfe-861f198c5550	55	79	{phishing,resolved}	{"assetName": "Billing Service", "threatActor": "Scattered Spider", "detectionRule": "MG-5820"}	2026-10-28 12:01:35.413+07	2026-10-29 16:01:35.413+07	2026-10-29 09:01:35.430895+07	2026-10-29 09:01:35.430895+07
c8a74e34-da3a-49d1-ab14-4688b861474a	Data exfiltration to unknown cloud storage	Detection triggered on Billing Service (10.10.1.30). Source 91.153.58.136 attributed to South Korea. Correlation confidence 68%.	medium	open	IDS	91.153.58.136	South Korea	KR	TA0001 Initial Access	T1566 Phishing	6a5c3953-28c0-43cc-bed7-2ebbea5dca46	c7fa215a-4985-4506-8c4e-b868df428c13	\N	53	86	{phishing,open}	{"assetName": "Billing Service", "threatActor": "FIN7", "detectionRule": "MG-7430"}	2026-10-26 04:01:35.413+07	\N	2026-10-29 09:01:35.431245+07	2026-10-29 09:01:35.431245+07
1172752b-9d9b-4c40-8a42-8e5c70109667	Crypto-mining process observed on workload	Detection triggered on VPN Gateway (10.10.0.5). Source 41.43.42.190 attributed to Singapore. Correlation confidence 99%.	high	false_positive	SIEM	41.43.42.190	Singapore	SG	TA0001 Initial Access	T1566 Phishing	14d6f1b4-5ab7-4783-8f84-4fd6bd2ec837	33177851-14ab-4ead-ba2a-7445d2b5ba38	b7d93566-607b-41f4-933f-612190e9288b	79	60	{phishing,false_positive}	{"assetName": "VPN Gateway", "threatActor": "RedLine", "detectionRule": "MG-8875"}	2026-10-21 09:01:35.413+07	2026-10-21 23:01:35.413+07	2026-10-29 09:01:35.431541+07	2026-10-29 09:01:35.431541+07
0fcb5404-a0b7-44fa-8cc7-22264bbdeca6	Phishing email delivered to executive inbox	Detection triggered on Imaging PACS (10.20.5.21). Source 82.128.212.79 attributed to Turkey. Correlation confidence 83%.	medium	resolved	Email Gateway	91.39.94.111	Turkey	TR	TA0001 Initial Access	T1195 Supply Chain Compromise	db27d234-3376-4ce6-8e0a-c1933a4820c4	b5ecd570-bfb9-455d-a802-c3031d7de183	\N	39	82	{supply-chain,resolved}	{"assetName": "Imaging PACS", "threatActor": "RedLine", "detectionRule": "MG-3927"}	2026-10-25 10:01:35.413+07	2026-10-26 05:01:35.413+07	2026-10-29 09:01:35.431858+07	2026-10-29 09:01:35.431858+07
90ec409d-c66f-40b1-8fad-6910aa54e568	Malicious PowerShell encoded command	Detection triggered on VPN Gateway (10.10.0.5). Source 212.224.188.213 attributed to Brazil. Correlation confidence 87%.	medium	contained	Email Gateway	212.224.188.213	Brazil	BR	TA0002 Execution	T1204 User Execution	5d5b6be5-2a59-4ce1-b1a1-11d7f1f5e787	33177851-14ab-4ead-ba2a-7445d2b5ba38	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	46	58	{malware,contained}	{"assetName": "VPN Gateway", "threatActor": "Qakbot", "detectionRule": "MG-4952"}	2026-10-28 11:01:35.413+07	\N	2026-10-29 09:01:35.432177+07	2026-10-29 09:01:35.432177+07
ae94a947-103a-4958-847c-de461e134bea	Data exfiltration to unknown cloud storage	Detection triggered on Imaging PACS (10.20.5.21). Source 185.82.131.214 attributed to South Korea. Correlation confidence 81%.	critical	contained	AI Anomaly Engine	185.82.131.214	South Korea	KR	TA0040 Impact	T1486 Data Encrypted for Impact	b90b3b50-50b3-467c-8169-f0fc5ab909cc	b5ecd570-bfb9-455d-a802-c3031d7de183	0b5e95ce-3f2b-4299-9e98-b4885de1043e	91	70	{ransomware,contained}	{"assetName": "Imaging PACS", "threatActor": "Volt Typhoon", "detectionRule": "MG-5771"}	2026-10-21 17:01:35.413+07	\N	2026-10-29 09:01:35.43248+07	2026-10-29 09:01:35.43248+07
ad54d392-dd6c-4854-8d00-e4762990efb5	Data exfiltration to unknown cloud storage	Detection triggered on SIEM Ingestor (10.10.8.9). Source 82.135.240.223 attributed to Turkey. Correlation confidence 72%.	high	resolved	AI Anomaly Engine	82.135.240.223	Turkey	TR	TA0002 Execution	T1204 User Execution	f1f79d39-8968-48fa-bb70-c69ca86c3ece	1d817fd7-6205-4dab-86c6-48beafa0ad78	\N	78	60	{malware,resolved}	{"assetName": "SIEM Ingestor", "threatActor": "Emotet", "detectionRule": "MG-9966"}	2026-10-20 13:01:35.413+07	2026-10-20 18:01:35.413+07	2026-10-29 09:01:35.432779+07	2026-10-29 09:01:35.432779+07
c3f1f82b-2740-4b74-b48f-f94e49c56bae	Phishing email delivered to executive inbox	Detection triggered on SIEM Ingestor (10.10.8.9). Source 77.17.140.64 attributed to Netherlands. Correlation confidence 81%.	medium	open	AI Anomaly Engine	77.17.140.64	Netherlands	NL	TA0001 Initial Access	T1203 Exploitation for Client Execution	c80cf857-8669-42a0-811b-e49d0ed96795	1d817fd7-6205-4dab-86c6-48beafa0ad78	b7d93566-607b-41f4-933f-612190e9288b	51	83	{zero-day,open}	{"assetName": "SIEM Ingestor", "threatActor": "RedLine", "detectionRule": "MG-7616"}	2026-10-28 01:01:35.413+07	\N	2026-10-29 09:01:35.433092+07	2026-10-29 09:01:35.433092+07
dfef1225-7c4b-4f1b-93e3-a9f1212b7d43	EDR blocked lateral movement attempt	Detection triggered on Imaging PACS (10.20.5.21). Source 45.175.186.105 attributed to Ukraine. Correlation confidence 73%.	medium	resolved	AI Anomaly Engine	45.175.186.105	Ukraine	UA	TA0006 Credential Access	T1110 Brute Force	7953f4ff-ae28-4b1f-9cde-3191902e0d02	b5ecd570-bfb9-455d-a802-c3031d7de183	92d776fe-9846-4fa0-b8eb-d4b5318321a0	35	62	{brute-force,resolved}	{"assetName": "Imaging PACS", "threatActor": "Medusa", "detectionRule": "MG-4646"}	2026-10-20 04:01:35.413+07	2026-10-23 00:01:35.413+07	2026-10-29 09:01:35.433453+07	2026-10-29 09:01:35.433453+07
4764d4ef-9da1-49c5-b6a4-393da778f9e1	Unauthorised API key usage detected	Detection triggered on EHR Database (10.10.2.11). Source 41.250.191.73 attributed to Romania. Correlation confidence 99%.	medium	resolved	AI Anomaly Engine	41.250.191.73	Romania	RO	TA0040 Impact	T1496 Resource Hijacking	5a8800e7-940e-493d-9572-6c7fe86f3982	920f61f5-9de0-4850-9cd1-99e0ba05365f	b7643562-4a3b-4bdc-87f5-ed48f78b9511	43	74	{cryptojacking,resolved}	{"assetName": "EHR Database", "threatActor": "Mirai", "detectionRule": "MG-1886"}	2026-10-18 15:01:35.413+07	2026-10-20 13:01:35.413+07	2026-10-29 09:01:35.43384+07	2026-10-29 09:01:35.43384+07
73fd890c-a374-4a83-a1d6-ac36f22fff0e	Malicious PowerShell encoded command	Detection triggered on EHR Database (10.10.2.11). Source 45.166.37.247 attributed to North Korea. Correlation confidence 67%.	medium	resolved	SIEM	45.166.37.247	North Korea	KP	TA0001 Initial Access	T1203 Exploitation for Client Execution	5c75d827-4e83-41cc-a4e8-16d6e200e22b	920f61f5-9de0-4850-9cd1-99e0ba05365f	b7643562-4a3b-4bdc-87f5-ed48f78b9511	41	84	{zero-day,resolved}	{"assetName": "EHR Database", "threatActor": "Akira", "detectionRule": "MG-1544"}	2026-10-20 22:01:35.413+07	2026-10-22 10:01:35.413+07	2026-10-29 09:01:35.434308+07	2026-10-29 09:01:35.434308+07
a387d3e2-1cf3-459b-9447-2322c2059448	Unauthorised API key usage detected	Detection triggered on Pharmacy Database (10.10.2.14). Source 82.128.212.79 attributed to Turkey. Correlation confidence 61%.	medium	false_positive	Firewall	82.128.212.79	Turkey	TR	TA0001 Initial Access	T1195 Supply Chain Compromise	db27d234-3376-4ce6-8e0a-c1933a4820c4	2a35cce6-c390-4c27-9c0d-84d30320c2cd	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	59	71	{supply-chain,false_positive}	{"assetName": "Pharmacy Database", "threatActor": "RedLine", "detectionRule": "MG-4128"}	2026-10-19 00:01:35.413+07	2026-10-20 08:01:35.413+07	2026-10-29 09:01:35.434661+07	2026-10-29 09:01:35.434661+07
ee36a143-5da5-421f-a3ab-64193f3e2f31	Unusual privileged account activity	Detection triggered on Email Gateway (10.10.0.25). Source 185.50.93.235 attributed to Netherlands. Correlation confidence 84%.	high	open	AI Anomaly Engine	185.50.93.235	Netherlands	NL	TA0006 Credential Access	T1110 Brute Force	f0d817b3-7c1e-4d24-a554-eb7a972a4e15	90f757b2-99a1-4342-bc1d-16a5a09b35eb	dcd2d08a-7310-414d-ae20-09165cb0c384	73	99	{brute-force,open}	{"assetName": "Email Gateway", "threatActor": "Lazarus Group", "detectionRule": "MG-4668"}	2026-10-20 03:01:35.413+07	\N	2026-10-29 09:01:35.434995+07	2026-10-29 09:01:35.434995+07
b85b240b-1ad5-47c9-a181-009f0ef13881	Data exfiltration to unknown cloud storage	Detection triggered on Appointment API (10.10.1.20). Source 89.204.40.5 attributed to China. Correlation confidence 86%.	high	resolved	IDS	185.42.116.247	China	CN	TA0006 Credential Access	T1110 Brute Force	37305175-0521-4495-8cc2-f765f1fe1e4a	b741c818-a15a-4fd4-b5ce-d92e9235e852	b8e0c918-6a79-47fb-9dfe-861f198c5550	70	85	{brute-force,resolved}	{"assetName": "Appointment API", "threatActor": "LockBit", "detectionRule": "MG-4466"}	2026-10-28 03:01:35.413+07	2026-10-29 04:01:35.413+07	2026-10-29 09:01:35.43531+07	2026-10-29 09:01:35.43531+07
71e374cf-b0b2-4572-a840-7141aa78e1cb	Multiple failed logins followed by success	Detection triggered on Admin Workstation (10.30.1.14). Source 77.35.40.181 attributed to Turkey. Correlation confidence 70%.	medium	false_positive	EDR	77.35.40.181	Turkey	TR	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	7c6950aa-5e7e-49ba-a242-26179f27aded	20484773-319b-430f-bf71-adbab8001006	b7d93566-607b-41f4-933f-612190e9288b	48	58	{data-exfiltration,false_positive}	{"assetName": "Admin Workstation", "threatActor": "Medusa", "detectionRule": "MG-1361"}	2026-10-29 02:01:35.413+07	2026-10-30 20:01:35.413+07	2026-10-29 09:01:35.435601+07	2026-10-29 09:01:35.435601+07
07d9b970-30bc-41e7-854f-bbf53d011bd8	Phishing email delivered to executive inbox	Detection triggered on SIEM Ingestor (10.10.8.9). Source 103.105.30.46 attributed to Germany. Correlation confidence 74%.	medium	open	Firewall	103.105.30.46	Germany	DE	TA0040 Impact	T1498 Network Denial of Service	835b0775-2959-4b05-8540-8aa8d198df4f	1d817fd7-6205-4dab-86c6-48beafa0ad78	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	42	89	{ddos,open}	{"assetName": "SIEM Ingestor", "threatActor": "Medusa", "detectionRule": "MG-5030"}	2026-10-21 17:01:35.413+07	\N	2026-10-29 09:01:35.435987+07	2026-10-29 09:01:35.435987+07
b9ffeb73-7aef-4c16-a91f-5bb7d449e54a	Web shell uploaded to application server	Detection triggered on Email Gateway (10.10.0.25). Source 212.91.160.161 attributed to Romania. Correlation confidence 83%.	high	resolved	Firewall	212.91.160.161	Romania	RO	TA0001 Initial Access	T1566 Phishing	0207baf9-932b-4d1a-88e3-6215fa5ae037	90f757b2-99a1-4342-bc1d-16a5a09b35eb	b7643562-4a3b-4bdc-87f5-ed48f78b9511	75	91	{phishing,resolved}	{"assetName": "Email Gateway", "threatActor": "Scattered Spider", "detectionRule": "MG-2232"}	2026-10-22 20:01:35.413+07	2026-10-23 19:01:35.413+07	2026-10-29 09:01:35.436336+07	2026-10-29 09:01:35.436336+07
ce59754f-61a7-418a-854d-e83ccbaa8245	WAF blocked SQL injection attempt	Detection triggered on Kubernetes Cluster (10.10.3.0). Source 91.191.185.98 attributed to Romania. Correlation confidence 98%.	high	investigating	EDR	62.75.122.50	Romania	RO	TA0006 Credential Access	T1110 Brute Force	6f19fa97-c338-4fbd-802c-0141c2296adc	9cf5cbb5-d702-4a86-8c4e-fd5a8db2ed5b	92d776fe-9846-4fa0-b8eb-d4b5318321a0	76	70	{brute-force,investigating}	{"assetName": "Kubernetes Cluster", "threatActor": "Kimsuky", "detectionRule": "MG-2446"}	2026-10-28 06:01:35.413+07	\N	2026-10-29 09:01:35.436662+07	2026-10-29 09:01:35.436662+07
b0174f16-71ea-42aa-a0bc-1f0788453f5c	Credential stuffing burst on login endpoint	Detection triggered on Pharmacy Database (10.10.2.14). Source 37.179.8.81 attributed to United States. Correlation confidence 62%.	medium	resolved	Cloud Trail	37.179.8.81	United States	US	TA0002 Execution	T1204 User Execution	77022662-ff41-4734-a96b-d1c7edcee46d	2a35cce6-c390-4c27-9c0d-84d30320c2cd	b7d93566-607b-41f4-933f-612190e9288b	52	59	{malware,resolved}	{"assetName": "Pharmacy Database", "threatActor": "BlackCat", "detectionRule": "MG-8967"}	2026-10-21 17:01:35.413+07	2026-10-23 16:01:35.413+07	2026-10-29 09:01:35.436967+07	2026-10-29 09:01:35.436967+07
f4b2a6c6-8e2a-405d-aa0d-5c2d9ba4be31	Malicious PowerShell encoded command	Detection triggered on Pharmacy Database (10.10.2.14). Source 5.173.25.30 attributed to Vietnam. Correlation confidence 67%.	critical	false_positive	Email Gateway	5.173.25.30	Vietnam	VN	TA0040 Impact	T1486 Data Encrypted for Impact	179d0c40-b534-462a-91bb-cfd3d007cf78	2a35cce6-c390-4c27-9c0d-84d30320c2cd	473353d6-ee2a-4345-adae-ca12b0fbee38	82	96	{ransomware,false_positive}	{"assetName": "Pharmacy Database", "threatActor": "Play", "detectionRule": "MG-1816"}	2026-10-21 19:01:35.413+07	2026-10-22 12:01:35.413+07	2026-10-29 09:01:35.437273+07	2026-10-29 09:01:35.437273+07
19e1a0e9-185b-4f58-98b0-55d26d332a21	EDR blocked lateral movement attempt	Detection triggered on Telehealth Gateway (10.10.1.44). Source 91.98.124.201 attributed to Germany. Correlation confidence 71%.	high	investigating	Firewall	91.98.124.201	Germany	DE	TA0040 Impact	T1486 Data Encrypted for Impact	875d77bf-f81d-4650-8880-178e22ee6728	2e96141d-1615-4b65-9224-7fa73fb6d0c4	b7d93566-607b-41f4-933f-612190e9288b	75	78	{ransomware,investigating}	{"assetName": "Telehealth Gateway", "threatActor": "Kimsuky", "detectionRule": "MG-9672"}	2026-10-25 14:01:35.413+07	\N	2026-10-29 09:01:35.437562+07	2026-10-29 09:01:35.437562+07
ee303995-e9cf-4b42-8c36-5d106d171bac	Crypto-mining process observed on workload	Detection triggered on Email Gateway (10.10.0.25). Source 77.35.40.181 attributed to Turkey. Correlation confidence 84%.	high	contained	AI Anomaly Engine	37.155.75.163	Turkey	TR	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	7c6950aa-5e7e-49ba-a242-26179f27aded	90f757b2-99a1-4342-bc1d-16a5a09b35eb	473353d6-ee2a-4345-adae-ca12b0fbee38	67	98	{data-exfiltration,contained}	{"assetName": "Email Gateway", "threatActor": "Medusa", "detectionRule": "MG-2429"}	2026-10-22 08:01:35.413+07	\N	2026-10-29 09:01:35.437858+07	2026-10-29 09:01:35.437858+07
5b62f6c7-ea4a-43b7-b9fe-9f0bb9c1d849	Malicious PowerShell encoded command	Detection triggered on Imaging PACS (10.20.5.21). Source 176.16.112.75 attributed to France. Correlation confidence 87%.	medium	resolved	AI Anomaly Engine	176.16.112.75	France	FR	TA0011 Command and Control	T1071 Application Layer Protocol	45f58fa6-37da-4c7c-b41c-395781be1ec6	b5ecd570-bfb9-455d-a802-c3031d7de183	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	44	85	{c2,resolved}	{"assetName": "Imaging PACS", "threatActor": "Qakbot", "detectionRule": "MG-8962"}	2026-10-18 14:01:35.413+07	2026-10-19 10:01:35.413+07	2026-10-29 09:01:35.438169+07	2026-10-29 09:01:35.438169+07
f2a28296-1649-4231-9f49-f8996af00ca8	Credential stuffing burst on login endpoint	Detection triggered on Medical IoT Gateway (10.20.4.10). Source 45.166.37.247 attributed to North Korea. Correlation confidence 95%.	medium	open	IDS	45.166.37.247	North Korea	KP	TA0001 Initial Access	T1203 Exploitation for Client Execution	5c75d827-4e83-41cc-a4e8-16d6e200e22b	61d416ee-8bd2-4eb1-b7b8-9bcc722886fa	ebd7404f-d9cc-41ad-9c75-384026a7aff9	40	99	{zero-day,open}	{"assetName": "Medical IoT Gateway", "threatActor": "Akira", "detectionRule": "MG-9387"}	2026-10-26 17:01:35.413+07	\N	2026-10-29 09:01:35.438461+07	2026-10-29 09:01:35.438461+07
d7428526-f8fa-4a27-80c7-a318510b5140	Impossible travel sign-in detected	Detection triggered on Telehealth Gateway (10.10.1.44). Source 185.50.93.235 attributed to Netherlands. Correlation confidence 95%.	medium	open	Cloud Trail	185.50.93.235	Netherlands	NL	TA0006 Credential Access	T1110 Brute Force	f0d817b3-7c1e-4d24-a554-eb7a972a4e15	2e96141d-1615-4b65-9224-7fa73fb6d0c4	ebd7404f-d9cc-41ad-9c75-384026a7aff9	40	59	{brute-force,open}	{"assetName": "Telehealth Gateway", "threatActor": "Lazarus Group", "detectionRule": "MG-4464"}	2026-10-28 09:01:35.413+07	\N	2026-10-29 09:01:35.438759+07	2026-10-29 09:01:35.438759+07
2fad8db0-3c17-46b0-98c2-ccfd2de91a7f	Web shell uploaded to application server	Detection triggered on Medical IoT Gateway (10.20.4.10). Source 176.147.87.248 attributed to Nigeria. Correlation confidence 73%.	low	open	Firewall	176.147.87.248	Nigeria	NG	TA0001 Initial Access	T1190 Exploit Public-Facing Application	ffb5a0dc-d170-4ff1-8bfb-7799ab3617ee	61d416ee-8bd2-4eb1-b7b8-9bcc722886fa	92d776fe-9846-4fa0-b8eb-d4b5318321a0	39	80	{web-attack,open}	{"assetName": "Medical IoT Gateway", "threatActor": "Lazarus Group", "detectionRule": "MG-6015"}	2026-10-26 09:01:35.413+07	\N	2026-10-29 09:01:35.439124+07	2026-10-29 09:01:35.439124+07
9698a305-fa20-4058-9474-3f753d7d8ad4	Suspicious outbound C2 beacon detected	Detection triggered on Imaging PACS (10.20.5.21). Source 212.172.52.214 attributed to United Kingdom. Correlation confidence 73%.	medium	resolved	SIEM	212.172.52.214	United Kingdom	GB	TA0011 Command and Control	T1071 Application Layer Protocol	65731344-d8bb-4c7a-b066-a7fb72512f98	b5ecd570-bfb9-455d-a802-c3031d7de183	b7d93566-607b-41f4-933f-612190e9288b	55	55	{c2,resolved}	{"assetName": "Imaging PACS", "threatActor": "Anonymous Sudan", "detectionRule": "MG-9192"}	2026-10-27 17:01:35.413+07	2026-10-29 23:01:35.413+07	2026-10-29 09:01:35.439449+07	2026-10-29 09:01:35.439449+07
7fb5b2ee-922a-47e8-860a-97819a50fd6a	WAF blocked SQL injection attempt	Detection triggered on Backup Vault (10.10.7.4). Source 77.163.165.241 attributed to United States. Correlation confidence 77%.	medium	resolved	AI Anomaly Engine	77.163.165.241	United States	US	TA0001 Initial Access	T1203 Exploitation for Client Execution	a33cfc49-b05c-48fc-b7d5-6dd4549d938b	578335bf-e75d-4878-89dc-12dc1f443613	ebd7404f-d9cc-41ad-9c75-384026a7aff9	40	84	{zero-day,resolved}	{"assetName": "Backup Vault", "threatActor": "Mirai", "detectionRule": "MG-6702"}	2026-10-18 22:01:35.413+07	2026-10-21 09:01:35.413+07	2026-10-29 09:01:35.439755+07	2026-10-29 09:01:35.439755+07
c2dac453-8b6e-471e-b20b-aab8ee16caa7	Crypto-mining process observed on workload	Detection triggered on Patient Portal (10.10.1.10). Source 62.101.194.60 attributed to Romania. Correlation confidence 64%.	low	false_positive	SIEM	37.40.42.231	Romania	RO	TA0001 Initial Access	T1203 Exploitation for Client Execution	c368788b-554f-40bd-84c3-5199428264de	bcdb679c-53d2-48f1-ad99-e1b949aeeb57	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	17	56	{zero-day,false_positive}	{"assetName": "Patient Portal", "threatActor": "Emotet", "detectionRule": "MG-4227"}	2026-10-28 18:01:35.413+07	2026-10-31 17:01:35.413+07	2026-10-29 09:01:35.440051+07	2026-10-29 09:01:35.440051+07
a0cc074e-966e-48fd-b8e6-659033fc2f41	Credential stuffing burst on login endpoint	Detection triggered on Admin Workstation (10.30.1.14). Source 41.164.216.176 attributed to Singapore. Correlation confidence 70%.	high	resolved	AI Anomaly Engine	41.164.216.176	Singapore	SG	TA0001 Initial Access	T1195 Supply Chain Compromise	ffdbb6a4-c306-4f16-a7ad-29d69f39219f	20484773-319b-430f-bf71-adbab8001006	0b5e95ce-3f2b-4299-9e98-b4885de1043e	65	94	{supply-chain,resolved}	{"assetName": "Admin Workstation", "threatActor": "Medusa", "detectionRule": "MG-7466"}	2026-10-26 12:01:35.413+07	2026-10-28 00:01:35.413+07	2026-10-29 09:01:35.440345+07	2026-10-29 09:01:35.440345+07
a70a8d12-f8b2-4fc6-b20e-c6f9b4723761	Impossible travel sign-in detected	Detection triggered on Admin Workstation (10.30.1.14). Source 91.153.58.136 attributed to South Korea. Correlation confidence 61%.	critical	open	EDR	91.153.58.136	South Korea	KR	TA0001 Initial Access	T1566 Phishing	6a5c3953-28c0-43cc-bed7-2ebbea5dca46	20484773-319b-430f-bf71-adbab8001006	dcd2d08a-7310-414d-ae20-09165cb0c384	97	87	{phishing,open}	{"assetName": "Admin Workstation", "threatActor": "FIN7", "detectionRule": "MG-6634"}	2026-10-21 08:01:35.413+07	\N	2026-10-29 09:01:35.440669+07	2026-10-29 09:01:35.440669+07
3aef148a-9af2-4799-9944-3c2deeb1a022	Data exfiltration to unknown cloud storage	Detection triggered on Kubernetes Cluster (10.10.3.0). Source 203.83.3.123 attributed to Russia. Correlation confidence 92%.	high	open	Firewall	203.83.3.123	Russia	RU	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	65244449-7ca2-4c2b-a356-87a3773df4a8	9cf5cbb5-d702-4a86-8c4e-fd5a8db2ed5b	473353d6-ee2a-4345-adae-ca12b0fbee38	71	70	{data-exfiltration,open}	{"assetName": "Kubernetes Cluster", "threatActor": "Kimsuky", "detectionRule": "MG-9888"}	2026-10-20 03:01:35.413+07	\N	2026-10-29 09:01:35.44101+07	2026-10-29 09:01:35.44101+07
0d4e72c2-82d9-4ba1-b6db-7c03cd0d9228	Ransomware note dropped on file share	Detection triggered on Pharmacy Database (10.10.2.14). Source 102.173.76.34 attributed to Japan. Correlation confidence 94%.	high	open	Cloud Trail	102.173.76.34	Japan	JP	TA0001 Initial Access	T1190 Exploit Public-Facing Application	61e38802-554e-42b8-bb43-5adadc01ea5c	2a35cce6-c390-4c27-9c0d-84d30320c2cd	ebd7404f-d9cc-41ad-9c75-384026a7aff9	68	75	{web-attack,open}	{"assetName": "Pharmacy Database", "threatActor": "Scattered Spider", "detectionRule": "MG-1399"}	2026-10-18 16:01:35.413+07	\N	2026-10-29 09:01:35.441427+07	2026-10-29 09:01:35.441427+07
178c6cbb-d28a-4da9-be57-9071ee945104	Phishing email delivered to executive inbox	Detection triggered on SIEM Ingestor (10.10.8.9). Source 41.18.147.63 attributed to Ukraine. Correlation confidence 99%.	low	open	Email Gateway	41.18.147.63	Ukraine	UA	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	9af3a12a-dd1d-4027-bc02-5afad11ab5c0	1d817fd7-6205-4dab-86c6-48beafa0ad78	\N	34	70	{data-exfiltration,open}	{"assetName": "SIEM Ingestor", "threatActor": "FIN7", "detectionRule": "MG-1766"}	2026-10-24 04:01:35.413+07	\N	2026-10-29 09:01:35.441759+07	2026-10-29 09:01:35.441759+07
7571c905-4065-47ed-af29-91c109ecda38	DNS tunnelling to suspicious domain	Detection triggered on Identity Provider (10.10.8.20). Source 41.18.147.63 attributed to Ukraine. Correlation confidence 79%.	low	resolved	Cloud Trail	41.18.147.63	Ukraine	UA	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	9af3a12a-dd1d-4027-bc02-5afad11ab5c0	d369c839-7416-482f-ba27-4ce4906c7712	b7643562-4a3b-4bdc-87f5-ed48f78b9511	40	98	{data-exfiltration,resolved}	{"assetName": "Identity Provider", "threatActor": "FIN7", "detectionRule": "MG-9983"}	2026-10-23 09:01:35.413+07	2026-10-23 17:01:35.413+07	2026-10-29 09:01:35.442073+07	2026-10-29 09:01:35.442073+07
15031999-d364-45b0-ae12-b86844989001	Crypto-mining process observed on workload	Detection triggered on SIEM Ingestor (10.10.8.9). Source 82.128.212.79 attributed to Turkey. Correlation confidence 73%.	medium	false_positive	Cloud Trail	82.128.212.79	Turkey	TR	TA0001 Initial Access	T1195 Supply Chain Compromise	db27d234-3376-4ce6-8e0a-c1933a4820c4	1d817fd7-6205-4dab-86c6-48beafa0ad78	b8e0c918-6a79-47fb-9dfe-861f198c5550	54	93	{supply-chain,false_positive}	{"assetName": "SIEM Ingestor", "threatActor": "RedLine", "detectionRule": "MG-9785"}	2026-10-21 19:01:35.413+07	2026-10-24 07:01:35.413+07	2026-10-29 09:01:35.442458+07	2026-10-29 09:01:35.442458+07
492d75b4-0a30-4191-9334-051d55cd20f5	Crypto-mining process observed on workload	Detection triggered on Billing Service (10.10.1.30). Source 77.190.220.196 attributed to Germany. Correlation confidence 86%.	medium	open	Firewall	77.190.220.196	Germany	DE	TA0002 Execution	T1204 User Execution	7de44dd1-1dcc-46e8-84c4-563779c4feb4	c7fa215a-4985-4506-8c4e-b868df428c13	\N	41	63	{malware,open}	{"assetName": "Billing Service", "threatActor": "Sandworm", "detectionRule": "MG-8059"}	2026-10-23 08:01:35.413+07	\N	2026-10-29 09:01:35.442791+07	2026-10-29 09:01:35.442791+07
95c477b4-dbf2-42c4-8560-526fb50c2014	Crypto-mining process observed on workload	Detection triggered on Billing Service (10.10.1.30). Source 185.235.188.67 attributed to United States. Correlation confidence 83%.	critical	resolved	SIEM	185.235.188.67	United States	US	TA0006 Credential Access	T1110 Brute Force	c635c6f4-2ecd-417b-a60a-78a5f0ea4ab1	c7fa215a-4985-4506-8c4e-b868df428c13	\N	84	79	{brute-force,resolved}	{"assetName": "Billing Service", "threatActor": "Volt Typhoon", "detectionRule": "MG-7571"}	2026-10-24 10:01:35.413+07	2026-10-25 00:01:35.413+07	2026-10-29 09:01:35.443111+07	2026-10-29 09:01:35.443111+07
17c4f540-735c-44ce-817d-275014fc3805	Anomalous database dump from EHR	Detection triggered on CI/CD Runner (10.10.6.7). Source 185.239.112.44 attributed to Russia. Correlation confidence 83%.	medium	contained	AI Anomaly Engine	185.239.112.44	Russia	RU	TA0002 Execution	T1204 User Execution	d40ecb02-6988-4ee5-b1ee-4a8e27616a11	e3a86baf-d72f-4d71-8d47-34768a15f739	\N	58	78	{malware,contained}	{"assetName": "CI/CD Runner", "threatActor": "Turla", "detectionRule": "MG-3480"}	2026-10-25 02:01:35.413+07	\N	2026-10-29 09:01:35.443482+07	2026-10-29 09:01:35.443482+07
5b70d35e-4323-4606-8a1b-b5bde3e4c75a	Impossible travel sign-in detected	Detection triggered on Kubernetes Cluster (10.10.3.0). Source 80.239.9.192 attributed to Russia. Correlation confidence 81%.	critical	open	Email Gateway	194.210.143.60	Russia	RU	TA0001 Initial Access	T1203 Exploitation for Client Execution	cee8bd38-628a-4547-9c17-f7b57a129e42	9cf5cbb5-d702-4a86-8c4e-fd5a8db2ed5b	\N	87	87	{zero-day,open}	{"assetName": "Kubernetes Cluster", "threatActor": "Cobalt Strike", "detectionRule": "MG-2688"}	2026-10-24 08:01:35.413+07	\N	2026-10-29 09:01:35.443817+07	2026-10-29 09:01:35.443817+07
4db9c058-4971-4024-a52b-3558c9485c8d	Anomalous database dump from EHR	Detection triggered on Medical IoT Gateway (10.20.4.10). Source 212.112.62.138 attributed to Singapore. Correlation confidence 75%.	high	investigating	IDS	109.93.197.128	Singapore	SG	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	376c9641-d150-43f7-b1ce-e2083d1f6488	61d416ee-8bd2-4eb1-b7b8-9bcc722886fa	b8e0c918-6a79-47fb-9dfe-861f198c5550	62	87	{data-exfiltration,investigating}	{"assetName": "Medical IoT Gateway", "threatActor": "Volt Typhoon", "detectionRule": "MG-5045"}	2026-10-26 10:01:35.413+07	\N	2026-10-29 09:01:35.444194+07	2026-10-29 09:01:35.444194+07
98c2e59e-731b-488a-8613-ec616bb63629	EDR blocked lateral movement attempt	Detection triggered on Medical IoT Gateway (10.20.4.10). Source 185.239.112.44 attributed to Russia. Correlation confidence 93%.	high	resolved	AI Anomaly Engine	185.239.112.44	Russia	RU	TA0002 Execution	T1204 User Execution	d40ecb02-6988-4ee5-b1ee-4a8e27616a11	61d416ee-8bd2-4eb1-b7b8-9bcc722886fa	\N	72	58	{malware,resolved}	{"assetName": "Medical IoT Gateway", "threatActor": "Turla", "detectionRule": "MG-8154"}	2026-10-25 23:01:35.413+07	2026-10-28 12:01:35.413+07	2026-10-29 09:01:35.444528+07	2026-10-29 09:01:35.444528+07
e91aa651-34c8-4d5c-8e1f-d8ce004f2df2	Suspicious outbound C2 beacon detected	Detection triggered on Patient Portal (10.10.1.10). Source 41.120.121.169 attributed to Russia. Correlation confidence 84%.	high	investigating	IDS	37.220.155.17	Russia	RU	TA0040 Impact	T1498 Network Denial of Service	8bfe3561-d97b-483f-9b6a-b38dd35927c7	bcdb679c-53d2-48f1-ad99-e1b949aeeb57	473353d6-ee2a-4345-adae-ca12b0fbee38	67	79	{ddos,investigating}	{"assetName": "Patient Portal", "threatActor": "Qakbot", "detectionRule": "MG-8196"}	2026-10-28 01:01:35.413+07	\N	2026-10-29 09:01:35.444824+07	2026-10-29 09:01:35.444824+07
037d9c8c-84bb-4402-8722-c785f85146d0	Suspicious outbound C2 beacon detected	Detection triggered on Backup Vault (10.10.7.4). Source 77.17.140.64 attributed to Netherlands. Correlation confidence 86%.	critical	investigating	EDR	77.17.140.64	Netherlands	NL	TA0001 Initial Access	T1203 Exploitation for Client Execution	c80cf857-8669-42a0-811b-e49d0ed96795	578335bf-e75d-4878-89dc-12dc1f443613	92d776fe-9846-4fa0-b8eb-d4b5318321a0	81	75	{zero-day,investigating}	{"assetName": "Backup Vault", "threatActor": "RedLine", "detectionRule": "MG-4858"}	2026-10-28 00:01:35.413+07	\N	2026-10-29 09:01:35.445136+07	2026-10-29 09:01:35.445136+07
d2185754-0895-4d88-be2a-f8cc713f13d4	Multiple failed logins followed by success	Detection triggered on Appointment API (10.10.1.20). Source 77.163.165.241 attributed to United States. Correlation confidence 97%.	critical	resolved	Firewall	77.163.165.241	United States	US	TA0001 Initial Access	T1203 Exploitation for Client Execution	a33cfc49-b05c-48fc-b7d5-6dd4549d938b	b741c818-a15a-4fd4-b5ce-d92e9235e852	\N	82	72	{zero-day,resolved}	{"assetName": "Appointment API", "threatActor": "Mirai", "detectionRule": "MG-1730"}	2026-10-27 07:01:35.413+07	2026-10-30 01:01:35.413+07	2026-10-29 09:01:35.44544+07	2026-10-29 09:01:35.44544+07
5aeef8e3-d32d-4157-b1c3-61788d942010	EDR blocked lateral movement attempt	Detection triggered on DNS Resolver (10.10.0.53). Source 80.44.121.200 attributed to North Korea. Correlation confidence 91%.	high	open	IDS	80.44.121.200	North Korea	KP	TA0001 Initial Access	T1190 Exploit Public-Facing Application	f4bee1da-cdbd-4940-b064-d63d30d10095	f8433530-5580-415e-9f16-41634a70bd47	\N	73	84	{web-attack,open}	{"assetName": "DNS Resolver", "threatActor": "Scattered Spider", "detectionRule": "MG-6418"}	2026-10-24 00:01:35.413+07	\N	2026-10-29 09:01:35.445741+07	2026-10-29 09:01:35.445741+07
d7d4225c-b834-43d0-b31c-628682dd3c96	Ransomware note dropped on file share	Detection triggered on Kubernetes Cluster (10.10.3.0). Source 41.43.42.190 attributed to Singapore. Correlation confidence 81%.	medium	open	Email Gateway	41.43.42.190	Singapore	SG	TA0001 Initial Access	T1566 Phishing	14d6f1b4-5ab7-4783-8f84-4fd6bd2ec837	9cf5cbb5-d702-4a86-8c4e-fd5a8db2ed5b	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	42	83	{phishing,open}	{"assetName": "Kubernetes Cluster", "threatActor": "RedLine", "detectionRule": "MG-6203"}	2026-10-19 14:01:35.413+07	\N	2026-10-29 09:01:35.446033+07	2026-10-29 09:01:35.446033+07
5fbb18b2-c015-40e8-ab8e-13e2eaaa5f9d	Ransomware note dropped on file share	Detection triggered on Billing Service (10.10.1.30). Source 185.82.131.214 attributed to South Korea. Correlation confidence 89%.	high	resolved	EDR	185.82.131.214	South Korea	KR	TA0040 Impact	T1486 Data Encrypted for Impact	b90b3b50-50b3-467c-8169-f0fc5ab909cc	c7fa215a-4985-4506-8c4e-b868df428c13	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	84	88	{ransomware,resolved}	{"assetName": "Billing Service", "threatActor": "Volt Typhoon", "detectionRule": "MG-7075"}	2026-10-19 17:01:35.413+07	2026-10-20 18:01:35.413+07	2026-10-29 09:01:35.446338+07	2026-10-29 09:01:35.446338+07
0c29039b-84ac-4c20-a6d7-bd4f3ef6fbad	Ransomware note dropped on file share	Detection triggered on DNS Resolver (10.10.0.53). Source 109.249.219.85 attributed to United States. Correlation confidence 94%.	high	open	EDR	109.249.219.85	United States	US	TA0011 Command and Control	T1071 Application Layer Protocol	10841f73-b107-4b91-8934-109165665ecd	f8433530-5580-415e-9f16-41634a70bd47	\N	76	73	{c2,open}	{"assetName": "DNS Resolver", "threatActor": "Emotet", "detectionRule": "MG-5778"}	2026-10-23 03:01:35.413+07	\N	2026-10-29 09:01:35.446644+07	2026-10-29 09:01:35.446644+07
cda0582a-aa50-4b93-a69a-db524153c659	Ransomware note dropped on file share	Detection triggered on Email Gateway (10.10.0.25). Source 82.76.234.157 attributed to Russia. Correlation confidence 82%.	medium	investigating	Email Gateway	82.76.234.157	Russia	RU	TA0009 Collection	T1530 Data from Cloud Storage	95879c27-d3fc-4365-95a3-c9572bc671f2	90f757b2-99a1-4342-bc1d-16a5a09b35eb	ebd7404f-d9cc-41ad-9c75-384026a7aff9	59	77	{insider-threat,investigating}	{"assetName": "Email Gateway", "threatActor": "Volt Typhoon", "detectionRule": "MG-1862"}	2026-10-25 21:01:35.413+07	\N	2026-10-29 09:01:35.446927+07	2026-10-29 09:01:35.446927+07
408e8ece-3026-40e2-8e44-bb011eeb253b	Suspicious outbound C2 beacon detected	Detection triggered on DNS Resolver (10.10.0.53). Source 82.205.112.66 attributed to Netherlands. Correlation confidence 61%.	medium	resolved	AI Anomaly Engine	82.205.112.66	Netherlands	NL	TA0040 Impact	T1498 Network Denial of Service	e7472452-efcd-4651-8727-8549382111f0	f8433530-5580-415e-9f16-41634a70bd47	b8e0c918-6a79-47fb-9dfe-861f198c5550	55	96	{ddos,resolved}	{"assetName": "DNS Resolver", "threatActor": "Kimsuky", "detectionRule": "MG-8801"}	2026-10-20 20:01:35.413+07	2026-10-23 03:01:35.413+07	2026-10-29 09:01:35.447231+07	2026-10-29 09:01:35.447231+07
fc95600c-b82e-4522-a042-f57fc2c41f4a	Phishing email delivered to executive inbox	Detection triggered on SIEM Ingestor (10.10.8.9). Source 176.117.101.20 attributed to North Korea. Correlation confidence 76%.	critical	false_positive	IDS	176.117.101.20	North Korea	KP	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	22d38993-8ff8-4ea8-b7d5-374ed61e9288	1d817fd7-6205-4dab-86c6-48beafa0ad78	\N	87	98	{data-exfiltration,false_positive}	{"assetName": "SIEM Ingestor", "threatActor": "Play", "detectionRule": "MG-6499"}	2026-10-21 18:01:35.413+07	2026-10-24 10:01:35.413+07	2026-10-29 09:01:35.447519+07	2026-10-29 09:01:35.447519+07
90a20cb0-0b91-4565-b8e3-d3daaf4bfcc3	Crypto-mining process observed on workload	Detection triggered on EHR Database (10.10.2.11). Source 82.205.112.66 attributed to Netherlands. Correlation confidence 66%.	high	investigating	SIEM	82.205.112.66	Netherlands	NL	TA0040 Impact	T1498 Network Denial of Service	e7472452-efcd-4651-8727-8549382111f0	920f61f5-9de0-4850-9cd1-99e0ba05365f	\N	75	92	{ddos,investigating}	{"assetName": "EHR Database", "threatActor": "Kimsuky", "detectionRule": "MG-7882"}	2026-10-22 15:01:35.413+07	\N	2026-10-29 09:01:35.447844+07	2026-10-29 09:01:35.447844+07
f00f0d28-3a2d-4e57-94bc-47a7b71758ab	Crypto-mining process observed on workload	Detection triggered on CI/CD Runner (10.10.6.7). Source 41.233.45.139 attributed to China. Correlation confidence 89%.	critical	false_positive	EDR	41.233.45.139	China	CN	TA0001 Initial Access	T1203 Exploitation for Client Execution	6ec20990-bb57-4d4f-9d7b-e3ba3f013593	e3a86baf-d72f-4d71-8d47-34768a15f739	473353d6-ee2a-4345-adae-ca12b0fbee38	82	82	{zero-day,false_positive}	{"assetName": "CI/CD Runner", "threatActor": "Anonymous Sudan", "detectionRule": "MG-6607"}	2026-10-29 07:01:35.413+07	2026-10-30 13:01:35.413+07	2026-10-29 09:01:35.44816+07	2026-10-29 09:01:35.44816+07
e223becc-5041-4581-8455-a93b67463444	Anomalous database dump from EHR	Detection triggered on DNS Resolver (10.10.0.53). Source 5.173.25.30 attributed to Vietnam. Correlation confidence 85%.	medium	resolved	AI Anomaly Engine	203.130.169.114	Vietnam	VN	TA0040 Impact	T1486 Data Encrypted for Impact	179d0c40-b534-462a-91bb-cfd3d007cf78	f8433530-5580-415e-9f16-41634a70bd47	473353d6-ee2a-4345-adae-ca12b0fbee38	62	99	{ransomware,resolved}	{"assetName": "DNS Resolver", "threatActor": "Play", "detectionRule": "MG-6271"}	2026-10-19 23:01:35.413+07	2026-10-20 09:01:35.413+07	2026-10-29 09:01:35.4485+07	2026-10-29 09:01:35.4485+07
8e2a5bbf-f521-4bef-94a2-956602910028	EDR blocked lateral movement attempt	Detection triggered on Admin Workstation (10.30.1.14). Source 5.173.25.30 attributed to Vietnam. Correlation confidence 88%.	low	investigating	Email Gateway	5.173.25.30	Vietnam	VN	TA0040 Impact	T1486 Data Encrypted for Impact	179d0c40-b534-462a-91bb-cfd3d007cf78	20484773-319b-430f-bf71-adbab8001006	\N	11	81	{ransomware,investigating}	{"assetName": "Admin Workstation", "threatActor": "Play", "detectionRule": "MG-5773"}	2026-10-22 02:01:35.413+07	\N	2026-10-29 09:01:35.448869+07	2026-10-29 09:01:35.448869+07
9e0570b0-7651-4d3c-99a9-ee19fb8aa99a	Suspicious outbound C2 beacon detected	Detection triggered on SIEM Ingestor (10.10.8.9). Source 176.117.101.20 attributed to North Korea. Correlation confidence 69%.	high	false_positive	Email Gateway	176.117.101.20	North Korea	KP	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	22d38993-8ff8-4ea8-b7d5-374ed61e9288	1d817fd7-6205-4dab-86c6-48beafa0ad78	\N	64	55	{data-exfiltration,false_positive}	{"assetName": "SIEM Ingestor", "threatActor": "Play", "detectionRule": "MG-6430"}	2026-10-19 10:01:35.413+07	2026-10-22 05:01:35.413+07	2026-10-29 09:01:35.449179+07	2026-10-29 09:01:35.449179+07
30c16436-37de-4ae0-8fb9-c5d20271fb5a	Web shell uploaded to application server	Detection triggered on Medical IoT Gateway (10.20.4.10). Source 41.112.33.191 attributed to Iran. Correlation confidence 68%.	critical	resolved	Email Gateway	41.112.33.191	Iran	IR	TA0001 Initial Access	T1195 Supply Chain Compromise	4dcdcd3e-9c12-4822-b431-96952b1205b6	61d416ee-8bd2-4eb1-b7b8-9bcc722886fa	b7643562-4a3b-4bdc-87f5-ed48f78b9511	95	92	{supply-chain,resolved}	{"assetName": "Medical IoT Gateway", "threatActor": "Kimsuky", "detectionRule": "MG-1097"}	2026-10-18 17:01:35.413+07	2026-10-21 10:01:35.413+07	2026-10-29 09:01:35.449473+07	2026-10-29 09:01:35.449473+07
6abcb4ce-0127-4d17-8e68-c69cda02f815	Multiple failed logins followed by success	Detection triggered on Appointment API (10.10.1.20). Source 82.76.234.157 attributed to Russia. Correlation confidence 71%.	low	resolved	Cloud Trail	82.76.234.157	Russia	RU	TA0009 Collection	T1530 Data from Cloud Storage	95879c27-d3fc-4365-95a3-c9572bc671f2	b741c818-a15a-4fd4-b5ce-d92e9235e852	92d776fe-9846-4fa0-b8eb-d4b5318321a0	23	99	{insider-threat,resolved}	{"assetName": "Appointment API", "threatActor": "Volt Typhoon", "detectionRule": "MG-4638"}	2026-10-22 03:01:35.413+07	2026-10-24 10:01:35.413+07	2026-10-29 09:01:35.449746+07	2026-10-29 09:01:35.449746+07
99754e62-70ed-44e0-83fa-7775a64ab5f3	Multiple failed logins followed by success	Detection triggered on Mobile API (10.10.1.50). Source 45.109.88.119 attributed to China. Correlation confidence 63%.	critical	open	Cloud Trail	45.109.88.119	China	CN	TA0001 Initial Access	T1190 Exploit Public-Facing Application	8d5751aa-62cd-4460-a8de-38cfe934a5bd	43b2d473-a21f-4654-99a4-99de37812bd7	b7d93566-607b-41f4-933f-612190e9288b	84	59	{web-attack,open}	{"assetName": "Mobile API", "threatActor": "Qakbot", "detectionRule": "MG-6636"}	2026-10-20 07:01:35.413+07	\N	2026-10-29 09:01:35.450032+07	2026-10-29 09:01:35.450032+07
335dea08-a04c-48bd-8acb-30babf190de0	Impossible travel sign-in detected	Detection triggered on EHR Database (10.10.2.11). Source 212.112.62.138 attributed to Singapore. Correlation confidence 63%.	medium	investigating	Firewall	103.77.140.65	Singapore	SG	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	376c9641-d150-43f7-b1ce-e2083d1f6488	920f61f5-9de0-4850-9cd1-99e0ba05365f	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	51	67	{data-exfiltration,investigating}	{"assetName": "EHR Database", "threatActor": "Volt Typhoon", "detectionRule": "MG-1330"}	2026-10-19 02:01:35.413+07	\N	2026-10-29 09:01:35.450308+07	2026-10-29 09:01:35.450308+07
4ce999a8-b26f-47a2-9359-7fcc54a6e8cd	Web shell uploaded to application server	Detection triggered on Appointment API (10.10.1.20). Source 203.125.201.170 attributed to Nigeria. Correlation confidence 77%.	critical	resolved	IDS	203.125.201.170	Nigeria	NG	TA0006 Credential Access	T1110 Brute Force	32ed708b-485b-4e58-bc0a-da16ef8f1800	b741c818-a15a-4fd4-b5ce-d92e9235e852	92d776fe-9846-4fa0-b8eb-d4b5318321a0	95	89	{brute-force,resolved}	{"assetName": "Appointment API", "threatActor": "Qakbot", "detectionRule": "MG-5118"}	2026-10-23 16:01:35.413+07	2026-10-26 02:01:35.413+07	2026-10-29 09:01:35.450571+07	2026-10-29 09:01:35.450571+07
080b58ef-351b-4382-a94c-cb2a41e414b5	Suspicious outbound C2 beacon detected	Detection triggered on Email Gateway (10.10.0.25). Source 203.83.3.123 attributed to Russia. Correlation confidence 64%.	high	resolved	SIEM	89.172.158.135	Russia	RU	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	65244449-7ca2-4c2b-a356-87a3773df4a8	90f757b2-99a1-4342-bc1d-16a5a09b35eb	92d776fe-9846-4fa0-b8eb-d4b5318321a0	61	83	{data-exfiltration,resolved}	{"assetName": "Email Gateway", "threatActor": "Kimsuky", "detectionRule": "MG-2439"}	2026-10-25 10:01:35.413+07	2026-10-25 18:01:35.413+07	2026-10-29 09:01:35.45087+07	2026-10-29 09:01:35.45087+07
90f33a0f-044e-4b09-a122-079ad72d64ea	Impossible travel sign-in detected	Detection triggered on Patient Portal (10.10.1.10). Source 203.160.127.215 attributed to Iran. Correlation confidence 95%.	medium	resolved	Firewall	203.160.127.215	Iran	IR	TA0040 Impact	T1496 Resource Hijacking	735f0705-801e-4b32-8f08-cf4b80c9b361	bcdb679c-53d2-48f1-ad99-e1b949aeeb57	ebd7404f-d9cc-41ad-9c75-384026a7aff9	59	66	{cryptojacking,resolved}	{"assetName": "Patient Portal", "threatActor": "Mirai", "detectionRule": "MG-7268"}	2026-10-22 06:01:35.413+07	2026-10-23 08:01:35.413+07	2026-10-29 09:01:35.451169+07	2026-10-29 09:01:35.451169+07
e7e858fd-9cd4-48f0-9c2b-8b22ad838787	Phishing email delivered to executive inbox	Detection triggered on Telehealth Gateway (10.10.1.44). Source 194.88.113.124 attributed to Romania. Correlation confidence 62%.	medium	open	SIEM	181.167.160.11	Romania	RO	TA0001 Initial Access	T1566 Phishing	efcc2d73-2c63-43c7-9c82-2c2af9ea9a9f	2e96141d-1615-4b65-9224-7fa73fb6d0c4	0b5e95ce-3f2b-4299-9e98-b4885de1043e	56	80	{phishing,open}	{"assetName": "Telehealth Gateway", "threatActor": "Play", "detectionRule": "MG-3178"}	2026-10-20 21:01:35.413+07	\N	2026-10-29 09:01:35.451429+07	2026-10-29 09:01:35.451429+07
5f87a666-4f74-4c96-978b-d40599b2d32d	Multiple failed logins followed by success	Detection triggered on Admin Workstation (10.30.1.14). Source 82.128.212.79 attributed to Turkey. Correlation confidence 64%.	high	investigating	IDS	82.128.212.79	Turkey	TR	TA0001 Initial Access	T1195 Supply Chain Compromise	db27d234-3376-4ce6-8e0a-c1933a4820c4	20484773-319b-430f-bf71-adbab8001006	473353d6-ee2a-4345-adae-ca12b0fbee38	60	97	{supply-chain,investigating}	{"assetName": "Admin Workstation", "threatActor": "RedLine", "detectionRule": "MG-7504"}	2026-10-25 11:01:35.413+07	\N	2026-10-29 09:01:35.451683+07	2026-10-29 09:01:35.451683+07
90d1d4cc-3362-4aeb-9ebd-717682b20caf	Unusual privileged account activity	Detection triggered on Admin Workstation (10.30.1.14). Source 102.35.83.112 attributed to India. Correlation confidence 98%.	high	resolved	Firewall	102.35.83.112	India	IN	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	b4d357a5-d88f-4ec5-84ee-15f41e5559c8	20484773-319b-430f-bf71-adbab8001006	ebd7404f-d9cc-41ad-9c75-384026a7aff9	77	75	{data-exfiltration,resolved}	{"assetName": "Admin Workstation", "threatActor": "RedLine", "detectionRule": "MG-9511"}	2026-10-19 07:01:35.413+07	2026-10-21 20:01:35.413+07	2026-10-29 09:01:35.452038+07	2026-10-29 09:01:35.452038+07
056c7621-cd78-47b8-b2cf-670ff3502913	Multiple failed logins followed by success	Detection triggered on Email Gateway (10.10.0.25). Source 103.81.169.220 attributed to Iran. Correlation confidence 79%.	medium	investigating	AI Anomaly Engine	103.81.169.220	Iran	IR	TA0040 Impact	T1486 Data Encrypted for Impact	5255b5db-ce04-4f87-adee-5ab4fc74049a	90f757b2-99a1-4342-bc1d-16a5a09b35eb	b7643562-4a3b-4bdc-87f5-ed48f78b9511	39	73	{ransomware,investigating}	{"assetName": "Email Gateway", "threatActor": "Volt Typhoon", "detectionRule": "MG-4001"}	2026-10-25 06:01:35.413+07	\N	2026-10-29 09:01:35.452363+07	2026-10-29 09:01:35.452363+07
4aec43dc-ddf0-44cc-9932-47ceba3e8f11	Ransomware note dropped on file share	Detection triggered on Mobile API (10.10.1.50). Source 203.125.201.170 attributed to Nigeria. Correlation confidence 77%.	low	false_positive	Email Gateway	203.125.201.170	Nigeria	NG	TA0006 Credential Access	T1110 Brute Force	32ed708b-485b-4e58-bc0a-da16ef8f1800	43b2d473-a21f-4654-99a4-99de37812bd7	\N	26	81	{brute-force,false_positive}	{"assetName": "Mobile API", "threatActor": "Qakbot", "detectionRule": "MG-4257"}	2026-10-22 05:01:35.413+07	2026-10-23 23:01:35.413+07	2026-10-29 09:01:35.452674+07	2026-10-29 09:01:35.452674+07
3d7eae22-3068-4e69-b592-4db92617e373	Data exfiltration to unknown cloud storage	Detection triggered on Identity Provider (10.10.8.20). Source 103.105.30.46 attributed to Germany. Correlation confidence 89%.	medium	open	AI Anomaly Engine	5.140.35.205	Germany	DE	TA0040 Impact	T1498 Network Denial of Service	835b0775-2959-4b05-8540-8aa8d198df4f	d369c839-7416-482f-ba27-4ce4906c7712	0b5e95ce-3f2b-4299-9e98-b4885de1043e	40	72	{ddos,open}	{"assetName": "Identity Provider", "threatActor": "Medusa", "detectionRule": "MG-8407"}	2026-10-21 09:01:35.413+07	\N	2026-10-29 09:01:35.45295+07	2026-10-29 09:01:35.45295+07
f59e8870-f2af-4db4-bb69-8b1285105d2d	Suspicious outbound C2 beacon detected	Detection triggered on Backup Vault (10.10.7.4). Source 41.18.147.63 attributed to Ukraine. Correlation confidence 64%.	critical	false_positive	EDR	41.18.147.63	Ukraine	UA	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	9af3a12a-dd1d-4027-bc02-5afad11ab5c0	578335bf-e75d-4878-89dc-12dc1f443613	b8e0c918-6a79-47fb-9dfe-861f198c5550	82	59	{data-exfiltration,false_positive}	{"assetName": "Backup Vault", "threatActor": "FIN7", "detectionRule": "MG-7214"}	2026-10-23 23:01:35.413+07	2026-10-24 09:01:35.413+07	2026-10-29 09:01:35.453232+07	2026-10-29 09:01:35.453232+07
4b74f050-7cda-4283-8962-adcf8ec345e9	Unauthorised API key usage detected	Detection triggered on Appointment API (10.10.1.20). Source 194.88.113.124 attributed to Romania. Correlation confidence 69%.	low	open	SIEM	194.88.113.124	Romania	RO	TA0001 Initial Access	T1566 Phishing	efcc2d73-2c63-43c7-9c82-2c2af9ea9a9f	b741c818-a15a-4fd4-b5ce-d92e9235e852	ebd7404f-d9cc-41ad-9c75-384026a7aff9	26	72	{phishing,open}	{"assetName": "Appointment API", "threatActor": "Play", "detectionRule": "MG-5656"}	2026-10-18 13:01:35.413+07	\N	2026-10-29 09:01:35.453529+07	2026-10-29 09:01:35.453529+07
b9ca47a0-2ed9-49f4-ad68-04bd9111979d	Credential stuffing burst on login endpoint	Detection triggered on Admin Workstation (10.30.1.14). Source 185.67.173.117 attributed to North Korea. Correlation confidence 82%.	medium	resolved	EDR	185.67.173.117	North Korea	KP	TA0001 Initial Access	T1566 Phishing	984c6266-0c50-4940-b708-0d243cd16002	20484773-319b-430f-bf71-adbab8001006	\N	35	80	{phishing,resolved}	{"assetName": "Admin Workstation", "threatActor": "Scattered Spider", "detectionRule": "MG-6410"}	2026-10-28 00:01:35.413+07	2026-10-29 12:01:35.413+07	2026-10-29 09:01:35.453817+07	2026-10-29 09:01:35.453817+07
87b80706-fdfb-44ce-9cc8-414e50b79b12	Ransomware note dropped on file share	Detection triggered on Appointment API (10.10.1.20). Source 31.172.143.94 attributed to Indonesia. Correlation confidence 84%.	high	resolved	Cloud Trail	31.172.143.94	Indonesia	ID	TA0040 Impact	T1498 Network Denial of Service	4692d51c-2468-46f0-9747-1e442ba5045c	b741c818-a15a-4fd4-b5ce-d92e9235e852	b7643562-4a3b-4bdc-87f5-ed48f78b9511	69	96	{ddos,resolved}	{"assetName": "Appointment API", "threatActor": "Kimsuky", "detectionRule": "MG-4897"}	2026-10-21 02:01:35.413+07	2026-10-23 05:01:35.413+07	2026-10-29 09:01:35.454079+07	2026-10-29 09:01:35.454079+07
fbce71a3-cb00-4db4-8ba9-833763a0562c	EDR blocked lateral movement attempt	Detection triggered on Email Gateway (10.10.0.25). Source 41.120.121.169 attributed to Russia. Correlation confidence 99%.	critical	open	AI Anomaly Engine	45.187.19.1	Russia	RU	TA0040 Impact	T1498 Network Denial of Service	8bfe3561-d97b-483f-9b6a-b38dd35927c7	90f757b2-99a1-4342-bc1d-16a5a09b35eb	\N	84	71	{ddos,open}	{"assetName": "Email Gateway", "threatActor": "Qakbot", "detectionRule": "MG-9796"}	2026-10-20 00:01:35.413+07	\N	2026-10-29 09:01:35.454382+07	2026-10-29 09:01:35.454382+07
ce51b726-5c46-426b-8d1d-609c9142b5e2	Credential stuffing burst on login endpoint	Detection triggered on Email Gateway (10.10.0.25). Source 77.165.136.67 attributed to Germany. Correlation confidence 71%.	critical	false_positive	IDS	77.165.136.67	Germany	DE	TA0040 Impact	T1498 Network Denial of Service	e288dae9-fb91-454c-afb3-ba078e8b7448	90f757b2-99a1-4342-bc1d-16a5a09b35eb	b8e0c918-6a79-47fb-9dfe-861f198c5550	82	96	{ddos,false_positive}	{"assetName": "Email Gateway", "threatActor": "Play", "detectionRule": "MG-8445"}	2026-10-24 16:01:35.413+07	2026-10-26 05:01:35.413+07	2026-10-29 09:01:35.454701+07	2026-10-29 09:01:35.454701+07
ebb9b1e7-5239-43b0-9a4f-1c58196ba06a	Web shell uploaded to application server	Detection triggered on Telehealth Gateway (10.10.1.44). Source 77.165.136.67 attributed to Germany. Correlation confidence 69%.	high	resolved	AI Anomaly Engine	77.165.136.67	Germany	DE	TA0040 Impact	T1498 Network Denial of Service	e288dae9-fb91-454c-afb3-ba078e8b7448	2e96141d-1615-4b65-9224-7fa73fb6d0c4	473353d6-ee2a-4345-adae-ca12b0fbee38	71	73	{ddos,resolved}	{"assetName": "Telehealth Gateway", "threatActor": "Play", "detectionRule": "MG-4032"}	2026-10-21 22:01:35.413+07	2026-10-23 10:01:35.413+07	2026-10-29 09:01:35.455029+07	2026-10-29 09:01:35.455029+07
6a466834-5e63-4afd-a576-e0d7fdbd6194	Web shell uploaded to application server	Detection triggered on Identity Provider (10.10.8.20). Source 176.117.101.20 attributed to North Korea. Correlation confidence 88%.	medium	investigating	Email Gateway	176.117.101.20	North Korea	KP	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	22d38993-8ff8-4ea8-b7d5-374ed61e9288	d369c839-7416-482f-ba27-4ce4906c7712	\N	49	62	{data-exfiltration,investigating}	{"assetName": "Identity Provider", "threatActor": "Play", "detectionRule": "MG-1815"}	2026-10-19 11:01:35.413+07	\N	2026-10-29 09:01:35.455362+07	2026-10-29 09:01:35.455362+07
b697cde3-aaf5-475e-812c-8704059f3782	Anomalous database dump from EHR	Detection triggered on Imaging PACS (10.20.5.21). Source 37.179.8.81 attributed to United States. Correlation confidence 71%.	high	open	EDR	37.179.8.81	United States	US	TA0002 Execution	T1204 User Execution	77022662-ff41-4734-a96b-d1c7edcee46d	b5ecd570-bfb9-455d-a802-c3031d7de183	dcd2d08a-7310-414d-ae20-09165cb0c384	79	61	{malware,open}	{"assetName": "Imaging PACS", "threatActor": "BlackCat", "detectionRule": "MG-3070"}	2026-10-26 07:01:35.413+07	\N	2026-10-29 09:01:35.455712+07	2026-10-29 09:01:35.455712+07
a3d6a96d-3097-4d64-b6f6-ea4c9a7b363e	Credential stuffing burst on login endpoint	Detection triggered on Kubernetes Cluster (10.10.3.0). Source 185.67.173.117 attributed to North Korea. Correlation confidence 88%.	critical	resolved	SIEM	185.67.173.117	North Korea	KP	TA0001 Initial Access	T1566 Phishing	984c6266-0c50-4940-b708-0d243cd16002	9cf5cbb5-d702-4a86-8c4e-fd5a8db2ed5b	b8e0c918-6a79-47fb-9dfe-861f198c5550	91	71	{phishing,resolved}	{"assetName": "Kubernetes Cluster", "threatActor": "Scattered Spider", "detectionRule": "MG-9104"}	2026-10-20 19:01:35.413+07	2026-10-21 00:01:35.413+07	2026-10-29 09:01:35.456038+07	2026-10-29 09:01:35.456038+07
72cf94e6-433c-43d6-b368-fddaa696385f	Multiple failed logins followed by success	Detection triggered on CI/CD Runner (10.10.6.7). Source 82.205.112.66 attributed to Netherlands. Correlation confidence 65%.	medium	open	Firewall	82.205.112.66	Netherlands	NL	TA0040 Impact	T1498 Network Denial of Service	e7472452-efcd-4651-8727-8549382111f0	e3a86baf-d72f-4d71-8d47-34768a15f739	\N	36	72	{ddos,open}	{"assetName": "CI/CD Runner", "threatActor": "Kimsuky", "detectionRule": "MG-5655"}	2026-10-19 02:01:35.413+07	\N	2026-10-29 09:01:35.456376+07	2026-10-29 09:01:35.456376+07
ba59f763-aa7b-4f3e-8150-f104d83b9ec3	Impossible travel sign-in detected	Detection triggered on VPN Gateway (10.10.0.5). Source 212.224.188.213 attributed to Brazil. Correlation confidence 79%.	high	false_positive	Cloud Trail	62.4.89.63	Brazil	BR	TA0002 Execution	T1204 User Execution	5d5b6be5-2a59-4ce1-b1a1-11d7f1f5e787	33177851-14ab-4ead-ba2a-7445d2b5ba38	dcd2d08a-7310-414d-ae20-09165cb0c384	61	71	{malware,false_positive}	{"assetName": "VPN Gateway", "threatActor": "Qakbot", "detectionRule": "MG-4034"}	2026-10-23 12:01:35.413+07	2026-10-26 03:01:35.413+07	2026-10-29 09:01:35.456681+07	2026-10-29 09:01:35.456681+07
d37d41db-9bbc-4a56-be9f-dff095fc799f	Crypto-mining process observed on workload	Detection triggered on Patient Portal (10.10.1.10). Source 212.253.185.48 attributed to United Kingdom. Correlation confidence 81%.	medium	resolved	Email Gateway	194.179.93.40	United Kingdom	GB	TA0040 Impact	T1496 Resource Hijacking	d619f3b0-23db-4f7d-afbd-cd1f7c439b0e	bcdb679c-53d2-48f1-ad99-e1b949aeeb57	92d776fe-9846-4fa0-b8eb-d4b5318321a0	62	93	{cryptojacking,resolved}	{"assetName": "Patient Portal", "threatActor": "Scattered Spider", "detectionRule": "MG-8438"}	2026-10-25 23:01:35.413+07	2026-10-27 08:01:35.413+07	2026-10-29 09:01:35.457049+07	2026-10-29 09:01:35.457049+07
45962f1c-d988-4757-84f9-c142784266ba	Unauthorised API key usage detected	Detection triggered on VPN Gateway (10.10.0.5). Source 103.81.169.220 attributed to Iran. Correlation confidence 77%.	medium	investigating	EDR	103.81.169.220	Iran	IR	TA0040 Impact	T1486 Data Encrypted for Impact	5255b5db-ce04-4f87-adee-5ab4fc74049a	33177851-14ab-4ead-ba2a-7445d2b5ba38	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	51	95	{ransomware,investigating}	{"assetName": "VPN Gateway", "threatActor": "Volt Typhoon", "detectionRule": "MG-8463"}	2026-10-19 05:01:35.413+07	\N	2026-10-29 09:01:35.457474+07	2026-10-29 09:01:35.457474+07
32ded4e4-ebc2-494b-99ef-14ade42f7ebd	Impossible travel sign-in detected	Detection triggered on VPN Gateway (10.10.0.5). Source 41.175.248.116 attributed to Russia. Correlation confidence 76%.	medium	investigating	Cloud Trail	41.175.248.116	Russia	RU	TA0001 Initial Access	T1195 Supply Chain Compromise	a8f82bee-0959-492d-a0fb-7c6ab92421fb	33177851-14ab-4ead-ba2a-7445d2b5ba38	ebd7404f-d9cc-41ad-9c75-384026a7aff9	65	76	{supply-chain,investigating}	{"assetName": "VPN Gateway", "threatActor": "BlackCat", "detectionRule": "MG-5583"}	2026-10-27 22:01:35.413+07	\N	2026-10-29 09:01:35.457831+07	2026-10-29 09:01:35.457831+07
0f977ac6-ad7f-4d44-8bcf-dd734924a441	Malicious PowerShell encoded command	Detection triggered on DNS Resolver (10.10.0.53). Source 203.83.3.123 attributed to Russia. Correlation confidence 94%.	low	false_positive	AI Anomaly Engine	203.83.3.123	Russia	RU	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	65244449-7ca2-4c2b-a356-87a3773df4a8	f8433530-5580-415e-9f16-41634a70bd47	b8e0c918-6a79-47fb-9dfe-861f198c5550	17	97	{data-exfiltration,false_positive}	{"assetName": "DNS Resolver", "threatActor": "Kimsuky", "detectionRule": "MG-8141"}	2026-10-28 18:01:35.413+07	2026-10-28 21:01:35.413+07	2026-10-29 09:01:35.458218+07	2026-10-29 09:01:35.458218+07
a630dd1f-3a84-41bc-a35d-f37e0aa1d664	Ransomware note dropped on file share	Detection triggered on Medical IoT Gateway (10.20.4.10). Source 5.173.25.30 attributed to Vietnam. Correlation confidence 78%.	high	open	SIEM	5.173.25.30	Vietnam	VN	TA0040 Impact	T1486 Data Encrypted for Impact	179d0c40-b534-462a-91bb-cfd3d007cf78	61d416ee-8bd2-4eb1-b7b8-9bcc722886fa	b7643562-4a3b-4bdc-87f5-ed48f78b9511	68	76	{ransomware,open}	{"assetName": "Medical IoT Gateway", "threatActor": "Play", "detectionRule": "MG-8245"}	2026-10-26 07:01:35.413+07	\N	2026-10-29 09:01:35.458606+07	2026-10-29 09:01:35.458606+07
d67b8176-ff17-4e2d-a108-33648777fe4d	Ransomware note dropped on file share	Detection triggered on SIEM Ingestor (10.10.8.9). Source 77.162.68.58 attributed to Germany. Correlation confidence 61%.	medium	open	IDS	77.162.68.58	Germany	DE	TA0040 Impact	T1498 Network Denial of Service	762d7707-2d0b-44ff-9e25-874a87b37c1c	1d817fd7-6205-4dab-86c6-48beafa0ad78	0b5e95ce-3f2b-4299-9e98-b4885de1043e	35	97	{ddos,open}	{"assetName": "SIEM Ingestor", "threatActor": "Kimsuky", "detectionRule": "MG-5361"}	2026-10-23 11:01:35.413+07	\N	2026-10-29 09:01:35.458951+07	2026-10-29 09:01:35.458951+07
cbaf5587-d277-49fb-a8f1-cadd4b8f1990	Malicious PowerShell encoded command	Detection triggered on VPN Gateway (10.10.0.5). Source 45.82.132.136 attributed to Ukraine. Correlation confidence 80%.	low	resolved	AI Anomaly Engine	45.82.132.136	Ukraine	UA	TA0009 Collection	T1530 Data from Cloud Storage	f573b7b0-367c-4c09-8390-2bd90db5684d	33177851-14ab-4ead-ba2a-7445d2b5ba38	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	30	83	{insider-threat,resolved}	{"assetName": "VPN Gateway", "threatActor": "Turla", "detectionRule": "MG-1734"}	2026-10-20 16:01:35.413+07	2026-10-21 12:01:35.413+07	2026-10-29 09:01:35.459264+07	2026-10-29 09:01:35.459264+07
b5884999-1eaf-4251-a5a9-48de6d43f44f	Phishing email delivered to executive inbox	Detection triggered on Email Gateway (10.10.0.25). Source 91.69.194.52 attributed to Iran. Correlation confidence 71%.	high	resolved	Email Gateway	91.69.194.52	Iran	IR	TA0011 Command and Control	T1071 Application Layer Protocol	ea6101ae-6e04-4397-88e7-25a0155b743f	90f757b2-99a1-4342-bc1d-16a5a09b35eb	ebd7404f-d9cc-41ad-9c75-384026a7aff9	60	87	{c2,resolved}	{"assetName": "Email Gateway", "threatActor": "Anonymous Sudan", "detectionRule": "MG-2483"}	2026-10-24 17:01:35.413+07	2026-10-26 18:01:35.413+07	2026-10-29 09:01:35.459618+07	2026-10-29 09:01:35.459618+07
3c36dc4a-3ef1-45a0-a05e-ddd261698c9c	Data exfiltration to unknown cloud storage	Detection triggered on Patient Portal (10.10.1.10). Source 5.173.25.30 attributed to Vietnam. Correlation confidence 67%.	high	resolved	EDR	5.173.25.30	Vietnam	VN	TA0040 Impact	T1486 Data Encrypted for Impact	179d0c40-b534-462a-91bb-cfd3d007cf78	bcdb679c-53d2-48f1-ad99-e1b949aeeb57	0b5e95ce-3f2b-4299-9e98-b4885de1043e	79	70	{ransomware,resolved}	{"assetName": "Patient Portal", "threatActor": "Play", "detectionRule": "MG-1970"}	2026-10-23 11:01:35.413+07	2026-10-25 20:01:35.413+07	2026-10-29 09:01:35.460027+07	2026-10-29 09:01:35.460027+07
24fe5312-4265-4c53-a564-a9318164a0f6	Data exfiltration to unknown cloud storage	Detection triggered on DNS Resolver (10.10.0.53). Source 102.218.134.190 attributed to Netherlands. Correlation confidence 61%.	high	resolved	Cloud Trail	102.218.134.190	Netherlands	NL	TA0002 Execution	T1204 User Execution	8e06e301-7237-4327-861f-96d15171465d	f8433530-5580-415e-9f16-41634a70bd47	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	72	80	{malware,resolved}	{"assetName": "DNS Resolver", "threatActor": "APT-29", "detectionRule": "MG-9195"}	2026-10-20 12:01:35.413+07	2026-10-21 03:01:35.413+07	2026-10-29 09:01:35.460954+07	2026-10-29 09:01:35.460954+07
8a77a2c5-5314-4cb8-9f70-8c148e3f6873	Suspicious outbound C2 beacon detected	Detection triggered on Mobile API (10.10.1.50). Source 203.160.127.215 attributed to Iran. Correlation confidence 72%.	critical	open	AI Anomaly Engine	203.160.127.215	Iran	IR	TA0040 Impact	T1496 Resource Hijacking	735f0705-801e-4b32-8f08-cf4b80c9b361	43b2d473-a21f-4654-99a4-99de37812bd7	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	91	86	{cryptojacking,open}	{"assetName": "Mobile API", "threatActor": "Mirai", "detectionRule": "MG-2932"}	2026-10-24 23:01:35.413+07	\N	2026-10-29 09:01:35.461286+07	2026-10-29 09:01:35.461286+07
7e295c80-1bf4-4a69-bc94-a1eafb8b5861	Suspicious outbound C2 beacon detected	Detection triggered on Imaging PACS (10.20.5.21). Source 91.69.194.52 attributed to Iran. Correlation confidence 60%.	medium	resolved	IDS	91.69.194.52	Iran	IR	TA0011 Command and Control	T1071 Application Layer Protocol	ea6101ae-6e04-4397-88e7-25a0155b743f	b5ecd570-bfb9-455d-a802-c3031d7de183	473353d6-ee2a-4345-adae-ca12b0fbee38	54	61	{c2,resolved}	{"assetName": "Imaging PACS", "threatActor": "Anonymous Sudan", "detectionRule": "MG-4283"}	2026-10-21 05:01:35.413+07	2026-10-22 13:01:35.413+07	2026-10-29 09:01:35.461606+07	2026-10-29 09:01:35.461606+07
d10ee564-17da-4da3-af32-c6a8b78123bd	EDR blocked lateral movement attempt	Detection triggered on Medical IoT Gateway (10.20.4.10). Source 62.101.194.60 attributed to Romania. Correlation confidence 84%.	medium	open	EDR	41.154.225.86	Romania	RO	TA0001 Initial Access	T1203 Exploitation for Client Execution	c368788b-554f-40bd-84c3-5199428264de	61d416ee-8bd2-4eb1-b7b8-9bcc722886fa	dcd2d08a-7310-414d-ae20-09165cb0c384	57	83	{zero-day,open}	{"assetName": "Medical IoT Gateway", "threatActor": "Emotet", "detectionRule": "MG-4081"}	2026-10-26 18:01:35.413+07	\N	2026-10-29 09:01:35.461922+07	2026-10-29 09:01:35.461922+07
\.


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.api_keys (id, name, key_prefix, key_hash, user_id, scopes, last_used_at, expires_at, revoked, created_at, updated_at) FROM stdin;
83c0998d-668a-4bbb-b7ad-8d6276eb38da	n8n automation	mg_live_n8n	hash-n8n-automation	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	{alerts:write,incidents:write,ai:use}	2026-10-29 09:01:35.692+07	2027-04-27 09:01:35.692+07	f	2026-10-29 09:01:35.692301+07	2026-10-29 09:01:35.692301+07
6827fc90-9ff2-4bc1-8762-d58200d1a6b9	Grafana read-only	mg_live_graf	hash-grafana-read	0b5e95ce-3f2b-4299-9e98-b4885de1043e	{read}	2026-10-29 07:01:35.692+07	2027-01-27 09:01:35.692+07	f	2026-10-29 09:01:35.692775+07	2026-10-29 09:01:35.692775+07
c3362a27-42e7-4189-b01b-773270c99458	Legacy SIEM bridge	mg_legacy_siem	hash-legacy-siem	92d776fe-9846-4fa0-b8eb-d4b5318321a0	{read}	2026-09-14 09:01:35.692+07	2026-10-24 09:01:35.692+07	t	2026-10-29 09:01:35.693018+07	2026-10-29 09:01:35.693018+07
\.


--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.assets (id, name, type, category, hostname, ip_address, mac_address, os, owner_id, department, location, criticality, status, risk_score, tags, last_seen, metadata, created_at, updated_at) FROM stdin;
bcdb679c-53d2-48f1-ad99-e1b949aeeb57	Patient Portal	web_server	Web	portal.medicareguard.io	10.10.1.10	02:42:3d:35:92:f8	Ubuntu 24.04	ebd7404f-d9cc-41ad-9c75-384026a7aff9	Security Operations	eu-west-1	critical	online	83	{security-operations,web_server}	2026-10-28 00:01:35.378+07	{}	2026-10-29 09:01:35.379211+07	2026-10-29 09:01:35.379211+07
920f61f5-9de0-4850-9cd1-99e0ba05365f	EHR Database	database	Data	ehr-db-01.medicareguard.io	10.10.2.11	02:42:ad:d0:13:da	PostgreSQL 16	ebd7404f-d9cc-41ad-9c75-384026a7aff9	Clinical Systems	on-prem-dc1	critical	online	95	{clinical-systems,database}	2026-10-27 23:01:35.378+07	{}	2026-10-29 09:01:35.379972+07	2026-10-29 09:01:35.379972+07
b741c818-a15a-4fd4-b5ce-d92e9235e852	Appointment API	api_gateway	API	api.medicareguard.io	10.10.1.20	02:42:5d:32:e2:3a	Node.js 20	92d776fe-9846-4fa0-b8eb-d4b5318321a0	Infrastructure	us-east-1	high	offline	67	{infrastructure,api_gateway}	2026-10-26 09:01:35.378+07	{}	2026-10-29 09:01:35.380382+07	2026-10-29 09:01:35.380382+07
c7fa215a-4985-4506-8c4e-b868df428c13	Billing Service	web_server	Finance	billing.medicareguard.io	10.10.1.30	02:42:80:2d:9c:b6	Java 21	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	Finance	ap-southeast-1	high	online	73	{finance,web_server}	2026-10-26 22:01:35.378+07	{}	2026-10-29 09:01:35.380746+07	2026-10-29 09:01:35.380746+07
9cf5cbb5-d702-4a86-8c4e-fd5a8db2ed5b	Kubernetes Cluster	kubernetes	Platform	eks-prod.medicareguard.io	10.10.3.0	02:42:3c:9d:77:aa	EKS 1.30	0b5e95ce-3f2b-4299-9e98-b4885de1043e	Infrastructure	on-prem-dc1	critical	online	76	{infrastructure,kubernetes}	2026-10-27 23:01:35.378+07	{}	2026-10-29 09:01:35.381096+07	2026-10-29 09:01:35.381096+07
33177851-14ab-4ead-ba2a-7445d2b5ba38	VPN Gateway	vpn	Network	vpn.medicareguard.io	10.10.0.5	02:42:b1:34:a9:94	FortiOS 7.4	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	Network Engineering	on-prem-dc2	critical	online	61	{network-engineering,vpn}	2026-10-28 01:01:35.378+07	{}	2026-10-29 09:01:35.381436+07	2026-10-29 09:01:35.381436+07
61d416ee-8bd2-4eb1-b7b8-9bcc722886fa	Medical IoT Gateway	iot	IoT	iot-gw-01.medicareguard.io	10.20.4.10	02:42:d0:68:af:c8	Embedded Linux	92d776fe-9846-4fa0-b8eb-d4b5318321a0	Clinical Systems	us-east-1	high	online	35	{clinical-systems,iot}	2026-10-28 16:01:35.378+07	{}	2026-10-29 09:01:35.38176+07	2026-10-29 09:01:35.38176+07
b5ecd570-bfb9-455d-a802-c3031d7de183	Imaging PACS	medical_device	Clinical	pacs-01.medicareguard.io	10.20.5.21	02:42:6d:51:39:cc	Windows Server 2022	92d776fe-9846-4fa0-b8eb-d4b5318321a0	Clinical Systems	eu-west-1	critical	online	62	{clinical-systems,medical_device}	2026-10-28 17:01:35.378+07	{}	2026-10-29 09:01:35.382133+07	2026-10-29 09:01:35.382133+07
2a35cce6-c390-4c27-9c0d-84d30320c2cd	Pharmacy Database	database	Data	pharmacy-db.medicareguard.io	10.10.2.14	02:42:de:13:ec:50	MySQL 8.4	b8e0c918-6a79-47fb-9dfe-861f198c5550	Clinical Systems	on-prem-dc2	high	online	63	{clinical-systems,database}	2026-10-27 05:01:35.378+07	{}	2026-10-29 09:01:35.382524+07	2026-10-29 09:01:35.382524+07
20484773-319b-430f-bf71-adbab8001006	Admin Workstation	workstation	Endpoint	adm-ws-14.medicareguard.io	10.30.1.14	02:42:4b:ca:e0:68	macOS 15	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	Security Operations	eu-west-1	medium	offline	18	{security-operations,workstation}	2026-10-29 06:01:35.378+07	{}	2026-10-29 09:01:35.382896+07	2026-10-29 09:01:35.382896+07
e3a86baf-d72f-4d71-8d47-34768a15f739	CI/CD Runner	ci_cd	Platform	runner-07.medicareguard.io	10.10.6.7	02:42:8b:71:27:9d	Ubuntu 24.04	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	Infrastructure	eu-west-1	high	online	40	{infrastructure,ci_cd}	2026-10-27 10:01:35.379+07	{}	2026-10-29 09:01:35.383233+07	2026-10-29 09:01:35.383233+07
90f757b2-99a1-4342-bc1d-16a5a09b35eb	Email Gateway	email	Network	mail.medicareguard.io	10.10.0.25	02:42:1b:9c:11:3a	Proofpoint	0b5e95ce-3f2b-4299-9e98-b4885de1043e	Security Operations	on-prem-dc2	high	online	49	{security-operations,email}	2026-10-27 15:01:35.379+07	{}	2026-10-29 09:01:35.383542+07	2026-10-29 09:01:35.383542+07
578335bf-e75d-4878-89dc-12dc1f443613	Backup Vault	storage	Data	vault.medicareguard.io	10.10.7.4	02:42:94:5c:5b:ea	Veeam	92d776fe-9846-4fa0-b8eb-d4b5318321a0	Infrastructure	on-prem-dc1	critical	offline	80	{infrastructure,storage}	2026-10-26 13:01:35.379+07	{}	2026-10-29 09:01:35.383964+07	2026-10-29 09:01:35.383964+07
1d817fd7-6205-4dab-86c6-48beafa0ad78	SIEM Ingestor	siem	Security	siem-ingest.medicareguard.io	10.10.8.9	02:42:a8:c7:e2:22	Elastic 8.15	0b5e95ce-3f2b-4299-9e98-b4885de1043e	Security Operations	on-prem-dc2	high	offline	55	{security-operations,siem}	2026-10-28 23:01:35.379+07	{}	2026-10-29 09:01:35.384337+07	2026-10-29 09:01:35.384337+07
2e96141d-1615-4b65-9224-7fa73fb6d0c4	Telehealth Gateway	gateway	Clinical	telehealth.medicareguard.io	10.10.1.44	02:42:f5:9d:23:86	Go 1.23	dcd2d08a-7310-414d-ae20-09165cb0c384	Clinical Systems	on-prem-dc2	high	online	78	{clinical-systems,gateway}	2026-10-28 09:01:35.379+07	{}	2026-10-29 09:01:35.38473+07	2026-10-29 09:01:35.38473+07
f8433530-5580-415e-9f16-41634a70bd47	DNS Resolver	dns	Network	dns.medicareguard.io	10.10.0.53	02:42:51:4a:bf:c4	BIND 9.20	b8e0c918-6a79-47fb-9dfe-861f198c5550	Network Engineering	on-prem-dc1	medium	online	24	{network-engineering,dns}	2026-10-29 02:01:35.379+07	{}	2026-10-29 09:01:35.385115+07	2026-10-29 09:01:35.385115+07
d369c839-7416-482f-ba27-4ce4906c7712	Identity Provider	identity	Security	idp.medicareguard.io	10.10.8.20	02:42:50:e3:a0:82	Keycloak 26	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	Security Operations	ap-southeast-1	critical	online	84	{security-operations,identity}	2026-10-28 12:01:35.379+07	{}	2026-10-29 09:01:35.385499+07	2026-10-29 09:01:35.385499+07
43b2d473-a21f-4654-99a4-99de37812bd7	Mobile API	api_gateway	API	mobile-api.medicareguard.io	10.10.1.50	02:42:8e:bf:26:ee	Node.js 20	92d776fe-9846-4fa0-b8eb-d4b5318321a0	Data Platform	us-east-1	high	maintenance	52	{data-platform,api_gateway}	2026-10-28 14:01:35.379+07	{}	2026-10-29 09:01:35.385819+07	2026-10-29 09:01:35.385819+07
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.audit_logs (id, actor_id, actor_email, action, resource, resource_id, ip_address, user_agent, details, created_at, updated_at) FROM stdin;
572b15e4-3db0-485e-8278-2e27f2d2735d	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	login	incidents	82c48220-0a27-44ac-9cc7-cd4301a07881	185.51.238.29	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-27 11:01:35.536+07	2026-10-29 09:01:35.536949+07
03145204-809d-4c15-a289-3cc04c98f7ee	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	permissions_change	settings	3f663ba3-7fcd-46f7-9c3d-202a7ac4ca6c	41.225.69.26	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-24 15:01:35.536+07	2026-10-29 09:01:35.53754+07
8774a8e0-0992-46d8-bc77-067e77ca6931	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	export	incidents	4d1fff4d-27b3-4d5a-be6d-a2a96dcb9e35	77.118.11.20	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-24 19:01:35.536+07	2026-10-29 09:01:35.537775+07
694395e0-1e89-4d10-89e2-815a381879a7	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	permissions_change	users	a0613b2e-9bc7-43e3-b3f8-fbbab11ffb98	45.92.89.103	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-26 09:01:35.536+07	2026-10-29 09:01:35.537997+07
81101d82-96a3-4fc0-bbe8-d5bc5d4271b7	9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	export	settings	ce1164bd-c6e7-417a-8a4d-534b4af75854	203.114.17.183	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-28 00:01:35.536+07	2026-10-29 09:01:35.538215+07
be83a0bf-5f3b-40ec-936a-04969fdc4dda	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	update	users	c28d1e67-fd0f-4c5d-ae41-bbfbea1607b2	102.141.212.90	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-26 00:01:35.536+07	2026-10-29 09:01:35.538403+07
8e41ac34-bd1b-4968-a619-e2931150e824	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	export	incidents	f5ed312c-fb22-4f9e-b930-8fa6f1c7026c	77.7.226.128	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-19 04:01:35.536+07	2026-10-29 09:01:35.538606+07
ce248bce-b2ac-4cfb-b1c8-baa28b9eed19	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	create	users	535020d9-db3c-4cc1-a1e9-efe0a405f984	41.186.65.143	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-19 20:01:35.536+07	2026-10-29 09:01:35.538798+07
46ba41ae-752a-4abb-b264-e2d3c81af21b	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	export	alerts	dc4ad5fd-27d4-42b3-bf81-6f02c3434ae9	203.21.238.110	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-27 11:01:35.536+07	2026-10-29 09:01:35.539004+07
f17db920-3d50-46f9-ba91-d1c5c73c72c2	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	export	assets	6465e40b-1a08-4337-a67e-8112fdff7451	181.11.102.7	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-27 16:01:35.536+07	2026-10-29 09:01:35.539259+07
6a6aaac4-3e71-40b8-987d-246f9387944a	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	permissions_change	users	d3170ea7-903b-4d89-9016-9a2d6091126b	203.1.140.213	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-25 06:01:35.536+07	2026-10-29 09:01:35.539491+07
45a67c03-3ed8-430b-883e-4493e50ac78c	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	permissions_change	assets	8447ecd4-7623-48f0-a58c-73ef2e2c523d	91.72.22.253	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-19 15:01:35.536+07	2026-10-29 09:01:35.539696+07
a6a80484-5a85-4919-8315-fff05f6be376	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	permissions_change	alerts	8a503092-6d68-4e54-9b6c-f43fcdd916f7	109.144.21.2	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-16 20:01:35.536+07	2026-10-29 09:01:35.539924+07
9ca4490c-1874-4ef9-a9e3-51d44f1b92c5	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	update	users	c9fc2676-f664-48fb-b34e-60b85c081965	203.41.222.76	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-28 17:01:35.536+07	2026-10-29 09:01:35.540116+07
019084de-68fa-4db2-b1fe-3636a8a16a80	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	update	roles	db0c53fa-8aa0-4fe9-bd4c-3e5096dd5bbf	77.39.75.226	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-24 11:01:35.536+07	2026-10-29 09:01:35.540322+07
a37f2db9-355a-469e-a77d-1e37afd088ab	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	create	reports	00dc2e3d-fbac-4ef0-b827-1fa26f3f23b5	77.67.203.170	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-28 23:01:35.536+07	2026-10-29 09:01:35.540501+07
564af9ea-98d8-441a-9058-19481d49408c	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	permissions_change	incidents	162e4925-5bfd-4575-bd83-284f55a37186	109.86.179.253	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-28 20:01:35.536+07	2026-10-29 09:01:35.540703+07
e1e5e350-33b4-42f4-a59a-8ef8d7cb2698	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	export	incidents	315f30dc-187f-44ec-817f-b64805a541a8	77.41.217.106	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-24 14:01:35.536+07	2026-10-29 09:01:35.540889+07
410e49cf-0b5c-4ac8-84f1-ea70a9e47444	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	delete	settings	8619b2fc-398c-4ee8-97e5-4fc46dd7d9a4	45.204.144.85	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-22 17:01:35.536+07	2026-10-29 09:01:35.5411+07
e6b4fd61-415b-4e3f-88f8-8d7de8b86a10	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	login	roles	21cac325-b95c-430e-a9ee-17b287b7bb29	62.185.237.5	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-21 20:01:35.536+07	2026-10-29 09:01:35.541295+07
77bfda20-ff98-4631-8bd4-989ad3a57f2d	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	create	alerts	1c88b512-f7d3-4587-901f-08e92f2c91d2	31.105.212.247	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-18 05:01:35.536+07	2026-10-29 09:01:35.541479+07
9dcc936f-56d0-4cf7-82eb-27fbddd61c0f	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	export	roles	0d3c8890-101d-4903-b3e5-745b8856ac45	31.151.15.163	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-23 09:01:35.536+07	2026-10-29 09:01:35.541671+07
03ca2510-dabe-408b-9519-b9a8e0c27911	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	permissions_change	users	d9315623-5270-4bd3-b70d-cd7cff344621	31.54.121.5	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-28 23:01:35.536+07	2026-10-29 09:01:35.541862+07
22a962f7-6f1e-4f73-a52a-c91c7f36a6c9	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	delete	users	bba79a44-04dc-4d73-8e3d-036db268c6d6	203.140.120.90	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-27 21:01:35.536+07	2026-10-29 09:01:35.542054+07
3c5d05e9-b0a4-4174-90c8-04d46c9650b9	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	permissions_change	users	9c22b648-68b7-4a1d-92d9-a161cae86fcb	102.186.13.132	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-27 05:01:35.536+07	2026-10-29 09:01:35.542244+07
154d7d89-a63b-4c1f-8391-5837a5980e2e	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	login	users	5f22edeb-0950-497e-8c98-fada6df80043	103.137.220.239	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-19 00:01:35.536+07	2026-10-29 09:01:35.542438+07
850d60aa-5c20-4383-8477-00494c6282c4	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	permissions_change	settings	57e8720a-380f-4839-99ba-02b84a1361f9	203.225.63.80	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-16 21:01:35.536+07	2026-10-29 09:01:35.54267+07
16d5fe8c-34bd-4956-8eb4-582eb7bebbd2	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	delete	assets	a54c3bcc-2005-49d0-a662-02e47d557039	82.183.185.167	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-16 16:01:35.536+07	2026-10-29 09:01:35.542847+07
845fa966-19c9-4c79-981e-e14d46297537	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	update	reports	fa74e857-f7f7-4610-b1cd-00dff67975b6	176.141.36.238	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-13 13:01:35.536+07	2026-10-29 09:01:35.543047+07
ed01ba81-52a1-4e38-a098-20d4d6a5c2c2	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	delete	reports	74c3d8f6-8fdb-4e0f-be44-b70ec7362e39	62.145.251.46	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-14 17:01:35.536+07	2026-10-29 09:01:35.543224+07
802b9def-31ba-4b83-bbd2-8844c3b78139	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	login	alerts	fd33d342-539f-448d-9799-5f04f45b8003	82.10.72.10	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-28 17:01:35.536+07	2026-10-29 09:01:35.543437+07
570b23df-2a41-4fd8-953d-f398a6ff72ae	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	export	alerts	93bb2e94-8624-4a1a-8797-409756a801e4	41.24.237.73	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-26 09:01:35.536+07	2026-10-29 09:01:35.543652+07
bb37f70d-ca66-4543-8b4f-b6165e034f16	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	export	users	4812a57d-82a5-40b7-9db0-076f7b4aa264	91.255.172.143	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-17 02:01:35.536+07	2026-10-29 09:01:35.543837+07
2c57003b-fc72-425d-bf9a-4660c04942de	9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	login	assets	7b1e2bec-28f9-4fd8-9eed-2b64b244b344	109.45.149.24	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-16 07:01:35.536+07	2026-10-29 09:01:35.544024+07
31cb60c3-2a24-4a9c-a3ef-a39a1488a045	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	delete	settings	1a62893e-46f8-402b-ae1b-0ed0dc9a99e8	102.37.170.202	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-28 13:01:35.536+07	2026-10-29 09:01:35.54422+07
297da83b-04f3-46e7-a744-937006f9cf73	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	permissions_change	settings	5a62ae6c-adde-488a-8135-11a101b0e5f9	109.41.150.130	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-25 11:01:35.536+07	2026-10-29 09:01:35.544407+07
d37012a6-a010-4489-b92a-ed0cc6402fb8	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	create	incidents	f3dca22a-eee1-47b6-952b-c093c93ef975	80.170.81.11	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-15 10:01:35.536+07	2026-10-29 09:01:35.544661+07
013a7953-9155-46a5-831f-4747c0ee8851	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	permissions_change	incidents	3dba4744-b822-4658-9931-9a72e3769cb6	109.56.204.201	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-23 22:01:35.536+07	2026-10-29 09:01:35.544849+07
9f69aff1-ad46-4054-bbb5-e4633b3c2ec5	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	create	reports	8e4da1c8-9320-40a6-a9ae-c7425ff79a26	181.87.71.67	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-28 23:01:35.536+07	2026-10-29 09:01:35.54507+07
efedb26f-660a-459c-bc4a-eec96e9f0f63	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	update	settings	60b0e6d4-987a-4014-9f44-ecefd148eda4	82.18.163.179	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-18 20:01:35.536+07	2026-10-29 09:01:35.545297+07
9b456ba4-d619-4ecc-a0f7-0007b52646ae	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	permissions_change	assets	1e38042c-ba1d-4e63-a37b-618a4b6a72e6	82.128.161.103	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-13 11:01:35.536+07	2026-10-29 09:01:35.545472+07
d228abf8-cb6f-4286-8667-5e7e113e7815	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	create	users	201a4fc8-ef94-4b72-9ebe-8da28f144577	103.165.129.130	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-27 18:01:35.536+07	2026-10-29 09:01:35.545657+07
8a227bc9-36f2-476d-912f-ebdb5c118494	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	create	users	6d51c70f-ef34-4c7c-8d4c-dd7d117439a8	5.118.135.230	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-14 03:01:35.536+07	2026-10-29 09:01:35.545841+07
6a5746e9-ddaf-48ae-9aac-d9ccd0435f8f	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	update	reports	a1605372-cdda-4259-a513-aad8520a904a	45.117.53.37	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-23 07:01:35.536+07	2026-10-29 09:01:35.546047+07
f0a3a052-18d0-4e6c-8985-48ff01d97b16	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	export	incidents	79591415-a008-48c3-aa64-3bd8db588612	89.70.2.57	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-25 02:01:35.536+07	2026-10-29 09:01:35.546251+07
50329604-f6c3-4b1f-8433-f1ba314d9713	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	update	assets	426c71c1-11b0-4ac4-994a-69b3da15f9ee	185.194.179.244	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-24 13:01:35.536+07	2026-10-29 09:01:35.546454+07
8c2e3257-7c58-455d-a581-ddc7a08cd889	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	create	roles	d9c0604a-c70b-4672-a4fc-00cc321d846e	176.42.29.170	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-23 19:01:35.536+07	2026-10-29 09:01:35.546634+07
43afa3f7-81f7-4764-bafd-fb1bd8dd85b6	dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	update	assets	31b8841a-8029-4a2f-a299-d15ae5beb2ab	45.169.14.12	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-15 09:01:35.536+07	2026-10-29 09:01:35.546807+07
11f9bc8c-0a5d-4ae2-94e5-1ad49b40a04a	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	export	alerts	40b6b4fb-63cd-4c14-b84b-4073949730e2	176.107.7.208	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-14 10:01:35.536+07	2026-10-29 09:01:35.547021+07
c355afb7-9c3b-4ece-8f9e-e31d0b42b241	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	delete	alerts	31f309ca-c6a8-4690-8489-933ae1208658	82.69.80.44	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-26 05:01:35.536+07	2026-10-29 09:01:35.547219+07
0a9b50ba-2927-4d2b-9c92-f29965ecfb96	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	create	incidents	cd3d92de-cdd0-4e7e-bf4f-83ee3edb4c80	212.194.119.164	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-28 13:01:35.536+07	2026-10-29 09:01:35.547406+07
83f8825e-d71e-4a98-abfd-8febc4be1d54	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	delete	settings	54e074a9-e224-4823-a6ef-d09fac5f9711	77.190.105.215	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-26 09:01:35.536+07	2026-10-29 09:01:35.547645+07
8eeac1a3-694d-47ab-b9e5-f600e8c6e145	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	permissions_change	assets	b7346334-67a3-40e4-91c7-64a332a6b4b4	109.74.225.226	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-28 20:01:35.536+07	2026-10-29 09:01:35.54787+07
2a8815f4-6af1-4ea7-8155-f855ce1fad4a	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	export	incidents	4d379cf9-cc0f-42f5-9e21-e5bedadd0252	212.6.253.148	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-27 03:01:35.536+07	2026-10-29 09:01:35.548095+07
57264655-7a60-4462-b2fd-6f4864a032c9	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	delete	settings	493affc2-d59a-4e9b-b3f4-0967ed764108	176.41.139.49	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-18 06:01:35.536+07	2026-10-29 09:01:35.548274+07
a2dc58ae-5883-43f1-a360-b25bd2529229	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	permissions_change	alerts	4e37426d-81dd-472a-a155-7bd83b2dcc33	77.76.148.104	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-21 03:01:35.536+07	2026-10-29 09:01:35.548468+07
584418bd-311c-4db9-9857-792fc58cfef7	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	permissions_change	reports	f40e0c2f-ef68-4938-82c5-c6ee4f0f45f5	194.49.174.94	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-13 20:01:35.536+07	2026-10-29 09:01:35.548654+07
2ca4efdd-7db3-4a65-bf03-4d3d5f07ec81	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	delete	alerts	8d76bdc5-a9a1-41b5-b4b4-08cbf3a5700b	89.206.215.234	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-15 20:01:35.536+07	2026-10-29 09:01:35.548847+07
9d2e96da-0a2a-4cc1-96a1-7acc46f22601	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	permissions_change	alerts	c90e0086-0a23-4cd9-966a-587ece0457d7	212.206.108.76	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-28 21:01:35.536+07	2026-10-29 09:01:35.549088+07
04a66fef-26bc-465c-aedd-030b357a541c	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	login	reports	d0827f64-1849-45f4-af1e-6f1f8b3c30b2	203.143.214.2	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-24 14:01:35.536+07	2026-10-29 09:01:35.549294+07
411b9000-5a35-4ea2-962b-f66cef9346ec	92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	login	reports	417b44fe-dbfb-43a0-ba3e-3ca10d1381ae	176.166.140.101	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-22 16:01:35.536+07	2026-10-29 09:01:35.549491+07
3407af71-0a5e-40aa-8258-1e39524789d2	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	login	assets	4cda41ce-82fa-4a89-904b-565426861fd1	109.135.181.74	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-18 14:01:35.536+07	2026-10-29 09:01:35.549685+07
924ea309-e77f-41ab-80ae-19377088c029	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	delete	incidents	88afe451-7c6c-447e-8717-233c7a108c63	31.248.202.182	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-24 04:01:35.536+07	2026-10-29 09:01:35.549861+07
0caf26a8-e598-4a1b-a1ac-22a524e1b9c1	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	delete	assets	828986f8-28f9-444a-a072-a1f9f589c53b	62.1.200.232	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-25 00:01:35.536+07	2026-10-29 09:01:35.550054+07
de609c64-3cf9-4f0c-a6fa-f16f78cd4b15	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	update	users	daf599f8-b33f-45c2-88a4-eabbe162c39e	203.132.165.91	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-20 07:01:35.536+07	2026-10-29 09:01:35.550247+07
0dc0a4a1-99d5-4ca1-97bd-894357e5a391	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	delete	reports	f5e3cc07-3648-4b3e-a5c9-2b4591be6e1b	203.73.190.188	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-28 04:01:35.536+07	2026-10-29 09:01:35.550437+07
b6fc3354-1b33-433b-af6b-41709f2ade7b	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	permissions_change	assets	c375a40b-3c88-495b-adcf-2a98a3e3ad51	109.145.218.129	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-19 15:01:35.536+07	2026-10-29 09:01:35.550654+07
5c66c9a8-97e3-4852-82f4-563209a08d2d	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	export	settings	7ad4b5ee-4249-4a2f-8d36-5800f95a6e6e	77.36.243.37	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-23 05:01:35.536+07	2026-10-29 09:01:35.550846+07
0902cc6e-f862-4b2e-bd40-1915ad62841d	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	delete	alerts	2b8953a8-ca87-4587-9fb7-f82419e18bf8	102.241.99.85	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-26 18:01:35.536+07	2026-10-29 09:01:35.551054+07
81b91792-a402-4ca9-bd5c-3ad04dc38f18	b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	update	reports	996bcacd-ca0f-4dff-bee0-94f32c43da14	109.34.73.173	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-28 14:01:35.536+07	2026-10-29 09:01:35.551233+07
fa74deed-5686-41c5-a7e1-7e6d2bb72bad	473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	login	incidents	8e53a86b-6591-428e-9036-0505aaee5973	37.16.253.173	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-17 01:01:35.536+07	2026-10-29 09:01:35.551433+07
b57d4af2-e4e0-4622-bac9-04918a531e5c	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	create	settings	97794b2c-5dde-431d-aae3-21920d1a2a45	194.115.159.233	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-22 01:01:35.536+07	2026-10-29 09:01:35.55163+07
65dd8428-75b7-45ca-94d0-fa703889d3a2	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	update	settings	18af355e-dcc6-4532-9b5b-9979dc1f2029	89.133.199.35	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-14 22:01:35.536+07	2026-10-29 09:01:35.551825+07
8a97ddfd-24a6-48ca-9823-850a0beb12cf	b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	export	alerts	50c63eb8-60bc-423a-a9e6-e4704f1668f0	194.201.228.248	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-26 15:01:35.536+07	2026-10-29 09:01:35.552171+07
aa5514f6-0b17-4934-8076-7f33adf71292	b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	export	reports	5ce48ec7-9e78-4aef-b434-a61dfd91d62e	109.96.127.72	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-23 19:01:35.536+07	2026-10-29 09:01:35.552403+07
49b09d5b-a878-4d1f-b98f-fd134d87874c	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	permissions_change	incidents	6ae62ca8-a45e-4173-b63f-940c3c7c429e	41.82.123.210	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-28 12:01:35.536+07	2026-10-29 09:01:35.552581+07
ebc4b8f7-875f-40c1-94f7-8228644e0812	0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	update	settings	275c1830-da23-4c21-88e2-50c34b97e6be	5.41.183.174	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-25 22:01:35.536+07	2026-10-29 09:01:35.552753+07
3299be8a-d9b9-488f-90e3-7ffcfbd03f22	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	create	roles	bccec11b-82f5-4458-8c0c-1ca42e821526	77.84.12.116	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-23 12:01:35.536+07	2026-10-29 09:01:35.552937+07
96eaec5c-0ea4-410c-9239-c0f7adc9f90b	ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	delete	roles	2e46da7e-5047-42a2-9d97-61e38d014b65	80.206.171.49	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-16 12:01:35.536+07	2026-10-29 09:01:35.553139+07
95c5f5a9-2e20-4b51-8586-e25aba70ca40	b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	delete	settings	db7ebbca-4a29-427d-ba0d-15cc12c648e8	62.156.189.236	MedicareGuard-Console/1.0	{"source": "console"}	2026-10-26 23:01:35.536+07	2026-10-29 09:01:35.553354+07
\.


--
-- Data for Name: cases; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.cases (id, title, status, severity, owner_id, incident_id, summary, metadata, created_at, updated_at) FROM stdin;
d8a13bb9-8d88-430b-8660-f0ccf48ba0fa	Investigation · Malicious OAuth application consent	investigating	medium	b7643562-4a3b-4bdc-87f5-ed48f78b9511	fff7c1ec-5327-4248-bfe7-83ee1fa0232a	Case opened to correlate telemetry and preserve evidence across affected systems.	{}	2026-10-29 09:01:35.571479+07	2026-10-29 09:01:35.571479+07
e97a64bc-6521-4945-a6e3-16a7201b33b9	Investigation · Supply chain package compromise	closed	high	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	7ef58faf-fd03-4abc-a6b7-2fd32580548c	Case opened to correlate telemetry and preserve evidence across affected systems.	{}	2026-10-29 09:01:35.572107+07	2026-10-29 09:01:35.572107+07
fbd40b5d-e011-47b1-9a7c-34e68ea6a099	Investigation · Malicious OAuth application consent	investigating	high	b8e0c918-6a79-47fb-9dfe-861f198c5550	d459f47f-aa33-4f35-9370-859f923a2fab	Case opened to correlate telemetry and preserve evidence across affected systems.	{}	2026-10-29 09:01:35.572357+07	2026-10-29 09:01:35.572357+07
fd62703f-e5d9-4b3c-8024-832fb6c8ac39	Investigation · Suspected ransomware on clinical file server	closed	low	0b5e95ce-3f2b-4299-9e98-b4885de1043e	f0832fce-d281-4618-9cab-946e6b0a7252	Case opened to correlate telemetry and preserve evidence across affected systems.	{}	2026-10-29 09:01:35.57263+07	2026-10-29 09:01:35.57263+07
4b0d19d5-8c2b-45cf-b709-b9d0d1860268	Investigation · Telehealth API abuse	investigating	low	473353d6-ee2a-4345-adae-ca12b0fbee38	53660727-417e-46bf-ae7a-25ae501d116c	Case opened to correlate telemetry and preserve evidence across affected systems.	{}	2026-10-29 09:01:35.572882+07	2026-10-29 09:01:35.572882+07
f18f1b80-e4a0-48ed-aced-d1da37e9cb62	Investigation · Suspected ransomware on clinical file server	pending_evidence	medium	ebd7404f-d9cc-41ad-9c75-384026a7aff9	68dbbb4f-1e8d-4bbd-a481-8c0d9ea86b68	Case opened to correlate telemetry and preserve evidence across affected systems.	{}	2026-10-29 09:01:35.573176+07	2026-10-29 09:01:35.573176+07
3309d87c-c5ca-4af2-a914-b629220a8f66	Investigation · EHR database exfiltration attempt	open	critical	b7643562-4a3b-4bdc-87f5-ed48f78b9511	a01527c1-ee50-4bd0-b9a8-5d8df3b0dcb8	Case opened to correlate telemetry and preserve evidence across affected systems.	{}	2026-10-29 09:01:35.573441+07	2026-10-29 09:01:35.573441+07
554408e1-35e2-4742-b39f-7ae297b856fe	Investigation · Compromised administrator account	investigating	medium	473353d6-ee2a-4345-adae-ca12b0fbee38	b7a58fe5-1fc2-4182-ad89-7f958977aa84	Case opened to correlate telemetry and preserve evidence across affected systems.	{}	2026-10-29 09:01:35.573685+07	2026-10-29 09:01:35.573685+07
8a1b9803-5848-4629-8abf-0cc5bfb377e7	Investigation · Malicious OAuth application consent	investigating	high	0b5e95ce-3f2b-4299-9e98-b4885de1043e	40948a5f-e4dd-4604-85ff-e842aa396d86	Case opened to correlate telemetry and preserve evidence across affected systems.	{}	2026-10-29 09:01:35.573905+07	2026-10-29 09:01:35.573905+07
5ba5bf0b-955e-4d99-a259-927d7da0f594	Investigation · Billing service web shell deployment	open	medium	0b5e95ce-3f2b-4299-9e98-b4885de1043e	725541d5-f947-42b8-8b70-30f673a69a83	Case opened to correlate telemetry and preserve evidence across affected systems.	{}	2026-10-29 09:01:35.574123+07	2026-10-29 09:01:35.574123+07
6d39076a-2fc9-4486-ae5e-b6c947580a9d	Investigation · Billing service web shell deployment	closed	low	473353d6-ee2a-4345-adae-ca12b0fbee38	b18bd51d-eeb2-4b71-b60d-6381be79579d	Case opened to correlate telemetry and preserve evidence across affected systems.	{}	2026-10-29 09:01:35.574325+07	2026-10-29 09:01:35.574325+07
b45f3a68-a5cc-4eb3-a694-4b35dda77706	Investigation · Supply chain package compromise	investigating	medium	dcd2d08a-7310-414d-ae20-09165cb0c384	d780f63c-abe7-4f63-b1c4-3d8d9c9dcb71	Case opened to correlate telemetry and preserve evidence across affected systems.	{}	2026-10-29 09:01:35.574546+07	2026-10-29 09:01:35.574546+07
2817b98f-5e17-4f3a-a201-3563c1e926da	Investigation · Billing service web shell deployment	open	low	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	e914ce78-ab66-4e60-946a-8d1ee11aa166	Case opened to correlate telemetry and preserve evidence across affected systems.	{}	2026-10-29 09:01:35.574776+07	2026-10-29 09:01:35.574776+07
d53ce67b-b81b-457c-ba67-95e7bba6eb5f	Investigation · Supply chain package compromise	closed	critical	b7d93566-607b-41f4-933f-612190e9288b	5fff4780-68d1-4354-a6c0-492bf5e257b2	Case opened to correlate telemetry and preserve evidence across affected systems.	{}	2026-10-29 09:01:35.575005+07	2026-10-29 09:01:35.575005+07
be96c30b-7037-4554-ba4c-b82b9782761a	Investigation · Telehealth API abuse	open	medium	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	33189cec-5ec8-45f2-9b24-8d5a47c662e6	Case opened to correlate telemetry and preserve evidence across affected systems.	{}	2026-10-29 09:01:35.575257+07	2026-10-29 09:01:35.575257+07
8b0b198e-a7c2-426f-8b59-d500151e98ac	Investigation · Supply chain package compromise	investigating	high	dcd2d08a-7310-414d-ae20-09165cb0c384	f4cffd21-6fb7-4d04-a43e-c9a48e69659d	Case opened to correlate telemetry and preserve evidence across affected systems.	{}	2026-10-29 09:01:35.575489+07	2026-10-29 09:01:35.575489+07
86f798f6-74d9-4c35-a1d2-3ee2942ea66c	Investigation · Patient portal credential stuffing campaign	open	medium	b7d93566-607b-41f4-933f-612190e9288b	d0472136-83db-46da-969e-fd7b86cb0da6	Case opened to correlate telemetry and preserve evidence across affected systems.	{}	2026-10-29 09:01:35.575745+07	2026-10-29 09:01:35.575745+07
f3a3ba38-85cd-4424-83f4-25f6fde49afc	Investigation · Insider data access anomaly	pending_evidence	high	b7643562-4a3b-4bdc-87f5-ed48f78b9511	1a4be992-f6c9-4bc6-ad9b-0a379eea556d	Case opened to correlate telemetry and preserve evidence across affected systems.	{}	2026-10-29 09:01:35.576022+07	2026-10-29 09:01:35.576022+07
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.comments (id, resource, resource_id, author_id, body, metadata, created_at, updated_at) FROM stdin;
e7db7074-709f-4d8c-9caa-49aec27f1702	alerts	a8f12fe6-520e-4485-8562-7f64d3c7ca4a	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	Asset owner notified and patching scheduled within SLA.	{}	2026-10-29 09:01:35.657324+07	2026-10-29 09:01:35.657324+07
f7b99462-e5a3-4dfb-822e-e14e5c0ba9f7	incidents	7ef58faf-fd03-4abc-a6b7-2fd32580548c	dcd2d08a-7310-414d-ae20-09165cb0c384	False positive confirmed after reviewing the EDR process tree.	{}	2026-10-29 09:01:35.657763+07	2026-10-29 09:01:35.657763+07
602522a7-abbc-4fbb-92d6-3196a7dffcf9	alerts	943a5842-3fb7-4ac9-a162-0e46937f98e1	b7643562-4a3b-4bdc-87f5-ed48f78b9511	Asset owner notified and patching scheduled within SLA.	{}	2026-10-29 09:01:35.658034+07	2026-10-29 09:01:35.658034+07
69ff6250-46a7-470e-ae1a-f244e583334a	incidents	f0832fce-d281-4618-9cab-946e6b0a7252	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	Asset owner notified and patching scheduled within SLA.	{}	2026-10-29 09:01:35.658261+07	2026-10-29 09:01:35.658261+07
be51494a-aa97-4c89-87cf-962a6345aedb	alerts	f6296dab-540f-4fe3-928c-16eebd4890b7	473353d6-ee2a-4345-adae-ca12b0fbee38	AI analyst suggests blocking the source IP at the edge firewall.	{}	2026-10-29 09:01:35.65848+07	2026-10-29 09:01:35.65848+07
7516da88-2565-4499-b60d-b2ec316a6634	incidents	68dbbb4f-1e8d-4bbd-a481-8c0d9ea86b68	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	Asset owner notified and patching scheduled within SLA.	{}	2026-10-29 09:01:35.658689+07	2026-10-29 09:01:35.658689+07
202311db-a3ba-4394-8cca-756fd983c0ae	alerts	53186fb8-f06a-45d2-b73e-14c0a1e32827	b7643562-4a3b-4bdc-87f5-ed48f78b9511	Containment applied on the affected workload. Monitoring for re-infection.	{}	2026-10-29 09:01:35.658886+07	2026-10-29 09:01:35.658886+07
b6b4a52a-0583-4895-a717-54f52303acb8	incidents	b7a58fe5-1fc2-4182-ad89-7f958977aa84	92d776fe-9846-4fa0-b8eb-d4b5318321a0	Asset owner notified and patching scheduled within SLA.	{}	2026-10-29 09:01:35.659122+07	2026-10-29 09:01:35.659122+07
f3b81797-40bd-4eee-8d24-de1c94708219	alerts	3eb6bcc4-b959-4bb6-9831-7e077c18a3ef	473353d6-ee2a-4345-adae-ca12b0fbee38	Correlated with the latest CTI feed — same infrastructure as the previous campaign.	{}	2026-10-29 09:01:35.659594+07	2026-10-29 09:01:35.659594+07
e04a4b3f-9b60-4af3-a520-38c7d0e1c62c	incidents	725541d5-f947-42b8-8b70-30f673a69a83	b8e0c918-6a79-47fb-9dfe-861f198c5550	Containment applied on the affected workload. Monitoring for re-infection.	{}	2026-10-29 09:01:35.659807+07	2026-10-29 09:01:35.659807+07
4dc558ea-d08e-4960-ae82-7e2d75003d92	alerts	f3db1937-c4c8-4058-b309-1ef287c33f7f	92d776fe-9846-4fa0-b8eb-d4b5318321a0	Containment applied on the affected workload. Monitoring for re-infection.	{}	2026-10-29 09:01:35.66001+07	2026-10-29 09:01:35.66001+07
0fbd4a45-1885-4b8c-85e0-b16ddcbfb98b	incidents	d780f63c-abe7-4f63-b1c4-3d8d9c9dcb71	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	Containment applied on the affected workload. Monitoring for re-infection.	{}	2026-10-29 09:01:35.660224+07	2026-10-29 09:01:35.660224+07
9fae93dd-3ba5-41e7-856d-dda98fdfee41	alerts	a3263b3a-269f-40e1-a78a-9ba18de51fb4	b8e0c918-6a79-47fb-9dfe-861f198c5550	Containment applied on the affected workload. Monitoring for re-infection.	{}	2026-10-29 09:01:35.660414+07	2026-10-29 09:01:35.660414+07
2b3044a0-f603-4ac1-bb53-6ec8b6ba6f31	incidents	5fff4780-68d1-4354-a6c0-492bf5e257b2	473353d6-ee2a-4345-adae-ca12b0fbee38	Evidence attached to the case and timeline updated.	{}	2026-10-29 09:01:35.660601+07	2026-10-29 09:01:35.660601+07
44104358-4058-4d4b-b273-76ac1c7535e6	alerts	dbe97a3a-0c24-4c44-9a6b-8f61fba86e36	b7643562-4a3b-4bdc-87f5-ed48f78b9511	AI analyst suggests blocking the source IP at the edge firewall.	{}	2026-10-29 09:01:35.660779+07	2026-10-29 09:01:35.660779+07
977d1188-0feb-41ac-a7ca-2fe5833fa10b	incidents	f4cffd21-6fb7-4d04-a43e-c9a48e69659d	0b5e95ce-3f2b-4299-9e98-b4885de1043e	Evidence attached to the case and timeline updated.	{}	2026-10-29 09:01:35.660956+07	2026-10-29 09:01:35.660956+07
366354d5-e879-4ba0-9928-821405e1af80	alerts	8e5a6680-c1bb-4468-be54-bbfb2206c36f	92d776fe-9846-4fa0-b8eb-d4b5318321a0	Asset owner notified and patching scheduled within SLA.	{}	2026-10-29 09:01:35.661111+07	2026-10-29 09:01:35.661111+07
a66529be-2744-4127-8e9f-6844650531d8	incidents	1a4be992-f6c9-4bc6-ad9b-0a379eea556d	473353d6-ee2a-4345-adae-ca12b0fbee38	Asset owner notified and patching scheduled within SLA.	{}	2026-10-29 09:01:35.661284+07	2026-10-29 09:01:35.661284+07
473bb28e-8ccc-43af-884c-bb3b6b336929	alerts	d037ee13-47dd-4b56-81e3-30fee4025bcc	b8e0c918-6a79-47fb-9dfe-861f198c5550	Asset owner notified and patching scheduled within SLA.	{}	2026-10-29 09:01:35.661458+07	2026-10-29 09:01:35.661458+07
36b099d1-71eb-4182-beb9-34e78f419025	incidents	114fbfd2-e43f-402c-985f-cb5725019c35	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	Correlated with the latest CTI feed — same infrastructure as the previous campaign.	{}	2026-10-29 09:01:35.661637+07	2026-10-29 09:01:35.661637+07
b5fd6ebe-219a-417d-93ce-2af99eef0179	alerts	b7c7be1b-b5b7-4863-a629-69d6c1f18f60	ebd7404f-d9cc-41ad-9c75-384026a7aff9	Asset owner notified and patching scheduled within SLA.	{}	2026-10-29 09:01:35.661804+07	2026-10-29 09:01:35.661804+07
14056a18-7454-478b-857d-3b980abf7c13	incidents	20231827-14b1-4029-8855-517096e44de7	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	Evidence attached to the case and timeline updated.	{}	2026-10-29 09:01:35.661979+07	2026-10-29 09:01:35.661979+07
3db360cf-4092-4385-bf76-b03ce8df2da3	alerts	1fd29587-5c16-4cea-a77b-01b46e277619	b7d93566-607b-41f4-933f-612190e9288b	Correlated with the latest CTI feed — same infrastructure as the previous campaign.	{}	2026-10-29 09:01:35.662154+07	2026-10-29 09:01:35.662154+07
f8126a58-2ef7-4945-b0c6-5ddd728d425d	incidents	eaa5030f-a55b-4bac-a10c-c3fb3fb9f049	ebd7404f-d9cc-41ad-9c75-384026a7aff9	Evidence attached to the case and timeline updated.	{}	2026-10-29 09:01:35.662325+07	2026-10-29 09:01:35.662325+07
f4808191-5c09-4c94-9cb3-0c8b64482b92	alerts	c2572d74-4b12-4c3a-ac55-e2fe5117c1b8	0b5e95ce-3f2b-4299-9e98-b4885de1043e	Asset owner notified and patching scheduled within SLA.	{}	2026-10-29 09:01:35.662501+07	2026-10-29 09:01:35.662501+07
1234b3bb-0d01-4830-ae7d-4fa93aa5a264	incidents	538c89d4-0fd2-4478-ae01-5e8112fb17bd	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	Asset owner notified and patching scheduled within SLA.	{}	2026-10-29 09:01:35.662677+07	2026-10-29 09:01:35.662677+07
3a108771-d694-4586-a729-e92b43b49f8a	alerts	367d2535-9499-4404-852a-7092cc07efd6	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	Correlated with the latest CTI feed — same infrastructure as the previous campaign.	{}	2026-10-29 09:01:35.662861+07	2026-10-29 09:01:35.662861+07
336d2d6d-9563-4d70-a618-82350c62cdd2	incidents	7ef58faf-fd03-4abc-a6b7-2fd32580548c	473353d6-ee2a-4345-adae-ca12b0fbee38	Containment applied on the affected workload. Monitoring for re-infection.	{}	2026-10-29 09:01:35.663049+07	2026-10-29 09:01:35.663049+07
905b6611-30b5-4ac2-8ff9-0739d302c71a	alerts	1c0f5b0a-1b5b-4348-a2af-aa05055ff869	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	Containment applied on the affected workload. Monitoring for re-infection.	{}	2026-10-29 09:01:35.663231+07	2026-10-29 09:01:35.663231+07
ac370e73-bf0f-429c-9365-e28edfafec24	incidents	f0832fce-d281-4618-9cab-946e6b0a7252	b8e0c918-6a79-47fb-9dfe-861f198c5550	Asset owner notified and patching scheduled within SLA.	{}	2026-10-29 09:01:35.663384+07	2026-10-29 09:01:35.663384+07
41294d47-b45f-47fb-b2a2-e24b553e2c51	alerts	3c577b59-49e4-4f1c-adf1-9b820ab8faf6	92d776fe-9846-4fa0-b8eb-d4b5318321a0	AI analyst suggests blocking the source IP at the edge firewall.	{}	2026-10-29 09:01:35.66355+07	2026-10-29 09:01:35.66355+07
eb2409a3-23c6-43c6-a661-cf40118f0550	incidents	68dbbb4f-1e8d-4bbd-a481-8c0d9ea86b68	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	False positive confirmed after reviewing the EDR process tree.	{}	2026-10-29 09:01:35.663717+07	2026-10-29 09:01:35.663717+07
96a4c0b7-47a1-4dd3-b002-48fbea78a406	alerts	6625e2da-fe2c-4aea-b72f-22c87c88ea3c	ebd7404f-d9cc-41ad-9c75-384026a7aff9	False positive confirmed after reviewing the EDR process tree.	{}	2026-10-29 09:01:35.663878+07	2026-10-29 09:01:35.663878+07
bd76345d-0420-4b63-a306-bf3a55ddfa93	incidents	b7a58fe5-1fc2-4182-ad89-7f958977aa84	dcd2d08a-7310-414d-ae20-09165cb0c384	AI analyst suggests blocking the source IP at the edge firewall.	{}	2026-10-29 09:01:35.664051+07	2026-10-29 09:01:35.664051+07
690962a8-1150-4ae8-a3a7-c230fd029101	alerts	49248028-e690-4339-aa32-105c94e667f7	b7643562-4a3b-4bdc-87f5-ed48f78b9511	Correlated with the latest CTI feed — same infrastructure as the previous campaign.	{}	2026-10-29 09:01:35.664201+07	2026-10-29 09:01:35.664201+07
a26b4982-ff8c-47ad-8d53-2d4c70d4f0cb	incidents	725541d5-f947-42b8-8b70-30f673a69a83	b8e0c918-6a79-47fb-9dfe-861f198c5550	Asset owner notified and patching scheduled within SLA.	{}	2026-10-29 09:01:35.664411+07	2026-10-29 09:01:35.664411+07
\.


--
-- Data for Name: compliance_controls; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.compliance_controls (id, framework, control_id, title, status, score, owner_id, description, metadata, created_at, updated_at) FROM stdin;
f6877941-ba3e-4678-94a8-f01fe879204c	NIST 800-53	AC-2	Account management	compliant	92	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	Automated joiner/mover/leaver controls	{}	2026-10-29 09:01:35.632316+07	2026-10-29 09:01:35.632316+07
5bf8f30e-14d1-4d3b-8357-b860282039f9	NIST 800-53	AU-6	Audit review and reporting	in_progress	78	92d776fe-9846-4fa0-b8eb-d4b5318321a0	Daily audit review with AI summarisation	{}	2026-10-29 09:01:35.632764+07	2026-10-29 09:01:35.632764+07
cdb023ab-933a-4094-83fa-3a0accfc3d1f	NIST 800-53	IR-4	Incident handling	compliant	88	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	Documented IR plan and SOAR playbooks	{}	2026-10-29 09:01:35.632984+07	2026-10-29 09:01:35.632984+07
9eeefc2e-da40-4465-ae79-ca1e18d4b91b	NIST 800-53	SC-7	Boundary protection	compliant	90	b7d93566-607b-41f4-933f-612190e9288b	Segmented perimeter with default deny	{}	2026-10-29 09:01:35.633202+07	2026-10-29 09:01:35.633202+07
6a73666c-ff1e-4c60-94ff-7713725f0229	ISO 27001	A.5.15	Access control	compliant	89	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	RBAC with quarterly reviews	{}	2026-10-29 09:01:35.633405+07	2026-10-29 09:01:35.633405+07
c3931c29-6fa9-4302-9a91-c3a38e289d6c	ISO 27001	A.8.8	Technical vulnerability management	in_progress	74	473353d6-ee2a-4345-adae-ca12b0fbee38	Weekly scanning and SLA tracking	{}	2026-10-29 09:01:35.633616+07	2026-10-29 09:01:35.633616+07
b248c647-63a2-4657-b4ff-f76cc3091c4c	ISO 27001	A.5.24	Incident management planning	compliant	86	92d776fe-9846-4fa0-b8eb-d4b5318321a0	Incident response framework	{}	2026-10-29 09:01:35.633804+07	2026-10-29 09:01:35.633804+07
ee18f9b6-3d2f-4ae6-a327-25219d1d9e72	ISO 27001	A.8.16	Monitoring activities	compliant	93	dcd2d08a-7310-414d-ae20-09165cb0c384	24/7 SOC monitoring	{}	2026-10-29 09:01:35.634016+07	2026-10-29 09:01:35.634016+07
ae887797-2e24-4a4f-b0a0-5ea07f966d1c	HIPAA	164.312(a)(1)	Access control	compliant	91	0b5e95ce-3f2b-4299-9e98-b4885de1043e	Unique user identification and emergency access	{}	2026-10-29 09:01:35.634201+07	2026-10-29 09:01:35.634201+07
2a16a5f0-1d0e-4698-aa2a-b15e84e28a73	HIPAA	164.312(b)	Audit controls	compliant	87	0b5e95ce-3f2b-4299-9e98-b4885de1043e	Audit logging across ePHI systems	{}	2026-10-29 09:01:35.634404+07	2026-10-29 09:01:35.634404+07
2916f8d8-4801-4b0a-8a24-0c171bb8d2fd	HIPAA	164.308(a)(6)	Security incident procedures	in_progress	79	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	Incident procedures under review	{}	2026-10-29 09:01:35.634622+07	2026-10-29 09:01:35.634622+07
a10e4fd9-032f-4af5-b06d-95ac24435879	HIPAA	164.312(e)(1)	Transmission security	compliant	94	b7d93566-607b-41f4-933f-612190e9288b	TLS everywhere, mTLS internal	{}	2026-10-29 09:01:35.634827+07	2026-10-29 09:01:35.634827+07
5563e15a-21f5-4bf7-9c64-6d00dba75550	PCI DSS	1.3	Network access controls	compliant	85	b7d93566-607b-41f4-933f-612190e9288b	Segmentation of CDE	{}	2026-10-29 09:01:35.635021+07	2026-10-29 09:01:35.635021+07
583fad95-cbb4-482a-b28a-848c1508cdcf	PCI DSS	10.2	Audit logging	compliant	88	92d776fe-9846-4fa0-b8eb-d4b5318321a0	Centralised immutable logging	{}	2026-10-29 09:01:35.635206+07	2026-10-29 09:01:35.635206+07
d447da10-9547-460b-8eab-6588eec78407	PCI DSS	6.4	Public-facing web protection	in_progress	72	473353d6-ee2a-4345-adae-ca12b0fbee38	WAF tuning in progress	{}	2026-10-29 09:01:35.635398+07	2026-10-29 09:01:35.635398+07
d3418f90-991a-4a81-baad-7c5d10901a98	PCI DSS	11.3	Penetration testing	compliant	83	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	Annual and post-change tests	{}	2026-10-29 09:01:35.635589+07	2026-10-29 09:01:35.635589+07
\.


--
-- Data for Name: data_sources; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.data_sources (id, name, type, status, endpoint, last_ingest_at, events_count, metadata, created_at, updated_at) FROM stdin;
6eb5aca2-5961-4d2d-bbd1-dd2967020101	CloudTrail	cloud	connected	s3://medicareguard-logs/cloudtrail	2026-10-29 09:01:35.621+07	18429302	{}	2026-10-29 09:01:35.621311+07	2026-10-29 09:01:35.621311+07
6b78dd19-314d-45f0-9553-b782474c11cd	Palo Alto Firewall	syslog	connected	udp://10.10.0.1:514	2026-10-29 09:01:35.621+07	9283742	{}	2026-10-29 09:01:35.621716+07	2026-10-29 09:01:35.621716+07
cbb8acd7-5ef7-400c-ab87-1d64f384b1a8	CrowdStrike Falcon	edr	connected	https://api.crowdstrike.com	2026-10-29 09:01:35.621+07	4829103	{}	2026-10-29 09:01:35.62196+07	2026-10-29 09:01:35.62196+07
b8abc5aa-ed89-4632-9ee5-3eb95c813b60	Office 365 Audit	saas	connected	https://manage.office.com	2026-10-29 08:01:35.621+07	2139841	{}	2026-10-29 09:01:35.622219+07	2026-10-29 09:01:35.622219+07
09e23792-4f30-4e0f-8286-3e2d427b5323	Kubernetes Audit	container	connected	https://eks-prod	2026-10-29 09:01:35.621+07	3829103	{}	2026-10-29 09:01:35.622434+07	2026-10-29 09:01:35.622434+07
1ba2b67d-1f13-4d88-904c-933b0552cc2a	Clinical IoT	iot	degraded	mqtt://iot-broker	2026-10-29 06:01:35.621+07	712830	{}	2026-10-29 09:01:35.622688+07	2026-10-29 09:01:35.622688+07
9f4aed2b-42ef-4fcd-b173-b1127a6dce59	Veeam Backup	backup	connected	https://vault.medicareguard.io	2026-10-29 07:01:35.621+07	19283	{}	2026-10-29 09:01:35.622899+07	2026-10-29 09:01:35.622899+07
0dd80959-e1c2-42d9-ac72-f8a7a049e741	DNS logs	dns	connected	udp://10.10.0.53:53	2026-10-29 09:01:35.621+07	12093842	{}	2026-10-29 09:01:35.623151+07	2026-10-29 09:01:35.623151+07
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.departments (id, name, code, manager_id, description, metadata, created_at, updated_at) FROM stdin;
f93417ca-62c1-4ecc-a1c1-3b7d1bd5ef5b	Security Operations	SOC	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	24/7 security monitoring and incident response	{}	2026-10-29 09:01:35.376395+07	2026-10-29 09:01:35.376395+07
48f0d1cd-131b-48ab-b099-51e00b929a0d	Infrastructure	INFRA	473353d6-ee2a-4345-adae-ca12b0fbee38	Cloud, platform and network engineering	{}	2026-10-29 09:01:35.377046+07	2026-10-29 09:01:35.377046+07
f14ef4d3-0437-4622-82ab-24f925de5add	Clinical Systems	CLIN	b8e0c918-6a79-47fb-9dfe-861f198c5550	EHR, PACS and patient-facing applications	{}	2026-10-29 09:01:35.377417+07	2026-10-29 09:01:35.377417+07
30f4b226-a8ff-4d50-a628-d3f4d75e58a7	Network Engineering	NET	b7d93566-607b-41f4-933f-612190e9288b	Perimeter, VPN and firewall operations	{}	2026-10-29 09:01:35.377718+07	2026-10-29 09:01:35.377718+07
441da51d-e76e-4b1b-a662-7b2136edc246	Compliance	GRC	0b5e95ce-3f2b-4299-9e98-b4885de1043e	Governance, risk and compliance	{}	2026-10-29 09:01:35.378058+07	2026-10-29 09:01:35.378058+07
ad7765eb-8997-42b1-bdfe-54e249d1365f	Data Platform	DATA	dcd2d08a-7310-414d-ae20-09165cb0c384	Analytics, integrations and data protection	{}	2026-10-29 09:01:35.378333+07	2026-10-29 09:01:35.378333+07
\.


--
-- Data for Name: detection_rules; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.detection_rules (id, name, rule_type, severity, status, expression, description, mitre_tactic, metadata, created_at, updated_at) FROM stdin;
af4aafd4-2ca0-4b70-85ad-cb837c815e58	Encoded PowerShell execution	sigma	high	active	Image|endswith: '\\powershell.exe' AND CommandLine|contains: '-enc'	Detects encoded PowerShell	TA0002 Execution	{}	2026-10-29 09:01:35.559887+07	2026-10-29 09:01:35.559887+07
3393e241-dc84-4704-ac8f-d11bf31d5712	Brute force success	sigma	high	active	failed_logins > 10 AND success_within: 5m	Credential access followed by success	TA0006 Credential Access	{}	2026-10-29 09:01:35.56023+07	2026-10-29 09:01:35.56023+07
f4801655-606a-42f2-8f37-9b4f8aabdab8	C2 beacon jitter	kql	critical	active	network_bytes | summarize by dst | where jitter > 0.2	Periodic beaconing detection	TA0011 Command and Control	{}	2026-10-29 09:01:35.560391+07	2026-10-29 09:01:35.560391+07
e79b45d1-56f3-4370-9145-d282d6393b64	Ransomware extension rename	yara	critical	active	$ext = .locked or .encrypted	Mass file rename	TA0040 Impact	{}	2026-10-29 09:01:35.560573+07	2026-10-29 09:01:35.560573+07
e5c888bb-62a6-4a91-840d-1cbeca80109e	Impossible travel	kql	medium	active	geo_distance(login1, login2) / elapsed > 900	Identity anomaly	TA0001 Initial Access	{}	2026-10-29 09:01:35.560734+07	2026-10-29 09:01:35.560734+07
a06c53cd-ddd3-4361-ab0e-f2a0d3050979	Web shell write	sigma	critical	active	file_write | where path contains 'wwwroot' and ext in (php,jsp,aspx)	Web shell drop detection	TA0003 Persistence	{}	2026-10-29 09:01:35.560928+07	2026-10-29 09:01:35.560928+07
942c1199-e24e-4a0c-9ef9-a7ac6dec8ffd	DNS tunnelling	kql	high	active	dns_queries | where length(subdomain) > 40	DNS exfil	TA0010 Exfiltration	{}	2026-10-29 09:01:35.561155+07	2026-10-29 09:01:35.561155+07
99296270-fbaa-4bb3-8070-e42fa443bd7f	LSASS access	sigma	high	active	target_image: lsass.exe AND access: 0x1010	Credential dumping	TA0006 Credential Access	{}	2026-10-29 09:01:35.561352+07	2026-10-29 09:01:35.561352+07
6cc9941c-0e66-44f0-a660-731c99358502	S3 public bucket	kql	medium	testing	storage_acl | where public == true	Cloud misconfiguration	TA0009 Collection	{}	2026-10-29 09:01:35.561548+07	2026-10-29 09:01:35.561548+07
020df8b5-6c0e-4839-8ec3-6e3fd33512e6	Suspicious OAuth consent	kql	high	active	oauth_grant | where scopes contains 'Mail.Read' and app_age < 7d	Consent phishing	TA0001 Initial Access	{}	2026-10-29 09:01:35.561723+07	2026-10-29 09:01:35.561723+07
34a8f716-f2fe-4647-adbb-9f52d2e3b748	Crypto miner process	sigma	medium	active	process | where cmdline contains 'xmrig'	Cryptojacking	TA0040 Impact	{}	2026-10-29 09:01:35.561895+07	2026-10-29 09:01:35.561895+07
c21848fe-9d14-4008-be37-27033df65b3d	Port scan threshold	kql	low	active	connections | summarize dcount(dst_port) by src | where > 100	Reconnaissance	TA0007 Discovery	{}	2026-10-29 09:01:35.562084+07	2026-10-29 09:01:35.562084+07
\.


--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.devices (id, name, type, hostname, ip_address, os, owner_id, status, compliance_status, last_seen, metadata, created_at, updated_at) FROM stdin;
acb05a8b-7a62-4eb7-a244-236b0601f03a	MacBook · SOC 1	tablet	mg-device-001	10.30.11.210	Windows 11	473353d6-ee2a-4345-adae-ca12b0fbee38	online	compliant	2026-10-27 17:01:35.595+07	{}	2026-10-29 09:01:35.595371+07	2026-10-29 09:01:35.595371+07
19dceffc-5f75-46f9-b2af-55f581c75f6c	Windows · Admin 2	workstation	mg-device-002	10.30.3.236	macOS 15	b8e0c918-6a79-47fb-9dfe-861f198c5550	online	compliant	2026-10-28 02:01:35.595+07	{}	2026-10-29 09:01:35.595867+07	2026-10-29 09:01:35.595867+07
038b795d-b6b8-4ab6-9f3c-4c50f8e78123	MacBook · Nursing 3	laptop	mg-device-003	10.30.15.221	iOS 18	92d776fe-9846-4fa0-b8eb-d4b5318321a0	online	non_compliant	2026-10-29 04:01:35.595+07	{}	2026-10-29 09:01:35.596213+07	2026-10-29 09:01:35.596213+07
665c1d7d-9f7c-462c-8bf1-bbb65df02262	ThinkPad · Finance 4	workstation	mg-device-004	10.30.19.89	Ubuntu 24.04	b4cad911-2d78-42af-9082-fb83caca55cc	online	at_risk	2026-10-28 11:01:35.595+07	{}	2026-10-29 09:01:35.596484+07	2026-10-29 09:01:35.596484+07
afe2eb46-6d5e-43e1-b67c-c6b871984334	Windows · Nursing 5	workstation	mg-device-005	10.30.8.112	iOS 18	473353d6-ee2a-4345-adae-ca12b0fbee38	online	non_compliant	2026-10-28 02:01:35.595+07	{}	2026-10-29 09:01:35.596722+07	2026-10-29 09:01:35.596722+07
f83305dd-0e14-483e-b587-893b941031a9	iPad · Admin 6	mobile	mg-device-006	10.30.18.41	Android 15	b8e0c918-6a79-47fb-9dfe-861f198c5550	offline	compliant	2026-10-28 22:01:35.595+07	{}	2026-10-29 09:01:35.596998+07	2026-10-29 09:01:35.596998+07
d7869f69-2734-4ec3-becc-a6e0df925c90	IoT · Nursing 7	medical_iot	mg-device-007	10.30.13.76	Windows 11	b4cad911-2d78-42af-9082-fb83caca55cc	online	compliant	2026-10-28 15:01:35.595+07	{}	2026-10-29 09:01:35.597258+07	2026-10-29 09:01:35.597258+07
5494c21d-c3e8-424d-91a3-feaef96f0d46	MacBook · Finance 8	laptop	mg-device-008	10.30.7.39	Android 15	b8e0c918-6a79-47fb-9dfe-861f198c5550	online	compliant	2026-10-29 08:01:35.595+07	{}	2026-10-29 09:01:35.597655+07	2026-10-29 09:01:35.597655+07
4366f42b-c275-44eb-94c1-d954cd30e497	iPad · Clinical 9	workstation	mg-device-009	10.30.7.68	iOS 18	b7643562-4a3b-4bdc-87f5-ed48f78b9511	online	compliant	2026-10-27 13:01:35.595+07	{}	2026-10-29 09:01:35.597967+07	2026-10-29 09:01:35.597967+07
afd587b5-91fc-4ec0-af14-1a59cda62dca	ThinkPad · Admin 10	medical_iot	mg-device-010	10.30.7.54	Ubuntu 24.04	0b5e95ce-3f2b-4299-9e98-b4885de1043e	online	compliant	2026-10-27 16:01:35.595+07	{}	2026-10-29 09:01:35.598204+07	2026-10-29 09:01:35.598204+07
b43f5173-4aaf-4d25-9865-b4a37b87adf4	MacBook · Admin 11	workstation	mg-device-011	10.30.6.202	Windows 11	b7643562-4a3b-4bdc-87f5-ed48f78b9511	online	at_risk	2026-10-28 20:01:35.595+07	{}	2026-10-29 09:01:35.59842+07	2026-10-29 09:01:35.59842+07
8ab7f441-8847-4716-b29f-3fb02b2850a4	ThinkPad · Nursing 12	tablet	mg-device-012	10.30.11.4	Android 15	b8e0c918-6a79-47fb-9dfe-861f198c5550	offline	compliant	2026-10-28 18:01:35.595+07	{}	2026-10-29 09:01:35.598721+07	2026-10-29 09:01:35.598721+07
c78399b8-1e91-4aac-953c-7048b6e75edc	iPad · SOC 13	laptop	mg-device-013	10.30.16.210	Ubuntu 24.04	92d776fe-9846-4fa0-b8eb-d4b5318321a0	online	compliant	2026-10-27 15:01:35.595+07	{}	2026-10-29 09:01:35.599001+07	2026-10-29 09:01:35.599001+07
f583463d-5d4d-4302-956c-23fa9d033dae	ThinkPad · SOC 14	medical_iot	mg-device-014	10.30.12.133	Ubuntu 24.04	b7d93566-607b-41f4-933f-612190e9288b	online	compliant	2026-10-27 23:01:35.595+07	{}	2026-10-29 09:01:35.59924+07	2026-10-29 09:01:35.59924+07
bd211479-6c60-447b-9fde-9f48c41747ea	IoT · Clinical 15	laptop	mg-device-015	10.30.12.106	Ubuntu 24.04	b4cad911-2d78-42af-9082-fb83caca55cc	online	at_risk	2026-10-28 01:01:35.595+07	{}	2026-10-29 09:01:35.599461+07	2026-10-29 09:01:35.599461+07
658bd613-3b0d-497c-9744-ea3280ba938b	MacBook · Nursing 16	laptop	mg-device-016	10.30.6.197	Ubuntu 24.04	b4cad911-2d78-42af-9082-fb83caca55cc	offline	non_compliant	2026-10-28 16:01:35.595+07	{}	2026-10-29 09:01:35.599677+07	2026-10-29 09:01:35.599677+07
d608251d-eb0b-4802-b1ed-4269d11d484e	IoT · Finance 17	tablet	mg-device-017	10.30.5.70	Windows 11	92d776fe-9846-4fa0-b8eb-d4b5318321a0	online	non_compliant	2026-10-29 03:01:35.595+07	{}	2026-10-29 09:01:35.599909+07	2026-10-29 09:01:35.599909+07
a1a5beaf-2c36-4f89-8978-e76b00b9e366	iPhone · Clinical 18	tablet	mg-device-018	10.30.9.54	macOS 15	9c716733-8564-4b64-b734-a2b03b81197d	online	compliant	2026-10-28 04:01:35.595+07	{}	2026-10-29 09:01:35.600148+07	2026-10-29 09:01:35.600148+07
511dc56d-b365-4f15-b068-239b4f29160e	MacBook · Finance 19	mobile	mg-device-019	10.30.19.28	iOS 18	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	online	at_risk	2026-10-28 17:01:35.595+07	{}	2026-10-29 09:01:35.600369+07	2026-10-29 09:01:35.600369+07
4267fbfb-a732-4ec3-adc7-f2f1e059cba0	IoT · Finance 20	medical_iot	mg-device-020	10.30.5.53	macOS 15	ebd7404f-d9cc-41ad-9c75-384026a7aff9	offline	compliant	2026-10-27 14:01:35.595+07	{}	2026-10-29 09:01:35.600576+07	2026-10-29 09:01:35.600576+07
b46c0aff-a626-4863-b99b-a449532ae30d	iPhone · Finance 21	tablet	mg-device-021	10.30.10.219	Ubuntu 24.04	b8e0c918-6a79-47fb-9dfe-861f198c5550	offline	compliant	2026-10-29 08:01:35.595+07	{}	2026-10-29 09:01:35.600796+07	2026-10-29 09:01:35.600796+07
eaf00807-1858-4879-9fdc-0516288029a9	IoT · Clinical 22	medical_iot	mg-device-022	10.30.16.70	Android 15	b7643562-4a3b-4bdc-87f5-ed48f78b9511	online	compliant	2026-10-29 07:01:35.595+07	{}	2026-10-29 09:01:35.601041+07	2026-10-29 09:01:35.601041+07
d73d218d-c65e-43b5-8fd3-e7a67f6c0b5d	iPhone · Nursing 23	mobile	mg-device-023	10.30.13.180	macOS 15	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	online	at_risk	2026-10-28 05:01:35.595+07	{}	2026-10-29 09:01:35.601301+07	2026-10-29 09:01:35.601301+07
36da4857-27e8-4bac-87dc-8400872d4e8b	Windows · Nursing 24	tablet	mg-device-024	10.30.6.73	Ubuntu 24.04	473353d6-ee2a-4345-adae-ca12b0fbee38	online	compliant	2026-10-28 04:01:35.595+07	{}	2026-10-29 09:01:35.601519+07	2026-10-29 09:01:35.601519+07
\.


--
-- Data for Name: email_events; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.email_events (id, subject, sender, recipient, verdict, severity, status, received_at, metadata, created_at, updated_at) FROM stdin;
abef4062-28c5-42b4-831e-ae8b0fb8123e	Payroll change confirmation	billing@medicare-secure.co	viewer@medicareguard.io	clean	critical	quarantined	2026-10-20 23:01:35.623+07	{}	2026-10-29 09:01:35.623536+07	2026-10-29 09:01:35.623536+07
9679feb8-324e-41f2-b517-4e3736bdc082	Benefits enrollment update	hr@medicareguard.io	viewer@medicareguard.io	phishing	low	blocked	2026-10-26 19:01:35.623+07	{}	2026-10-29 09:01:35.623944+07	2026-10-29 09:01:35.623944+07
fee1b9a5-c883-42cd-9092-fdb72f57aa28	Payroll change confirmation	hr@medicareguard.io	finance@medicareguard.io	phishing	medium	quarantined	2026-10-23 05:01:35.623+07	{}	2026-10-29 09:01:35.624167+07	2026-10-29 09:01:35.624167+07
795d5ce2-0bf8-4e55-8a54-bbf29bf63cc4	Security alert: new sign-in	no-reply@patient-portal.net	finance@medicareguard.io	malware	critical	quarantined	2026-10-25 01:01:35.623+07	{}	2026-10-29 09:01:35.624381+07	2026-10-29 09:01:35.624381+07
1fd3e843-33d5-4064-82c4-e44c7751edbc	Benefits enrollment update	cfo@medicareguard.io	viewer@medicareguard.io	clean	high	blocked	2026-10-28 04:01:35.623+07	{}	2026-10-29 09:01:35.624585+07	2026-10-29 09:01:35.624585+07
a32342ef-a6a2-40cc-a891-cda5ae4bf877	Security alert: new sign-in	hr@medicareguard.io	finance@medicareguard.io	clean	high	reported	2026-10-21 13:01:35.623+07	{}	2026-10-29 09:01:35.624783+07	2026-10-29 09:01:35.624783+07
d1ddc060-7a6f-49e6-9fba-2fd6eb472953	Benefits enrollment update	cfo@medicareguard.io	nursing@medicareguard.io	malware	low	blocked	2026-10-22 23:01:35.623+07	{}	2026-10-29 09:01:35.624985+07	2026-10-29 09:01:35.624985+07
67d2f1a6-05b2-413e-b2f3-343549622a1f	Security alert: new sign-in	cfo@medicareguard.io	analyst@medicareguard.io	clean	low	delivered	2026-10-23 03:01:35.623+07	{}	2026-10-29 09:01:35.625196+07	2026-10-29 09:01:35.625196+07
8e2c9449-fd7b-40c5-9c3e-5dc7a5e1143c	Shared document: patient_records.xlsx	cfo@medicareguard.io	viewer@medicareguard.io	clean	medium	reported	2026-10-20 00:01:35.623+07	{}	2026-10-29 09:01:35.625408+07	2026-10-29 09:01:35.625408+07
8bafc8e1-5279-4ee9-a718-38959e0ded0f	Benefits enrollment update	hr@medicareguard.io	finance@medicareguard.io	phishing	high	reported	2026-10-23 11:01:35.623+07	{}	2026-10-29 09:01:35.625595+07	2026-10-29 09:01:35.625595+07
cc2c3a41-93bb-490c-912b-daa0b0705332	Invoice overdue — action required	hr@medicareguard.io	nursing@medicareguard.io	malware	high	delivered	2026-10-27 21:01:35.623+07	{}	2026-10-29 09:01:35.625789+07	2026-10-29 09:01:35.625789+07
2107acd6-c45e-421e-b44b-cf87db7213d2	Invoice overdue — action required	it-support@medicareguard.io	viewer@medicareguard.io	bec	low	blocked	2026-10-25 20:01:35.623+07	{}	2026-10-29 09:01:35.626001+07	2026-10-29 09:01:35.626001+07
13c7c879-3273-4765-8bf7-88231c1cdf69	Security alert: new sign-in	billing@medicare-secure.co	finance@medicareguard.io	clean	low	delivered	2026-10-21 12:01:35.623+07	{}	2026-10-29 09:01:35.62619+07	2026-10-29 09:01:35.62619+07
fdc20625-6c6d-4e58-98b3-8ab80d55c218	Shared document: patient_records.xlsx	cfo@medicareguard.io	nursing@medicareguard.io	clean	medium	delivered	2026-10-21 00:01:35.623+07	{}	2026-10-29 09:01:35.62641+07	2026-10-29 09:01:35.62641+07
f7553958-8bb3-40c3-8054-2c2973661879	Payroll change confirmation	no-reply@patient-portal.net	nursing@medicareguard.io	clean	critical	reported	2026-10-22 08:01:35.623+07	{}	2026-10-29 09:01:35.626631+07	2026-10-29 09:01:35.626631+07
6dfe3ffd-3358-4f4e-8041-d394ce404d3c	Benefits enrollment update	cfo@medicareguard.io	finance@medicareguard.io	spam	critical	delivered	2026-10-26 03:01:35.623+07	{}	2026-10-29 09:01:35.626843+07	2026-10-29 09:01:35.626843+07
a4d378c1-6545-4726-9cf0-46e0a3b124c8	Benefits enrollment update	hr@medicareguard.io	finance@medicareguard.io	clean	low	quarantined	2026-10-29 04:01:35.623+07	{}	2026-10-29 09:01:35.627064+07	2026-10-29 09:01:35.627064+07
5135f0ae-3bfa-4af0-a29d-ca5c424e2ab5	Benefits enrollment update	it-support@medicareguard.io	viewer@medicareguard.io	phishing	low	delivered	2026-10-21 16:01:35.623+07	{}	2026-10-29 09:01:35.627262+07	2026-10-29 09:01:35.627262+07
71c7f608-0b96-468d-938d-a2605fcf74d1	Shared document: patient_records.xlsx	billing@medicare-secure.co	viewer@medicareguard.io	clean	critical	reported	2026-10-27 06:01:35.623+07	{}	2026-10-29 09:01:35.627455+07	2026-10-29 09:01:35.627455+07
5b0bbe57-6100-434e-8d78-cb6a98295a51	Invoice overdue — action required	billing@medicare-secure.co	analyst@medicareguard.io	spam	high	delivered	2026-10-24 10:01:35.623+07	{}	2026-10-29 09:01:35.627665+07	2026-10-29 09:01:35.627665+07
73593d6c-c9d5-404f-bead-337ad3f77afd	Shared document: patient_records.xlsx	hr@medicareguard.io	analyst@medicareguard.io	phishing	critical	reported	2026-10-28 06:01:35.623+07	{}	2026-10-29 09:01:35.627924+07	2026-10-29 09:01:35.627924+07
cc069647-857e-4a5e-bf44-d7df9e72b3aa	Benefits enrollment update	it-support@medicareguard.io	finance@medicareguard.io	clean	low	blocked	2026-10-26 23:01:35.623+07	{}	2026-10-29 09:01:35.628158+07	2026-10-29 09:01:35.628158+07
e5a67ef6-a1fb-4ebf-8349-135822c11eb6	Benefits enrollment update	cfo@medicareguard.io	viewer@medicareguard.io	clean	medium	reported	2026-10-21 04:01:35.623+07	{}	2026-10-29 09:01:35.628361+07	2026-10-29 09:01:35.628361+07
276f2db5-05a3-4ce3-91f5-7452ba6deba2	Shared document: patient_records.xlsx	no-reply@patient-portal.net	analyst@medicareguard.io	clean	critical	reported	2026-10-23 09:01:35.623+07	{}	2026-10-29 09:01:35.628549+07	2026-10-29 09:01:35.628549+07
c3bb44f7-dd76-4e12-990b-c58a48b1c05c	Benefits enrollment update	it-support@medicareguard.io	nursing@medicareguard.io	phishing	critical	quarantined	2026-10-21 09:01:35.623+07	{}	2026-10-29 09:01:35.628742+07	2026-10-29 09:01:35.628742+07
a62610b4-e80b-467c-aab1-18f2941305a5	Shared document: patient_records.xlsx	hr@medicareguard.io	analyst@medicareguard.io	clean	low	quarantined	2026-10-21 05:01:35.623+07	{}	2026-10-29 09:01:35.628935+07	2026-10-29 09:01:35.628935+07
ec2a369d-1245-40b6-ae7d-f8fbffad3d3d	Shared document: patient_records.xlsx	no-reply@patient-portal.net	analyst@medicareguard.io	spam	low	delivered	2026-10-22 19:01:35.623+07	{}	2026-10-29 09:01:35.629132+07	2026-10-29 09:01:35.629132+07
6c29d198-6e84-40a0-a93c-2d7762c5562c	Security alert: new sign-in	cfo@medicareguard.io	finance@medicareguard.io	clean	medium	quarantined	2026-10-22 04:01:35.623+07	{}	2026-10-29 09:01:35.629319+07	2026-10-29 09:01:35.629319+07
0aa295b9-1267-4620-89b3-c8389a3e07fd	Payroll change confirmation	it-support@medicareguard.io	analyst@medicareguard.io	spam	low	reported	2026-10-26 09:01:35.623+07	{}	2026-10-29 09:01:35.629506+07	2026-10-29 09:01:35.629506+07
d8613817-01e3-4646-b6ad-531afe581253	Benefits enrollment update	cfo@medicareguard.io	analyst@medicareguard.io	bec	high	reported	2026-10-22 13:01:35.623+07	{}	2026-10-29 09:01:35.629695+07	2026-10-29 09:01:35.629695+07
8c64e3ee-cf89-4248-9554-46a8351e7cd7	Password expiry notice	hr@medicareguard.io	analyst@medicareguard.io	phishing	high	reported	2026-10-28 09:01:35.623+07	{}	2026-10-29 09:01:35.629888+07	2026-10-29 09:01:35.629888+07
172dede8-5f40-4a31-bc41-66e8d181ac5f	Shared document: patient_records.xlsx	cfo@medicareguard.io	analyst@medicareguard.io	clean	low	quarantined	2026-10-25 07:01:35.623+07	{}	2026-10-29 09:01:35.630081+07	2026-10-29 09:01:35.630081+07
af1ffd85-2401-4ac9-b8e4-152f4866a7cf	Invoice overdue — action required	cfo@medicareguard.io	finance@medicareguard.io	spam	low	delivered	2026-10-26 15:01:35.623+07	{}	2026-10-29 09:01:35.630269+07	2026-10-29 09:01:35.630269+07
3bd81fae-a7e4-4d07-859a-27cdf47646e9	Security alert: new sign-in	no-reply@patient-portal.net	nursing@medicareguard.io	spam	critical	delivered	2026-10-22 11:01:35.623+07	{}	2026-10-29 09:01:35.630474+07	2026-10-29 09:01:35.630474+07
b79a51a6-9fb3-4683-8180-09d88f51d8e7	Password expiry notice	no-reply@patient-portal.net	nursing@medicareguard.io	clean	high	reported	2026-10-24 09:01:35.623+07	{}	2026-10-29 09:01:35.630685+07	2026-10-29 09:01:35.630685+07
\.


--
-- Data for Name: findings; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.findings (id, title, severity, status, scan_id, asset_id, description, remediation, metadata, created_at, updated_at) FROM stdin;
679b3d79-2fcd-41c2-97cf-725ebcc4bab5	Anonymous FTP enabled	low	in_progress	377d3f61-e149-4fea-8f28-80cddeb35892	1d817fd7-6205-4dab-86c6-48beafa0ad78	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.583863+07	2026-10-29 09:01:35.583863+07
fa3e3364-4c49-4c54-833b-8935d2afb54d	Outdated TLS cipher suite	low	in_progress	b2676fc6-572e-4ce0-a992-2776d9bf577b	b741c818-a15a-4fd4-b5ce-d92e9235e852	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.584435+07	2026-10-29 09:01:35.584435+07
772d87f9-a845-4917-9149-0e5cefa23b3a	Exposed debug endpoint	high	accepted_risk	d851297b-15d2-4d7b-afa6-21a5231a4f28	2a35cce6-c390-4c27-9c0d-84d30320c2cd	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.584642+07	2026-10-29 09:01:35.584642+07
da27dad3-20fc-4712-9a3c-107b7b90f1df	Outdated TLS cipher suite	high	accepted_risk	7ca65ca0-ddae-4497-b648-1a065aa5a77f	20484773-319b-430f-bf71-adbab8001006	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.584843+07	2026-10-29 09:01:35.584843+07
291076ab-033a-426b-8de1-a8c56d3e274c	Default credentials detected	critical	open	cd2653bb-2365-4200-9f9a-d427cdc721e8	578335bf-e75d-4878-89dc-12dc1f443613	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.585066+07	2026-10-29 09:01:35.585066+07
d39f2a25-bd39-4884-8025-60fb905a16d1	SMB signing disabled	high	accepted_risk	2cac7bd4-253b-431c-96e1-b46cdfc40245	bcdb679c-53d2-48f1-ad99-e1b949aeeb57	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.585299+07	2026-10-29 09:01:35.585299+07
ecb78c58-2a72-4a6a-a4b1-5b0b3265f413	Anonymous FTP enabled	medium	open	fe4e2031-5047-433a-a74c-b12c5695ab4b	2a35cce6-c390-4c27-9c0d-84d30320c2cd	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.585514+07	2026-10-29 09:01:35.585514+07
31f7f3eb-924a-4daf-9646-82d4805fb220	Default credentials detected	critical	resolved	3d6d1cc2-ba30-45e4-8d6b-ee9f4e0fca66	b741c818-a15a-4fd4-b5ce-d92e9235e852	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.585707+07	2026-10-29 09:01:35.585707+07
03941516-13b8-4a97-b9a5-7cce4864fb1e	Default credentials detected	critical	accepted_risk	91994f02-a95a-486d-90fc-07dbd7295794	33177851-14ab-4ead-ba2a-7445d2b5ba38	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.585899+07	2026-10-29 09:01:35.585899+07
c0baf9d8-8939-470b-9456-d0c1f774eb0b	SMB signing disabled	low	resolved	1107ca4d-b72b-4041-a5ed-8ac0ba548087	9cf5cbb5-d702-4a86-8c4e-fd5a8db2ed5b	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.586118+07	2026-10-29 09:01:35.586118+07
4767f0a9-0ed8-45aa-8152-18e729b08b16	Exposed debug endpoint	low	open	74b97c8c-d9a6-4f03-8c0f-309c9d8b5824	1d817fd7-6205-4dab-86c6-48beafa0ad78	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.586294+07	2026-10-29 09:01:35.586294+07
8e2d51e2-fe70-4f68-aac7-14ef028c001a	Weak SSH configuration	critical	open	8e719c60-6973-4cbf-bf73-b97e965ad48c	20484773-319b-430f-bf71-adbab8001006	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.586468+07	2026-10-29 09:01:35.586468+07
0893e7dc-0fa2-41a7-a7f6-bd8def3e8cff	Unpatched CVE present	low	in_progress	377d3f61-e149-4fea-8f28-80cddeb35892	578335bf-e75d-4878-89dc-12dc1f443613	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.586644+07	2026-10-29 09:01:35.586644+07
fcbbe090-e835-4f30-b197-be1825619d8c	Exposed debug endpoint	critical	accepted_risk	b2676fc6-572e-4ce0-a992-2776d9bf577b	b741c818-a15a-4fd4-b5ce-d92e9235e852	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.586843+07	2026-10-29 09:01:35.586843+07
1eb6fc17-8d6f-4981-8216-cd543aae6945	Anonymous FTP enabled	medium	open	d851297b-15d2-4d7b-afa6-21a5231a4f28	1d817fd7-6205-4dab-86c6-48beafa0ad78	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.587103+07	2026-10-29 09:01:35.587103+07
cf876f91-7000-49a9-9cb2-c9ee0bcf531a	Unpatched CVE present	low	open	7ca65ca0-ddae-4497-b648-1a065aa5a77f	b5ecd570-bfb9-455d-a802-c3031d7de183	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.587362+07	2026-10-29 09:01:35.587362+07
1d06b8ff-f9ea-4553-bea1-ebb15e08d314	Default credentials detected	critical	resolved	cd2653bb-2365-4200-9f9a-d427cdc721e8	1d817fd7-6205-4dab-86c6-48beafa0ad78	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.587609+07	2026-10-29 09:01:35.587609+07
7a5a6938-4799-4ba1-9b99-50c4289be713	Unpatched CVE present	high	resolved	2cac7bd4-253b-431c-96e1-b46cdfc40245	c7fa215a-4985-4506-8c4e-b868df428c13	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.587852+07	2026-10-29 09:01:35.587852+07
9637c898-9c60-4ce2-938c-9b9de5da9000	SMB signing disabled	high	resolved	fe4e2031-5047-433a-a74c-b12c5695ab4b	e3a86baf-d72f-4d71-8d47-34768a15f739	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.588089+07	2026-10-29 09:01:35.588089+07
1d144490-1066-4cb0-b961-78769abeceed	Outdated TLS cipher suite	low	accepted_risk	3d6d1cc2-ba30-45e4-8d6b-ee9f4e0fca66	c7fa215a-4985-4506-8c4e-b868df428c13	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.588315+07	2026-10-29 09:01:35.588315+07
bdb455b5-e2e4-4221-ab10-63cd20157275	Weak SSH configuration	low	resolved	91994f02-a95a-486d-90fc-07dbd7295794	e3a86baf-d72f-4d71-8d47-34768a15f739	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.588539+07	2026-10-29 09:01:35.588539+07
63b22178-4c78-43c3-bc67-213bb0fa0619	Unpatched CVE present	medium	in_progress	1107ca4d-b72b-4041-a5ed-8ac0ba548087	43b2d473-a21f-4654-99a4-99de37812bd7	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.588751+07	2026-10-29 09:01:35.588751+07
e54b6775-6eff-4afd-be1d-4ad77bb350d7	Outdated TLS cipher suite	low	resolved	74b97c8c-d9a6-4f03-8c0f-309c9d8b5824	2a35cce6-c390-4c27-9c0d-84d30320c2cd	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.588967+07	2026-10-29 09:01:35.588967+07
5431ce82-2585-4d33-989c-fe18f5bdacc7	Anonymous FTP enabled	medium	accepted_risk	8e719c60-6973-4cbf-bf73-b97e965ad48c	20484773-319b-430f-bf71-adbab8001006	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.589177+07	2026-10-29 09:01:35.589177+07
7b0051a4-2c26-4da8-8e71-e1f4115a90db	Default credentials detected	medium	accepted_risk	377d3f61-e149-4fea-8f28-80cddeb35892	43b2d473-a21f-4654-99a4-99de37812bd7	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.589368+07	2026-10-29 09:01:35.589368+07
c5a65016-41a8-4e40-896d-38e35fe804e7	Exposed debug endpoint	high	in_progress	b2676fc6-572e-4ce0-a992-2776d9bf577b	90f757b2-99a1-4342-bc1d-16a5a09b35eb	Scanner identified a configuration or patch-level weakness on the target asset.	Apply vendor patch, harden configuration and re-scan to validate.	{}	2026-10-29 09:01:35.58956+07	2026-10-29 09:01:35.58956+07
\.


--
-- Data for Name: firewall_rules; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.firewall_rules (id, name, description, direction, action, protocol, source_ip, destination_ip, source_port, destination_port, priority, enabled, hit_count, last_hit_at, created_by, metadata, created_at, updated_at) FROM stdin;
9a03c7fc-0467-4d84-84de-d47fbe6e66c9	Allow HTTPS to Patient Portal	Public ingress for patient portal	inbound	allow	tcp	any	10.10.1.10	any	443	10	t	184329	2026-10-29 08:01:35.471+07	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	{"managed": true}	2026-10-29 09:01:35.471848+07	2026-10-29 09:01:35.471848+07
959246d1-d938-453e-a39d-9f9233fb644e	Deny SSH from Internet	Block SSH from untrusted networks	inbound	deny	tcp	any	any	any	22	5	t	8432	2026-10-29 07:01:35.471+07	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	{"managed": true}	2026-10-29 09:01:35.472444+07	2026-10-29 09:01:35.472444+07
9a9eb719-a6a0-4512-af56-ab9033d9bcfd	Allow VPN from corporate ranges	Corporate VPN access	inbound	allow	udp	10.0.0.0/8	10.10.0.5	any	51820	20	t	3201	2026-10-29 06:01:35.471+07	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	{"managed": true}	2026-10-29 09:01:35.472712+07	2026-10-29 09:01:35.472712+07
1068259d-db31-4ebf-b0a6-3ff20d4b9e97	Deny RDP from Internet	Prevent exposed RDP	inbound	deny	tcp	any	any	any	3389	5	t	12980	2026-10-29 08:01:35.471+07	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	{"managed": true}	2026-10-29 09:01:35.472961+07	2026-10-29 09:01:35.472961+07
2032665f-97dc-435d-9be0-579ec9dd2db1	Allow EHR DB from app subnet	Application tier to EHR	internal	allow	tcp	10.10.1.0/24	10.10.2.11	any	5432	30	t	99120	2026-10-29 08:01:35.471+07	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	{"managed": true}	2026-10-29 09:01:35.473265+07	2026-10-29 09:01:35.473265+07
7f0bf65f-6155-4b31-93c1-1d0492d168f7	Block known C2 IP range	CTI-driven egress block	outbound	deny	any	any	45.146.164.0/24	any	any	8	t	4421	2026-10-29 05:01:35.471+07	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	{"managed": true}	2026-10-29 09:01:35.473551+07	2026-10-29 09:01:35.473551+07
5c9b08d4-8016-4c38-b686-a9ce209a1098	Allow DNS to resolver	Restrict egress DNS	outbound	allow	udp	10.0.0.0/8	10.10.0.53	any	53	25	t	528391	2026-10-29 08:01:35.471+07	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	{"managed": true}	2026-10-29 09:01:35.47379+07	2026-10-29 09:01:35.47379+07
8c7ce44c-b557-4c33-a2ec-895eed5cf0a4	Deny SMB egress	Stop lateral SMB egress	outbound	deny	tcp	10.0.0.0/8	any	any	445	15	t	2301	2026-10-29 03:01:35.471+07	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	{"managed": true}	2026-10-29 09:01:35.474087+07	2026-10-29 09:01:35.474087+07
d92cebac-468e-4a1c-a531-191c25f7df9d	Allow monitoring scrape	Prometheus scraping	internal	allow	tcp	10.10.8.0/24	10.0.0.0/8	any	9090	40	t	129832	2026-10-29 08:01:35.471+07	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	{"managed": true}	2026-10-29 09:01:35.474353+07	2026-10-29 09:01:35.474353+07
8d076bb9-c2b9-4008-9438-9fe1993adc0d	Block Tor exit nodes	Egress policy	outbound	deny	any	any	tor-exit-list	any	any	9	t	762	2026-10-29 01:01:35.471+07	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	{"managed": true}	2026-10-29 09:01:35.474579+07	2026-10-29 09:01:35.474579+07
8c0430cd-5a47-496a-b5b7-1bc7fdde5321	Allow telehealth media	WebRTC media ports	inbound	allow	udp	any	10.10.1.44	any	10000-20000	22	t	88432	2026-10-29 07:01:35.471+07	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	{"managed": true}	2026-10-29 09:01:35.474812+07	2026-10-29 09:01:35.474812+07
81de20ae-85d4-47e7-8809-eca9f5a84bbb	Block malware hash C2 domain	DNS RPZ block	outbound	deny	udp	10.0.0.0/8	any	any	53	12	t	3412	2026-10-29 04:01:35.471+07	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	{"managed": true}	2026-10-29 09:01:35.475038+07	2026-10-29 09:01:35.475038+07
\.


--
-- Data for Name: incidents; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.incidents (id, title, description, severity, status, priority, category, assignee_id, reporter_id, incident_key, sla_due_at, detected_at, resolved_at, root_cause, impact, timeline, metadata, created_at, updated_at) FROM stdin;
fff7c1ec-5327-4248-bfe7-83ee1fa0232a	Supply chain package compromise	Incident involving Telehealth Gateway. Investigated by the MedicareGuard SOC with automated evidence collection.	critical	closed	P1	insider-threat	b8e0c918-6a79-47fb-9dfe-861f198c5550	b8e0c918-6a79-47fb-9dfe-861f198c5550	INC-20261010-0001	2026-10-11 06:01:35.462+07	2026-10-11 02:01:35.462+07	2026-10-15 00:01:35.462+07	Reused privileged credentials	Regulatory exposure	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-10T19:01:35.462Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-10T19:21:35.462Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-10T19:56:35.462Z"}]	{"assetId": "2e96141d-1615-4b65-9224-7fa73fb6d0c4", "assetName": "Telehealth Gateway"}	2026-10-29 09:01:35.463186+07	2026-10-29 09:01:35.463186+07
7ef58faf-fd03-4abc-a6b7-2fd32580548c	Patient portal credential stuffing campaign	Incident involving Backup Vault. Investigated by the MedicareGuard SOC with automated evidence collection.	medium	eradicated	P3	credential-access	92d776fe-9846-4fa0-b8eb-d4b5318321a0	b8e0c918-6a79-47fb-9dfe-861f198c5550	INC-20261016-0002	2026-10-19 04:01:35.462+07	2026-10-17 04:01:35.462+07	\N	\N	Regulatory exposure	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-16T21:01:35.462Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-16T21:21:35.462Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-16T21:56:35.462Z"}]	{"assetId": "578335bf-e75d-4878-89dc-12dc1f443613", "assetName": "Backup Vault"}	2026-10-29 09:01:35.464004+07	2026-10-29 09:01:35.464004+07
d459f47f-aa33-4f35-9370-859f923a2fab	Suspected ransomware on clinical file server	Incident involving EHR Database. Investigated by the MedicareGuard SOC with automated evidence collection.	high	investigating	P2	vulnerability	b7d93566-607b-41f4-933f-612190e9288b	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	INC-20261019-0003	2026-10-20 09:01:35.462+07	2026-10-19 21:01:35.462+07	\N	\N	Financial fraud risk	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-19T14:01:35.462Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-19T14:21:35.462Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-19T14:56:35.462Z"}]	{"assetId": "920f61f5-9de0-4850-9cd1-99e0ba05365f", "assetName": "EHR Database"}	2026-10-29 09:01:35.464384+07	2026-10-29 09:01:35.464384+07
f0832fce-d281-4618-9cab-946e6b0a7252	Billing service web shell deployment	Incident involving Backup Vault. Investigated by the MedicareGuard SOC with automated evidence collection.	critical	recovered	P1	network	b7d93566-607b-41f4-933f-612190e9288b	dcd2d08a-7310-414d-ae20-09165cb0c384	INC-20261016-0004	2026-10-17 01:01:35.462+07	2026-10-16 21:01:35.462+07	\N	\N	Regulatory exposure	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-16T14:01:35.462Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-16T14:21:35.462Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-16T14:56:35.462Z"}]	{"assetId": "578335bf-e75d-4878-89dc-12dc1f443613", "assetName": "Backup Vault"}	2026-10-29 09:01:35.464696+07	2026-10-29 09:01:35.464696+07
53660727-417e-46bf-ae7a-25ae501d116c	Telehealth API abuse	Incident involving Telehealth Gateway. Investigated by the MedicareGuard SOC with automated evidence collection.	medium	investigating	P3	malware	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	INC-20261028-0005	2026-10-30 23:01:35.462+07	2026-10-28 23:01:35.462+07	\N	\N	Patient data confidentiality	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-28T16:01:35.462Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-28T16:21:35.462Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-28T16:56:35.462Z"}]	{"assetId": "2e96141d-1615-4b65-9224-7fa73fb6d0c4", "assetName": "Telehealth Gateway"}	2026-10-29 09:01:35.465402+07	2026-10-29 09:01:35.465402+07
68dbbb4f-1e8d-4bbd-a481-8c0d9ea86b68	Suspected ransomware on clinical file server	Incident involving Imaging PACS. Investigated by the MedicareGuard SOC with automated evidence collection.	high	investigating	P2	credential-access	0b5e95ce-3f2b-4299-9e98-b4885de1043e	473353d6-ee2a-4345-adae-ca12b0fbee38	INC-20261017-0006	2026-10-17 19:01:35.462+07	2026-10-17 07:01:35.462+07	\N	\N	Financial fraud risk	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-17T00:01:35.462Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-17T00:21:35.462Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-17T00:56:35.462Z"}]	{"assetId": "b5ecd570-bfb9-455d-a802-c3031d7de183", "assetName": "Imaging PACS"}	2026-10-29 09:01:35.465749+07	2026-10-29 09:01:35.465749+07
a01527c1-ee50-4bd0-b9a8-5d8df3b0dcb8	Suspected ransomware on clinical file server	Incident involving Pharmacy Database. Investigated by the MedicareGuard SOC with automated evidence collection.	critical	eradicated	P1	data-exfiltration	dcd2d08a-7310-414d-ae20-09165cb0c384	ebd7404f-d9cc-41ad-9c75-384026a7aff9	INC-20261017-0007	2026-10-17 22:01:35.462+07	2026-10-17 18:01:35.462+07	\N	\N	Service availability	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-17T11:01:35.462Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-17T11:21:35.462Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-17T11:56:35.462Z"}]	{"assetId": "2a35cce6-c390-4c27-9c0d-84d30320c2cd", "assetName": "Pharmacy Database"}	2026-10-29 09:01:35.466085+07	2026-10-29 09:01:35.466085+07
b7a58fe5-1fc2-4182-ad89-7f958977aa84	Malicious OAuth application consent	Incident involving Billing Service. Investigated by the MedicareGuard SOC with automated evidence collection.	critical	closed	P1	malware	0b5e95ce-3f2b-4299-9e98-b4885de1043e	b7d93566-607b-41f4-933f-612190e9288b	INC-20261019-0008	2026-10-20 09:01:35.462+07	2026-10-20 05:01:35.462+07	2026-10-22 09:01:35.462+07	Unpatched public-facing service	Regulatory exposure	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-19T22:01:35.462Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-19T22:21:35.462Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-19T22:56:35.462Z"}]	{"assetId": "c7fa215a-4985-4506-8c4e-b868df428c13", "assetName": "Billing Service"}	2026-10-29 09:01:35.466368+07	2026-10-29 09:01:35.466368+07
40948a5f-e4dd-4604-85ff-e842aa396d86	Patient portal credential stuffing campaign	Incident involving Kubernetes Cluster. Investigated by the MedicareGuard SOC with automated evidence collection.	high	investigating	P2	network	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	473353d6-ee2a-4345-adae-ca12b0fbee38	INC-20261020-0009	2026-10-21 08:01:35.462+07	2026-10-20 20:01:35.462+07	\N	\N	Limited — contained early	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-20T13:01:35.462Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-20T13:21:35.462Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-20T13:56:35.462Z"}]	{"assetId": "9cf5cbb5-d702-4a86-8c4e-fd5a8db2ed5b", "assetName": "Kubernetes Cluster"}	2026-10-29 09:01:35.466632+07	2026-10-29 09:01:35.466632+07
725541d5-f947-42b8-8b70-30f673a69a83	Suspected ransomware on clinical file server	Incident involving SIEM Ingestor. Investigated by the MedicareGuard SOC with automated evidence collection.	critical	open	P1	vulnerability	b7d93566-607b-41f4-933f-612190e9288b	ebd7404f-d9cc-41ad-9c75-384026a7aff9	INC-20261026-0010	2026-10-26 19:01:35.462+07	2026-10-26 15:01:35.462+07	\N	\N	Limited — contained early	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-26T08:01:35.462Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-26T08:21:35.462Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-26T08:56:35.462Z"}]	{"assetId": "1d817fd7-6205-4dab-86c6-48beafa0ad78", "assetName": "SIEM Ingestor"}	2026-10-29 09:01:35.466885+07	2026-10-29 09:01:35.466885+07
b18bd51d-eeb2-4b71-b60d-6381be79579d	Billing service web shell deployment	Incident involving CI/CD Runner. Investigated by the MedicareGuard SOC with automated evidence collection.	high	resolved	P2	data-exfiltration	dcd2d08a-7310-414d-ae20-09165cb0c384	dcd2d08a-7310-414d-ae20-09165cb0c384	INC-20261012-0011	2026-10-13 03:01:35.462+07	2026-10-12 15:01:35.462+07	2026-10-13 08:01:35.462+07	Unpatched public-facing service	Limited — contained early	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-12T08:01:35.462Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-12T08:21:35.462Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-12T08:56:35.462Z"}]	{"assetId": "e3a86baf-d72f-4d71-8d47-34768a15f739", "assetName": "CI/CD Runner"}	2026-10-29 09:01:35.467213+07	2026-10-29 09:01:35.467213+07
d780f63c-abe7-4f63-b1c4-3d8d9c9dcb71	Telehealth API abuse	Incident involving VPN Gateway. Investigated by the MedicareGuard SOC with automated evidence collection.	critical	contained	P1	credential-access	0b5e95ce-3f2b-4299-9e98-b4885de1043e	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	INC-20261018-0012	2026-10-18 23:01:35.462+07	2026-10-18 19:01:35.462+07	\N	\N	Service availability	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-18T12:01:35.462Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-18T12:21:35.462Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-18T12:56:35.462Z"}]	{"assetId": "33177851-14ab-4ead-ba2a-7445d2b5ba38", "assetName": "VPN Gateway"}	2026-10-29 09:01:35.467468+07	2026-10-29 09:01:35.467468+07
e914ce78-ab66-4e60-946a-8d1ee11aa166	Malicious OAuth application consent	Incident involving SIEM Ingestor. Investigated by the MedicareGuard SOC with automated evidence collection.	low	investigating	P4	vulnerability	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	INC-20261009-0013	2026-10-11 20:01:35.462+07	2026-10-09 20:01:35.462+07	\N	\N	Regulatory exposure	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-09T13:01:35.462Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-09T13:21:35.462Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-09T13:56:35.462Z"}]	{"assetId": "1d817fd7-6205-4dab-86c6-48beafa0ad78", "assetName": "SIEM Ingestor"}	2026-10-29 09:01:35.467714+07	2026-10-29 09:01:35.467714+07
5fff4780-68d1-4354-a6c0-492bf5e257b2	Suspected ransomware on clinical file server	Incident involving VPN Gateway. Investigated by the MedicareGuard SOC with automated evidence collection.	critical	open	P1	data-exfiltration	ebd7404f-d9cc-41ad-9c75-384026a7aff9	b7d93566-607b-41f4-933f-612190e9288b	INC-20261011-0014	2026-10-11 11:01:35.462+07	2026-10-11 07:01:35.462+07	\N	\N	Patient data confidentiality	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-11T00:01:35.462Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-11T00:21:35.462Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-11T00:56:35.462Z"}]	{"assetId": "33177851-14ab-4ead-ba2a-7445d2b5ba38", "assetName": "VPN Gateway"}	2026-10-29 09:01:35.467999+07	2026-10-29 09:01:35.467999+07
33189cec-5ec8-45f2-9b24-8d5a47c662e6	Insider data access anomaly	Incident involving Admin Workstation. Investigated by the MedicareGuard SOC with automated evidence collection.	high	investigating	P2	insider-threat	473353d6-ee2a-4345-adae-ca12b0fbee38	b7643562-4a3b-4bdc-87f5-ed48f78b9511	INC-20261020-0015	2026-10-21 04:01:35.462+07	2026-10-20 16:01:35.462+07	\N	\N	Financial fraud risk	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-20T09:01:35.462Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-20T09:21:35.462Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-20T09:56:35.462Z"}]	{"assetId": "20484773-319b-430f-bf71-adbab8001006", "assetName": "Admin Workstation"}	2026-10-29 09:01:35.468245+07	2026-10-29 09:01:35.468245+07
f4cffd21-6fb7-4d04-a43e-c9a48e69659d	Insider data access anomaly	Incident involving Appointment API. Investigated by the MedicareGuard SOC with automated evidence collection.	low	closed	P4	data-exfiltration	dcd2d08a-7310-414d-ae20-09165cb0c384	b8e0c918-6a79-47fb-9dfe-861f198c5550	INC-20261011-0016	2026-10-13 09:01:35.462+07	2026-10-11 09:01:35.462+07	2026-10-11 15:01:35.462+07	Phishing attachment execution	Regulatory exposure	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-11T02:01:35.462Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-11T02:21:35.462Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-11T02:56:35.462Z"}]	{"assetId": "b741c818-a15a-4fd4-b5ce-d92e9235e852", "assetName": "Appointment API"}	2026-10-29 09:01:35.468499+07	2026-10-29 09:01:35.468499+07
d0472136-83db-46da-969e-fd7b86cb0da6	Supply chain package compromise	Incident involving EHR Database. Investigated by the MedicareGuard SOC with automated evidence collection.	high	recovered	P2	malware	b7d93566-607b-41f4-933f-612190e9288b	dcd2d08a-7310-414d-ae20-09165cb0c384	INC-20261017-0017	2026-10-18 18:01:35.462+07	2026-10-18 06:01:35.462+07	\N	\N	Financial fraud risk	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-17T23:01:35.462Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-17T23:21:35.462Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-17T23:56:35.462Z"}]	{"assetId": "920f61f5-9de0-4850-9cd1-99e0ba05365f", "assetName": "EHR Database"}	2026-10-29 09:01:35.468745+07	2026-10-29 09:01:35.468745+07
1a4be992-f6c9-4bc6-ad9b-0a379eea556d	Suspected ransomware on clinical file server	Incident involving Pharmacy Database. Investigated by the MedicareGuard SOC with automated evidence collection.	critical	recovered	P1	insider-threat	92d776fe-9846-4fa0-b8eb-d4b5318321a0	473353d6-ee2a-4345-adae-ca12b0fbee38	INC-20261012-0018	2026-10-13 02:01:35.462+07	2026-10-12 22:01:35.462+07	\N	\N	Limited — contained early	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-12T15:01:35.462Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-12T15:21:35.462Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-12T15:56:35.462Z"}]	{"assetId": "2a35cce6-c390-4c27-9c0d-84d30320c2cd", "assetName": "Pharmacy Database"}	2026-10-29 09:01:35.469019+07	2026-10-29 09:01:35.469019+07
dec111af-a2fd-405b-befd-b5770a80fcae	Patient portal credential stuffing campaign	Incident involving Kubernetes Cluster. Investigated by the MedicareGuard SOC with automated evidence collection.	critical	resolved	P1	malware	dcd2d08a-7310-414d-ae20-09165cb0c384	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	INC-20261020-0019	2026-10-20 13:01:35.462+07	2026-10-20 09:01:35.462+07	2026-10-24 04:01:35.462+07	Reused privileged credentials	Limited — contained early	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-20T02:01:35.462Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-20T02:21:35.462Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-20T02:56:35.462Z"}]	{"assetId": "9cf5cbb5-d702-4a86-8c4e-fd5a8db2ed5b", "assetName": "Kubernetes Cluster"}	2026-10-29 09:01:35.46934+07	2026-10-29 09:01:35.46934+07
114fbfd2-e43f-402c-985f-cb5725019c35	Malicious OAuth application consent	Incident involving Admin Workstation. Investigated by the MedicareGuard SOC with automated evidence collection.	medium	open	P3	network	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	b8e0c918-6a79-47fb-9dfe-861f198c5550	INC-20261016-0020	2026-10-18 21:01:35.463+07	2026-10-16 21:01:35.463+07	\N	\N	Financial fraud risk	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-16T14:01:35.463Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-16T14:21:35.463Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-16T14:56:35.463Z"}]	{"assetId": "20484773-319b-430f-bf71-adbab8001006", "assetName": "Admin Workstation"}	2026-10-29 09:01:35.469655+07	2026-10-29 09:01:35.469655+07
707751b7-01a1-42c1-ae98-cbaba00b1596	Edge VPN vulnerable appliance exploitation	Incident involving Patient Portal. Investigated by the MedicareGuard SOC with automated evidence collection.	low	contained	P4	vulnerability	b8e0c918-6a79-47fb-9dfe-861f198c5550	92d776fe-9846-4fa0-b8eb-d4b5318321a0	INC-20261026-0021	2026-10-28 16:01:35.463+07	2026-10-26 16:01:35.463+07	\N	\N	Limited — contained early	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-26T09:01:35.463Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-26T09:21:35.463Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-26T09:56:35.463Z"}]	{"assetId": "bcdb679c-53d2-48f1-ad99-e1b949aeeb57", "assetName": "Patient Portal"}	2026-10-29 09:01:35.469951+07	2026-10-29 09:01:35.469951+07
20231827-14b1-4029-8855-517096e44de7	Supply chain package compromise	Incident involving Identity Provider. Investigated by the MedicareGuard SOC with automated evidence collection.	critical	open	P1	network	b7643562-4a3b-4bdc-87f5-ed48f78b9511	92d776fe-9846-4fa0-b8eb-d4b5318321a0	INC-20261015-0022	2026-10-16 06:01:35.463+07	2026-10-16 02:01:35.463+07	\N	\N	Service availability	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-15T19:01:35.463Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-15T19:21:35.463Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-15T19:56:35.463Z"}]	{"assetId": "d369c839-7416-482f-ba27-4ce4906c7712", "assetName": "Identity Provider"}	2026-10-29 09:01:35.470247+07	2026-10-29 09:01:35.470247+07
707a3309-1761-4188-ab84-b321e0bea258	Billing service web shell deployment	Incident involving Admin Workstation. Investigated by the MedicareGuard SOC with automated evidence collection.	critical	resolved	P1	vulnerability	473353d6-ee2a-4345-adae-ca12b0fbee38	0b5e95ce-3f2b-4299-9e98-b4885de1043e	INC-20261018-0023	2026-10-18 19:01:35.463+07	2026-10-18 15:01:35.463+07	2026-10-18 20:01:35.463+07	Phishing attachment execution	Limited — contained early	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-18T08:01:35.463Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-18T08:21:35.463Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-18T08:56:35.463Z"}]	{"assetId": "20484773-319b-430f-bf71-adbab8001006", "assetName": "Admin Workstation"}	2026-10-29 09:01:35.470528+07	2026-10-29 09:01:35.470528+07
eaa5030f-a55b-4bac-a10c-c3fb3fb9f049	EHR database exfiltration attempt	Incident involving VPN Gateway. Investigated by the MedicareGuard SOC with automated evidence collection.	medium	recovered	P3	data-exfiltration	ebd7404f-d9cc-41ad-9c75-384026a7aff9	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	INC-20261019-0024	2026-10-22 03:01:35.463+07	2026-10-20 03:01:35.463+07	\N	\N	Limited — contained early	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-19T20:01:35.463Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-19T20:21:35.463Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-19T20:56:35.463Z"}]	{"assetId": "33177851-14ab-4ead-ba2a-7445d2b5ba38", "assetName": "VPN Gateway"}	2026-10-29 09:01:35.470789+07	2026-10-29 09:01:35.470789+07
f57ea1b7-8431-46ca-a518-d4c363d230fa	Billing service web shell deployment	Incident involving Appointment API. Investigated by the MedicareGuard SOC with automated evidence collection.	critical	eradicated	P1	vulnerability	dcd2d08a-7310-414d-ae20-09165cb0c384	ebd7404f-d9cc-41ad-9c75-384026a7aff9	INC-20261019-0025	2026-10-20 01:01:35.463+07	2026-10-19 21:01:35.463+07	\N	\N	Regulatory exposure	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-19T14:01:35.463Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-19T14:21:35.463Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-19T14:56:35.463Z"}]	{"assetId": "b741c818-a15a-4fd4-b5ce-d92e9235e852", "assetName": "Appointment API"}	2026-10-29 09:01:35.471099+07	2026-10-29 09:01:35.471099+07
538c89d4-0fd2-4478-ae01-5e8112fb17bd	Insider data access anomaly	Incident involving Admin Workstation. Investigated by the MedicareGuard SOC with automated evidence collection.	low	open	P4	data-exfiltration	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	b7d93566-607b-41f4-933f-612190e9288b	INC-20261020-0026	2026-10-22 19:01:35.463+07	2026-10-20 19:01:35.463+07	\N	\N	Financial fraud risk	[{"kind": "detection", "actor": "system", "message": "Automated detection raised by SIEM", "created_at": "2026-10-20T12:01:35.463Z"}, {"kind": "triage", "actor": "analyst@medicareguard.io", "message": "L1 analyst validated the alert", "created_at": "2026-10-20T12:21:35.463Z"}, {"kind": "containment", "actor": "analyst@medicareguard.io", "message": "Affected workload isolated from production", "created_at": "2026-10-20T12:56:35.463Z"}]	{"assetId": "20484773-319b-430f-bf71-adbab8001006", "assetName": "Admin Workstation"}	2026-10-29 09:01:35.471384+07	2026-10-29 09:01:35.471384+07
\.


--
-- Data for Name: integrations; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.integrations (id, name, provider, type, status, config, last_sync_at, metadata, created_at, updated_at) FROM stdin;
25da3140-2aca-4705-a81a-50b2847f5fad	CrowdStrike Falcon	CrowdStrike	edr	connected	{"region": "us-1"}	2026-10-29 09:01:35.669+07	{}	2026-10-29 09:01:35.669427+07	2026-10-29 09:01:35.669427+07
2f99f3a4-b498-4172-b110-e502cec3dbef	Elastic SIEM	Elastic	siem	connected	{"index": "mg-security-*"}	2026-10-29 09:01:35.669+07	{}	2026-10-29 09:01:35.669875+07	2026-10-29 09:01:35.669875+07
ac04d681-9587-4180-b132-61134a7cd0ec	Palo Alto Cortex	Palo Alto	firewall	connected	{"panorama": "mg-panorama"}	2026-10-29 08:01:35.669+07	{}	2026-10-29 09:01:35.67014+07	2026-10-29 09:01:35.67014+07
eda6b8e1-2492-4684-855a-c3eee8462ad3	AWS GuardDuty	AWS	cloud	connected	{"account": "medicare-prod"}	2026-10-29 09:01:35.669+07	{}	2026-10-29 09:01:35.670364+07	2026-10-29 09:01:35.670364+07
3d43b1ed-372b-4b7a-a5db-a2ee4cd45954	Okta	Okta	identity	connected	{"org": "medicareguard"}	2026-10-29 09:01:35.669+07	{}	2026-10-29 09:01:35.670588+07	2026-10-29 09:01:35.670588+07
a8afe17c-744a-4c16-8490-5301c2055b8e	Jira Service Management	Atlassian	ticketing	connected	{"project": "SOC"}	2026-10-29 06:01:35.669+07	{}	2026-10-29 09:01:35.67084+07	2026-10-29 09:01:35.67084+07
f1eb3253-2e86-4d95-be81-7b21c6d517b3	Slack	Slack	notification	connected	{"channel": "#soc-alerts"}	2026-10-29 09:01:35.669+07	{}	2026-10-29 09:01:35.671061+07	2026-10-29 09:01:35.671061+07
ee2fab8e-d197-4448-825c-1b1d9805d2c0	n8n Automation	n8n	soar	connected	{"baseUrl": "http://n8n:5678"}	2026-10-29 09:01:35.669+07	{}	2026-10-29 09:01:35.671364+07	2026-10-29 09:01:35.671364+07
dd5b122f-b86a-40fb-b224-58f3eb68f3b3	MISP	MISP	threat-intel	degraded	{"feed": "cti-shared"}	2026-10-29 03:01:35.669+07	{}	2026-10-29 09:01:35.671564+07	2026-10-29 09:01:35.671564+07
\.


--
-- Data for Name: knowledge_base; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.knowledge_base (id, title, category, status, content, author_id, tags, metadata, created_at, updated_at) FROM stdin;
60ce3cb7-615e-4c82-87c9-0eb4454d8d6c	How to triage a critical alert	runbook	published	Validate, enrich, contain, escalate within 15 minutes.	92d776fe-9846-4fa0-b8eb-d4b5318321a0	{triage,alerts}	{}	2026-10-29 09:01:35.649971+07	2026-10-29 09:01:35.649971+07
26a34c3e-7e68-4fc2-bee4-6b2017f29c0f	Ransomware containment checklist	runbook	published	Isolate hosts, preserve evidence, disable accounts, restore from backup.	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	{ransomware,incident-response}	{}	2026-10-29 09:01:35.650378+07	2026-10-29 09:01:35.650378+07
4298f270-4ae4-4a41-b518-6a0097156094	Firewall rule deployment	process	published	Peer review, change ticket, deploy to edge, validate hit counts.	b7d93566-607b-41f4-933f-612190e9288b	{firewall,change}	{}	2026-10-29 09:01:35.650597+07	2026-10-29 09:01:35.650597+07
2f00bb6a-ce0d-49d0-83dc-4a975b33e995	Phishing analysis guide	runbook	published	Inspect headers, detonate URLs, purge mailboxes, reset credentials.	b7643562-4a3b-4bdc-87f5-ed48f78b9511	{phishing,email}	{}	2026-10-29 09:01:35.650792+07	2026-10-29 09:01:35.650792+07
6e988b97-3e9e-439c-984f-b8e013d88c8e	HIPAA breach notification	compliance	published	Assess risk, notify privacy office within 24 hours, document decision.	0b5e95ce-3f2b-4299-9e98-b4885de1043e	{hipaa,privacy}	{}	2026-10-29 09:01:35.651012+07	2026-10-29 09:01:35.651012+07
cd36f426-2ac5-4a93-846e-5f89c9697905	Using the AI analyst safely	guide	published	AI output is advisory; confirm with telemetry before action.	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	{ai,governance}	{}	2026-10-29 09:01:35.651233+07	2026-10-29 09:01:35.651233+07
41e5a954-035f-4dbd-8351-87190b90d517	Vulnerability SLA matrix	process	published	Critical 72h, high 14d, medium 30d, low 90d.	473353d6-ee2a-4345-adae-ca12b0fbee38	{vulnerability,sla}	{}	2026-10-29 09:01:35.651445+07	2026-10-29 09:01:35.651445+07
96ba3644-dff4-493d-9ca1-bd1dabb6c9a2	Incident severity matrix	guide	published	P1 critical business impact, P2 high, P3 medium, P4 low.	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	{incident,severity}	{}	2026-10-29 09:01:35.65163+07	2026-10-29 09:01:35.65163+07
95ebf241-11d1-4faa-b271-63893abb72fc	CloudTrail investigation	runbook	published	Scope by principal, eventName and source IP; correlate with GuardDuty.	dcd2d08a-7310-414d-ae20-09165cb0c384	{aws,cloud}	{}	2026-10-29 09:01:35.651834+07	2026-10-29 09:01:35.651834+07
3dc68bbe-534e-41be-9ab2-1e2e996d2552	n8n automation operations	process	published	Monitor failed executions, retry idempotently, review audit logs.	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	{n8n,automation}	{}	2026-10-29 09:01:35.652058+07	2026-10-29 09:01:35.652058+07
\.


--
-- Data for Name: metrics; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.metrics (id, name, value, unit, source, tags, recorded_at, created_at, updated_at) FROM stdin;
3f328402-ff85-4ebb-a863-a1bf81a15d89	cpu_usage_percent	200	count	edr	{"env": "prod"}	2026-10-24 22:01:35.674+07	2026-10-29 09:01:35.674447+07	2026-10-29 09:01:35.674447+07
e7daa06a-af60-4b87-b347-410c03ba9668	cpu_usage_percent	191	count	platform	{"env": "prod"}	2026-10-23 04:01:35.674+07	2026-10-29 09:01:35.674804+07	2026-10-29 09:01:35.674804+07
a331c064-6df0-4501-a010-55634fbcf7c4	open_incidents	387	count	firewall	{"env": "prod"}	2026-10-23 01:01:35.674+07	2026-10-29 09:01:35.675078+07	2026-10-29 09:01:35.675078+07
ddd884bb-415f-45c9-94c8-865f6722964e	cpu_usage_percent	155	count	firewall	{"env": "prod"}	2026-10-29 04:01:35.674+07	2026-10-29 09:01:35.675298+07	2026-10-29 09:01:35.675298+07
b19fac9f-05bb-48fe-b40c-e624241d823e	blocked_requests	203	hours	platform	{"env": "prod"}	2026-10-27 18:01:35.674+07	2026-10-29 09:01:35.67549+07	2026-10-29 09:01:35.67549+07
2d9090f5-73cb-4680-931e-b41973e6662d	blocked_requests	364	percent	edr	{"env": "prod"}	2026-10-25 00:01:35.674+07	2026-10-29 09:01:35.675676+07	2026-10-29 09:01:35.675676+07
98b9896d-a2d4-4f23-92bb-f652630cc616	mttr_hours	386	seconds	firewall	{"env": "prod"}	2026-10-28 08:01:35.674+07	2026-10-29 09:01:35.675925+07	2026-10-29 09:01:35.675925+07
b0221974-8a90-416e-892c-3ac3a87958e7	ingest_lag_seconds	337	hours	platform	{"env": "prod"}	2026-10-23 03:01:35.674+07	2026-10-29 09:01:35.676108+07	2026-10-29 09:01:35.676108+07
6d8943fc-a28c-49a9-b271-02045af7c6f2	open_incidents	220	hours	siem	{"env": "prod"}	2026-10-27 03:01:35.674+07	2026-10-29 09:01:35.67629+07	2026-10-29 09:01:35.67629+07
4eabcabe-dd47-4426-9526-eeb44ede182d	mttr_hours	436	percent	edr	{"env": "prod"}	2026-10-26 01:01:35.674+07	2026-10-29 09:01:35.676529+07	2026-10-29 09:01:35.676529+07
bb466519-7bc2-4d57-abe4-d9ec22e538bd	open_incidents	34	hours	platform	{"env": "prod"}	2026-10-23 10:01:35.674+07	2026-10-29 09:01:35.676745+07	2026-10-29 09:01:35.676745+07
dfa36489-0791-48ee-a7cb-08249982c3cb	cpu_usage_percent	408	hours	siem	{"env": "prod"}	2026-10-25 04:01:35.674+07	2026-10-29 09:01:35.676942+07	2026-10-29 09:01:35.676942+07
3fc7bc8b-d2be-4a12-bb86-bdd84bdff606	open_incidents	260	seconds	platform	{"env": "prod"}	2026-10-22 12:01:35.674+07	2026-10-29 09:01:35.677162+07	2026-10-29 09:01:35.677162+07
51fd00e0-00fb-4a45-b459-f1afb789dc0e	blocked_requests	90	percent	siem	{"env": "prod"}	2026-10-26 04:01:35.674+07	2026-10-29 09:01:35.677352+07	2026-10-29 09:01:35.677352+07
fc1d3c42-5afc-49d8-a165-eefb3d573a54	ingest_lag_seconds	18	percent	platform	{"env": "prod"}	2026-10-29 08:01:35.674+07	2026-10-29 09:01:35.677523+07	2026-10-29 09:01:35.677523+07
af741d2f-edc3-4b9c-b4e6-1ac04e991c2b	blocked_requests	436	seconds	platform	{"env": "prod"}	2026-10-28 06:01:35.674+07	2026-10-29 09:01:35.677702+07	2026-10-29 09:01:35.677702+07
03eeac10-5cfc-4314-9ccf-b8e4db79cec1	alerts_per_hour	76	count	firewall	{"env": "prod"}	2026-10-24 05:01:35.674+07	2026-10-29 09:01:35.677867+07	2026-10-29 09:01:35.677867+07
57e10495-cb83-443f-9333-5bb27cb17674	open_incidents	483	percent	edr	{"env": "prod"}	2026-10-27 13:01:35.674+07	2026-10-29 09:01:35.678086+07	2026-10-29 09:01:35.678086+07
b50d3c95-5286-46f5-adb1-d6afed6ed3fc	ingest_lag_seconds	296	percent	siem	{"env": "prod"}	2026-10-28 01:01:35.674+07	2026-10-29 09:01:35.67828+07	2026-10-29 09:01:35.67828+07
a65ca039-40e6-4340-b083-d09e8bf555d4	ingest_lag_seconds	6	count	platform	{"env": "prod"}	2026-10-25 20:01:35.674+07	2026-10-29 09:01:35.678438+07	2026-10-29 09:01:35.678438+07
6ed0ab24-fd7a-4f0d-baed-94acc124464e	cpu_usage_percent	472	count	platform	{"env": "prod"}	2026-10-27 21:01:35.674+07	2026-10-29 09:01:35.67863+07	2026-10-29 09:01:35.67863+07
e4e06afa-0280-47a3-b00e-9ec8b716457a	mttr_hours	82	seconds	siem	{"env": "prod"}	2026-10-22 15:01:35.674+07	2026-10-29 09:01:35.678783+07	2026-10-29 09:01:35.678783+07
484da662-ebc5-49c7-86dd-21730ff199f9	open_incidents	219	seconds	firewall	{"env": "prod"}	2026-10-23 02:01:35.674+07	2026-10-29 09:01:35.678967+07	2026-10-29 09:01:35.678967+07
4bcd6358-4c69-4efd-924f-553538faff09	blocked_requests	158	hours	firewall	{"env": "prod"}	2026-10-26 18:01:35.674+07	2026-10-29 09:01:35.679135+07	2026-10-29 09:01:35.679135+07
98e9ee0f-ea2c-404e-95fa-983b875306be	cpu_usage_percent	244	hours	platform	{"env": "prod"}	2026-10-22 14:01:35.674+07	2026-10-29 09:01:35.679341+07	2026-10-29 09:01:35.679341+07
e932b469-ec4b-4748-9323-d044a0b2a2a9	open_incidents	413	percent	firewall	{"env": "prod"}	2026-10-23 15:01:35.674+07	2026-10-29 09:01:35.679519+07	2026-10-29 09:01:35.679519+07
44d4c849-0837-45af-9c61-52da19fa508c	cpu_usage_percent	94	seconds	siem	{"env": "prod"}	2026-10-23 19:01:35.674+07	2026-10-29 09:01:35.679671+07	2026-10-29 09:01:35.679671+07
54677fd1-367c-4bef-97f8-39bba2da982f	alerts_per_hour	258	percent	siem	{"env": "prod"}	2026-10-24 04:01:35.674+07	2026-10-29 09:01:35.679937+07	2026-10-29 09:01:35.679937+07
ce49bc9b-ed3c-41d1-8243-96a08296478d	mttr_hours	437	percent	platform	{"env": "prod"}	2026-10-27 05:01:35.674+07	2026-10-29 09:01:35.680146+07	2026-10-29 09:01:35.680146+07
d2e26a57-700a-456b-aa4a-0a44f5a4b052	open_incidents	471	seconds	platform	{"env": "prod"}	2026-10-28 03:01:35.674+07	2026-10-29 09:01:35.680365+07	2026-10-29 09:01:35.680365+07
8fa28378-f204-49dc-b2d7-441a83c79ce3	alerts_per_hour	74	percent	firewall	{"env": "prod"}	2026-10-26 13:01:35.674+07	2026-10-29 09:01:35.680577+07	2026-10-29 09:01:35.680577+07
d3a77231-c400-4443-a76a-f10d57916576	mttr_hours	267	hours	edr	{"env": "prod"}	2026-10-27 17:01:35.674+07	2026-10-29 09:01:35.680786+07	2026-10-29 09:01:35.680786+07
2550ff4b-2a48-44ca-b20b-0fa9f2b69d90	blocked_requests	404	hours	platform	{"env": "prod"}	2026-10-25 07:01:35.674+07	2026-10-29 09:01:35.680993+07	2026-10-29 09:01:35.680993+07
25450820-4954-4767-bb65-472d511605d8	ingest_lag_seconds	124	seconds	firewall	{"env": "prod"}	2026-10-23 14:01:35.674+07	2026-10-29 09:01:35.68123+07	2026-10-29 09:01:35.68123+07
338719b1-bef2-4b56-9c9b-569e0e45c111	ingest_lag_seconds	306	seconds	edr	{"env": "prod"}	2026-10-22 11:01:35.674+07	2026-10-29 09:01:35.681462+07	2026-10-29 09:01:35.681462+07
1d2e87be-a0fd-4091-b01f-c14bca036fb0	blocked_requests	344	seconds	edr	{"env": "prod"}	2026-10-23 15:01:35.674+07	2026-10-29 09:01:35.681654+07	2026-10-29 09:01:35.681654+07
dc0842bc-73ff-4d92-9404-413cde9a4041	blocked_requests	179	hours	edr	{"env": "prod"}	2026-10-29 02:01:35.674+07	2026-10-29 09:01:35.681871+07	2026-10-29 09:01:35.681871+07
3038790e-a1f6-47e1-809b-4b1e8d68983b	alerts_per_hour	157	seconds	siem	{"env": "prod"}	2026-10-23 06:01:35.674+07	2026-10-29 09:01:35.682088+07	2026-10-29 09:01:35.682088+07
f43f0dbb-6e66-497b-a9e0-e720f2f577f7	ingest_lag_seconds	139	count	platform	{"env": "prod"}	2026-10-24 09:01:35.674+07	2026-10-29 09:01:35.682355+07	2026-10-29 09:01:35.682355+07
e048fae7-f606-459e-bafc-2bea3ad89451	ingest_lag_seconds	97	seconds	firewall	{"env": "prod"}	2026-10-23 05:01:35.674+07	2026-10-29 09:01:35.682643+07	2026-10-29 09:01:35.682643+07
4417bb1e-33ca-4285-99cd-3dc082e31444	ingest_lag_seconds	316	seconds	siem	{"env": "prod"}	2026-10-24 00:01:35.674+07	2026-10-29 09:01:35.682895+07	2026-10-29 09:01:35.682895+07
168a37ca-9a49-4eea-bdc7-11152b361540	cpu_usage_percent	58	seconds	siem	{"env": "prod"}	2026-10-27 06:01:35.674+07	2026-10-29 09:01:35.683157+07	2026-10-29 09:01:35.683157+07
5db76858-2581-491c-852e-e0f699b32c5c	open_incidents	154	percent	edr	{"env": "prod"}	2026-10-27 23:01:35.674+07	2026-10-29 09:01:35.683392+07	2026-10-29 09:01:35.683392+07
2d976f79-a32e-4f32-9e63-3a2d5099f7e0	mttr_hours	181	hours	siem	{"env": "prod"}	2026-10-25 12:01:35.674+07	2026-10-29 09:01:35.683626+07	2026-10-29 09:01:35.683626+07
3173486f-6364-4053-810f-3f9e051075d5	alerts_per_hour	316	hours	firewall	{"env": "prod"}	2026-10-27 08:01:35.674+07	2026-10-29 09:01:35.683846+07	2026-10-29 09:01:35.683846+07
4f248d2b-b396-4597-baa5-e95740792ca4	mttr_hours	493	seconds	firewall	{"env": "prod"}	2026-10-25 05:01:35.674+07	2026-10-29 09:01:35.684099+07	2026-10-29 09:01:35.684099+07
941437a2-5969-4121-b464-40353794ba0e	alerts_per_hour	261	seconds	firewall	{"env": "prod"}	2026-10-24 02:01:35.674+07	2026-10-29 09:01:35.684336+07	2026-10-29 09:01:35.684336+07
14af17c4-6cb5-4f99-a64f-c25f25f12d42	mttr_hours	207	percent	edr	{"env": "prod"}	2026-10-27 03:01:35.674+07	2026-10-29 09:01:35.684541+07	2026-10-29 09:01:35.684541+07
75a64690-c5a6-46aa-917f-d0e140a7b3f2	mttr_hours	449	seconds	firewall	{"env": "prod"}	2026-10-23 13:01:35.674+07	2026-10-29 09:01:35.684703+07	2026-10-29 09:01:35.684703+07
ce63c7f9-0573-4c46-b2fc-63330215aae3	cpu_usage_percent	424	hours	platform	{"env": "prod"}	2026-10-27 16:01:35.674+07	2026-10-29 09:01:35.684881+07	2026-10-29 09:01:35.684881+07
326835d0-8458-455d-a965-d072050f971c	mttr_hours	364	count	edr	{"env": "prod"}	2026-10-27 03:01:35.674+07	2026-10-29 09:01:35.685062+07	2026-10-29 09:01:35.685062+07
c44dc0fb-918e-4f0d-b30a-6daeb07f93f7	cpu_usage_percent	495	hours	platform	{"env": "prod"}	2026-10-22 22:01:35.674+07	2026-10-29 09:01:35.685231+07	2026-10-29 09:01:35.685231+07
96b45902-98f3-4f21-980e-abdd6fe49187	mttr_hours	255	count	edr	{"env": "prod"}	2026-10-28 18:01:35.674+07	2026-10-29 09:01:35.685415+07	2026-10-29 09:01:35.685415+07
ddab91fe-ddf1-4704-a006-53f3a73d8e85	cpu_usage_percent	132	count	edr	{"env": "prod"}	2026-10-25 00:01:35.674+07	2026-10-29 09:01:35.685592+07	2026-10-29 09:01:35.685592+07
8ea484e3-a07a-48eb-b837-76b321c3477e	cpu_usage_percent	233	seconds	edr	{"env": "prod"}	2026-10-25 18:01:35.674+07	2026-10-29 09:01:35.685783+07	2026-10-29 09:01:35.685783+07
7796f8f3-def8-4069-bdf7-c8b92a25d9a5	open_incidents	225	percent	edr	{"env": "prod"}	2026-10-24 10:01:35.674+07	2026-10-29 09:01:35.685982+07	2026-10-29 09:01:35.685982+07
bf4a552a-4dc9-4eeb-b63d-d3299acf6162	blocked_requests	134	count	platform	{"env": "prod"}	2026-10-22 18:01:35.674+07	2026-10-29 09:01:35.686203+07	2026-10-29 09:01:35.686203+07
7640d633-ada5-4ce0-b950-a798f59cbee8	cpu_usage_percent	54	percent	siem	{"env": "prod"}	2026-10-28 04:01:35.674+07	2026-10-29 09:01:35.686379+07	2026-10-29 09:01:35.686379+07
3d0d2c72-63b9-4a99-b5b5-7e884b0997a2	alerts_per_hour	276	hours	firewall	{"env": "prod"}	2026-10-25 08:01:35.674+07	2026-10-29 09:01:35.68656+07	2026-10-29 09:01:35.68656+07
02237bed-66a0-449c-a0f5-ac8db6d14241	alerts_per_hour	307	count	siem	{"env": "prod"}	2026-10-22 22:01:35.674+07	2026-10-29 09:01:35.686763+07	2026-10-29 09:01:35.686763+07
\.


--
-- Data for Name: monitors; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.monitors (id, name, type, target, status, interval_seconds, last_checked_at, uptime_percent, metadata, created_at, updated_at) FROM stdin;
0291b5a1-5ae4-41ec-b2fa-fe6cf9929c6c	Patient Portal uptime	uptime	https://portal.medicareguard.io	up	60	2026-10-29 09:01:35.589+07	99.99	{}	2026-10-29 09:01:35.589876+07	2026-10-29 09:01:35.589876+07
07c4f20c-10f9-4b13-a15f-5b6d6d5cc38d	EHR API health	api	https://api.medicareguard.io/health	up	30	2026-10-29 09:01:35.589+07	99.97	{}	2026-10-29 09:01:35.590255+07	2026-10-29 09:01:35.590255+07
b01c1415-c747-4521-8462-8734a1b8012d	SIEM ingest lag	metric	siem-ingest	degraded	60	2026-10-29 09:01:35.589+07	98.32	{}	2026-10-29 09:01:35.590427+07	2026-10-29 09:01:35.590427+07
916813c2-eb01-4e19-81ae-5874aa9327eb	VPN gateway latency	synthetic	vpn.medicareguard.io	up	60	2026-10-29 09:01:35.589+07	99.91	{}	2026-10-29 09:01:35.590624+07	2026-10-29 09:01:35.590624+07
e2b577fb-721a-46aa-9a16-1451ddb39cc4	Backup job success	job	vault.medicareguard.io	up	3600	2026-10-29 07:01:35.589+07	100.00	{}	2026-10-29 09:01:35.59083+07	2026-10-29 09:01:35.59083+07
d68eb229-6a67-4854-a1f6-3a151364ba09	Identity provider	api	https://idp.medicareguard.io	up	30	2026-10-29 09:01:35.589+07	99.99	{}	2026-10-29 09:01:35.591067+07	2026-10-29 09:01:35.591067+07
c4d2c968-33c0-4707-b0e7-a931c83746ea	Telehealth media	synthetic	telehealth.medicareguard.io	up	60	2026-10-29 09:01:35.589+07	99.84	{}	2026-10-29 09:01:35.591301+07	2026-10-29 09:01:35.591301+07
0a65d662-85d5-4b74-8161-e9677ebeee56	DNS resolution	dns	dns.medicareguard.io	up	30	2026-10-29 09:01:35.589+07	99.95	{}	2026-10-29 09:01:35.591519+07	2026-10-29 09:01:35.591519+07
\.


--
-- Data for Name: network_flows; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.network_flows (id, src_ip, dst_ip, src_port, dst_port, protocol, bytes, packets, action, verdict, recorded_at, metadata, created_at, updated_at) FROM stdin;
c1dbeaae-e8c7-4620-b364-e47dee47827b	5.81.95.118	10.10.5.248	60651	22	icmp	4581292	174	allow	benign	2026-10-26 10:01:35.601+07	{}	2026-10-29 09:01:35.60204+07	2026-10-29 09:01:35.60204+07
cfe315bd-f123-4279-998d-1aaa4b14f081	10.10.4.46	176.107.155.163	5781	53	tcp	4230682	4020	allow	benign	2026-10-28 14:01:35.601+07	{}	2026-10-29 09:01:35.602567+07	2026-10-29 09:01:35.602567+07
0a907168-c806-4d0c-8989-a53232e869b2	82.143.56.111	77.86.245.56	57586	9090	icmp	2165486	2194	deny	suspicious	2026-10-27 17:01:35.601+07	{}	2026-10-29 09:01:35.602809+07	2026-10-29 09:01:35.602809+07
3acefbf8-bf02-4722-8899-1993bad9eb39	181.206.34.48	10.10.8.236	30848	22	tcp	4046291	4721	allow	benign	2026-10-28 16:01:35.601+07	{}	2026-10-29 09:01:35.603345+07	2026-10-29 09:01:35.603345+07
85938af7-f24d-4d2f-ac9a-62c67afb9c53	10.10.8.160	10.10.6.232	45270	8080	tcp	653092	36	deny	malicious	2026-10-28 08:01:35.601+07	{}	2026-10-29 09:01:35.603583+07	2026-10-29 09:01:35.603583+07
db4b51dd-68f2-44ab-82ad-4ad968e1bf8a	181.252.140.242	103.195.102.251	50519	53	tcp	1803708	514	deny	benign	2026-10-27 10:01:35.601+07	{}	2026-10-29 09:01:35.603823+07	2026-10-29 09:01:35.603823+07
0176469b-108c-43a6-8c08-184c14b1517d	10.10.2.248	10.10.1.247	47505	80	udp	4834794	2713	allow	malicious	2026-10-29 07:01:35.601+07	{}	2026-10-29 09:01:35.604044+07	2026-10-29 09:01:35.604044+07
4e6dc486-348f-4f43-8aaa-abf46890d6de	37.40.212.180	10.10.4.58	61991	443	tcp	1829327	1652	allow	suspicious	2026-10-29 03:01:35.601+07	{}	2026-10-29 09:01:35.604284+07	2026-10-29 09:01:35.604284+07
00d5bbc7-a23d-4ce4-8330-632e1afd5965	203.13.195.243	10.10.4.116	12335	3389	icmp	1228487	3390	deny	suspicious	2026-10-29 02:01:35.601+07	{}	2026-10-29 09:01:35.6045+07	2026-10-29 09:01:35.6045+07
f07092d4-d6d6-4e9a-acd8-f69c0e935fd6	10.10.4.210	62.32.204.147	15915	53	tcp	1866783	2713	allow	benign	2026-10-26 12:01:35.601+07	{}	2026-10-29 09:01:35.604706+07	2026-10-29 09:01:35.604706+07
8ae5d9ac-0e33-4a00-b07f-6b81375d84a5	10.10.8.218	102.235.207.191	3526	22	tcp	4331516	3781	allow	suspicious	2026-10-26 14:01:35.601+07	{}	2026-10-29 09:01:35.604921+07	2026-10-29 09:01:35.604921+07
6710d4f9-6e50-4ca8-be2e-f1859f9baeac	10.10.2.57	10.10.6.205	14037	5432	icmp	3691659	1753	deny	benign	2026-10-27 12:01:35.601+07	{}	2026-10-29 09:01:35.605133+07	2026-10-29 09:01:35.605133+07
60875013-7bff-4450-a04c-9d29254476e6	82.208.74.39	41.150.100.26	35392	5432	icmp	1004532	2646	allow	benign	2026-10-26 20:01:35.601+07	{}	2026-10-29 09:01:35.605348+07	2026-10-29 09:01:35.605348+07
80112052-5001-4a46-a91b-68bb00341432	203.51.132.15	77.107.80.36	10520	22	icmp	2512113	4845	allow	malicious	2026-10-27 13:01:35.601+07	{}	2026-10-29 09:01:35.605582+07	2026-10-29 09:01:35.605582+07
4fdf67ed-384b-4f93-ad0f-8cef2a5d38e4	41.224.148.213	80.116.200.59	14355	80	tcp	3134252	418	allow	suspicious	2026-10-27 05:01:35.601+07	{}	2026-10-29 09:01:35.605796+07	2026-10-29 09:01:35.605796+07
32e916b0-b67d-416b-8ee0-d32afb25971b	91.20.0.103	10.10.8.31	10812	9090	udp	3098389	39	allow	malicious	2026-10-26 19:01:35.601+07	{}	2026-10-29 09:01:35.606037+07	2026-10-29 09:01:35.606037+07
763c5892-4f29-464f-8476-0627263ec054	10.10.2.115	62.254.50.79	37857	8080	udp	4082187	1853	allow	benign	2026-10-28 10:01:35.601+07	{}	2026-10-29 09:01:35.606274+07	2026-10-29 09:01:35.606274+07
7061b248-56b7-49b6-9eac-727863229cf3	203.113.74.147	10.10.2.18	31674	22	icmp	1088239	380	allow	suspicious	2026-10-29 05:01:35.601+07	{}	2026-10-29 09:01:35.606504+07	2026-10-29 09:01:35.606504+07
f56a3296-dcc6-4842-a77a-c82db071519c	10.10.3.214	10.10.8.116	58405	80	udp	3403028	3206	deny	suspicious	2026-10-28 01:01:35.601+07	{}	2026-10-29 09:01:35.606724+07	2026-10-29 09:01:35.606724+07
efaee1ca-81ee-4f97-87bf-70f61c79595a	41.79.236.221	10.10.7.106	57969	5432	tcp	2731904	1011	allow	suspicious	2026-10-28 02:01:35.601+07	{}	2026-10-29 09:01:35.606939+07	2026-10-29 09:01:35.606939+07
11b3bd17-e691-4600-adba-79c69567efda	194.87.94.84	10.10.5.97	38146	9090	icmp	316979	4991	deny	benign	2026-10-26 11:01:35.601+07	{}	2026-10-29 09:01:35.607156+07	2026-10-29 09:01:35.607156+07
0df9f377-d7ab-4096-9b3d-e72d877b12a0	10.10.7.108	41.74.87.93	15281	443	tcp	4248259	4719	allow	benign	2026-10-27 10:01:35.601+07	{}	2026-10-29 09:01:35.607385+07	2026-10-29 09:01:35.607385+07
d041b600-2ad8-4042-90d2-48a0ba4c5d6a	82.170.56.90	10.10.4.135	58415	443	tcp	4032048	2321	allow	malicious	2026-10-28 21:01:35.601+07	{}	2026-10-29 09:01:35.60761+07	2026-10-29 09:01:35.60761+07
e4575021-a960-4132-8200-5c357b365200	10.10.4.30	10.10.1.32	49834	22	tcp	2206027	923	allow	benign	2026-10-26 14:01:35.601+07	{}	2026-10-29 09:01:35.607807+07	2026-10-29 09:01:35.607807+07
30c9676f-0f30-4cbe-a9cc-2536681fb327	10.10.6.212	10.10.1.228	63788	8080	icmp	1327407	3282	allow	malicious	2026-10-28 19:01:35.601+07	{}	2026-10-29 09:01:35.608026+07	2026-10-29 09:01:35.608026+07
54f5c960-622e-49b6-8c69-cc225dd7dd48	10.10.1.182	10.10.7.153	57947	53	udp	2981411	1731	allow	suspicious	2026-10-29 04:01:35.601+07	{}	2026-10-29 09:01:35.608258+07	2026-10-29 09:01:35.608258+07
5bc6f49a-5699-4320-8ef1-f5edf77dd599	10.10.3.180	10.10.8.177	14144	5432	icmp	2502282	2665	allow	malicious	2026-10-28 15:01:35.601+07	{}	2026-10-29 09:01:35.60847+07	2026-10-29 09:01:35.60847+07
db24b0df-d812-4dab-b673-c885c9725e23	82.145.239.59	41.60.175.104	45860	9090	icmp	367910	1215	allow	benign	2026-10-27 08:01:35.601+07	{}	2026-10-29 09:01:35.608671+07	2026-10-29 09:01:35.608671+07
4ce33124-05cb-4a28-be92-ae1e063b0f39	10.10.6.137	10.10.7.222	62305	3389	icmp	1718867	2288	deny	benign	2026-10-27 16:01:35.601+07	{}	2026-10-29 09:01:35.608873+07	2026-10-29 09:01:35.608873+07
16d0d30a-cda1-467f-9b82-f9d777baea39	185.8.52.88	10.10.6.166	32614	3389	tcp	2972528	3105	deny	benign	2026-10-26 19:01:35.601+07	{}	2026-10-29 09:01:35.609094+07	2026-10-29 09:01:35.609094+07
c7af7605-e281-43a2-9d14-dded0a45e067	10.10.6.95	10.10.1.4	51460	443	icmp	2319253	2932	allow	benign	2026-10-27 04:01:35.601+07	{}	2026-10-29 09:01:35.609334+07	2026-10-29 09:01:35.609334+07
16afa6f1-e4a6-443a-9b2f-41f26955f0cf	102.22.186.25	10.10.1.169	26833	443	icmp	3595934	2196	deny	benign	2026-10-28 08:01:35.601+07	{}	2026-10-29 09:01:35.609551+07	2026-10-29 09:01:35.609551+07
2014f354-2e96-43fe-9a0f-eedce4a213e4	10.10.4.213	10.10.4.161	35173	443	icmp	1607657	2998	allow	malicious	2026-10-26 12:01:35.601+07	{}	2026-10-29 09:01:35.609811+07	2026-10-29 09:01:35.609811+07
7edb9caa-f703-4586-ae57-5348b9c14ec5	103.49.242.130	109.30.52.57	24481	53	icmp	4672720	4719	allow	malicious	2026-10-28 15:01:35.601+07	{}	2026-10-29 09:01:35.610075+07	2026-10-29 09:01:35.610075+07
376e0e4c-725c-4adb-96f3-4ee622d364a4	89.77.125.168	10.10.6.198	25644	53	udp	439319	3992	deny	malicious	2026-10-26 20:01:35.601+07	{}	2026-10-29 09:01:35.610308+07	2026-10-29 09:01:35.610308+07
967985c9-6f71-40cb-adff-53bb64eea411	10.10.1.111	10.10.4.139	8163	8080	icmp	896977	1382	allow	suspicious	2026-10-27 23:01:35.601+07	{}	2026-10-29 09:01:35.610522+07	2026-10-29 09:01:35.610522+07
6340a5a7-9513-4ff9-8503-f80d5dd2164d	62.22.69.51	10.10.6.170	47791	80	tcp	2180479	952	allow	benign	2026-10-27 08:01:35.601+07	{}	2026-10-29 09:01:35.610732+07	2026-10-29 09:01:35.610732+07
eb0cf2d1-73e1-4c70-8336-6afad21af117	181.60.25.204	10.10.6.86	39898	22	icmp	3605604	4796	allow	suspicious	2026-10-29 05:01:35.601+07	{}	2026-10-29 09:01:35.610958+07	2026-10-29 09:01:35.610958+07
f6dac0ef-c2cb-4cd2-87a4-5a591d97a7ab	10.10.5.167	10.10.8.79	17142	22	icmp	3690919	3111	allow	benign	2026-10-28 07:01:35.601+07	{}	2026-10-29 09:01:35.611167+07	2026-10-29 09:01:35.611167+07
7dfdb4ea-effb-4601-a686-c3ecc488aa95	203.116.124.222	10.10.2.250	57059	53	icmp	311770	4185	allow	benign	2026-10-27 04:01:35.601+07	{}	2026-10-29 09:01:35.611372+07	2026-10-29 09:01:35.611372+07
d7fece3e-7996-4504-b9f2-559d07817eed	109.92.230.149	194.171.246.248	14680	22	udp	3681251	4941	allow	benign	2026-10-28 01:01:35.601+07	{}	2026-10-29 09:01:35.611592+07	2026-10-29 09:01:35.611592+07
8f1cacae-1444-4695-83f9-7bf2ad14dfbf	10.10.2.60	10.10.4.6	10251	3389	tcp	325745	2831	allow	benign	2026-10-27 00:01:35.601+07	{}	2026-10-29 09:01:35.61183+07	2026-10-29 09:01:35.61183+07
0fa56b31-f362-4db2-a38c-d746238d1ce9	10.10.5.24	10.10.7.212	12334	22	udp	4391831	4784	allow	malicious	2026-10-26 17:01:35.601+07	{}	2026-10-29 09:01:35.612101+07	2026-10-29 09:01:35.612101+07
86537986-6a67-4dc5-b1b3-91de7efd3bf3	10.10.6.98	10.10.7.114	57306	443	udp	4967307	1231	deny	malicious	2026-10-27 09:01:35.601+07	{}	2026-10-29 09:01:35.612322+07	2026-10-29 09:01:35.612322+07
cda7d352-8c7f-41db-a26f-4b6c0b70eea8	212.8.60.9	10.10.6.158	2561	53	udp	2856773	973	allow	suspicious	2026-10-27 10:01:35.601+07	{}	2026-10-29 09:01:35.612576+07	2026-10-29 09:01:35.612576+07
5b70d66b-bdbd-4542-ae99-9e7785bf5f46	194.134.170.112	10.10.4.38	15999	3389	udp	761468	4519	deny	suspicious	2026-10-28 00:01:35.601+07	{}	2026-10-29 09:01:35.612816+07	2026-10-29 09:01:35.612816+07
7b1da7c9-2726-474d-b933-71c3882ecb76	10.10.4.222	10.10.4.198	25681	53	tcp	1147269	4806	allow	suspicious	2026-10-26 17:01:35.601+07	{}	2026-10-29 09:01:35.61309+07	2026-10-29 09:01:35.61309+07
b6a9e5e1-edec-4b48-95de-163e1da0d880	10.10.5.197	10.10.3.217	47998	5432	icmp	1283141	2460	allow	malicious	2026-10-28 17:01:35.601+07	{}	2026-10-29 09:01:35.613351+07	2026-10-29 09:01:35.613351+07
d0414b0f-c112-4612-8a66-87987f3c2043	10.10.3.28	10.10.7.142	43390	5432	tcp	1115864	255	allow	suspicious	2026-10-29 07:01:35.601+07	{}	2026-10-29 09:01:35.613561+07	2026-10-29 09:01:35.613561+07
18a57bc3-b0bd-476f-8951-34cded70c187	89.247.236.87	10.10.6.61	34006	53	tcp	3308328	4236	deny	benign	2026-10-27 14:01:35.601+07	{}	2026-10-29 09:01:35.613757+07	2026-10-29 09:01:35.613757+07
6fe1b991-4cf4-4e76-ac05-9c047ac0f5e8	102.105.63.205	10.10.2.81	10776	5432	udp	3614456	3602	deny	malicious	2026-10-26 18:01:35.601+07	{}	2026-10-29 09:01:35.614003+07	2026-10-29 09:01:35.614003+07
b1ce5616-7614-4c5c-a43a-c9282f69a7eb	10.10.6.168	10.10.5.174	37803	8080	udp	4886612	4847	allow	benign	2026-10-26 15:01:35.601+07	{}	2026-10-29 09:01:35.614228+07	2026-10-29 09:01:35.614228+07
0f41451a-aa0f-4fd8-ad54-e3c61146c5a9	31.104.170.13	10.10.4.54	5624	5432	udp	2090972	2291	allow	suspicious	2026-10-28 10:01:35.601+07	{}	2026-10-29 09:01:35.614446+07	2026-10-29 09:01:35.614446+07
18f249b9-7dbe-42c7-949f-4e99c29a1943	37.239.12.59	10.10.2.146	26890	53	tcp	166461	1337	allow	benign	2026-10-27 23:01:35.601+07	{}	2026-10-29 09:01:35.614689+07	2026-10-29 09:01:35.614689+07
a3204c33-3e16-4bc0-bfc8-a5596d2212b0	77.111.96.22	185.192.62.75	49922	3389	tcp	4960795	1526	allow	benign	2026-10-28 00:01:35.601+07	{}	2026-10-29 09:01:35.615016+07	2026-10-29 09:01:35.615016+07
402c9b58-2b81-44ba-8020-0890013448a0	10.10.2.65	10.10.8.87	55669	5432	icmp	3332735	3227	deny	suspicious	2026-10-28 07:01:35.601+07	{}	2026-10-29 09:01:35.615234+07	2026-10-29 09:01:35.615234+07
fc0e136b-15b4-4f5c-8551-eaa38cc63339	89.150.218.47	37.53.25.9	1722	80	tcp	4033101	3852	allow	benign	2026-10-28 01:01:35.601+07	{}	2026-10-29 09:01:35.615435+07	2026-10-29 09:01:35.615435+07
8a66649b-c24c-485f-ac93-16a9e3d6e748	10.10.8.230	82.102.254.213	20910	22	tcp	3257999	3995	deny	benign	2026-10-27 10:01:35.601+07	{}	2026-10-29 09:01:35.615672+07	2026-10-29 09:01:35.615672+07
052fd5d1-bb05-4d18-8429-a3de49311835	10.10.7.11	10.10.5.88	42052	443	tcp	3157145	4690	allow	suspicious	2026-10-28 18:01:35.601+07	{}	2026-10-29 09:01:35.615978+07	2026-10-29 09:01:35.615978+07
333f492b-30fa-4595-80a8-fb9f8702074f	10.10.5.70	10.10.5.235	38359	9090	icmp	2792862	3164	allow	benign	2026-10-27 02:01:35.601+07	{}	2026-10-29 09:01:35.616263+07	2026-10-29 09:01:35.616263+07
ea8987d5-a657-4d3e-a4b1-4bb2be11f796	82.247.218.54	10.10.1.4	3680	80	tcp	163442	1960	allow	benign	2026-10-28 18:01:35.601+07	{}	2026-10-29 09:01:35.616535+07	2026-10-29 09:01:35.616535+07
58430b5c-2ee7-4a34-83e8-d7d2cbc55603	10.10.4.78	10.10.7.189	36879	443	tcp	4199437	1360	allow	benign	2026-10-26 11:01:35.601+07	{}	2026-10-29 09:01:35.616814+07	2026-10-29 09:01:35.616814+07
5332eaae-60fe-4c79-97fa-7cc185615884	10.10.3.96	212.202.193.15	8559	22	udp	1949717	3803	allow	suspicious	2026-10-27 12:01:35.601+07	{}	2026-10-29 09:01:35.617167+07	2026-10-29 09:01:35.617167+07
af343339-1fb2-4b9b-8240-d8fd3bd25033	10.10.7.77	10.10.4.223	24138	443	tcp	4552067	566	deny	benign	2026-10-27 02:01:35.601+07	{}	2026-10-29 09:01:35.617418+07	2026-10-29 09:01:35.617418+07
6ab4250e-24fd-4e87-8099-6472e6d76b36	10.10.2.51	10.10.7.232	44436	9090	tcp	4705203	1118	allow	suspicious	2026-10-28 06:01:35.601+07	{}	2026-10-29 09:01:35.617642+07	2026-10-29 09:01:35.617642+07
329453d7-7f68-41be-84bc-6381edcfc2dd	10.10.3.44	10.10.7.37	35995	9090	udp	1987813	4894	allow	suspicious	2026-10-28 19:01:35.601+07	{}	2026-10-29 09:01:35.617839+07	2026-10-29 09:01:35.617839+07
b4d58472-cb85-4afa-a810-947e16fcb11f	10.10.1.77	10.10.2.30	31528	5432	icmp	1864740	3036	allow	malicious	2026-10-27 13:01:35.601+07	{}	2026-10-29 09:01:35.618064+07	2026-10-29 09:01:35.618064+07
ca6e5046-2a1b-464f-8060-9ae7a8666e80	185.48.138.5	10.10.1.54	44745	9090	tcp	4641462	1855	allow	suspicious	2026-10-28 21:01:35.601+07	{}	2026-10-29 09:01:35.618314+07	2026-10-29 09:01:35.618314+07
0c42c7f7-aae5-4330-b373-b593d913eeaa	103.59.59.144	91.170.128.201	27032	443	tcp	2140857	1867	deny	benign	2026-10-26 11:01:35.601+07	{}	2026-10-29 09:01:35.618528+07	2026-10-29 09:01:35.618528+07
932699d4-a71f-4ea7-b32b-0543eaff40db	176.173.133.66	10.10.6.75	15831	443	icmp	4007352	3092	deny	suspicious	2026-10-28 02:01:35.601+07	{}	2026-10-29 09:01:35.61877+07	2026-10-29 09:01:35.61877+07
a61df90d-c1f6-49a7-8907-51ef58481d08	37.90.81.163	10.10.3.57	62603	53	udp	1944127	1371	deny	benign	2026-10-26 09:01:35.601+07	{}	2026-10-29 09:01:35.619041+07	2026-10-29 09:01:35.619041+07
d4771623-135b-472c-9404-d57085bb888a	181.191.65.50	10.10.3.120	14322	443	tcp	3831992	483	allow	malicious	2026-10-28 09:01:35.601+07	{}	2026-10-29 09:01:35.619274+07	2026-10-29 09:01:35.619274+07
598f8ce0-92fe-4b80-bdd2-a88fcb3f8c38	41.120.43.227	10.10.8.9	53555	80	tcp	2892909	4648	allow	benign	2026-10-28 05:01:35.601+07	{}	2026-10-29 09:01:35.619477+07	2026-10-29 09:01:35.619477+07
4e40804d-858d-45f2-b8ae-9d24c503ae81	37.170.138.25	10.10.2.202	15842	22	tcp	3388498	3441	allow	malicious	2026-10-27 10:01:35.601+07	{}	2026-10-29 09:01:35.61968+07	2026-10-29 09:01:35.61968+07
e3848faf-0c21-4c73-b2ab-35793e1a8365	103.67.114.171	10.10.1.48	39092	9090	icmp	2407934	3800	deny	malicious	2026-10-29 04:01:35.601+07	{}	2026-10-29 09:01:35.619908+07	2026-10-29 09:01:35.619908+07
3eeaef4a-d0f0-4ffa-9993-2e77e553c77c	176.92.149.164	10.10.7.97	19754	8080	udp	2415843	3140	allow	malicious	2026-10-28 15:01:35.601+07	{}	2026-10-29 09:01:35.62016+07	2026-10-29 09:01:35.62016+07
f35c8f68-8856-42f7-bd78-4f232ee49e76	10.10.8.27	102.46.6.69	44883	80	udp	659964	2276	allow	benign	2026-10-27 15:01:35.601+07	{}	2026-10-29 09:01:35.620366+07	2026-10-29 09:01:35.620366+07
d41a98a5-05d7-4b2a-9be6-8864b672f0d3	37.208.157.61	10.10.2.216	52791	80	tcp	1607982	723	allow	benign	2026-10-27 21:01:35.601+07	{}	2026-10-29 09:01:35.620562+07	2026-10-29 09:01:35.620562+07
5535f73b-f488-4426-a2e3-a57bdf54fe49	10.10.6.223	10.10.5.7	54941	22	tcp	3282070	2384	allow	malicious	2026-10-29 03:01:35.601+07	{}	2026-10-29 09:01:35.620756+07	2026-10-29 09:01:35.620756+07
9454371c-3264-4b21-b17e-42f0e0bfd1ca	109.23.167.83	10.10.7.120	17679	80	icmp	3554122	1263	allow	malicious	2026-10-27 20:01:35.601+07	{}	2026-10-29 09:01:35.620962+07	2026-10-29 09:01:35.620962+07
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.notifications (id, user_id, title, message, type, read, link, metadata, created_at, updated_at) FROM stdin;
4fcde2e8-9c91-4d6b-9a49-10d562cd2488	0b5e95ce-3f2b-4299-9e98-b4885de1043e	New threat intel match	Incident INC-2026 is approaching its SLA deadline.	report	f	/alerts	{}	2026-10-29 09:01:35.687116+07	2026-10-29 09:01:35.687116+07
81c6feb6-8cff-4545-a938-a9e3c9ea0412	b8e0c918-6a79-47fb-9dfe-861f198c5550	Incident SLA approaching	The scheduled vulnerability scan finished.	alert	t	/alerts	{}	2026-10-29 09:01:35.687535+07	2026-10-29 09:01:35.687535+07
bea7d322-1c5f-4c25-8ba3-268bff66c0ca	b4cad911-2d78-42af-9082-fb83caca55cc	Critical alert assigned	Incident INC-2026 is approaching its SLA deadline.	report	t	/reports	{}	2026-10-29 09:01:35.687748+07	2026-10-29 09:01:35.687748+07
c626ed9c-cbab-4069-8b67-9809a8ff1688	9c716733-8564-4b64-b734-a2b03b81197d	Scan completed	Incident INC-2026 is approaching its SLA deadline.	intel	f	/reports	{}	2026-10-29 09:01:35.687961+07	2026-10-29 09:01:35.687961+07
a00da9de-02aa-4c23-a8dd-0fabe21e3bcf	dcd2d08a-7310-414d-ae20-09165cb0c384	Critical alert assigned	Your weekly report is ready to download.	incident	f	/threats	{}	2026-10-29 09:01:35.688279+07	2026-10-29 09:01:35.688279+07
eba5f408-3b3a-4732-af10-a3d16a90afe4	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	Scan completed	Your weekly report is ready to download.	scan	t	/assets	{}	2026-10-29 09:01:35.688508+07	2026-10-29 09:01:35.688508+07
7b535b77-0a01-4bbc-85c9-fd1f5ee696a2	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	Critical alert assigned	Incident INC-2026 is approaching its SLA deadline.	report	f	/threats	{}	2026-10-29 09:01:35.688719+07	2026-10-29 09:01:35.688719+07
a1bd9784-c4c8-4cd8-b623-37f80f23f591	dcd2d08a-7310-414d-ae20-09165cb0c384	Critical alert assigned	Incident INC-2026 is approaching its SLA deadline.	intel	f	/reports	{}	2026-10-29 09:01:35.688887+07	2026-10-29 09:01:35.688887+07
7e1fd9f1-5432-41a7-962d-754f833b8c14	b7d93566-607b-41f4-933f-612190e9288b	Critical alert assigned	Incident INC-2026 is approaching its SLA deadline.	report	f	/assets	{}	2026-10-29 09:01:35.689081+07	2026-10-29 09:01:35.689081+07
428bf58a-3e53-4c68-8327-b2876aa776be	b4cad911-2d78-42af-9082-fb83caca55cc	New threat intel match	A critical alert requires your review.	scan	f	/threats	{}	2026-10-29 09:01:35.689323+07	2026-10-29 09:01:35.689323+07
2a0db24d-5a41-4df2-8882-c1949373ec9d	0b5e95ce-3f2b-4299-9e98-b4885de1043e	Report ready	Your weekly report is ready to download.	report	t	/threats	{}	2026-10-29 09:01:35.689491+07	2026-10-29 09:01:35.689491+07
bd7dd287-a8ef-4002-be8b-9eafa7c8cc7e	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	Critical alert assigned	The scheduled vulnerability scan finished.	report	t	/incidents	{}	2026-10-29 09:01:35.689673+07	2026-10-29 09:01:35.689673+07
783adabd-8d5c-4015-9f5f-0557103edeac	b7643562-4a3b-4bdc-87f5-ed48f78b9511	Report ready	New IOC matched an internal asset.	report	f	/threats	{}	2026-10-29 09:01:35.689843+07	2026-10-29 09:01:35.689843+07
870515b6-c9d0-44be-bc59-306a8a6ca940	b8e0c918-6a79-47fb-9dfe-861f198c5550	Incident SLA approaching	A critical alert requires your review.	intel	f	/incidents	{}	2026-10-29 09:01:35.690043+07	2026-10-29 09:01:35.690043+07
11d9e5fc-c1e3-4e15-bb63-d1cfec2b61f2	b7643562-4a3b-4bdc-87f5-ed48f78b9511	New threat intel match	Incident INC-2026 is approaching its SLA deadline.	incident	f	/incidents	{}	2026-10-29 09:01:35.690233+07	2026-10-29 09:01:35.690233+07
59bc9e74-173c-4114-9dee-2d00eda2e17c	ebd7404f-d9cc-41ad-9c75-384026a7aff9	New threat intel match	New IOC matched an internal asset.	alert	f	/incidents	{}	2026-10-29 09:01:35.690416+07	2026-10-29 09:01:35.690416+07
4a38016a-6e58-444b-af35-049e3676ab1d	9c716733-8564-4b64-b734-a2b03b81197d	New threat intel match	The scheduled vulnerability scan finished.	scan	f	/incidents	{}	2026-10-29 09:01:35.690621+07	2026-10-29 09:01:35.690621+07
fe9652a9-58c2-4e0b-b2c4-fcacf94293b7	9c716733-8564-4b64-b734-a2b03b81197d	New threat intel match	A critical alert requires your review.	incident	f	/alerts	{}	2026-10-29 09:01:35.69083+07	2026-10-29 09:01:35.69083+07
762334d4-0a17-4cd6-8975-5871f4a552e9	b8e0c918-6a79-47fb-9dfe-861f198c5550	Report ready	Incident INC-2026 is approaching its SLA deadline.	intel	f	/threats	{}	2026-10-29 09:01:35.691015+07	2026-10-29 09:01:35.691015+07
2c078929-5d43-49ef-ac07-e36ebb3012ee	0b5e95ce-3f2b-4299-9e98-b4885de1043e	Incident SLA approaching	Incident INC-2026 is approaching its SLA deadline.	scan	t	/threats	{}	2026-10-29 09:01:35.691212+07	2026-10-29 09:01:35.691212+07
18c9f6ea-e5b7-4109-88ed-192edd930ee8	92d776fe-9846-4fa0-b8eb-d4b5318321a0	Incident SLA approaching	New IOC matched an internal asset.	report	t	/alerts	{}	2026-10-29 09:01:35.691411+07	2026-10-29 09:01:35.691411+07
8d65e73b-69ca-4ae0-8c10-65e2fda14e99	b4cad911-2d78-42af-9082-fb83caca55cc	Scan completed	New IOC matched an internal asset.	report	f	/alerts	{}	2026-10-29 09:01:35.691612+07	2026-10-29 09:01:35.691612+07
bcd06739-c5b6-44f7-8f79-b39e7181ed32	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	Critical alert assigned	A critical alert requires your review.	alert	f	/alerts	{}	2026-10-29 09:01:35.691803+07	2026-10-29 09:01:35.691803+07
d6f22abe-8401-445f-a449-abfd32f96aa5	dcd2d08a-7310-414d-ae20-09165cb0c384	Incident SLA approaching	A critical alert requires your review.	alert	f	/assets	{}	2026-10-29 09:01:35.691999+07	2026-10-29 09:01:35.691999+07
\.


--
-- Data for Name: phishing_campaigns; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.phishing_campaigns (id, name, status, target_group, started_at, completed_at, sent_count, clicked_count, reported_count, metadata, created_at, updated_at) FROM stdin;
6b748326-509e-494e-805e-5fca0d78c228	Q4 credential awareness	completed	All staff	2026-10-09 09:01:35.63+07	2026-10-16 09:01:35.63+07	820	61	42	{}	2026-10-29 09:01:35.630959+07	2026-10-29 09:01:35.630959+07
cd4e6830-3dbf-4584-bec2-312656ba4843	Clinical phishing drill	completed	Clinical Systems	2026-09-24 09:01:35.63+07	2026-10-01 09:01:35.63+07	210	12	18	{}	2026-10-29 09:01:35.631362+07	2026-10-29 09:01:35.631362+07
d96e738a-f528-4dc0-a206-8d304c85b7a1	Invoice fraud simulation	running	Finance	2026-10-27 09:01:35.63+07	\N	95	7	3	{}	2026-10-29 09:01:35.631581+07	2026-10-29 09:01:35.631581+07
bfa08611-830b-404a-b818-254b47c4763c	MFA fatigue simulation	draft	Infrastructure	\N	\N	0	0	0	{}	2026-10-29 09:01:35.631779+07	2026-10-29 09:01:35.631779+07
8ce5aaea-dfb6-45b4-8461-fcb4d7c1b38f	Executive whale test	scheduled	Leadership	2026-11-01 09:01:35.63+07	\N	0	0	0	{}	2026-10-29 09:01:35.631977+07	2026-10-29 09:01:35.631977+07
\.


--
-- Data for Name: playbooks; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.playbooks (id, name, category, status, description, steps, metadata, created_at, updated_at) FROM stdin;
716deacb-490d-43b0-8665-1ef055e125e1	Ransomware Containment	ransomware	active	Isolate, preserve evidence, recover from backups	[{"order": 1, "title": "Detect"}, {"order": 2, "title": "Isolate"}, {"order": 3, "title": "Preserve"}, {"order": 4, "title": "Eradicate"}, {"order": 5, "title": "Recover"}, {"order": 6, "title": "Review"}]	{}	2026-10-29 09:01:35.558502+07	2026-10-29 09:01:35.558502+07
4b988d67-d48c-4016-a68e-62c22ee1747f	Phishing Response	phishing	active	Triage reported phishing and purge mailboxes	[{"order": 1, "title": "Validate headers"}, {"order": 2, "title": "Purge messages"}, {"order": 3, "title": "Reset credentials"}]	{}	2026-10-29 09:01:35.558868+07	2026-10-29 09:01:35.558868+07
d2b38d63-2972-4278-a42a-bf54b22c8433	Data Exfiltration Response	exfiltration	active	Contain egress and scope exposed data	[{"order": 1, "title": "Block egress"}, {"order": 2, "title": "Identify data"}, {"order": 3, "title": "Notify privacy office"}]	{}	2026-10-29 09:01:35.559046+07	2026-10-29 09:01:35.559046+07
69682a5d-fc29-4eb6-98af-9eae3b33761f	Compromised Account	identity	active	Contain and recover a compromised identity	[{"order": 1, "title": "Revoke sessions"}, {"order": 2, "title": "Reset MFA"}, {"order": 3, "title": "Review activity"}]	{}	2026-10-29 09:01:35.559226+07	2026-10-29 09:01:35.559226+07
8eedc735-5c84-4f43-be07-86076b85aa6d	Malware Triage	malware	active	Analyse and eradicate malware	[{"order": 1, "title": "Collect sample"}, {"order": 2, "title": "Sandbox detonate"}, {"order": 3, "title": "Remove persistence"}]	{}	2026-10-29 09:01:35.559382+07	2026-10-29 09:01:35.559382+07
258ba87c-4ebe-4dd7-a3c7-9d435194ccd0	DDoS Mitigation	availability	active	Activate scrubbing and rate limits	[{"order": 1, "title": "Enable scrubbing"}, {"order": 2, "title": "Rate limit"}, {"order": 3, "title": "Notify stakeholders"}]	{}	2026-10-29 09:01:35.55955+07	2026-10-29 09:01:35.55955+07
\.


--
-- Data for Name: policies; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.policies (id, name, category, status, version, description, content, effective_date, metadata, created_at, updated_at) FROM stdin;
4e8d6349-fddb-4d4f-8fc6-a1f2055cedbf	Acceptable Use Policy	workforce	published	3.1	Rules for acceptable use of Medicare systems	Employees must use company assets responsibly and report incidents.	2027-01-13	{}	2026-10-29 09:01:35.639135+07	2026-10-29 09:01:35.639135+07
c254598c-3a5a-4eff-91dd-ddf11d8a062d	Incident Response Policy	security	published	2.4	Incident classification and response	All incidents are triaged within 15 minutes by the SOC.	2027-04-22	{}	2026-10-29 09:01:35.639601+07	2026-10-29 09:01:35.639601+07
9d872be2-6751-4aaf-b3c7-c997d08f737b	Access Control Policy	security	published	4.0	Least privilege and MFA	Privileged access requires MFA and quarterly recertification.	2027-02-11	{}	2026-10-29 09:01:35.639829+07	2026-10-29 09:01:35.639829+07
525dcb34-b27f-485e-9481-22556e88edd7	Data Retention Policy	privacy	in_review	1.8	Retention of patient and security data	Security logs retained for 12 months, ePHI per HIPAA.	2027-01-10	{}	2026-10-29 09:01:35.640057+07	2026-10-29 09:01:35.640057+07
8640c060-8cb7-4631-b37f-7462160da199	Vulnerability Management Policy	security	published	2.0	Remediation SLAs by severity	Critical vulnerabilities remediated within 72 hours.	2027-02-26	{}	2026-10-29 09:01:35.64029+07	2026-10-29 09:01:35.64029+07
19502c49-f911-4a87-8c31-143dedc39b13	Third-Party Risk Policy	governance	published	1.5	Vendor due diligence	Tier-1 vendors reviewed annually.	2027-02-28	{}	2026-10-29 09:01:35.640505+07	2026-10-29 09:01:35.640505+07
8d35eee3-1c57-49c6-ad61-cef6a26fe9eb	Backup and Recovery Policy	resilience	published	3.3	Backup testing and recovery	Backups tested quarterly with documented RTO/RPO.	2027-01-13	{}	2026-10-29 09:01:35.640725+07	2026-10-29 09:01:35.640725+07
eac8aebe-9144-43c4-8a82-0039c31e01d8	AI Usage Policy	governance	draft	0.9	Responsible use of AI in SOC	AI outputs require human validation before action.	2027-02-07	{}	2026-10-29 09:01:35.640948+07	2026-10-29 09:01:35.640948+07
\.


--
-- Data for Name: remediations; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.remediations (id, title, status, priority, owner_id, asset_id, finding_id, due_at, completed_at, description, metadata, created_at, updated_at) FROM stdin;
06e064d8-c17b-4265-8576-7353a3311671	Rotate exposed API keys	in_progress	critical	ebd7404f-d9cc-41ad-9c75-384026a7aff9	d369c839-7416-482f-ba27-4ce4906c7712	\N	2026-11-05 09:01:35.576+07	\N	Remediation task generated from vulnerability and incident findings.	{}	2026-10-29 09:01:35.57634+07	2026-10-29 09:01:35.57634+07
78111f18-bc42-4b16-ab15-c525f63dbe5d	Patch OpenSSL on edge nodes	blocked	medium	b4cad911-2d78-42af-9082-fb83caca55cc	c7fa215a-4985-4506-8c4e-b868df428c13	\N	2026-11-15 09:01:35.576+07	2026-10-25 09:01:35.576+07	Remediation task generated from vulnerability and incident findings.	{}	2026-10-29 09:01:35.576778+07	2026-10-29 09:01:35.576778+07
08656715-e057-4318-8452-61a7ff37486a	Restrict SMB egress	in_progress	high	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	1d817fd7-6205-4dab-86c6-48beafa0ad78	\N	2026-11-07 09:01:35.576+07	\N	Remediation task generated from vulnerability and incident findings.	{}	2026-10-29 09:01:35.577107+07	2026-10-29 09:01:35.577107+07
90f30a56-b77a-4c56-bd6f-190cf7c2b092	Enable MFA for service accounts	blocked	high	ebd7404f-d9cc-41ad-9c75-384026a7aff9	43b2d473-a21f-4654-99a4-99de37812bd7	\N	2026-11-09 09:01:35.576+07	\N	Remediation task generated from vulnerability and incident findings.	{}	2026-10-29 09:01:35.577396+07	2026-10-29 09:01:35.577396+07
851121e9-45ba-42d3-88af-6d310d71b883	Rotate exposed API keys	completed	low	ebd7404f-d9cc-41ad-9c75-384026a7aff9	1d817fd7-6205-4dab-86c6-48beafa0ad78	\N	2026-11-01 09:01:35.576+07	\N	Remediation task generated from vulnerability and incident findings.	{}	2026-10-29 09:01:35.577657+07	2026-10-29 09:01:35.577657+07
86c09142-d9ae-472d-96ca-2d23ccf39b39	Patch OpenSSL on edge nodes	blocked	high	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	920f61f5-9de0-4850-9cd1-99e0ba05365f	\N	2026-11-14 09:01:35.576+07	2026-10-27 09:01:35.576+07	Remediation task generated from vulnerability and incident findings.	{}	2026-10-29 09:01:35.577891+07	2026-10-29 09:01:35.577891+07
b025b922-4c92-430d-bd0d-24ec4483dc1b	Remove stale admin accounts	completed	high	b8e0c918-6a79-47fb-9dfe-861f198c5550	920f61f5-9de0-4850-9cd1-99e0ba05365f	\N	2026-11-07 09:01:35.576+07	2026-10-29 09:01:35.576+07	Remediation task generated from vulnerability and incident findings.	{}	2026-10-29 09:01:35.578145+07	2026-10-29 09:01:35.578145+07
9e78a344-1568-4fe1-811f-a539a313d286	Restrict SMB egress	pending	medium	ebd7404f-d9cc-41ad-9c75-384026a7aff9	2e96141d-1615-4b65-9224-7fa73fb6d0c4	\N	2026-11-08 09:01:35.576+07	2026-10-29 09:01:35.576+07	Remediation task generated from vulnerability and incident findings.	{}	2026-10-29 09:01:35.57839+07	2026-10-29 09:01:35.57839+07
677f2834-20c7-4588-8c54-453668813707	Restrict SMB egress	pending	medium	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	20484773-319b-430f-bf71-adbab8001006	\N	2026-11-18 09:01:35.576+07	2026-10-25 09:01:35.576+07	Remediation task generated from vulnerability and incident findings.	{}	2026-10-29 09:01:35.578618+07	2026-10-29 09:01:35.578618+07
7519feda-816a-4347-a562-2b34ccfe9d75	Patch OpenSSL on edge nodes	pending	critical	b4cad911-2d78-42af-9082-fb83caca55cc	920f61f5-9de0-4850-9cd1-99e0ba05365f	\N	2026-11-16 09:01:35.576+07	2026-10-28 09:01:35.576+07	Remediation task generated from vulnerability and incident findings.	{}	2026-10-29 09:01:35.578814+07	2026-10-29 09:01:35.578814+07
38bf980d-b9ca-4d4d-bf1d-e920dff6ad14	Enable MFA for service accounts	pending	low	b7d93566-607b-41f4-933f-612190e9288b	b741c818-a15a-4fd4-b5ce-d92e9235e852	\N	2026-11-12 09:01:35.576+07	\N	Remediation task generated from vulnerability and incident findings.	{}	2026-10-29 09:01:35.579018+07	2026-10-29 09:01:35.579018+07
e93fd278-e5ab-497e-bd8e-80aa3bd54d84	Enable MFA for service accounts	in_progress	critical	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	920f61f5-9de0-4850-9cd1-99e0ba05365f	\N	2026-11-13 09:01:35.576+07	\N	Remediation task generated from vulnerability and incident findings.	{}	2026-10-29 09:01:35.579213+07	2026-10-29 09:01:35.579213+07
b93fb887-e00c-44c1-9c2f-411183af9bbf	Rotate exposed API keys	in_progress	medium	b4cad911-2d78-42af-9082-fb83caca55cc	bcdb679c-53d2-48f1-ad99-e1b949aeeb57	\N	2026-11-09 09:01:35.576+07	\N	Remediation task generated from vulnerability and incident findings.	{}	2026-10-29 09:01:35.579408+07	2026-10-29 09:01:35.579408+07
e90f2d0b-d587-4487-9448-d2fa3fc99f7b	Enable MFA for service accounts	completed	critical	473353d6-ee2a-4345-adae-ca12b0fbee38	9cf5cbb5-d702-4a86-8c4e-fd5a8db2ed5b	\N	2026-11-17 09:01:35.576+07	\N	Remediation task generated from vulnerability and incident findings.	{}	2026-10-29 09:01:35.579608+07	2026-10-29 09:01:35.579608+07
9530bf04-ad8f-4689-8d37-8564a0dee3ee	Rebuild compromised runner	completed	low	dcd2d08a-7310-414d-ae20-09165cb0c384	b5ecd570-bfb9-455d-a802-c3031d7de183	\N	2026-11-10 09:01:35.576+07	\N	Remediation task generated from vulnerability and incident findings.	{}	2026-10-29 09:01:35.57981+07	2026-10-29 09:01:35.57981+07
e2d2abe2-b068-4ab2-8217-5a7e5b046733	Restrict SMB egress	blocked	low	ebd7404f-d9cc-41ad-9c75-384026a7aff9	90f757b2-99a1-4342-bc1d-16a5a09b35eb	\N	2026-11-01 09:01:35.576+07	2026-10-25 09:01:35.576+07	Remediation task generated from vulnerability and incident findings.	{}	2026-10-29 09:01:35.580015+07	2026-10-29 09:01:35.580015+07
6717acee-d46d-4fd5-bd80-8c8355b51a15	Remove stale admin accounts	in_progress	critical	b8e0c918-6a79-47fb-9dfe-861f198c5550	20484773-319b-430f-bf71-adbab8001006	\N	2026-11-18 09:01:35.576+07	\N	Remediation task generated from vulnerability and incident findings.	{}	2026-10-29 09:01:35.580214+07	2026-10-29 09:01:35.580214+07
40b95ea6-d1d0-4e5d-a527-e8e0a005e326	Enable MFA for service accounts	pending	medium	dcd2d08a-7310-414d-ae20-09165cb0c384	920f61f5-9de0-4850-9cd1-99e0ba05365f	\N	2026-11-10 09:01:35.576+07	\N	Remediation task generated from vulnerability and incident findings.	{}	2026-10-29 09:01:35.580443+07	2026-10-29 09:01:35.580443+07
7e38a345-d906-4ff8-806b-20a733c244ab	Enable MFA for service accounts	in_progress	medium	b4cad911-2d78-42af-9082-fb83caca55cc	e3a86baf-d72f-4d71-8d47-34768a15f739	\N	2026-11-18 09:01:35.576+07	\N	Remediation task generated from vulnerability and incident findings.	{}	2026-10-29 09:01:35.580673+07	2026-10-29 09:01:35.580673+07
8da7f338-7836-466d-a2b7-b76078dda8ca	Rebuild compromised runner	completed	medium	92d776fe-9846-4fa0-b8eb-d4b5318321a0	f8433530-5580-415e-9f16-41634a70bd47	\N	2026-11-09 09:01:35.576+07	\N	Remediation task generated from vulnerability and incident findings.	{}	2026-10-29 09:01:35.580892+07	2026-10-29 09:01:35.580892+07
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.reports (id, name, type, status, format, period_start, period_end, created_by, summary, metadata, created_at, updated_at) FROM stdin;
0720276f-3c8d-4289-b006-f0f690abd64a	Firewall report · 2026-10-04	firewall	archived	json	2026-08-30 09:01:35.664+07	2026-10-24 09:01:35.664+07	92d776fe-9846-4fa0-b8eb-d4b5318321a0	Automated security report generated from live SOC telemetry.	{"automated": true}	2026-10-29 09:01:35.664839+07	2026-10-29 09:01:35.664839+07
b28a0b33-03fa-45ce-908f-f9a3c9792be1	Executive report · 2026-10-19	executive	ready	csv	2026-09-07 09:01:35.664+07	2026-10-28 09:01:35.664+07	0b5e95ce-3f2b-4299-9e98-b4885de1043e	Automated security report generated from live SOC telemetry.	{"automated": true}	2026-10-29 09:01:35.665441+07	2026-10-29 09:01:35.665441+07
5e523349-c087-4168-90be-54fc177808e6	Firewall report · 2026-10-14	firewall	generating	json	2026-09-14 09:01:35.664+07	2026-10-27 09:01:35.664+07	473353d6-ee2a-4345-adae-ca12b0fbee38	Automated security report generated from live SOC telemetry.	{"automated": true}	2026-10-29 09:01:35.665681+07	2026-10-29 09:01:35.665681+07
9a56bce3-852f-4150-a3e7-7e360598a9cb	Incident report · 2026-10-27	incident	archived	csv	2026-09-12 09:01:35.664+07	2026-10-25 09:01:35.664+07	ebd7404f-d9cc-41ad-9c75-384026a7aff9	Automated security report generated from live SOC telemetry.	{"automated": true}	2026-10-29 09:01:35.665902+07	2026-10-29 09:01:35.665902+07
9aac4755-a2fd-4ea2-919e-231336898705	Incident report · 2026-10-15	incident	generating	pdf	2026-09-08 09:01:35.664+07	2026-10-26 09:01:35.664+07	b7643562-4a3b-4bdc-87f5-ed48f78b9511	Automated security report generated from live SOC telemetry.	{"automated": true}	2026-10-29 09:01:35.666132+07	2026-10-29 09:01:35.666132+07
913cf83c-9555-4e20-9432-895cea00f73e	Firewall report · 2026-10-15	firewall	ready	csv	2026-09-28 09:01:35.664+07	2026-10-24 09:01:35.664+07	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	Automated security report generated from live SOC telemetry.	{"automated": true}	2026-10-29 09:01:35.666348+07	2026-10-29 09:01:35.666348+07
f17d3da8-9f10-46b5-b634-55818476fc05	Incident report · 2026-10-16	incident	ready	json	2026-09-12 09:01:35.664+07	2026-10-25 09:01:35.664+07	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	Automated security report generated from live SOC telemetry.	{"automated": true}	2026-10-29 09:01:35.666577+07	2026-10-29 09:01:35.666577+07
49d5bbee-2fbb-4a01-8f2f-85c9b0ea0438	Executive report · 2026-10-27	executive	ready	csv	2026-09-21 09:01:35.664+07	2026-10-27 09:01:35.664+07	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	Automated security report generated from live SOC telemetry.	{"automated": true}	2026-10-29 09:01:35.666792+07	2026-10-29 09:01:35.666792+07
0124a2a5-4937-4346-bd44-61e56c6038ad	Firewall report · 2026-10-14	firewall	ready	json	2026-09-09 09:01:35.664+07	2026-10-26 09:01:35.664+07	0b5e95ce-3f2b-4299-9e98-b4885de1043e	Automated security report generated from live SOC telemetry.	{"automated": true}	2026-10-29 09:01:35.667102+07	2026-10-29 09:01:35.667102+07
798b7c9d-60fb-4b57-b0f5-0a5fe3034875	Compliance report · 2026-10-17	compliance	archived	pdf	2026-09-08 09:01:35.664+07	2026-10-28 09:01:35.664+07	b7643562-4a3b-4bdc-87f5-ed48f78b9511	Automated security report generated from live SOC telemetry.	{"automated": true}	2026-10-29 09:01:35.667363+07	2026-10-29 09:01:35.667363+07
20062abb-97c7-418c-b0d2-905f82ecc15a	Firewall report · 2026-10-06	firewall	archived	json	2026-09-22 09:01:35.664+07	2026-10-26 09:01:35.664+07	dcd2d08a-7310-414d-ae20-09165cb0c384	Automated security report generated from live SOC telemetry.	{"automated": true}	2026-10-29 09:01:35.66762+07	2026-10-29 09:01:35.66762+07
4b1fa9d6-8cf8-449d-a865-36dbe851fef0	Threat report · 2026-10-02	threat	ready	pdf	2026-09-25 09:01:35.664+07	2026-10-28 09:01:35.664+07	dcd2d08a-7310-414d-ae20-09165cb0c384	Automated security report generated from live SOC telemetry.	{"automated": true}	2026-10-29 09:01:35.667885+07	2026-10-29 09:01:35.667885+07
5920aa99-e5eb-40b7-8e84-68f87c6941ca	Incident report · 2026-10-26	incident	ready	pdf	2026-09-01 09:01:35.664+07	2026-10-28 09:01:35.664+07	0b5e95ce-3f2b-4299-9e98-b4885de1043e	Automated security report generated from live SOC telemetry.	{"automated": true}	2026-10-29 09:01:35.668212+07	2026-10-29 09:01:35.668212+07
708f8be2-57f0-4a03-bed2-020002584f0f	Executive report · 2026-10-21	executive	ready	csv	2026-09-03 09:01:35.664+07	2026-10-27 09:01:35.664+07	b8e0c918-6a79-47fb-9dfe-861f198c5550	Automated security report generated from live SOC telemetry.	{"automated": true}	2026-10-29 09:01:35.668468+07	2026-10-29 09:01:35.668468+07
e2725c7f-050c-4bb8-ad51-e40824abdb1a	Firewall report · 2026-10-16	firewall	generating	csv	2026-09-14 09:01:35.664+07	2026-10-26 09:01:35.664+07	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	Automated security report generated from live SOC telemetry.	{"automated": true}	2026-10-29 09:01:35.668716+07	2026-10-29 09:01:35.668716+07
681dbc83-b683-4ee8-8a58-99f7c4912184	Compliance report · 2026-10-07	compliance	archived	json	2026-09-26 09:01:35.664+07	2026-10-24 09:01:35.664+07	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	Automated security report generated from live SOC telemetry.	{"automated": true}	2026-10-29 09:01:35.669092+07	2026-10-29 09:01:35.669092+07
\.


--
-- Data for Name: risk_assessments; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.risk_assessments (id, title, status, score, asset_id, owner_id, methodology, description, metadata, created_at, updated_at) FROM stdin;
4c0f3db6-8c5e-4d29-ac5e-e83969dbe8dc	Risk assessment · DNS Resolver	in_review	88	9cf5cbb5-d702-4a86-8c4e-fd5a8db2ed5b	b8e0c918-6a79-47fb-9dfe-861f198c5550	FAIR	Assessment of confidentiality, integrity and availability exposure for the in-scope asset.	{}	2026-10-29 09:01:35.635871+07	2026-10-29 09:01:35.635871+07
c57f60d4-1e7c-4bae-8448-27b7b83d687e	Risk assessment · Mobile API	expired	26	b741c818-a15a-4fd4-b5ce-d92e9235e852	92d776fe-9846-4fa0-b8eb-d4b5318321a0	FAIR	Assessment of confidentiality, integrity and availability exposure for the in-scope asset.	{}	2026-10-29 09:01:35.636337+07	2026-10-29 09:01:35.636337+07
42c4ef25-74b3-406a-8803-fc4484d39c2c	Risk assessment · Billing Service	expired	53	bcdb679c-53d2-48f1-ad99-e1b949aeeb57	b7d93566-607b-41f4-933f-612190e9288b	NIST 800-30	Assessment of confidentiality, integrity and availability exposure for the in-scope asset.	{}	2026-10-29 09:01:35.636551+07	2026-10-29 09:01:35.636551+07
5b647cec-bc0f-491f-854f-409472249a42	Risk assessment · Email Gateway	draft	93	9cf5cbb5-d702-4a86-8c4e-fd5a8db2ed5b	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	OCTAVE	Assessment of confidentiality, integrity and availability exposure for the in-scope asset.	{}	2026-10-29 09:01:35.636768+07	2026-10-29 09:01:35.636768+07
eec0366a-9b38-4afe-ae4d-41ed43c45c10	Risk assessment · Admin Workstation	approved	42	d369c839-7416-482f-ba27-4ce4906c7712	473353d6-ee2a-4345-adae-ca12b0fbee38	OCTAVE	Assessment of confidentiality, integrity and availability exposure for the in-scope asset.	{}	2026-10-29 09:01:35.636979+07	2026-10-29 09:01:35.636979+07
669a6755-1a8c-4b0b-a651-d3a28a24b0a0	Risk assessment · DNS Resolver	expired	84	920f61f5-9de0-4850-9cd1-99e0ba05365f	92d776fe-9846-4fa0-b8eb-d4b5318321a0	ISO 27005	Assessment of confidentiality, integrity and availability exposure for the in-scope asset.	{}	2026-10-29 09:01:35.637202+07	2026-10-29 09:01:35.637202+07
71a5dafe-53df-4471-8e2d-6af4d6f8e1c5	Risk assessment · Pharmacy Database	expired	75	43b2d473-a21f-4654-99a4-99de37812bd7	ebd7404f-d9cc-41ad-9c75-384026a7aff9	FAIR	Assessment of confidentiality, integrity and availability exposure for the in-scope asset.	{}	2026-10-29 09:01:35.637424+07	2026-10-29 09:01:35.637424+07
60132778-4802-41a9-a66f-8c0cff6e53d1	Risk assessment · EHR Database	in_review	60	1d817fd7-6205-4dab-86c6-48beafa0ad78	0b5e95ce-3f2b-4299-9e98-b4885de1043e	NIST 800-30	Assessment of confidentiality, integrity and availability exposure for the in-scope asset.	{}	2026-10-29 09:01:35.637622+07	2026-10-29 09:01:35.637622+07
e8a3d454-aedc-418f-993d-2290f9b1dff4	Risk assessment · Backup Vault	expired	29	b741c818-a15a-4fd4-b5ce-d92e9235e852	473353d6-ee2a-4345-adae-ca12b0fbee38	ISO 27005	Assessment of confidentiality, integrity and availability exposure for the in-scope asset.	{}	2026-10-29 09:01:35.637806+07	2026-10-29 09:01:35.637806+07
811e3c35-217b-4082-9c74-ce68d05276ee	Risk assessment · VPN Gateway	approved	47	9cf5cbb5-d702-4a86-8c4e-fd5a8db2ed5b	0b5e95ce-3f2b-4299-9e98-b4885de1043e	NIST 800-30	Assessment of confidentiality, integrity and availability exposure for the in-scope asset.	{}	2026-10-29 09:01:35.638033+07	2026-10-29 09:01:35.638033+07
030c7c1a-b8d8-474c-8cfd-b102be7fd422	Risk assessment · Telehealth Gateway	draft	80	33177851-14ab-4ead-ba2a-7445d2b5ba38	b7d93566-607b-41f4-933f-612190e9288b	FAIR	Assessment of confidentiality, integrity and availability exposure for the in-scope asset.	{}	2026-10-29 09:01:35.638261+07	2026-10-29 09:01:35.638261+07
a1bf9738-2b0b-43b9-af04-cfb80f7f6582	Risk assessment · EHR Database	in_review	22	b5ecd570-bfb9-455d-a802-c3031d7de183	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	NIST 800-30	Assessment of confidentiality, integrity and availability exposure for the in-scope asset.	{}	2026-10-29 09:01:35.638471+07	2026-10-29 09:01:35.638471+07
9fbb0d9c-88c4-4679-990f-d4503b484043	Risk assessment · SIEM Ingestor	in_review	62	90f757b2-99a1-4342-bc1d-16a5a09b35eb	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	FAIR	Assessment of confidentiality, integrity and availability exposure for the in-scope asset.	{}	2026-10-29 09:01:35.638669+07	2026-10-29 09:01:35.638669+07
6d7e3ac4-a1b6-4c31-9950-b00720b09ce1	Risk assessment · CI/CD Runner	expired	80	578335bf-e75d-4878-89dc-12dc1f443613	473353d6-ee2a-4345-adae-ca12b0fbee38	NIST 800-30	Assessment of confidentiality, integrity and availability exposure for the in-scope asset.	{}	2026-10-29 09:01:35.638866+07	2026-10-29 09:01:35.638866+07
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.roles (id, name, description, permissions, level, created_at, updated_at) FROM stdin;
681badf5-aaf1-4de7-90ee-dc3d8c2eda66	admin	Full platform administration and security operations	{*}	100	2026-10-29 09:01:35.097635+07	2026-10-29 09:01:35.097635+07
86be11ac-25b8-4ee2-a4e6-525afd7d6292	analyst	SOC analyst — triage, respond and report	{read,write,alerts:write,alerts:assign,threats:write,threats:enrich,assets:write,assets:scan,incidents:write,incidents:resolve,firewall:write,firewall:apply,logs:read,reports:write,reports:export,ai:use}	80	2026-10-29 09:01:35.099227+07	2026-10-29 09:01:35.099227+07
ea58a25c-7c09-40c6-ad0d-f8643271b665	hunter	Threat hunter — detection engineering and intel	{read,write,threats:write,threats:enrich,alerts:write,assets:scan,logs:read,ai:use,reports:export}	60	2026-10-29 09:01:35.100069+07	2026-10-29 09:01:35.100069+07
82d065d3-e288-4502-aa3e-9caf261d8b69	viewer	Read-only business stakeholder	{read,ai:use}	10	2026-10-29 09:01:35.100589+07	2026-10-29 09:01:35.100589+07
\.


--
-- Data for Name: scans; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.scans (id, name, type, status, target, agent_id, started_at, completed_at, findings_count, metadata, created_at, updated_at) FROM stdin;
377d3f61-e149-4fea-8f28-80cddeb35892	Weekly scan · Telehealth Gateway	vulnerability	completed	10.10.1.44	\N	2026-10-25 09:01:35.581+07	2026-10-25 09:01:35.581+07	6	{}	2026-10-29 09:01:35.581427+07	2026-10-29 09:01:35.581427+07
b2676fc6-572e-4ce0-a992-2776d9bf577b	On-demand scan · Telehealth Gateway	configuration	queued	10.10.1.44	\N	2026-10-25 09:01:35.581+07	\N	5	{}	2026-10-29 09:01:35.581793+07	2026-10-29 09:01:35.581793+07
d851297b-15d2-4d7b-afa6-21a5231a4f28	External attack surface scan · Mobile API	configuration	completed	10.10.1.50	\N	2026-10-20 09:01:35.581+07	2026-10-28 09:01:35.581+07	2	{}	2026-10-29 09:01:35.581997+07	2026-10-29 09:01:35.581997+07
7ca65ca0-ddae-4497-b648-1a065aa5a77f	On-demand scan · Appointment API	malware	completed	10.10.1.20	\N	2026-10-20 09:01:35.581+07	2026-10-25 09:01:35.581+07	10	{}	2026-10-29 09:01:35.582198+07	2026-10-29 09:01:35.582198+07
cd2653bb-2365-4200-9f9a-d427cdc721e8	Weekly scan · Telehealth Gateway	vulnerability	completed	10.10.1.44	\N	2026-10-25 09:01:35.581+07	2026-10-24 09:01:35.581+07	4	{}	2026-10-29 09:01:35.582385+07	2026-10-29 09:01:35.582385+07
2cac7bd4-253b-431c-96e1-b46cdfc40245	On-demand scan · EHR Database	external	completed	10.10.2.11	\N	2026-10-29 09:01:35.581+07	2026-10-24 09:01:35.581+07	2	{}	2026-10-29 09:01:35.58257+07	2026-10-29 09:01:35.58257+07
fe4e2031-5047-433a-a74c-b12c5695ab4b	Compliance scan · Admin Workstation	configuration	completed	10.30.1.14	\N	2026-10-24 09:01:35.581+07	2026-10-21 09:01:35.581+07	7	{}	2026-10-29 09:01:35.582742+07	2026-10-29 09:01:35.582742+07
3d6d1cc2-ba30-45e4-8d6b-ee9f4e0fca66	External attack surface scan · Email Gateway	configuration	completed	10.10.0.25	\N	2026-10-27 09:01:35.581+07	2026-10-25 09:01:35.581+07	13	{}	2026-10-29 09:01:35.5829+07	2026-10-29 09:01:35.5829+07
91994f02-a95a-486d-90fc-07dbd7295794	On-demand scan · Imaging PACS	external	completed	10.20.5.21	\N	2026-10-19 09:01:35.581+07	2026-10-22 09:01:35.581+07	2	{}	2026-10-29 09:01:35.58308+07	2026-10-29 09:01:35.58308+07
1107ca4d-b72b-4041-a5ed-8ac0ba548087	Weekly scan · Backup Vault	vulnerability	completed	10.10.7.4	\N	2026-10-22 09:01:35.581+07	2026-10-20 09:01:35.581+07	14	{}	2026-10-29 09:01:35.583262+07	2026-10-29 09:01:35.583262+07
74b97c8c-d9a6-4f03-8c0f-309c9d8b5824	External attack surface scan · Backup Vault	malware	completed	10.10.7.4	\N	2026-10-20 09:01:35.581+07	2026-10-29 09:01:35.581+07	9	{}	2026-10-29 09:01:35.58343+07	2026-10-29 09:01:35.58343+07
8e719c60-6973-4cbf-bf73-b97e965ad48c	Weekly scan · Medical IoT Gateway	malware	queued	10.20.4.10	\N	2026-10-24 09:01:35.581+07	\N	0	{}	2026-10-29 09:01:35.583612+07	2026-10-29 09:01:35.583612+07
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.sessions (id, user_id, token_hash, ip_address, user_agent, expires_at, revoked, created_at, updated_at) FROM stdin;
15d6c5fd-5b27-44f9-a76d-58aad0040122	dcd2d08a-7310-414d-ae20-09165cb0c384	42df54ef9e13124faed3d29d659462df912d30588dad7c05711ec4f4c120886a	212.247.235.57	MedicareGuard-Console/1.0	2026-10-30 09:01:35.693+07	f	2026-10-25 11:01:35.693+07	2026-10-29 09:01:35.693487+07
ec6e1450-445d-4287-a730-2d0763aaaf16	473353d6-ee2a-4345-adae-ca12b0fbee38	00e05a426933393776dfbc9f7071aabd0ed3f55a6381c793466ae0b40ae0cc38	89.227.169.39	MedicareGuard-Console/1.0	2026-10-30 09:01:35.693+07	f	2026-10-23 20:01:35.693+07	2026-10-29 09:01:35.693941+07
b11f8075-2af8-45d0-8d14-07723f005d73	dcd2d08a-7310-414d-ae20-09165cb0c384	cdbea6d9087fe8007eb08c0a7ddb1bac22b80a3acc74f6495d860a773bf9e671	62.175.86.61	MedicareGuard-Console/1.0	2026-10-30 09:01:35.693+07	f	2026-10-28 06:01:35.693+07	2026-10-29 09:01:35.694161+07
3e50704f-91bc-4c1b-9e6f-0e328501dd69	473353d6-ee2a-4345-adae-ca12b0fbee38	40f4416b00b0d0002e18a7eb2ea86cfb43380098e1a699ca5415a4cd93ebce5b	91.180.104.143	MedicareGuard-Console/1.0	2026-10-30 09:01:35.693+07	t	2026-10-26 17:01:35.693+07	2026-10-29 09:01:35.694371+07
fd9af532-986c-44ea-9490-8079ff24011b	ebd7404f-d9cc-41ad-9c75-384026a7aff9	06110c1b1c65ad48d144d3226902d5313d617cfc0a5aeed91155a4687365b51d	102.40.22.77	MedicareGuard-Console/1.0	2026-10-30 09:01:35.693+07	t	2026-10-23 18:01:35.693+07	2026-10-29 09:01:35.694589+07
1d21144d-1c18-4b4b-a197-bc36e9013068	0b5e95ce-3f2b-4299-9e98-b4885de1043e	2a77b03001424a3fc6ee59f57f069c4a694923e4fcc1295c2d3c5ec9e91eb6c7	181.34.29.141	MedicareGuard-Console/1.0	2026-10-30 09:01:35.693+07	f	2026-10-28 00:01:35.693+07	2026-10-29 09:01:35.6948+07
eda125b9-c211-4ff7-8bf8-e4fc1b1ee33a	dcd2d08a-7310-414d-ae20-09165cb0c384	605cf8a642f9d24d65bfcd7540b7a3d72cd484f93902208596a3c1e3b0ec190c	176.17.113.230	MedicareGuard-Console/1.0	2026-10-30 09:01:35.693+07	t	2026-10-27 22:01:35.693+07	2026-10-29 09:01:35.694998+07
6becd888-ff91-4fc3-b95c-e656556c84d0	b7d93566-607b-41f4-933f-612190e9288b	345b98c5f0b6fb4f8abbace7932e42fcf483c101571a489eaa23c26f8a2f6c00	80.223.188.75	MedicareGuard-Console/1.0	2026-10-30 09:01:35.693+07	f	2026-10-29 06:01:35.693+07	2026-10-29 09:01:35.69518+07
e083847c-978a-46ea-8912-07d8167d5e6e	473353d6-ee2a-4345-adae-ca12b0fbee38	e4ef19ac8ea681acb0a8cb8b62b31a4afc70e8d2d7bb8eef0971895e3c488aa2	37.234.84.49	MedicareGuard-Console/1.0	2026-10-30 09:01:35.693+07	t	2026-10-26 06:01:35.693+07	2026-10-29 09:01:35.695365+07
7a730879-f14c-4f11-9437-c0f3e2875041	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	0a3251bc6ce6851d38b5d479bff446b52f763508718df33de479a6202055d4d4	31.162.252.216	MedicareGuard-Console/1.0	2026-10-30 09:01:35.693+07	f	2026-10-28 15:01:35.693+07	2026-10-29 09:01:35.695556+07
9c77b851-557d-4c97-a199-4c51625b67a4	9c716733-8564-4b64-b734-a2b03b81197d	f1787fc9ca756ad567f5d7d282deb4a9cd9f1614681f2fb2dc4fdf1d4d774c6e	212.29.136.125	MedicareGuard-Console/1.0	2026-10-30 09:01:35.693+07	f	2026-10-24 23:01:35.693+07	2026-10-29 09:01:35.695749+07
0680dd0f-05b8-4202-8638-be4125ab54d4	dcd2d08a-7310-414d-ae20-09165cb0c384	7ae0ccf6fcbac2555e0a0c265cc36a5cff8935bf6af624366560ada385b52b03	37.186.48.172	MedicareGuard-Console/1.0	2026-10-30 09:01:35.693+07	f	2026-10-26 07:01:35.693+07	2026-10-29 09:01:35.695943+07
223a55d0-0ec9-4ae3-8038-4f694e413303	b8e0c918-6a79-47fb-9dfe-861f198c5550	bc0a5c08dc79dc3110461305fa780df462861f6882ed6296a23b84b7f75fe252	80.181.244.113	MedicareGuard-Console/1.0	2026-10-30 09:01:35.693+07	f	2026-10-27 15:01:35.693+07	2026-10-29 09:01:35.696133+07
11c5d719-ed81-4e56-b896-9c433ec5d602	b8e0c918-6a79-47fb-9dfe-861f198c5550	86fb19a493b5fc24fee6092b3a2e9c7edd411a397a8cb203b352f7e9af6a3b47	62.233.233.190	MedicareGuard-Console/1.0	2026-10-30 09:01:35.693+07	f	2026-10-26 18:01:35.693+07	2026-10-29 09:01:35.696307+07
a1909a9d-b7ab-47b4-84e6-a9e075d82d9a	0b5e95ce-3f2b-4299-9e98-b4885de1043e	ed0ec56d9d6422275c047bac3ef0673d2935714aebb6ca7b8975e856a8cd1086	181.49.112.211	MedicareGuard-Console/1.0	2026-10-30 09:01:35.693+07	t	2026-10-27 08:01:35.693+07	2026-10-29 09:01:35.696499+07
3952218a-43be-4555-a3f8-6b5c4b46e7c2	473353d6-ee2a-4345-adae-ca12b0fbee38	7c53cd6e754edb567cc9c7e7674e8151653b2ee7359155d50485e16e43229eb9	203.193.254.155	MedicareGuard-Console/1.0	2026-10-30 09:01:35.693+07	f	2026-10-29 09:01:35.693+07	2026-10-29 09:01:35.696713+07
0e6a9e3e-ea87-499d-a80d-b1f40f5e73ee	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	12990e4e62ebb99ec8b54ee4c845485b4b2b5cb02dce25bd959b6ed27230c2a2	77.50.163.138	MedicareGuard-Console/1.0	2026-10-30 09:01:35.693+07	f	2026-10-24 01:01:35.693+07	2026-10-29 09:01:35.696893+07
0418b1fb-689e-45a1-badd-a78ef3ecdef9	473353d6-ee2a-4345-adae-ca12b0fbee38	ca4c02cc93bb8c736f98846a1e8cb73ffcdf0bcdaaa5457b19c34b8dd9660917	194.149.184.198	MedicareGuard-Console/1.0	2026-10-30 09:01:35.693+07	f	2026-10-23 14:01:35.693+07	2026-10-29 09:01:35.697098+07
8a3e681c-49c6-4337-b52f-cb4dffd56b17	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	d7725a5dce387afc30be49e6708a818ec2b2d3113829525a86655482cd43852f	185.130.55.247	MedicareGuard-Console/1.0	2026-10-30 09:01:35.693+07	f	2026-10-26 16:01:35.693+07	2026-10-29 09:01:35.697312+07
360fa312-328c-46d1-a9d9-d3b1d2ef70cb	dcd2d08a-7310-414d-ae20-09165cb0c384	0a59cd1b2b18cc3d0cffca259c47ec9a1f3eead1181c6691ecdd6b671514d0f2	91.33.139.125	MedicareGuard-Console/1.0	2026-10-30 09:01:35.693+07	t	2026-10-26 19:01:35.693+07	2026-10-29 09:01:35.697536+07
ad58d094-cfff-4d54-a76f-dc648384c4e0	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	093873da10b7cac123a039bc45f4b1ce901f7b17596ba8b78d40555447fe20e7	192.168.65.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15	2026-10-29 23:23:32.703+07	f	2026-10-29 11:23:32.703948+07	2026-10-29 11:23:32.703948+07
31f1511f-3d4d-4cf0-96c5-0a88227ca500	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	3b0ffa029a9f8748dddfb1540ce6684752d8bf6248719526339ab660072f9df1	192.168.65.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15	2026-10-30 11:43:49.071+07	f	2026-10-29 23:43:49.071912+07	2026-10-29 23:43:49.071912+07
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.settings (id, key, value, scope, description, updated_by, created_at, updated_at) FROM stdin;
d35f01f5-e596-456a-8c09-674d9083e139	soc.name	"MedicareGuard SOC"	global	Display name	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	2026-10-29 09:01:35.654698+07	2026-10-29 09:01:35.654698+07
c4b868f3-4f34-4802-8e44-7837f09e2f69	soc.retention_days	365	global	Security data retention	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	2026-10-29 09:01:35.655178+07	2026-10-29 09:01:35.655178+07
657f0561-527a-4815-a397-78a82ce3d70b	alerts.auto_escalate_critical	true	alerts	Auto-create incident for critical alerts	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	2026-10-29 09:01:35.655426+07	2026-10-29 09:01:35.655426+07
d682fc1a-2d45-487c-b40d-251a49878af1	ai.enabled	true	ai	Enable AI analyst	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	2026-10-29 09:01:35.655643+07	2026-10-29 09:01:35.655643+07
d0b033f7-5b07-4580-9d3f-41b1055dc0fc	ai.model	"medicareguard-analyst"	ai	Default AI model	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	2026-10-29 09:01:35.655845+07	2026-10-29 09:01:35.655845+07
008f8d20-c075-4b36-b515-f704dc768405	firewall.auto_block	true	firewall	Automatically block critical threat IPs	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	2026-10-29 09:01:35.656097+07	2026-10-29 09:01:35.656097+07
45d46475-bd74-4262-b66b-8bd8941cd35a	report.schedule.weekly	{"format": "pdf", "cadence": "weekly", "enabled": true, "template": "executive", "recipients": ["ciso@medicareguard.io"]}	reporting	Weekly executive report	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	2026-10-29 09:01:35.656333+07	2026-10-29 09:01:35.656333+07
d28215e2-3868-46de-ade3-e4877b43de47	notifications.email	true	notifications	Email notifications enabled	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	2026-10-29 09:01:35.656562+07	2026-10-29 09:01:35.656562+07
edb051ff-470a-4167-a6cd-b77e0bae0e84	mfa.enforced	true	identity	MFA enforced for privileged roles	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	2026-10-29 09:01:35.656787+07	2026-10-29 09:01:35.656787+07
ae3dea13-0dc2-4723-829d-cf3e84d36ee7	n8n.base_url	"http://n8n:5678"	integrations	Automation base URL	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	2026-10-29 09:01:35.657012+07	2026-10-29 09:01:35.657012+07
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.tags (id, name, color, description, created_at, updated_at) FROM stdin;
62f5cfa7-bb07-4760-9715-8cc85c035fe2	critical	#ff4d6d	Critical severity or impact	2026-10-29 09:01:35.652317+07	2026-10-29 09:01:35.652317+07
4c45d521-698d-4c46-9da0-f8f7935f9bb0	ransomware	#f97316	Ransomware-related activity	2026-10-29 09:01:35.652699+07	2026-10-29 09:01:35.652699+07
376cdbe4-7e4a-4905-b209-686448c01370	phishing	#eab308	Phishing and social engineering	2026-10-29 09:01:35.652873+07	2026-10-29 09:01:35.652873+07
878829c6-9f1e-4e78-8819-98ed06dcdc50	patient-data	#8b5cf6	Involves ePHI	2026-10-29 09:01:35.653063+07	2026-10-29 09:01:35.653063+07
b69e0f58-67cb-44e8-863c-be4609a8e2e7	insider	#ec4899	Insider threat	2026-10-29 09:01:35.653234+07	2026-10-29 09:01:35.653234+07
fbc2c88a-473f-4b02-9858-29b384a4176f	cloud	#06b6d4	Cloud infrastructure	2026-10-29 09:01:35.653409+07	2026-10-29 09:01:35.653409+07
aba056da-5ea1-46e0-8a79-5f39ba3d34db	network	#3b82f6	Network telemetry	2026-10-29 09:01:35.653575+07	2026-10-29 09:01:35.653575+07
555f1856-855b-4185-acc1-1f2070c59553	identity	#22c55e	Identity and access	2026-10-29 09:01:35.653736+07	2026-10-29 09:01:35.653736+07
30a6da2f-0bd4-4818-b675-35055f6caa97	compliance	#14b8a6	Regulatory relevance	2026-10-29 09:01:35.653899+07	2026-10-29 09:01:35.653899+07
d70a3b53-5395-4be4-a227-71e6bd62977d	automated	#a855f7	Created by automation	2026-10-29 09:01:35.654067+07	2026-10-29 09:01:35.654067+07
d6959f0b-e0c0-4a41-9455-91bfbab8132a	hunting	#f59e0b	Threat hunt hypothesis	2026-10-29 09:01:35.65422+07	2026-10-29 09:01:35.65422+07
867982bf-8812-491a-a259-dff742f9a3ac	regression	#64748b	Detection regression test	2026-10-29 09:01:35.654375+07	2026-10-29 09:01:35.654375+07
\.


--
-- Data for Name: threat_intel; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.threat_intel (id, indicator, indicator_type, threat_actor, confidence, severity, source, country, last_seen, metadata, created_at, updated_at) FROM stdin;
1233687d-06a0-47b6-8041-1aff94500d9c	lockbit41.badhost.io	domain	LockBit	81	critical	Recorded Future	Singapore	2026-10-18 20:01:35.562+07	{}	2026-10-29 09:01:35.562541+07	2026-10-29 09:01:35.562541+07
019bade9-8cfe-4c5c-b5b3-b66570f72bc5	ef145fcfb4067a581008f2912b498781e34cd63d9e3030ecd8b2cc0e08bbc0b0	hash	FIN7	90	medium	Recorded Future	North Korea	2026-10-28 20:01:35.562+07	{}	2026-10-29 09:01:35.562889+07	2026-10-29 09:01:35.562889+07
8e03f4ad-c79c-454b-9b25-170bbea2db7c	turla84.badhost.io	domain	Turla	94	high	AbuseCH	Nigeria	2026-10-26 02:01:35.562+07	{}	2026-10-29 09:01:35.56307+07	2026-10-29 09:01:35.56307+07
7734603c-9fb8-4747-9ef1-eee63748fdb4	http://80.102.113.171/c2	url	RedLine	85	low	Internal CTI	India	2026-10-21 05:01:35.562+07	{}	2026-10-29 09:01:35.563272+07	2026-10-29 09:01:35.563272+07
06bb1d85-1e03-4c33-b977-08b92ba05629	613ff3293a5f62f1029ec8ee7ae352f7e5428991a17a626e62ad51b26246016e	hash	Akira	55	high	Recorded Future	Japan	2026-10-19 05:01:35.562+07	{}	2026-10-29 09:01:35.563487+07	2026-10-29 09:01:35.563487+07
02870967-0285-4c06-9027-1e5367ee517b	203.132.181.107	ip	Cobalt Strike	95	medium	CrowdStrike	China	2026-10-23 01:01:35.562+07	{}	2026-10-29 09:01:35.563707+07	2026-10-29 09:01:35.563707+07
68815865-98e8-4058-b862-ec119292ee8b	1a22f222cae18a4ab727bd54f56e1a113f1428cc0a68c98506657c5887e06326	hash	Scattered Spider	61	critical	Internal CTI	Turkey	2026-10-21 02:01:35.562+07	{}	2026-10-29 09:01:35.563976+07	2026-10-29 09:01:35.563976+07
0a64fc9c-944c-40e9-beee-fe61eece8392	103.67.70.198	ip	BlackCat	78	critical	MISP	Russia	2026-10-18 14:01:35.562+07	{}	2026-10-29 09:01:35.564176+07	2026-10-29 09:01:35.564176+07
9abba916-67e9-49ad-91c9-4a338ccea101	http://80.156.90.232/c2	url	Mirai	74	critical	Recorded Future	Iran	2026-10-24 03:01:35.562+07	{}	2026-10-29 09:01:35.564365+07	2026-10-29 09:01:35.564365+07
ea66db20-effa-46cf-b765-76aa95ed0e38	http://45.246.188.81/c2	url	Turla	59	low	MISP	Vietnam	2026-10-24 23:01:35.562+07	{}	2026-10-29 09:01:35.564554+07	2026-10-29 09:01:35.564554+07
2bfeace4-8e9c-4ac6-9885-721aae2d8753	f0f2c3f535d5bd2b8f35cd9efdb58955bf9a67e838977b281982db610ce0a378	hash	Kimsuky	62	critical	AbuseCH	India	2026-10-21 22:01:35.562+07	{}	2026-10-29 09:01:35.564832+07	2026-10-29 09:01:35.564832+07
09af4e27-e620-48e9-a47c-1b52de6d0d7d	185.100.136.222	ip	Kimsuky	95	critical	AbuseCH	India	2026-10-26 22:01:35.562+07	{}	2026-10-29 09:01:35.56506+07	2026-10-29 09:01:35.56506+07
677b29aa-5ea9-44ca-9756-6de24bfdd16d	http://91.192.223.130/c2	url	Medusa	80	medium	Recorded Future	Russia	2026-10-21 10:01:35.562+07	{}	2026-10-29 09:01:35.565275+07	2026-10-29 09:01:35.565275+07
757ba340-742d-437e-b49e-456306b25bcd	http://194.163.31.79/c2	url	Anonymous Sudan	93	low	AbuseCH	Brazil	2026-10-23 06:01:35.562+07	{}	2026-10-29 09:01:35.565445+07	2026-10-29 09:01:35.565445+07
7fc28312-7e32-474d-a6db-bf7b4d2b5383	82607d2ec59f2e691a7c233bfbdb11ba526396aa931c8f73f7dae83019d49d9b	hash	Anonymous Sudan	52	low	MISP	Nigeria	2026-10-22 01:01:35.562+07	{}	2026-10-29 09:01:35.56561+07	2026-10-29 09:01:35.56561+07
41e8f313-85db-4b56-90d6-b4ac25e91699	15f1cc152c2e3501f1e1b62f2a9a65334f7590e282acc120b0ab58b7ee277c3b	hash	Play	99	medium	AbuseCH	Iran	2026-10-26 11:01:35.562+07	{}	2026-10-29 09:01:35.565791+07	2026-10-29 09:01:35.565791+07
8d150dcb-9fc8-4fde-908b-401b7390cd12	2a7920789831531e293e8d9007a5d959e73c5811595d4fca2c013112f709ab71	hash	Lazarus Group	63	medium	Recorded Future	South Korea	2026-10-20 13:01:35.562+07	{}	2026-10-29 09:01:35.565977+07	2026-10-29 09:01:35.565977+07
b1cc6215-2288-4952-a69a-466da395e3c6	244bdcf20765e7bfc0b8f3f7ea1bde81e309633653295ff1c34c1cb6baabe401	hash	Lazarus Group	91	low	AbuseCH	North Korea	2026-10-24 08:01:35.562+07	{}	2026-10-29 09:01:35.566161+07	2026-10-29 09:01:35.566161+07
0d6c79e3-5fe7-43fb-b401-4ff0d033e235	http://41.102.202.33/c2	url	Qakbot	60	low	AlienVault OTX	Germany	2026-10-18 22:01:35.562+07	{}	2026-10-29 09:01:35.566337+07	2026-10-29 09:01:35.566337+07
31fe4053-0425-4559-a9a1-985d8df21ecb	5e8fc99c7d0d4821a678f59e7340888566c497221316e2f0454dcf02246ac325	hash	Medusa	80	medium	MISP	Russia	2026-10-26 17:01:35.562+07	{}	2026-10-29 09:01:35.566541+07	2026-10-29 09:01:35.566541+07
ef00b743-93d4-42c3-9274-44944e1846e1	66ecbe5ab29a16d9e87b9b078fb33b4e7288aa8fb4c92a973d96346620938ef2	hash	Medusa	86	high	AlienVault OTX	Ukraine	2026-10-20 19:01:35.562+07	{}	2026-10-29 09:01:35.566756+07	2026-10-29 09:01:35.566756+07
e287f954-5e8d-4c2c-8725-ecfe5f805c40	45.131.160.250	ip	Mirai	66	medium	Internal CTI	Vietnam	2026-10-16 03:01:35.562+07	{}	2026-10-29 09:01:35.567015+07	2026-10-29 09:01:35.567015+07
b1cbb0c1-a4d1-463c-ba23-5b37fb97a1da	medusa40.badhost.io	domain	Medusa	87	high	Internal CTI	United States	2026-10-16 22:01:35.562+07	{}	2026-10-29 09:01:35.567222+07	2026-10-29 09:01:35.567222+07
775f53cc-e9fd-4343-bccb-eb7d896c5ce8	80.151.85.20	ip	Lazarus Group	53	medium	AbuseCH	North Korea	2026-10-23 16:01:35.562+07	{}	2026-10-29 09:01:35.567408+07	2026-10-29 09:01:35.567408+07
2cd5bf4c-23b3-4f2c-bdef-92e0438e2b32	fin756.badhost.io	domain	FIN7	68	medium	AlienVault OTX	Russia	2026-10-24 06:01:35.562+07	{}	2026-10-29 09:01:35.567582+07	2026-10-29 09:01:35.567582+07
a413372d-28d9-4c7d-89ff-1bbfd1f912f3	203.69.227.61	ip	Emotet	79	medium	AlienVault OTX	Vietnam	2026-10-27 08:01:35.562+07	{}	2026-10-29 09:01:35.567748+07	2026-10-29 09:01:35.567748+07
b11cc632-09fe-4554-9fcc-eaa8495215f6	c8860093f0537e22fd717218f6609241a6ea36eabc133e5ca86e00427ad4cdb2	hash	BlackCat	74	high	Recorded Future	Netherlands	2026-10-21 05:01:35.562+07	{}	2026-10-29 09:01:35.567945+07	2026-10-29 09:01:35.567945+07
8f0a724c-a0da-495b-9adf-97ffff8af84b	http://194.215.244.106/c2	url	Lazarus Group	85	high	AbuseCH	United Kingdom	2026-10-18 10:01:35.562+07	{}	2026-10-29 09:01:35.568113+07	2026-10-29 09:01:35.568113+07
aad8e399-99ba-483b-8f81-f48b4d38beef	ce1117ff6ac4f70ddad7a02fdacdb8a7dde8424849af03894199f9fb05bc4cc2	hash	Turla	53	high	Internal CTI	United Kingdom	2026-10-26 19:01:35.562+07	{}	2026-10-29 09:01:35.568272+07	2026-10-29 09:01:35.568272+07
e3966a1b-f40d-4e62-a060-f6f4823efd50	http://31.47.197.167/c2	url	Lazarus Group	63	medium	MISP	Ukraine	2026-10-16 21:01:35.562+07	{}	2026-10-29 09:01:35.568462+07	2026-10-29 09:01:35.568462+07
bd331e2c-b3da-4840-9f8f-be374c4d33bd	cl0p68.badhost.io	domain	Cl0p	60	medium	MISP	Vietnam	2026-10-22 05:01:35.562+07	{}	2026-10-29 09:01:35.568641+07	2026-10-29 09:01:35.568641+07
361e13de-5dd1-46d7-92cb-0a3a6af7492e	c80937eac0ecb3989ccbc6e1969d1a7669222f21c330d15896d5c821f6b59f35	hash	RedLine	58	critical	Recorded Future	Romania	2026-10-16 20:01:35.562+07	{}	2026-10-29 09:01:35.568823+07	2026-10-29 09:01:35.568823+07
469561fa-8601-4185-852b-a948de1005e2	5.157.76.153	ip	FIN7	92	low	CrowdStrike	Iran	2026-10-16 18:01:35.562+07	{}	2026-10-29 09:01:35.56901+07	2026-10-29 09:01:35.56901+07
a1436003-05b9-45c7-a8b6-8cc6ab62aa63	103.53.92.235	ip	Anonymous Sudan	91	critical	Internal CTI	China	2026-10-21 02:01:35.562+07	{}	2026-10-29 09:01:35.569202+07	2026-10-29 09:01:35.569202+07
8f7b4668-a81e-4a91-8c5a-2d076800ced9	http://102.82.183.30/c2	url	LockBit	95	high	AlienVault OTX	France	2026-10-24 07:01:35.562+07	{}	2026-10-29 09:01:35.569382+07	2026-10-29 09:01:35.569382+07
5fa1295d-fcef-4daf-b7c3-6b393bab9a43	f341ce806a6496c1a6c55f185dbaf2cab99b013f54af4707bb9203f9d7c78ac6	hash	BlackCat	91	high	Recorded Future	Japan	2026-10-26 19:01:35.562+07	{}	2026-10-29 09:01:35.569568+07	2026-10-29 09:01:35.569568+07
690d73dd-4cfe-49be-acaa-6aa0a2e86bd5	203.24.202.226	ip	LockBit	52	medium	Recorded Future	China	2026-10-29 05:01:35.562+07	{}	2026-10-29 09:01:35.569727+07	2026-10-29 09:01:35.569727+07
2cda408d-d830-428f-8aa2-f308d3385ecc	http://212.225.86.14/c2	url	Scattered Spider	60	high	CrowdStrike	Netherlands	2026-10-24 01:01:35.562+07	{}	2026-10-29 09:01:35.56995+07	2026-10-29 09:01:35.56995+07
f012a053-cbb0-4ec9-9d5e-579b5881370c	http://176.134.146.91/c2	url	Mirai	77	low	AbuseCH	India	2026-10-15 12:01:35.562+07	{}	2026-10-29 09:01:35.570146+07	2026-10-29 09:01:35.570146+07
48542b83-fd93-437f-a59e-3c7a10e69478	anonymoussudan71.badhost.io	domain	Anonymous Sudan	76	critical	CrowdStrike	Indonesia	2026-10-27 02:01:35.562+07	{}	2026-10-29 09:01:35.570327+07	2026-10-29 09:01:35.570327+07
8c11218b-55b6-4f6b-a4c2-01598231fde8	41.242.19.226	ip	Akira	81	critical	MISP	North Korea	2026-10-21 15:01:35.562+07	{}	2026-10-29 09:01:35.570497+07	2026-10-29 09:01:35.570497+07
b4a00f28-aef1-4a89-a4d0-c863e471d3e3	fin785.badhost.io	domain	FIN7	50	high	AbuseCH	North Korea	2026-10-21 22:01:35.562+07	{}	2026-10-29 09:01:35.570672+07	2026-10-29 09:01:35.570672+07
37d407e5-c0de-4647-bbf2-e07128333ae0	mirai35.badhost.io	domain	Mirai	53	high	Recorded Future	United States	2026-10-27 00:01:35.562+07	{}	2026-10-29 09:01:35.570848+07	2026-10-29 09:01:35.570848+07
e020126f-710d-4cfc-9eba-b7352e7273e0	7c5eb6af42b0b0ffc2f4846c6c88915843bb155c889af1cc54a8cff2efd763f8	hash	Play	60	critical	AlienVault OTX	Germany	2026-10-28 19:01:35.562+07	{}	2026-10-29 09:01:35.571025+07	2026-10-29 09:01:35.571025+07
99fb94ed-edb7-4f2d-8035-c062d1c330ea	http://45.121.188.76/c2	url	Anonymous Sudan	93	critical	MISP	South Korea	2026-10-19 03:01:35.562+07	{}	2026-10-29 09:01:35.571205+07	2026-10-29 09:01:35.571205+07
\.


--
-- Data for Name: threats; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.threats (id, name, category, severity, status, source, source_ip, country, country_code, ioc_type, ioc_value, confidence, risk_score, description, mitre_tactic, mitre_technique, first_seen, last_seen, metadata, created_at, updated_at) FROM stdin;
f1f79d39-8968-48fa-bb70-c69ca86c3ece	Emotet — DDoS Botnet	Malware	high	resolved	Emotet infrastructure	82.135.240.223	Turkey	TR	hash	6a6515480b76b90959fc49e8ef949f72d2ce6a400adb06de27cd77d44c4f259f	78	63	Malware activity attributed to Emotet targeting the Medicare platform. Observed in the telehealth perimeter.	TA0002 Execution	T1204 User Execution	2026-09-26 00:01:35.386+07	2026-10-20 21:01:35.386+07	{"actor": "Emotet", "campaign": "Emotet-759", "kill_chain": "reconnaissance"}	2026-10-29 09:01:35.387184+07	2026-10-29 09:01:35.387184+07
cecd2dc9-3666-452b-91bd-8aea685608e9	LockBit — C2 Beacon	Web Attack	medium	active	LockBit infrastructure	181.25.104.227	North Korea	KP	hash	047d9ee81bf5fe981ff2d25023a9dfab3afd1b1982dc5a4ce7c2bf8598ba65bc	81	36	Web Attack activity attributed to LockBit targeting the Medicare platform. Observed in the telehealth perimeter.	TA0001 Initial Access	T1190 Exploit Public-Facing Application	2026-09-03 13:01:35.386+07	2026-10-21 05:01:35.386+07	{"actor": "LockBit", "campaign": "LockBit-308", "kill_chain": "actions-on-objective"}	2026-10-29 09:01:35.388125+07	2026-10-29 09:01:35.388125+07
6f19fa97-c338-4fbd-802c-0141c2296adc	Kimsuky — SQL Injection Wave	Brute Force	high	active	Kimsuky infrastructure	91.191.185.98	Romania	RO	ip	91.191.185.98	56	69	Brute Force activity attributed to Kimsuky targeting the Medicare platform. Observed in the EHR perimeter.	TA0006 Credential Access	T1110 Brute Force	2026-09-02 02:01:35.386+07	2026-10-28 09:01:35.386+07	{"actor": "Kimsuky", "campaign": "Kimsuky-900", "kill_chain": "weaponization"}	2026-10-29 09:01:35.38854+07	2026-10-29 09:01:35.38854+07
762d7707-2d0b-44ff-9e25-874a87b37c1c	Kimsuky — Phishing Kit	DDoS	medium	active	Kimsuky infrastructure	77.162.68.58	Germany	DE	url	https://77.162.68.58/payload/4108	70	38	DDoS activity attributed to Kimsuky targeting the Medicare platform. Observed in the identity perimeter.	TA0040 Impact	T1498 Network Denial of Service	2026-10-10 19:01:35.386+07	2026-10-27 04:01:35.386+07	{"actor": "Kimsuky", "campaign": "Kimsuky-371", "kill_chain": "exploitation"}	2026-10-29 09:01:35.38892+07	2026-10-29 09:01:35.38892+07
9af3a12a-dd1d-4027-bc02-5afad11ab5c0	FIN7 — Supply Chain Compromise	Data Exfiltration	low	active	FIN7 infrastructure	41.18.147.63	Ukraine	UA	url	https://41.18.147.63/payload/5665	89	29	Data Exfiltration activity attributed to FIN7 targeting the Medicare platform. Observed in the telehealth perimeter.	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	2026-10-16 08:01:35.386+07	2026-10-27 13:01:35.386+07	{"actor": "FIN7", "campaign": "FIN7-661", "kill_chain": "actions-on-objective"}	2026-10-29 09:01:35.389286+07	2026-10-29 09:01:35.389286+07
835b0775-2959-4b05-8540-8aa8d198df4f	Medusa — Phishing Kit	DDoS	high	monitoring	Medusa infrastructure	103.105.30.46	Germany	DE	ip	103.105.30.46	71	74	DDoS activity attributed to Medusa targeting the Medicare platform. Observed in the telehealth perimeter.	TA0040 Impact	T1498 Network Denial of Service	2026-09-16 13:01:35.386+07	2026-10-21 22:01:35.386+07	{"actor": "Medusa", "campaign": "Medusa-892", "kill_chain": "exploitation"}	2026-10-29 09:01:35.389651+07	2026-10-29 09:01:35.389651+07
376c9641-d150-43f7-b1ce-e2083d1f6488	Volt Typhoon — C2 Beacon	Data Exfiltration	high	active	Volt Typhoon infrastructure	212.112.62.138	Singapore	SG	ip	212.112.62.138	63	65	Data Exfiltration activity attributed to Volt Typhoon targeting the Medicare platform. Observed in the telehealth perimeter.	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	2026-09-02 04:01:35.386+07	2026-10-24 21:01:35.386+07	{"actor": "Volt Typhoon", "campaign": "Volt Typhoon-289", "kill_chain": "actions-on-objective"}	2026-10-29 09:01:35.389997+07	2026-10-29 09:01:35.389997+07
61e38802-554e-42b8-bb43-5adadc01ea5c	Scattered Spider — Brute Force Campaign	Web Attack	high	blocked	Scattered Spider infrastructure	102.173.76.34	Japan	JP	ip	102.173.76.34	94	71	Web Attack activity attributed to Scattered Spider targeting the Medicare platform. Observed in the patient portal perimeter.	TA0001 Initial Access	T1190 Exploit Public-Facing Application	2026-10-17 21:01:35.386+07	2026-10-27 14:01:35.386+07	{"actor": "Scattered Spider", "campaign": "Scattered Spider-818", "kill_chain": "delivery"}	2026-10-29 09:01:35.390317+07	2026-10-29 09:01:35.390317+07
77022662-ff41-4734-a96b-d1c7edcee46d	BlackCat — DDoS Botnet	Malware	medium	active	BlackCat infrastructure	37.179.8.81	United States	US	ip	37.179.8.81	87	35	Malware activity attributed to BlackCat targeting the Medicare platform. Observed in the telehealth perimeter.	TA0002 Execution	T1204 User Execution	2026-10-16 04:01:35.386+07	2026-10-21 23:01:35.386+07	{"actor": "BlackCat", "campaign": "BlackCat-321", "kill_chain": "exploitation"}	2026-10-29 09:01:35.390692+07	2026-10-29 09:01:35.390692+07
5255b5db-ce04-4f87-adee-5ab4fc74049a	Volt Typhoon — Credential Harvesting	Ransomware	high	active	Volt Typhoon infrastructure	103.81.169.220	Iran	IR	hash	7b45824d02fa6e9b1eba2219097e053582975fd3d366c3ff94a6e015568de3f6	88	81	Ransomware activity attributed to Volt Typhoon targeting the Medicare platform. Observed in the identity perimeter.	TA0040 Impact	T1486 Data Encrypted for Impact	2026-09-16 02:01:35.386+07	2026-10-20 15:01:35.386+07	{"actor": "Volt Typhoon", "campaign": "Volt Typhoon-378", "kill_chain": "delivery"}	2026-10-29 09:01:35.391053+07	2026-10-29 09:01:35.391053+07
ffdbb6a4-c306-4f16-a7ad-29d69f39219f	Medusa — Zero-day Exploitation	Supply Chain	critical	blocked	Medusa infrastructure	41.164.216.176	Singapore	SG	domain	medusa-76.evil-cdn.net	93	90	Supply Chain activity attributed to Medusa targeting the Medicare platform. Observed in the patient portal perimeter.	TA0001 Initial Access	T1195 Supply Chain Compromise	2026-09-11 08:01:35.386+07	2026-10-26 22:01:35.386+07	{"actor": "Medusa", "campaign": "Medusa-241", "kill_chain": "command-and-control"}	2026-10-29 09:01:35.391405+07	2026-10-29 09:01:35.391405+07
a33cfc49-b05c-48fc-b7d5-6dd4549d938b	Mirai — Brute Force Campaign	Zero-day	critical	active	Mirai infrastructure	77.163.165.241	United States	US	url	https://77.163.165.241/payload/4033	61	87	Zero-day activity attributed to Mirai targeting the Medicare platform. Observed in the identity perimeter.	TA0001 Initial Access	T1203 Exploitation for Client Execution	2026-10-15 14:01:35.386+07	2026-10-21 00:01:35.386+07	{"actor": "Mirai", "campaign": "Mirai-534", "kill_chain": "exploitation"}	2026-10-29 09:01:35.391744+07	2026-10-29 09:01:35.391744+07
c80cf857-8669-42a0-811b-e49d0ed96795	RedLine — Cryptojacking	Zero-day	critical	active	RedLine infrastructure	77.17.140.64	Netherlands	NL	domain	redline-70.evil-cdn.net	70	83	Zero-day activity attributed to RedLine targeting the Medicare platform. Observed in the patient portal perimeter.	TA0001 Initial Access	T1203 Exploitation for Client Execution	2026-10-08 14:01:35.386+07	2026-10-26 12:01:35.386+07	{"actor": "RedLine", "campaign": "RedLine-821", "kill_chain": "weaponization"}	2026-10-29 09:01:35.39208+07	2026-10-29 09:01:35.39208+07
5a8800e7-940e-493d-9572-6c7fe86f3982	Mirai — Brute Force Campaign	Cryptojacking	critical	active	Mirai infrastructure	41.250.191.73	Romania	RO	ip	41.250.191.73	94	84	Cryptojacking activity attributed to Mirai targeting the Medicare platform. Observed in the identity perimeter.	TA0040 Impact	T1496 Resource Hijacking	2026-09-28 21:01:35.386+07	2026-10-23 04:01:35.386+07	{"actor": "Mirai", "campaign": "Mirai-388", "kill_chain": "exploitation"}	2026-10-29 09:01:35.392431+07	2026-10-29 09:01:35.392431+07
b3ba977e-a125-4c63-b9a0-60ae6baa22cf	Qakbot — Zero-day Exploitation	Ransomware	critical	active	Qakbot infrastructure	181.70.65.245	Brazil	BR	ip	181.70.65.245	57	94	Ransomware activity attributed to Qakbot targeting the Medicare platform. Observed in the EHR perimeter.	TA0040 Impact	T1486 Data Encrypted for Impact	2026-10-16 09:01:35.386+07	2026-10-22 02:01:35.386+07	{"actor": "Qakbot", "campaign": "Qakbot-630", "kill_chain": "command-and-control"}	2026-10-29 09:01:35.392763+07	2026-10-29 09:01:35.392763+07
5f853892-c003-4a55-8d20-14faff86c298	Volt Typhoon — Brute Force Campaign	C2	medium	active	Volt Typhoon infrastructure	185.33.142.204	China	CN	url	https://185.33.142.204/payload/3410	56	41	C2 activity attributed to Volt Typhoon targeting the Medicare platform. Observed in the telehealth perimeter.	TA0011 Command and Control	T1071 Application Layer Protocol	2026-09-02 03:01:35.386+07	2026-10-24 16:01:35.386+07	{"actor": "Volt Typhoon", "campaign": "Volt Typhoon-926", "kill_chain": "exploitation"}	2026-10-29 09:01:35.393311+07	2026-10-29 09:01:35.393311+07
d619f3b0-23db-4f7d-afbd-cd1f7c439b0e	Scattered Spider — Web Shell Deployment	Cryptojacking	high	blocked	Scattered Spider infrastructure	212.253.185.48	United Kingdom	GB	hash	0879f8d739130eabdb70f39ccdff674b91a479094b749dd964aad3a918d3f7e3	64	73	Cryptojacking activity attributed to Scattered Spider targeting the Medicare platform. Observed in the billing perimeter.	TA0040 Impact	T1496 Resource Hijacking	2026-10-08 05:01:35.386+07	2026-10-27 23:01:35.386+07	{"actor": "Scattered Spider", "campaign": "Scattered Spider-521", "kill_chain": "command-and-control"}	2026-10-29 09:01:35.393681+07	2026-10-29 09:01:35.393681+07
a7f0c60d-7d39-43c4-bd01-9da35e4f8436	Mirai — C2 Beacon	Web Attack	medium	active	Mirai infrastructure	212.185.39.244	North Korea	KP	domain	mirai-37.evil-cdn.net	93	44	Web Attack activity attributed to Mirai targeting the Medicare platform. Observed in the telehealth perimeter.	TA0001 Initial Access	T1190 Exploit Public-Facing Application	2026-10-12 08:01:35.386+07	2026-10-28 07:01:35.386+07	{"actor": "Mirai", "campaign": "Mirai-409", "kill_chain": "exploitation"}	2026-10-29 09:01:35.394092+07	2026-10-29 09:01:35.394092+07
8bfe3561-d97b-483f-9b6a-b38dd35927c7	Qakbot — C2 Beacon	DDoS	high	active	Qakbot infrastructure	41.120.121.169	Russia	RU	url	https://41.120.121.169/payload/5393	98	73	DDoS activity attributed to Qakbot targeting the Medicare platform. Observed in the telehealth perimeter.	TA0040 Impact	T1498 Network Denial of Service	2026-09-21 20:01:35.386+07	2026-10-28 14:01:35.386+07	{"actor": "Qakbot", "campaign": "Qakbot-851", "kill_chain": "weaponization"}	2026-10-29 09:01:35.394395+07	2026-10-29 09:01:35.394395+07
6a5c3953-28c0-43cc-bed7-2ebbea5dca46	FIN7 — Phishing Kit	Phishing	low	active	FIN7 infrastructure	91.153.58.136	South Korea	KR	hash	01408dda6700b41cb0027c7b6377cf8e2a51c64acae1ea1f8441225edabf79bb	68	34	Phishing activity attributed to FIN7 targeting the Medicare platform. Observed in the EHR perimeter.	TA0001 Initial Access	T1566 Phishing	2026-10-10 01:01:35.386+07	2026-10-28 06:01:35.386+07	{"actor": "FIN7", "campaign": "FIN7-526", "kill_chain": "command-and-control"}	2026-10-29 09:01:35.394826+07	2026-10-29 09:01:35.394826+07
7de44dd1-1dcc-46e8-84c4-563779c4feb4	Sandworm — Credential Harvesting	Malware	critical	active	Sandworm infrastructure	77.190.220.196	Germany	DE	hash	a5691633283d7d0a34c45eebd2239fc8c9f76a038a8e385addc26b2c4f4d5f4c	67	82	Malware activity attributed to Sandworm targeting the Medicare platform. Observed in the billing perimeter.	TA0002 Execution	T1204 User Execution	2026-09-09 00:01:35.386+07	2026-10-26 21:01:35.386+07	{"actor": "Sandworm", "campaign": "Sandworm-866", "kill_chain": "delivery"}	2026-10-29 09:01:35.39529+07	2026-10-29 09:01:35.39529+07
c12ffa96-6100-4fcc-ae68-6fd14ef2ee61	Turla — C2 Beacon	Zero-day	critical	monitoring	Turla infrastructure	80.104.163.112	Russia	RU	domain	turla-22.evil-cdn.net	72	94	Zero-day activity attributed to Turla targeting the Medicare platform. Observed in the telehealth perimeter.	TA0001 Initial Access	T1203 Exploitation for Client Execution	2026-10-18 18:01:35.386+07	2026-10-23 18:01:35.386+07	{"actor": "Turla", "campaign": "Turla-592", "kill_chain": "command-and-control"}	2026-10-29 09:01:35.395686+07	2026-10-29 09:01:35.395686+07
b90b3b50-50b3-467c-8169-f0fc5ab909cc	Volt Typhoon — Credential Harvesting	Ransomware	medium	active	Volt Typhoon infrastructure	185.82.131.214	South Korea	KR	hash	709ce6df40967cf8a53d2438d971edee7b8a76c4900f142da791d5865cd496d6	71	36	Ransomware activity attributed to Volt Typhoon targeting the Medicare platform. Observed in the telehealth perimeter.	TA0040 Impact	T1486 Data Encrypted for Impact	2026-09-12 07:01:35.386+07	2026-10-22 20:01:35.386+07	{"actor": "Volt Typhoon", "campaign": "Volt Typhoon-663", "kill_chain": "delivery"}	2026-10-29 09:01:35.396076+07	2026-10-29 09:01:35.396076+07
22d38993-8ff8-4ea8-b7d5-374ed61e9288	Play — Supply Chain Compromise	Data Exfiltration	medium	active	Play infrastructure	176.117.101.20	North Korea	KP	domain	play-46.evil-cdn.net	95	49	Data Exfiltration activity attributed to Play targeting the Medicare platform. Observed in the patient portal perimeter.	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	2026-09-06 00:01:35.386+07	2026-10-23 16:01:35.386+07	{"actor": "Play", "campaign": "Play-990", "kill_chain": "reconnaissance"}	2026-10-29 09:01:35.396412+07	2026-10-29 09:01:35.396412+07
14d6f1b4-5ab7-4783-8f84-4fd6bd2ec837	RedLine — Credential Harvesting	Phishing	medium	active	RedLine infrastructure	41.43.42.190	Singapore	SG	ip	41.43.42.190	65	59	Phishing activity attributed to RedLine targeting the Medicare platform. Observed in the EHR perimeter.	TA0001 Initial Access	T1566 Phishing	2026-10-22 03:01:35.386+07	2026-10-21 07:01:35.386+07	{"actor": "RedLine", "campaign": "RedLine-116", "kill_chain": "actions-on-objective"}	2026-10-29 09:01:35.396716+07	2026-10-29 09:01:35.396716+07
8d5751aa-62cd-4460-a8de-38cfe934a5bd	Qakbot — Cryptojacking	Web Attack	medium	active	Qakbot infrastructure	45.109.88.119	China	CN	url	https://45.109.88.119/payload/7583	61	47	Web Attack activity attributed to Qakbot targeting the Medicare platform. Observed in the telehealth perimeter.	TA0001 Initial Access	T1190 Exploit Public-Facing Application	2026-09-30 08:01:35.386+07	2026-10-22 21:01:35.386+07	{"actor": "Qakbot", "campaign": "Qakbot-190", "kill_chain": "weaponization"}	2026-10-29 09:01:35.397027+07	2026-10-29 09:01:35.397027+07
f573b7b0-367c-4c09-8390-2bd90db5684d	Turla — Web Shell Deployment	Insider Threat	medium	resolved	Turla infrastructure	45.82.132.136	Ukraine	UA	domain	turla-92.evil-cdn.net	65	61	Insider Threat activity attributed to Turla targeting the Medicare platform. Observed in the identity perimeter.	TA0009 Collection	T1530 Data from Cloud Storage	2026-10-09 19:01:35.386+07	2026-10-23 10:01:35.386+07	{"actor": "Turla", "campaign": "Turla-506", "kill_chain": "reconnaissance"}	2026-10-29 09:01:35.397346+07	2026-10-29 09:01:35.397346+07
6ec20990-bb57-4d4f-9d7b-e3ba3f013593	Anonymous Sudan — SQL Injection Wave	Zero-day	low	resolved	Anonymous Sudan infrastructure	41.233.45.139	China	CN	url	https://41.233.45.139/payload/3958	58	15	Zero-day activity attributed to Anonymous Sudan targeting the Medicare platform. Observed in the patient portal perimeter.	TA0001 Initial Access	T1203 Exploitation for Client Execution	2026-10-04 06:01:35.386+07	2026-10-22 18:01:35.386+07	{"actor": "Anonymous Sudan", "campaign": "Anonymous Sudan-917", "kill_chain": "command-and-control"}	2026-10-29 09:01:35.397651+07	2026-10-29 09:01:35.397651+07
32ed708b-485b-4e58-bc0a-da16ef8f1800	Qakbot — Web Shell Deployment	Brute Force	low	blocked	Qakbot infrastructure	203.125.201.170	Nigeria	NG	ip	203.125.201.170	79	33	Brute Force activity attributed to Qakbot targeting the Medicare platform. Observed in the patient portal perimeter.	TA0006 Credential Access	T1110 Brute Force	2026-09-30 19:01:35.386+07	2026-10-26 18:01:35.386+07	{"actor": "Qakbot", "campaign": "Qakbot-100", "kill_chain": "delivery"}	2026-10-29 09:01:35.397952+07	2026-10-29 09:01:35.397952+07
179d0c40-b534-462a-91bb-cfd3d007cf78	Play — Zero-day Exploitation	Ransomware	low	blocked	Play infrastructure	5.173.25.30	Vietnam	VN	url	https://5.173.25.30/payload/2014	80	22	Ransomware activity attributed to Play targeting the Medicare platform. Observed in the telehealth perimeter.	TA0040 Impact	T1486 Data Encrypted for Impact	2026-10-12 03:01:35.386+07	2026-10-23 20:01:35.386+07	{"actor": "Play", "campaign": "Play-854", "kill_chain": "exploitation"}	2026-10-29 09:01:35.398489+07	2026-10-29 09:01:35.398489+07
8e06e301-7237-4327-861f-96d15171465d	APT-29 — Ransomware Campaign	Malware	low	resolved	APT-29 infrastructure	102.218.134.190	Netherlands	NL	url	https://102.218.134.190/payload/4190	68	23	Malware activity attributed to APT-29 targeting the Medicare platform. Observed in the billing perimeter.	TA0002 Execution	T1204 User Execution	2026-10-13 09:01:35.386+07	2026-10-27 13:01:35.386+07	{"actor": "APT-29", "campaign": "APT-29-813", "kill_chain": "exploitation"}	2026-10-29 09:01:35.39883+07	2026-10-29 09:01:35.39883+07
efcc2d73-2c63-43c7-9c82-2c2af9ea9a9f	Play — DDoS Botnet	Phishing	critical	monitoring	Play infrastructure	194.88.113.124	Romania	RO	url	https://194.88.113.124/payload/9440	90	99	Phishing activity attributed to Play targeting the Medicare platform. Observed in the billing perimeter.	TA0001 Initial Access	T1566 Phishing	2026-09-29 18:01:35.386+07	2026-10-22 19:01:35.386+07	{"actor": "Play", "campaign": "Play-436", "kill_chain": "reconnaissance"}	2026-10-29 09:01:35.399188+07	2026-10-29 09:01:35.399188+07
4692d51c-2468-46f0-9747-1e442ba5045c	Kimsuky — Phishing Kit	DDoS	medium	active	Kimsuky infrastructure	31.172.143.94	Indonesia	ID	hash	a04b7c73c2b18f685a120ca75553191e16c94c38d034d39440277f9889c7d399	87	46	DDoS activity attributed to Kimsuky targeting the Medicare platform. Observed in the EHR perimeter.	TA0040 Impact	T1498 Network Denial of Service	2026-10-13 15:01:35.386+07	2026-10-22 01:01:35.386+07	{"actor": "Kimsuky", "campaign": "Kimsuky-868", "kill_chain": "exploitation"}	2026-10-29 09:01:35.399503+07	2026-10-29 09:01:35.399503+07
c368788b-554f-40bd-84c3-5199428264de	Emotet — SQL Injection Wave	Zero-day	high	active	Emotet infrastructure	62.101.194.60	Romania	RO	domain	emotet-45.evil-cdn.net	92	66	Zero-day activity attributed to Emotet targeting the Medicare platform. Observed in the patient portal perimeter.	TA0001 Initial Access	T1203 Exploitation for Client Execution	2026-09-11 06:01:35.386+07	2026-10-27 19:01:35.386+07	{"actor": "Emotet", "campaign": "Emotet-516", "kill_chain": "command-and-control"}	2026-10-29 09:01:35.399853+07	2026-10-29 09:01:35.399853+07
735f0705-801e-4b32-8f08-cf4b80c9b361	Mirai — Cryptojacking	Cryptojacking	medium	blocked	Mirai infrastructure	203.160.127.215	Iran	IR	url	https://203.160.127.215/payload/8321	65	59	Cryptojacking activity attributed to Mirai targeting the Medicare platform. Observed in the patient portal perimeter.	TA0040 Impact	T1496 Resource Hijacking	2026-10-10 09:01:35.386+07	2026-10-21 12:01:35.386+07	{"actor": "Mirai", "campaign": "Mirai-687", "kill_chain": "exploitation"}	2026-10-29 09:01:35.400212+07	2026-10-29 09:01:35.400212+07
a8f82bee-0959-492d-a0fb-7c6ab92421fb	BlackCat — Brute Force Campaign	Supply Chain	medium	blocked	BlackCat infrastructure	41.175.248.116	Russia	RU	url	https://41.175.248.116/payload/5596	72	62	Supply Chain activity attributed to BlackCat targeting the Medicare platform. Observed in the identity perimeter.	TA0001 Initial Access	T1195 Supply Chain Compromise	2026-09-03 02:01:35.386+07	2026-10-22 23:01:35.386+07	{"actor": "BlackCat", "campaign": "BlackCat-453", "kill_chain": "command-and-control"}	2026-10-29 09:01:35.400546+07	2026-10-29 09:01:35.400546+07
1f2cae3e-655e-42ae-95f1-7af9ea350c76	Akira — Data Exfiltration	C2	high	resolved	Akira infrastructure	37.51.172.200	Nigeria	NG	domain	akira-39.evil-cdn.net	55	78	C2 activity attributed to Akira targeting the Medicare platform. Observed in the EHR perimeter.	TA0011 Command and Control	T1071 Application Layer Protocol	2026-09-23 13:01:35.386+07	2026-10-28 01:01:35.386+07	{"actor": "Akira", "campaign": "Akira-646", "kill_chain": "actions-on-objective"}	2026-10-29 09:01:35.400861+07	2026-10-29 09:01:35.400861+07
b4d357a5-d88f-4ec5-84ee-15f41e5559c8	RedLine — C2 Beacon	Data Exfiltration	medium	blocked	RedLine infrastructure	102.35.83.112	India	IN	hash	2336a1d5623afe25edc806662459ae05b0b58c9454d5505fcf9281d17a0f7713	78	40	Data Exfiltration activity attributed to RedLine targeting the Medicare platform. Observed in the EHR perimeter.	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	2026-09-01 23:01:35.386+07	2026-10-29 07:01:35.386+07	{"actor": "RedLine", "campaign": "RedLine-342", "kill_chain": "command-and-control"}	2026-10-29 09:01:35.401218+07	2026-10-29 09:01:35.401218+07
8f5f405a-f609-4d76-a349-4a96eafa592a	Sandworm — C2 Beacon	DDoS	high	active	Sandworm infrastructure	89.23.13.200	Romania	RO	url	https://89.23.13.200/payload/5384	78	84	DDoS activity attributed to Sandworm targeting the Medicare platform. Observed in the patient portal perimeter.	TA0040 Impact	T1498 Network Denial of Service	2026-10-03 18:01:35.386+07	2026-10-29 05:01:35.386+07	{"actor": "Sandworm", "campaign": "Sandworm-252", "kill_chain": "exploitation"}	2026-10-29 09:01:35.401532+07	2026-10-29 09:01:35.401532+07
543ca178-1052-439b-a6d7-edf17a9bfda3	Play — C2 Beacon	DDoS	low	resolved	Play infrastructure	31.19.145.52	Russia	RU	domain	play-91.evil-cdn.net	83	29	DDoS activity attributed to Play targeting the Medicare platform. Observed in the identity perimeter.	TA0040 Impact	T1498 Network Denial of Service	2026-09-30 23:01:35.386+07	2026-10-27 21:01:35.386+07	{"actor": "Play", "campaign": "Play-993", "kill_chain": "exploitation"}	2026-10-29 09:01:35.401814+07	2026-10-29 09:01:35.401814+07
7953f4ff-ae28-4b1f-9cde-3191902e0d02	Medusa — Zero-day Exploitation	Brute Force	medium	resolved	Medusa infrastructure	45.175.186.105	Ukraine	UA	ip	45.175.186.105	68	55	Brute Force activity attributed to Medusa targeting the Medicare platform. Observed in the telehealth perimeter.	TA0006 Credential Access	T1110 Brute Force	2026-10-23 04:01:35.386+07	2026-10-22 07:01:35.386+07	{"actor": "Medusa", "campaign": "Medusa-366", "kill_chain": "reconnaissance"}	2026-10-29 09:01:35.402104+07	2026-10-29 09:01:35.402104+07
cee8bd38-628a-4547-9c17-f7b57a129e42	Cobalt Strike — Credential Harvesting	Zero-day	medium	active	Cobalt Strike infrastructure	80.239.9.192	Russia	RU	ip	80.239.9.192	59	65	Zero-day activity attributed to Cobalt Strike targeting the Medicare platform. Observed in the EHR perimeter.	TA0001 Initial Access	T1203 Exploitation for Client Execution	2026-10-08 14:01:35.386+07	2026-10-28 16:01:35.386+07	{"actor": "Cobalt Strike", "campaign": "Cobalt Strike-997", "kill_chain": "delivery"}	2026-10-29 09:01:35.402383+07	2026-10-29 09:01:35.402383+07
c635c6f4-2ecd-417b-a60a-78a5f0ea4ab1	Volt Typhoon — Zero-day Exploitation	Brute Force	high	active	Volt Typhoon infrastructure	185.235.188.67	United States	US	url	https://185.235.188.67/payload/6854	64	71	Brute Force activity attributed to Volt Typhoon targeting the Medicare platform. Observed in the EHR perimeter.	TA0006 Credential Access	T1110 Brute Force	2026-09-19 09:01:35.386+07	2026-10-22 09:01:35.386+07	{"actor": "Volt Typhoon", "campaign": "Volt Typhoon-563", "kill_chain": "exploitation"}	2026-10-29 09:01:35.402656+07	2026-10-29 09:01:35.402656+07
10841f73-b107-4b91-8934-109165665ecd	Emotet — Phishing Kit	C2	low	active	Emotet infrastructure	109.249.219.85	United States	US	hash	7d065eebb0c70015e25908e362dc165e1ff58f0b61ff8e2b94b1166373179bd2	69	24	C2 activity attributed to Emotet targeting the Medicare platform. Observed in the identity perimeter.	TA0011 Command and Control	T1071 Application Layer Protocol	2026-09-12 06:01:35.386+07	2026-10-22 03:01:35.386+07	{"actor": "Emotet", "campaign": "Emotet-366", "kill_chain": "actions-on-objective"}	2026-10-29 09:01:35.402944+07	2026-10-29 09:01:35.402944+07
f4bee1da-cdbd-4940-b064-d63d30d10095	Scattered Spider — SQL Injection Wave	Web Attack	high	active	Scattered Spider infrastructure	80.44.121.200	North Korea	KP	domain	scatteredspider-13.evil-cdn.net	87	83	Web Attack activity attributed to Scattered Spider targeting the Medicare platform. Observed in the patient portal perimeter.	TA0001 Initial Access	T1190 Exploit Public-Facing Application	2026-10-03 07:01:35.386+07	2026-10-26 19:01:35.386+07	{"actor": "Scattered Spider", "campaign": "Scattered Spider-590", "kill_chain": "delivery"}	2026-10-29 09:01:35.403229+07	2026-10-29 09:01:35.403229+07
f0d817b3-7c1e-4d24-a554-eb7a972a4e15	Lazarus Group — Supply Chain Compromise	Brute Force	medium	resolved	Lazarus Group infrastructure	185.50.93.235	Netherlands	NL	url	https://185.50.93.235/payload/7357	88	61	Brute Force activity attributed to Lazarus Group targeting the Medicare platform. Observed in the billing perimeter.	TA0006 Credential Access	T1110 Brute Force	2026-10-17 08:01:35.386+07	2026-10-21 16:01:35.386+07	{"actor": "Lazarus Group", "campaign": "Lazarus Group-215", "kill_chain": "exploitation"}	2026-10-29 09:01:35.403517+07	2026-10-29 09:01:35.403517+07
f93967ae-bbbe-4267-85bc-79991c071f4b	Play — Brute Force Campaign	Phishing	low	active	Play infrastructure	45.251.70.13	Iran	IR	hash	946c2d30a83bf638c40705eec23cf0ebe13b69476a3ee254df66dbc7c440b182	92	29	Phishing activity attributed to Play targeting the Medicare platform. Observed in the patient portal perimeter.	TA0001 Initial Access	T1566 Phishing	2026-08-30 04:01:35.386+07	2026-10-25 09:01:35.386+07	{"actor": "Play", "campaign": "Play-115", "kill_chain": "command-and-control"}	2026-10-29 09:01:35.403794+07	2026-10-29 09:01:35.403794+07
0207baf9-932b-4d1a-88e3-6215fa5ae037	Scattered Spider — Web Shell Deployment	Phishing	high	active	Scattered Spider infrastructure	212.91.160.161	Romania	RO	hash	1dfb0ccb641710f53cc6488f0b86c3d29e90e673002b3c7a913333806af8d6c3	94	63	Phishing activity attributed to Scattered Spider targeting the Medicare platform. Observed in the EHR perimeter.	TA0001 Initial Access	T1566 Phishing	2026-10-12 05:01:35.386+07	2026-10-28 19:01:35.386+07	{"actor": "Scattered Spider", "campaign": "Scattered Spider-940", "kill_chain": "reconnaissance"}	2026-10-29 09:01:35.404181+07	2026-10-29 09:01:35.404181+07
f3908e6a-db5d-4562-9179-5309e37959de	Akira — Brute Force Campaign	DDoS	high	active	Akira infrastructure	37.87.176.139	United States	US	domain	akira-70.evil-cdn.net	57	69	DDoS activity attributed to Akira targeting the Medicare platform. Observed in the identity perimeter.	TA0040 Impact	T1498 Network Denial of Service	2026-09-23 01:01:35.386+07	2026-10-29 00:01:35.386+07	{"actor": "Akira", "campaign": "Akira-462", "kill_chain": "command-and-control"}	2026-10-29 09:01:35.404534+07	2026-10-29 09:01:35.404534+07
65731344-d8bb-4c7a-b066-a7fb72512f98	Anonymous Sudan — C2 Beacon	C2	medium	resolved	Anonymous Sudan infrastructure	212.172.52.214	United Kingdom	GB	hash	b421cf4d83aa61fce28cc6de3a36b892bc046b0c9c8cdb12122a4b2fe6456221	95	62	C2 activity attributed to Anonymous Sudan targeting the Medicare platform. Observed in the patient portal perimeter.	TA0011 Command and Control	T1071 Application Layer Protocol	2026-08-29 23:01:35.386+07	2026-10-27 04:01:35.386+07	{"actor": "Anonymous Sudan", "campaign": "Anonymous Sudan-119", "kill_chain": "reconnaissance"}	2026-10-29 09:01:35.404884+07	2026-10-29 09:01:35.404884+07
366d3637-1848-4ce0-82bf-a97763627469	Scattered Spider — SQL Injection Wave	Zero-day	medium	active	Scattered Spider infrastructure	37.9.173.191	Iran	IR	ip	37.9.173.191	81	37	Zero-day activity attributed to Scattered Spider targeting the Medicare platform. Observed in the EHR perimeter.	TA0001 Initial Access	T1203 Exploitation for Client Execution	2026-09-22 13:01:35.386+07	2026-10-23 15:01:35.386+07	{"actor": "Scattered Spider", "campaign": "Scattered Spider-662", "kill_chain": "exploitation"}	2026-10-29 09:01:35.405192+07	2026-10-29 09:01:35.405192+07
4dcdcd3e-9c12-4822-b431-96952b1205b6	Kimsuky — Cryptojacking	Supply Chain	medium	active	Kimsuky infrastructure	41.112.33.191	Iran	IR	hash	5074e227e33f9c2529ee484ecb42a48d8c7b89119d4991fa71360bd4654cf23f	64	58	Supply Chain activity attributed to Kimsuky targeting the Medicare platform. Observed in the EHR perimeter.	TA0001 Initial Access	T1195 Supply Chain Compromise	2026-10-21 09:01:35.386+07	2026-10-20 10:01:35.386+07	{"actor": "Kimsuky", "campaign": "Kimsuky-465", "kill_chain": "delivery"}	2026-10-29 09:01:35.405493+07	2026-10-29 09:01:35.405493+07
e288dae9-fb91-454c-afb3-ba078e8b7448	Play — Ransomware Campaign	DDoS	high	monitoring	Play infrastructure	77.165.136.67	Germany	DE	ip	77.165.136.67	67	71	DDoS activity attributed to Play targeting the Medicare platform. Observed in the patient portal perimeter.	TA0040 Impact	T1498 Network Denial of Service	2026-09-14 14:01:35.386+07	2026-10-24 02:01:35.386+07	{"actor": "Play", "campaign": "Play-352", "kill_chain": "command-and-control"}	2026-10-29 09:01:35.405797+07	2026-10-29 09:01:35.405797+07
95879c27-d3fc-4365-95a3-c9572bc671f2	Volt Typhoon — Phishing Kit	Insider Threat	high	active	Volt Typhoon infrastructure	82.76.234.157	Russia	RU	domain	volttyphoon-37.evil-cdn.net	55	69	Insider Threat activity attributed to Volt Typhoon targeting the Medicare platform. Observed in the identity perimeter.	TA0009 Collection	T1530 Data from Cloud Storage	2026-09-25 07:01:35.386+07	2026-10-27 08:01:35.386+07	{"actor": "Volt Typhoon", "campaign": "Volt Typhoon-224", "kill_chain": "weaponization"}	2026-10-29 09:01:35.406099+07	2026-10-29 09:01:35.406099+07
37305175-0521-4495-8cc2-f765f1fe1e4a	LockBit — Credential Harvesting	Brute Force	high	active	LockBit infrastructure	89.204.40.5	China	CN	url	https://89.204.40.5/payload/5643	93	66	Brute Force activity attributed to LockBit targeting the Medicare platform. Observed in the patient portal perimeter.	TA0006 Credential Access	T1110 Brute Force	2026-09-29 06:01:35.386+07	2026-10-20 11:01:35.386+07	{"actor": "LockBit", "campaign": "LockBit-277", "kill_chain": "exploitation"}	2026-10-29 09:01:35.406499+07	2026-10-29 09:01:35.406499+07
ea6101ae-6e04-4397-88e7-25a0155b743f	Anonymous Sudan — DDoS Botnet	C2	critical	monitoring	Anonymous Sudan infrastructure	91.69.194.52	Iran	IR	ip	91.69.194.52	84	91	C2 activity attributed to Anonymous Sudan targeting the Medicare platform. Observed in the EHR perimeter.	TA0011 Command and Control	T1071 Application Layer Protocol	2026-09-03 06:01:35.386+07	2026-10-24 16:01:35.386+07	{"actor": "Anonymous Sudan", "campaign": "Anonymous Sudan-277", "kill_chain": "actions-on-objective"}	2026-10-29 09:01:35.40683+07	2026-10-29 09:01:35.40683+07
984c6266-0c50-4940-b708-0d243cd16002	Scattered Spider — C2 Beacon	Phishing	high	active	Scattered Spider infrastructure	185.67.173.117	North Korea	KP	ip	185.67.173.117	84	77	Phishing activity attributed to Scattered Spider targeting the Medicare platform. Observed in the telehealth perimeter.	TA0001 Initial Access	T1566 Phishing	2026-09-29 16:01:35.386+07	2026-10-20 17:01:35.386+07	{"actor": "Scattered Spider", "campaign": "Scattered Spider-706", "kill_chain": "actions-on-objective"}	2026-10-29 09:01:35.407239+07	2026-10-29 09:01:35.407239+07
d40ecb02-6988-4ee5-b1ee-4a8e27616a11	Turla — Credential Harvesting	Malware	critical	active	Turla infrastructure	185.239.112.44	Russia	RU	hash	3f4c45c93ee0bed38dfa36d72a7807c5f27a8cb8819b298a0ea7b7f5f7cd9957	57	91	Malware activity attributed to Turla targeting the Medicare platform. Observed in the billing perimeter.	TA0002 Execution	T1204 User Execution	2026-10-20 15:01:35.386+07	2026-10-26 07:01:35.386+07	{"actor": "Turla", "campaign": "Turla-204", "kill_chain": "reconnaissance"}	2026-10-29 09:01:35.407573+07	2026-10-29 09:01:35.407573+07
ffb5a0dc-d170-4ff1-8bfb-7799ab3617ee	Lazarus Group — Supply Chain Compromise	Web Attack	high	active	Lazarus Group infrastructure	176.147.87.248	Nigeria	NG	url	https://176.147.87.248/payload/6131	75	75	Web Attack activity attributed to Lazarus Group targeting the Medicare platform. Observed in the telehealth perimeter.	TA0001 Initial Access	T1190 Exploit Public-Facing Application	2026-08-29 16:01:35.386+07	2026-10-24 09:01:35.386+07	{"actor": "Lazarus Group", "campaign": "Lazarus Group-609", "kill_chain": "delivery"}	2026-10-29 09:01:35.407889+07	2026-10-29 09:01:35.407889+07
e7472452-efcd-4651-8727-8549382111f0	Kimsuky — Data Exfiltration	DDoS	low	active	Kimsuky infrastructure	82.205.112.66	Netherlands	NL	hash	590b78798a15c0dfb6c4b03e51038b009be6d2d411f3f99bd8152bf2ca1a6d8e	75	37	DDoS activity attributed to Kimsuky targeting the Medicare platform. Observed in the identity perimeter.	TA0040 Impact	T1498 Network Denial of Service	2026-09-20 14:01:35.386+07	2026-10-20 10:01:35.386+07	{"actor": "Kimsuky", "campaign": "Kimsuky-925", "kill_chain": "weaponization"}	2026-10-29 09:01:35.408234+07	2026-10-29 09:01:35.408234+07
db27d234-3376-4ce6-8e0a-c1933a4820c4	RedLine — Zero-day Exploitation	Supply Chain	high	resolved	RedLine infrastructure	82.128.212.79	Turkey	TR	domain	redline-54.evil-cdn.net	62	78	Supply Chain activity attributed to RedLine targeting the Medicare platform. Observed in the telehealth perimeter.	TA0001 Initial Access	T1195 Supply Chain Compromise	2026-10-14 21:01:35.386+07	2026-10-28 18:01:35.386+07	{"actor": "RedLine", "campaign": "RedLine-716", "kill_chain": "weaponization"}	2026-10-29 09:01:35.408562+07	2026-10-29 09:01:35.408562+07
5d5b6be5-2a59-4ce1-b1a1-11d7f1f5e787	Qakbot — Data Exfiltration	Malware	critical	active	Qakbot infrastructure	212.224.188.213	Brazil	BR	hash	3bdc0589eaa292cc3fdaf074bef77f05f24ffd0afd6e09b50e57fb86c6a3052a	66	83	Malware activity attributed to Qakbot targeting the Medicare platform. Observed in the identity perimeter.	TA0002 Execution	T1204 User Execution	2026-08-30 09:01:35.386+07	2026-10-26 22:01:35.386+07	{"actor": "Qakbot", "campaign": "Qakbot-700", "kill_chain": "command-and-control"}	2026-10-29 09:01:35.408875+07	2026-10-29 09:01:35.408875+07
875d77bf-f81d-4650-8880-178e22ee6728	Kimsuky — Ransomware Campaign	Ransomware	medium	resolved	Kimsuky infrastructure	91.98.124.201	Germany	DE	hash	5057704a966a79ea8241426a1ab591249b02913d3fee49a62af92cb558c1af3d	59	43	Ransomware activity attributed to Kimsuky targeting the Medicare platform. Observed in the EHR perimeter.	TA0040 Impact	T1486 Data Encrypted for Impact	2026-08-31 07:01:35.387+07	2026-10-22 06:01:35.387+07	{"actor": "Kimsuky", "campaign": "Kimsuky-291", "kill_chain": "command-and-control"}	2026-10-29 09:01:35.409239+07	2026-10-29 09:01:35.409239+07
45f58fa6-37da-4c7c-b41c-395781be1ec6	Qakbot — Phishing Kit	C2	medium	blocked	Qakbot infrastructure	176.16.112.75	France	FR	ip	176.16.112.75	61	57	C2 activity attributed to Qakbot targeting the Medicare platform. Observed in the billing perimeter.	TA0011 Command and Control	T1071 Application Layer Protocol	2026-10-16 23:01:35.387+07	2026-10-24 14:01:35.387+07	{"actor": "Qakbot", "campaign": "Qakbot-289", "kill_chain": "delivery"}	2026-10-29 09:01:35.409624+07	2026-10-29 09:01:35.409624+07
5c75d827-4e83-41cc-a4e8-16d6e200e22b	Akira — C2 Beacon	Zero-day	critical	active	Akira infrastructure	45.166.37.247	North Korea	KP	ip	45.166.37.247	94	80	Zero-day activity attributed to Akira targeting the Medicare platform. Observed in the telehealth perimeter.	TA0001 Initial Access	T1203 Exploitation for Client Execution	2026-09-25 18:01:35.387+07	2026-10-25 04:01:35.387+07	{"actor": "Akira", "campaign": "Akira-309", "kill_chain": "actions-on-objective"}	2026-10-29 09:01:35.409976+07	2026-10-29 09:01:35.409976+07
e30ece18-ecc1-4daf-989f-857de041c5e9	LockBit — DDoS Botnet	Malware	critical	monitoring	LockBit infrastructure	194.48.37.229	Vietnam	VN	url	https://194.48.37.229/payload/8938	66	82	Malware activity attributed to LockBit targeting the Medicare platform. Observed in the identity perimeter.	TA0002 Execution	T1204 User Execution	2026-09-07 06:01:35.387+07	2026-10-22 03:01:35.387+07	{"actor": "LockBit", "campaign": "LockBit-462", "kill_chain": "weaponization"}	2026-10-29 09:01:35.410398+07	2026-10-29 09:01:35.410398+07
6f49b5e1-3926-4cfc-9019-957463e9167f	Medusa — Credential Harvesting	DDoS	critical	active	Medusa infrastructure	45.197.150.179	Romania	RO	hash	b3daedd3db556b6ca192f983f0dd935a70687ba8876a4ece1f141a751be16f3d	65	98	DDoS activity attributed to Medusa targeting the Medicare platform. Observed in the billing perimeter.	TA0040 Impact	T1498 Network Denial of Service	2026-10-01 18:01:35.387+07	2026-10-23 13:01:35.387+07	{"actor": "Medusa", "campaign": "Medusa-138", "kill_chain": "weaponization"}	2026-10-29 09:01:35.410745+07	2026-10-29 09:01:35.410745+07
db5b975e-8811-40d6-8c48-4f9faf80e5e5	Play — Brute Force Campaign	Supply Chain	critical	resolved	Play infrastructure	82.90.202.165	Ukraine	UA	domain	play-53.evil-cdn.net	87	87	Supply Chain activity attributed to Play targeting the Medicare platform. Observed in the telehealth perimeter.	TA0001 Initial Access	T1195 Supply Chain Compromise	2026-10-05 18:01:35.387+07	2026-10-22 12:01:35.387+07	{"actor": "Play", "campaign": "Play-116", "kill_chain": "command-and-control"}	2026-10-29 09:01:35.411159+07	2026-10-29 09:01:35.411159+07
7c6950aa-5e7e-49ba-a242-26179f27aded	Medusa — Ransomware Campaign	Data Exfiltration	medium	resolved	Medusa infrastructure	77.35.40.181	Turkey	TR	domain	medusa-13.evil-cdn.net	61	37	Data Exfiltration activity attributed to Medusa targeting the Medicare platform. Observed in the billing perimeter.	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	2026-08-30 20:01:35.387+07	2026-10-28 12:01:35.387+07	{"actor": "Medusa", "campaign": "Medusa-615", "kill_chain": "command-and-control"}	2026-10-29 09:01:35.411501+07	2026-10-29 09:01:35.411501+07
65244449-7ca2-4c2b-a356-87a3773df4a8	Kimsuky — SQL Injection Wave	Data Exfiltration	critical	monitoring	Kimsuky infrastructure	203.83.3.123	Russia	RU	hash	fa04f028279da7357e7543741a541648a782c4971496c44b2590170b559682cc	93	86	Data Exfiltration activity attributed to Kimsuky targeting the Medicare platform. Observed in the billing perimeter.	TA0010 Exfiltration	T1041 Exfiltration Over C2 Channel	2026-10-18 06:01:35.387+07	2026-10-24 04:01:35.387+07	{"actor": "Kimsuky", "campaign": "Kimsuky-494", "kill_chain": "command-and-control"}	2026-10-29 09:01:35.411825+07	2026-10-29 09:01:35.411825+07
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.tickets (id, subject, status, priority, requester_id, assignee_id, description, metadata, created_at, updated_at) FROM stdin;
5c4aada9-359b-42b1-b616-4036ac5602de	Password reset	closed	high	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	473353d6-ee2a-4345-adae-ca12b0fbee38	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.643753+07	2026-10-29 09:01:35.643753+07
58e70061-1f5d-4c7e-9504-6bae18af0602	Access request for SIEM	open	medium	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.644251+07	2026-10-29 09:01:35.644251+07
09513720-4458-4b25-a629-57b5ccd09bb2	Password reset	waiting	low	b7d93566-607b-41f4-933f-612190e9288b	0b5e95ce-3f2b-4299-9e98-b4885de1043e	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.644498+07	2026-10-29 09:01:35.644498+07
d3216938-bc82-4bb7-bd6b-eca0604b88de	Suspicious email report	open	medium	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	dcd2d08a-7310-414d-ae20-09165cb0c384	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.644737+07	2026-10-29 09:01:35.644737+07
1b8536b2-6c28-4f7d-8f31-5e423630ee34	Password reset	open	critical	92d776fe-9846-4fa0-b8eb-d4b5318321a0	dcd2d08a-7310-414d-ae20-09165cb0c384	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.644987+07	2026-10-29 09:01:35.644987+07
bf46f6f8-3977-49bf-a60a-4fc921e69d81	Suspicious email report	waiting	medium	b7643562-4a3b-4bdc-87f5-ed48f78b9511	92d776fe-9846-4fa0-b8eb-d4b5318321a0	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.645262+07	2026-10-29 09:01:35.645262+07
65a054f6-2ee1-4f1f-9511-8f3b4504b924	Phishing simulation question	open	medium	b7643562-4a3b-4bdc-87f5-ed48f78b9511	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.645673+07	2026-10-29 09:01:35.645673+07
f44204eb-d9e4-427b-bb76-32fd8de6fa93	Password reset	open	critical	7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	b7643562-4a3b-4bdc-87f5-ed48f78b9511	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.645935+07	2026-10-29 09:01:35.645935+07
74f70798-3da7-42c0-8b55-de5ab52c64f8	Access request for SIEM	waiting	high	9c716733-8564-4b64-b734-a2b03b81197d	dcd2d08a-7310-414d-ae20-09165cb0c384	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.646161+07	2026-10-29 09:01:35.646161+07
dbe30f73-3f1d-4b73-bb8d-c776abf15b4f	Password reset	resolved	medium	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	b8e0c918-6a79-47fb-9dfe-861f198c5550	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.646389+07	2026-10-29 09:01:35.646389+07
d71cdab6-2126-4424-bcbb-248c3ae93522	Password reset	resolved	critical	0b5e95ce-3f2b-4299-9e98-b4885de1043e	dcd2d08a-7310-414d-ae20-09165cb0c384	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.64666+07	2026-10-29 09:01:35.64666+07
124e821e-7e2f-4ffa-9b57-9ceea69d3f63	Access request for SIEM	in_progress	high	b4cad911-2d78-42af-9082-fb83caca55cc	dcd2d08a-7310-414d-ae20-09165cb0c384	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.646907+07	2026-10-29 09:01:35.646907+07
e3765df6-a034-4f69-813f-64d6b4cbfc81	Firewall change request	closed	high	dcd2d08a-7310-414d-ae20-09165cb0c384	ebd7404f-d9cc-41ad-9c75-384026a7aff9	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.647132+07	2026-10-29 09:01:35.647132+07
71d2135a-9751-48ba-b1ef-c695a02523e4	Password reset	waiting	high	b8e0c918-6a79-47fb-9dfe-861f198c5550	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.647383+07	2026-10-29 09:01:35.647383+07
092c36a4-c8a2-4391-b180-41ee5fc84439	Suspicious email report	closed	medium	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	0b5e95ce-3f2b-4299-9e98-b4885de1043e	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.647666+07	2026-10-29 09:01:35.647666+07
3362ba6f-519e-499c-8c76-05d7c59df97a	Firewall change request	closed	low	92d776fe-9846-4fa0-b8eb-d4b5318321a0	dcd2d08a-7310-414d-ae20-09165cb0c384	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.647978+07	2026-10-29 09:01:35.647978+07
27ab1a0e-1bfa-451c-899e-c05ce667d66d	Access request for SIEM	resolved	high	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.64829+07	2026-10-29 09:01:35.64829+07
61c06c0b-2545-4fc2-a06c-aaa484f0f321	Access request for SIEM	waiting	low	b8e0c918-6a79-47fb-9dfe-861f198c5550	0b5e95ce-3f2b-4299-9e98-b4885de1043e	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.64856+07	2026-10-29 09:01:35.64856+07
ccfbcd44-9fbc-407c-b4ec-f2f107dbfae6	Suspicious email report	in_progress	high	dcd2d08a-7310-414d-ae20-09165cb0c384	dcd2d08a-7310-414d-ae20-09165cb0c384	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.648817+07	2026-10-29 09:01:35.648817+07
9b125425-9d5a-43b8-b028-05b6130dd9e8	Firewall change request	in_progress	critical	473353d6-ee2a-4345-adae-ca12b0fbee38	473353d6-ee2a-4345-adae-ca12b0fbee38	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.649164+07	2026-10-29 09:01:35.649164+07
cecfbb6e-df21-4434-b148-45b84bd22434	MFA reset request	open	low	92d776fe-9846-4fa0-b8eb-d4b5318321a0	92d776fe-9846-4fa0-b8eb-d4b5318321a0	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.649432+07	2026-10-29 09:01:35.649432+07
2201492d-57e5-4957-8e47-bd57bd073e8f	Phishing simulation question	waiting	critical	3f3d575f-1ab8-4d9c-9794-12f70e1471fc	b8e0c918-6a79-47fb-9dfe-861f198c5550	Service request raised through the MedicareGuard employee portal.	{}	2026-10-29 09:01:35.649667+07	2026-10-29 09:01:35.649667+07
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.users (id, email, password_hash, full_name, role_id, department, phone, avatar_url, status, last_login_at, mfa_enabled, created_at, updated_at) FROM stdin;
92d776fe-9846-4fa0-b8eb-d4b5318321a0	analyst@medicareguard.io	$2a$10$ExVyGARgSe3iJTHSHyBBkOSg4P9QTJCm1bZyXhSAEJYuR9XxNU4cm	Minh Anh Tran	86be11ac-25b8-4ee2-a4e6-525afd7d6292	Security Operations	+84 90 376 7772	\N	active	2026-10-27 18:01:35.368+07	t	2026-10-29 09:01:35.370864+07	2026-10-29 09:01:35.370864+07
b7643562-4a3b-4bdc-87f5-ed48f78b9511	hunter@medicareguard.io	$2a$10$O3xjD.3H80qXCMRwlEg..ebSj0yNjLYJepjMczcInfmvr0OSrUGMm	Duc Huy Le	ea58a25c-7c09-40c6-ad0d-f8643271b665	Security Operations	+84 90 618 5824	\N	active	2026-10-27 13:01:35.368+07	t	2026-10-29 09:01:35.371524+07	2026-10-29 09:01:35.371524+07
0b5e95ce-3f2b-4299-9e98-b4885de1043e	viewer@medicareguard.io	$2a$10$0WUlFJwx5Uju1UeYRhwi4uHiKjG/gUScHoHAgY71SF.kS.AqmXNFG	Lan Phuong Vo	82d065d3-e288-4502-aa3e-9caf261d8b69	Compliance	+84 90 798 8008	\N	active	2026-10-22 23:01:35.368+07	t	2026-10-29 09:01:35.372171+07	2026-10-29 09:01:35.372171+07
473353d6-ee2a-4345-adae-ca12b0fbee38	sarah.chen@medicareguard.io	$2a$10$ExVyGARgSe3iJTHSHyBBkOSg4P9QTJCm1bZyXhSAEJYuR9XxNU4cm	Sarah Chen	86be11ac-25b8-4ee2-a4e6-525afd7d6292	Infrastructure	+84 90 416 2525	\N	active	2026-10-28 02:01:35.368+07	t	2026-10-29 09:01:35.372822+07	2026-10-29 09:01:35.372822+07
b7d93566-607b-41f4-933f-612190e9288b	marcus.weber@medicareguard.io	$2a$10$ExVyGARgSe3iJTHSHyBBkOSg4P9QTJCm1bZyXhSAEJYuR9XxNU4cm	Marcus Weber	86be11ac-25b8-4ee2-a4e6-525afd7d6292	Network Engineering	+84 90 650 2203	\N	active	2026-10-22 16:01:35.368+07	t	2026-10-29 09:01:35.373381+07	2026-10-29 09:01:35.373381+07
dcd2d08a-7310-414d-ae20-09165cb0c384	aisha.rahman@medicareguard.io	$2a$10$O3xjD.3H80qXCMRwlEg..ebSj0yNjLYJepjMczcInfmvr0OSrUGMm	Aisha Rahman	ea58a25c-7c09-40c6-ad0d-f8643271b665	Data Platform	+84 90 647 1451	\N	active	2026-10-28 20:01:35.368+07	t	2026-10-29 09:01:35.373788+07	2026-10-29 09:01:35.373788+07
b8e0c918-6a79-47fb-9dfe-861f198c5550	daniel.okafor@medicareguard.io	$2a$10$ExVyGARgSe3iJTHSHyBBkOSg4P9QTJCm1bZyXhSAEJYuR9XxNU4cm	Daniel Okafor	86be11ac-25b8-4ee2-a4e6-525afd7d6292	Clinical Systems	+84 90 453 6484	\N	active	2026-10-23 04:01:35.368+07	t	2026-10-29 09:01:35.374212+07	2026-10-29 09:01:35.374212+07
3f3d575f-1ab8-4d9c-9794-12f70e1471fc	yuki.tanaka@medicareguard.io	$2a$10$0WUlFJwx5Uju1UeYRhwi4uHiKjG/gUScHoHAgY71SF.kS.AqmXNFG	Yuki Tanaka	82d065d3-e288-4502-aa3e-9caf261d8b69	Finance	+84 90 801 9095	\N	active	2026-10-24 23:01:35.368+07	f	2026-10-29 09:01:35.374811+07	2026-10-29 09:01:35.374811+07
ebd7404f-d9cc-41ad-9c75-384026a7aff9	carlos.mendoza@medicareguard.io	$2a$10$ExVyGARgSe3iJTHSHyBBkOSg4P9QTJCm1bZyXhSAEJYuR9XxNU4cm	Carlos Mendoza	86be11ac-25b8-4ee2-a4e6-525afd7d6292	Security Operations	+84 90 596 6545	\N	active	2026-10-25 04:01:35.368+07	t	2026-10-29 09:01:35.375204+07	2026-10-29 09:01:35.375204+07
9c716733-8564-4b64-b734-a2b03b81197d	elena.petrova@medicareguard.io	$2a$10$O3xjD.3H80qXCMRwlEg..ebSj0yNjLYJepjMczcInfmvr0OSrUGMm	Elena Petrova	ea58a25c-7c09-40c6-ad0d-f8643271b665	Infrastructure	+84 90 690 1147	\N	active	2026-10-26 19:01:35.368+07	t	2026-10-29 09:01:35.375597+07	2026-10-29 09:01:35.375597+07
b4cad911-2d78-42af-9082-fb83caca55cc	james.mitchell@medicareguard.io	$2a$10$0WUlFJwx5Uju1UeYRhwi4uHiKjG/gUScHoHAgY71SF.kS.AqmXNFG	James Mitchell	82d065d3-e288-4502-aa3e-9caf261d8b69	Security Operations	+84 90 379 1158	\N	disabled	2026-10-26 21:01:35.368+07	f	2026-10-29 09:01:35.3759+07	2026-10-29 09:01:35.3759+07
7e04f2c8-f4ea-48b0-b5d8-ba9f83166acd	admin@medicareguard.io	$2a$10$S9EkdudrUIZYpvYQd2/fA.U8Th5oLbVeTBE9hS2J7aKmHJSPX5QYS	Nguyen Thi Bich Tram	681badf5-aaf1-4de7-90ee-dc3d8c2eda66	Security Operations	+84 90 475 8278	\N	active	2026-10-29 23:43:49.06803+07	t	2026-10-29 09:01:35.369258+07	2026-10-29 23:43:49.06803+07
\.


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.vendors (id, name, category, risk_level, status, contact_email, website, description, metadata, created_at, updated_at) FROM stdin;
ad72e884-3cde-4152-a545-c2875262c1f0	CrowdStrike	EDR	low	active	security@crowdstrike.com	https://crowdstrike.com	Endpoint detection and response	{}	2026-10-29 09:01:35.641307+07	2026-10-29 09:01:35.641307+07
66c1c267-d1a1-4248-adf4-a353b971937a	Palo Alto Networks	Network	low	active	support@paloaltonetworks.com	https://paloaltonetworks.com	Perimeter firewalls	{}	2026-10-29 09:01:35.641749+07	2026-10-29 09:01:35.641749+07
2357b0ad-33f3-4bee-ab34-179495540093	Veeam	Backup	medium	active	support@veeam.com	https://veeam.com	Backup and recovery	{}	2026-10-29 09:01:35.641972+07	2026-10-29 09:01:35.641972+07
b515aadf-753d-456a-ac94-7d276b4cc837	Elastic	SIEM	low	active	support@elastic.co	https://elastic.co	Security analytics platform	{}	2026-10-29 09:01:35.642208+07	2026-10-29 09:01:35.642208+07
74aa0c75-d6ba-42dc-bef4-396f3b995ff5	Okta	Identity	low	active	support@okta.com	https://okta.com	Identity provider	{}	2026-10-29 09:01:35.642411+07	2026-10-29 09:01:35.642411+07
00abae01-178f-4684-ae89-f2e1924544e2	Cloudflare	CDN/WAF	low	active	support@cloudflare.com	https://cloudflare.com	Edge protection	{}	2026-10-29 09:01:35.642597+07	2026-10-29 09:01:35.642597+07
9857b208-8a4f-4bef-9359-a1e97043d8d3	Clinical Data Systems	EHR	high	under_review	security@clinicaldata.example	https://clinicaldata.example	EHR integration vendor	{}	2026-10-29 09:01:35.642786+07	2026-10-29 09:01:35.642786+07
9068d5d7-c632-40c8-b7a4-939de1c0b762	Acme Billing	Finance	medium	active	security@acmebilling.example	https://acmebilling.example	Billing processor	{}	2026-10-29 09:01:35.642983+07	2026-10-29 09:01:35.642983+07
fe92214f-34a4-4d1d-82db-afc0d9423df5	MedDevice Corp	IoT	high	active	security@meddevice.example	https://meddevice.example	Medical IoT devices	{}	2026-10-29 09:01:35.643193+07	2026-10-29 09:01:35.643193+07
a7cd5e74-5ef9-4724-8319-4693778a72b6	SecureMail	Email	medium	active	security@securemail.example	https://securemail.example	Email security gateway	{}	2026-10-29 09:01:35.643396+07	2026-10-29 09:01:35.643396+07
\.


--
-- Data for Name: vulnerabilities; Type: TABLE DATA; Schema: public; Owner: medicare
--

COPY public.vulnerabilities (id, title, severity, status, cvss_score, cve_id, asset_id, description, metadata, created_at, updated_at) FROM stdin;
4b75a12e-2091-4a53-ad03-09b1b8ed9f5f	OpenSSL buffer overflow in TLS handler	critical	open	9.8	CVE-2024-6119	bcdb679c-53d2-48f1-ad99-e1b949aeeb57	\N	{}	2026-10-29 09:01:35.553777+07	2026-10-29 09:01:35.553777+07
bad662a3-9a2f-4242-9eda-a90dae1ba2cb	Apache path traversal in reverse proxy	critical	open	9.1	CVE-2024-38476	920f61f5-9de0-4850-9cd1-99e0ba05365f	\N	{}	2026-10-29 09:01:35.554293+07	2026-10-29 09:01:35.554293+07
2be84ee8-1355-4143-8c7f-72718762e992	Kubernetes kubelet privilege escalation	high	open	8.1	CVE-2024-5321	b741c818-a15a-4fd4-b5ce-d92e9235e852	\N	{}	2026-10-29 09:01:35.554507+07	2026-10-29 09:01:35.554507+07
6f610908-9138-47ef-ab82-4c585548e876	PostgreSQL extension RCE	critical	open	9.2	CVE-2024-7348	c7fa215a-4985-4506-8c4e-b868df428c13	\N	{}	2026-10-29 09:01:35.554696+07	2026-10-29 09:01:35.554696+07
0440dd0f-ad60-475b-81b8-20ab634d5133	FortiOS SSL VPN heap overflow	critical	open	9.8	CVE-2024-21762	9cf5cbb5-d702-4a86-8c4e-fd5a8db2ed5b	\N	{}	2026-10-29 09:01:35.554888+07	2026-10-29 09:01:35.554888+07
418cc882-2f47-43ba-be47-683a3e03eb3e	Keycloak open redirect	medium	open	5.4	CVE-2024-8698	33177851-14ab-4ead-ba2a-7445d2b5ba38	\N	{}	2026-10-29 09:01:35.555078+07	2026-10-29 09:01:35.555078+07
4b584e4e-ca62-491d-9d3c-f3f43652f22a	Log4j remote code execution	critical	open	10.0	CVE-2021-44228	61d416ee-8bd2-4eb1-b7b8-9bcc722886fa	\N	{}	2026-10-29 09:01:35.555274+07	2026-10-29 09:01:35.555274+07
e6f2b020-89d3-4d60-9ba0-1deac9ed0a00	Windows SMB privilege escalation	high	in_progress	8.8	CVE-2024-38080	b5ecd570-bfb9-455d-a802-c3031d7de183	\N	{}	2026-10-29 09:01:35.555476+07	2026-10-29 09:01:35.555476+07
44b7cd5e-afc1-43a2-a1a7-3f553f141aaa	Nginx HTTP/3 memory disclosure	medium	open	6.1	CVE-2024-31079	2a35cce6-c390-4c27-9c0d-84d30320c2cd	\N	{}	2026-10-29 09:01:35.555716+07	2026-10-29 09:01:35.555716+07
95b85210-f730-445d-b9a6-1c36d8ab5de1	MySQL authentication bypass	high	resolved	7.5	CVE-2024-20960	20484773-319b-430f-bf71-adbab8001006	\N	{}	2026-10-29 09:01:35.555983+07	2026-10-29 09:01:35.555983+07
6225c5d2-fd52-47ca-bb19-ae7801210ca7	Elasticsearch information disclosure	medium	open	6.5	CVE-2024-5290	e3a86baf-d72f-4d71-8d47-34768a15f739	\N	{}	2026-10-29 09:01:35.556217+07	2026-10-29 09:01:35.556217+07
f5b5dc97-f0ca-4dbc-9fd9-e9532e714dc4	Node.js HTTP request smuggling	high	open	7.2	CVE-2024-22019	90f757b2-99a1-4342-bc1d-16a5a09b35eb	\N	{}	2026-10-29 09:01:35.556443+07	2026-10-29 09:01:35.556443+07
f566477e-2070-44b9-ac3e-e0f1cba8fee2	Docker overlayFS escape	critical	in_progress	9.3	CVE-2024-21626	578335bf-e75d-4878-89dc-12dc1f443613	\N	{}	2026-10-29 09:01:35.556713+07	2026-10-29 09:01:35.556713+07
ba40d688-9948-49dd-99aa-aa156906b998	Veeam backup RCE	critical	open	9.8	CVE-2023-27532	1d817fd7-6205-4dab-86c6-48beafa0ad78	\N	{}	2026-10-29 09:01:35.55695+07	2026-10-29 09:01:35.55695+07
c27c247d-1c24-4f87-b576-294dbf19660d	Go crypto/tls DoS	medium	resolved	5.9	CVE-2024-24790	2e96141d-1615-4b65-9224-7fa73fb6d0c4	\N	{}	2026-10-29 09:01:35.557166+07	2026-10-29 09:01:35.557166+07
dfc16aa5-a3d4-4fb3-ad73-ed8f3dc4f3f9	Chromium V8 type confusion	high	open	8.8	CVE-2024-4947	f8433530-5580-415e-9f16-41634a70bd47	\N	{}	2026-10-29 09:01:35.557372+07	2026-10-29 09:01:35.557372+07
6b58c518-ad1a-4dfe-9dde-1d814e9de156	Apple macOS kernel escalation	high	open	7.8	CVE-2024-27822	d369c839-7416-482f-ba27-4ce4906c7712	\N	{}	2026-10-29 09:01:35.557548+07	2026-10-29 09:01:35.557548+07
f00d3768-ef0a-4945-8a16-902068e24c01	BIND9 DNS cache poisoning	high	open	7.5	CVE-2024-1737	43b2d473-a21f-4654-99a4-99de37812bd7	\N	{}	2026-10-29 09:01:35.557773+07	2026-10-29 09:01:35.557773+07
7e1792e6-f61c-4e41-b946-f25adc1c4e19	PHP-FPM code injection	critical	open	9.8	CVE-2024-4577	bcdb679c-53d2-48f1-ad99-e1b949aeeb57	\N	{}	2026-10-29 09:01:35.558+07	2026-10-29 09:01:35.558+07
eeb1ada0-8392-4c7c-8451-bd177b9eebee	Redis unauthenticated access	high	in_progress	8.2	CVE-2024-31449	920f61f5-9de0-4850-9cd1-99e0ba05365f	\N	{}	2026-10-29 09:01:35.558191+07	2026-10-29 09:01:35.558191+07
\.


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: compliance_controls compliance_controls_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.compliance_controls
    ADD CONSTRAINT compliance_controls_pkey PRIMARY KEY (id);


--
-- Name: data_sources data_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.data_sources
    ADD CONSTRAINT data_sources_pkey PRIMARY KEY (id);


--
-- Name: departments departments_code_key; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_key UNIQUE (code);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: detection_rules detection_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.detection_rules
    ADD CONSTRAINT detection_rules_pkey PRIMARY KEY (id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: email_events email_events_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.email_events
    ADD CONSTRAINT email_events_pkey PRIMARY KEY (id);


--
-- Name: findings findings_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.findings
    ADD CONSTRAINT findings_pkey PRIMARY KEY (id);


--
-- Name: firewall_rules firewall_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.firewall_rules
    ADD CONSTRAINT firewall_rules_pkey PRIMARY KEY (id);


--
-- Name: incidents incidents_incident_key_key; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_incident_key_key UNIQUE (incident_key);


--
-- Name: incidents incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_pkey PRIMARY KEY (id);


--
-- Name: integrations integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_pkey PRIMARY KEY (id);


--
-- Name: knowledge_base knowledge_base_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.knowledge_base
    ADD CONSTRAINT knowledge_base_pkey PRIMARY KEY (id);


--
-- Name: metrics metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.metrics
    ADD CONSTRAINT metrics_pkey PRIMARY KEY (id);


--
-- Name: monitors monitors_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.monitors
    ADD CONSTRAINT monitors_pkey PRIMARY KEY (id);


--
-- Name: network_flows network_flows_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.network_flows
    ADD CONSTRAINT network_flows_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: phishing_campaigns phishing_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.phishing_campaigns
    ADD CONSTRAINT phishing_campaigns_pkey PRIMARY KEY (id);


--
-- Name: playbooks playbooks_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.playbooks
    ADD CONSTRAINT playbooks_pkey PRIMARY KEY (id);


--
-- Name: policies policies_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_pkey PRIMARY KEY (id);


--
-- Name: remediations remediations_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.remediations
    ADD CONSTRAINT remediations_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: risk_assessments risk_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.risk_assessments
    ADD CONSTRAINT risk_assessments_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: scans scans_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.scans
    ADD CONSTRAINT scans_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: threat_intel threat_intel_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.threat_intel
    ADD CONSTRAINT threat_intel_pkey PRIMARY KEY (id);


--
-- Name: threats threats_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.threats
    ADD CONSTRAINT threats_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: vulnerabilities vulnerabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.vulnerabilities
    ADD CONSTRAINT vulnerabilities_pkey PRIMARY KEY (id);


--
-- Name: idx_ai_messages_conversation; Type: INDEX; Schema: public; Owner: medicare
--

CREATE INDEX idx_ai_messages_conversation ON public.ai_messages USING btree (conversation_id, created_at);


--
-- Name: idx_alerts_country; Type: INDEX; Schema: public; Owner: medicare
--

CREATE INDEX idx_alerts_country ON public.alerts USING btree (country_code);


--
-- Name: idx_alerts_detected; Type: INDEX; Schema: public; Owner: medicare
--

CREATE INDEX idx_alerts_detected ON public.alerts USING btree (detected_at DESC);


--
-- Name: idx_alerts_severity; Type: INDEX; Schema: public; Owner: medicare
--

CREATE INDEX idx_alerts_severity ON public.alerts USING btree (severity);


--
-- Name: idx_alerts_source_ip; Type: INDEX; Schema: public; Owner: medicare
--

CREATE INDEX idx_alerts_source_ip ON public.alerts USING btree (source_ip);


--
-- Name: idx_alerts_status; Type: INDEX; Schema: public; Owner: medicare
--

CREATE INDEX idx_alerts_status ON public.alerts USING btree (status);


--
-- Name: idx_assets_criticality; Type: INDEX; Schema: public; Owner: medicare
--

CREATE INDEX idx_assets_criticality ON public.assets USING btree (criticality);


--
-- Name: idx_firewall_enabled; Type: INDEX; Schema: public; Owner: medicare
--

CREATE INDEX idx_firewall_enabled ON public.firewall_rules USING btree (enabled);


--
-- Name: idx_incidents_severity; Type: INDEX; Schema: public; Owner: medicare
--

CREATE INDEX idx_incidents_severity ON public.incidents USING btree (severity);


--
-- Name: idx_incidents_status; Type: INDEX; Schema: public; Owner: medicare
--

CREATE INDEX idx_incidents_status ON public.incidents USING btree (status);


--
-- Name: idx_logs_created; Type: INDEX; Schema: public; Owner: medicare
--

CREATE INDEX idx_logs_created ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_logs_level; Type: INDEX; Schema: public; Owner: medicare
--

CREATE INDEX idx_logs_level ON public.activity_logs USING btree (level);


--
-- Name: idx_network_flows_recorded; Type: INDEX; Schema: public; Owner: medicare
--

CREATE INDEX idx_network_flows_recorded ON public.network_flows USING btree (recorded_at DESC);


--
-- Name: idx_reports_created; Type: INDEX; Schema: public; Owner: medicare
--

CREATE INDEX idx_reports_created ON public.reports USING btree (created_at DESC);


--
-- Name: idx_threats_country; Type: INDEX; Schema: public; Owner: medicare
--

CREATE INDEX idx_threats_country ON public.threats USING btree (country);


--
-- Name: idx_threats_last_seen; Type: INDEX; Schema: public; Owner: medicare
--

CREATE INDEX idx_threats_last_seen ON public.threats USING btree (last_seen DESC);


--
-- Name: idx_threats_severity; Type: INDEX; Schema: public; Owner: medicare
--

CREATE INDEX idx_threats_severity ON public.threats USING btree (severity);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: medicare
--

CREATE INDEX idx_users_role ON public.users USING btree (role_id);


--
-- Name: activity_logs trg_activity_logs_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_activity_logs_updated_at BEFORE UPDATE ON public.activity_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: agents trg_agents_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ai_conversations trg_ai_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ai_messages trg_ai_messages_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_ai_messages_updated_at BEFORE UPDATE ON public.ai_messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: alerts trg_alerts_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_alerts_updated_at BEFORE UPDATE ON public.alerts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: api_keys trg_api_keys_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_api_keys_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: assets trg_assets_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: audit_logs trg_audit_logs_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_audit_logs_updated_at BEFORE UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: cases trg_cases_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_cases_updated_at BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: comments trg_comments_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: compliance_controls trg_compliance_controls_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_compliance_controls_updated_at BEFORE UPDATE ON public.compliance_controls FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: data_sources trg_data_sources_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_data_sources_updated_at BEFORE UPDATE ON public.data_sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: departments trg_departments_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: detection_rules trg_detection_rules_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_detection_rules_updated_at BEFORE UPDATE ON public.detection_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: devices trg_devices_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_devices_updated_at BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: email_events trg_email_events_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_email_events_updated_at BEFORE UPDATE ON public.email_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: findings trg_findings_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_findings_updated_at BEFORE UPDATE ON public.findings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: firewall_rules trg_firewall_rules_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_firewall_rules_updated_at BEFORE UPDATE ON public.firewall_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: incidents trg_incidents_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_incidents_updated_at BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: integrations trg_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_integrations_updated_at BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: knowledge_base trg_knowledge_base_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_knowledge_base_updated_at BEFORE UPDATE ON public.knowledge_base FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: metrics trg_metrics_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_metrics_updated_at BEFORE UPDATE ON public.metrics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: monitors trg_monitors_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_monitors_updated_at BEFORE UPDATE ON public.monitors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: network_flows trg_network_flows_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_network_flows_updated_at BEFORE UPDATE ON public.network_flows FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: notifications trg_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: phishing_campaigns trg_phishing_campaigns_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_phishing_campaigns_updated_at BEFORE UPDATE ON public.phishing_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: playbooks trg_playbooks_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_playbooks_updated_at BEFORE UPDATE ON public.playbooks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: policies trg_policies_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_policies_updated_at BEFORE UPDATE ON public.policies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: remediations trg_remediations_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_remediations_updated_at BEFORE UPDATE ON public.remediations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: reports trg_reports_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: risk_assessments trg_risk_assessments_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_risk_assessments_updated_at BEFORE UPDATE ON public.risk_assessments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: roles trg_roles_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: scans trg_scans_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_scans_updated_at BEFORE UPDATE ON public.scans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: sessions trg_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: settings trg_settings_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tags trg_tags_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: threat_intel trg_threat_intel_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_threat_intel_updated_at BEFORE UPDATE ON public.threat_intel FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: threats trg_threats_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_threats_updated_at BEFORE UPDATE ON public.threats FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tickets trg_tickets_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: vendors trg_vendors_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: vulnerabilities trg_vulnerabilities_updated_at; Type: TRIGGER; Schema: public; Owner: medicare
--

CREATE TRIGGER trg_vulnerabilities_updated_at BEFORE UPDATE ON public.vulnerabilities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: activity_logs activity_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ai_conversations ai_conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ai_messages ai_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id) ON DELETE CASCADE;


--
-- Name: alerts alerts_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE SET NULL;


--
-- Name: alerts alerts_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: alerts alerts_threat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_threat_id_fkey FOREIGN KEY (threat_id) REFERENCES public.threats(id) ON DELETE SET NULL;


--
-- Name: api_keys api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: assets assets_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cases cases_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON DELETE SET NULL;


--
-- Name: cases cases_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: comments comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: compliance_controls compliance_controls_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.compliance_controls
    ADD CONSTRAINT compliance_controls_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: departments departments_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: devices devices_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: findings findings_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.findings
    ADD CONSTRAINT findings_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE SET NULL;


--
-- Name: findings findings_scan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.findings
    ADD CONSTRAINT findings_scan_id_fkey FOREIGN KEY (scan_id) REFERENCES public.scans(id) ON DELETE SET NULL;


--
-- Name: firewall_rules firewall_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.firewall_rules
    ADD CONSTRAINT firewall_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: incidents incidents_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: incidents incidents_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: knowledge_base knowledge_base_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.knowledge_base
    ADD CONSTRAINT knowledge_base_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: remediations remediations_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.remediations
    ADD CONSTRAINT remediations_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE SET NULL;


--
-- Name: remediations remediations_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.remediations
    ADD CONSTRAINT remediations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reports reports_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: risk_assessments risk_assessments_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.risk_assessments
    ADD CONSTRAINT risk_assessments_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE SET NULL;


--
-- Name: risk_assessments risk_assessments_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.risk_assessments
    ADD CONSTRAINT risk_assessments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: settings settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;


--
-- Name: vulnerabilities vulnerabilities_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medicare
--

ALTER TABLE ONLY public.vulnerabilities
    ADD CONSTRAINT vulnerabilities_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict TvDcYtIWO5m46iiiJmKqsC3Ms12qywTCuVn42V15gjDd4c5NnllwS8itroNfeJq

