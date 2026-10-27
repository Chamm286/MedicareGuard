import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Bug,
  ChevronRight,
  FileText,
  Fingerprint,
  Flame,
  Gauge,
  HardDrive,
  ListTree,
  LockKeyhole,
  type LucideIcon,
  Network,
  Radar,
  Shield,
  ShieldAlert,
  Siren,
  Users,
  Workflow,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    title: "Operations",
    items: [
      { label: "Command Center", href: "/dashboard", icon: Gauge },
      { label: "Alerts", href: "/alerts", icon: ShieldAlert, badge: "live" },
      { label: "Incidents", href: "/incidents", icon: Siren },
    ],
  },
  {
    title: "Threat Intelligence",
    items: [
      { label: "Threat Landscape", href: "/threats", icon: Radar },
      { label: "Threat Intel", href: "/threat-intel", icon: Fingerprint },
      { label: "Vulnerabilities", href: "/vulnerabilities", icon: Bug },
    ],
  },
  {
    title: "Exposure & Response",
    items: [
      { label: "Asset Inventory", href: "/assets", icon: HardDrive },
      { label: "Firewall Policy", href: "/firewall", icon: Flame },
      { label: "Playbooks", href: "/playbooks", icon: ListTree },
      { label: "Automation", href: "/automation", icon: Workflow, badge: "n8n" },
    ],
  },
  {
    title: "Intelligence & Reporting",
    items: [
      { label: "AI Analyst", href: "/ai", icon: Bot, badge: "AI" },
      { label: "Reports", href: "/reports", icon: FileText },
      { label: "Activity Logs", href: "/logs", icon: Activity },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Users & Roles", href: "/users", icon: Users },
      { label: "Settings", href: "/settings", icon: LockKeyhole },
    ],
  },
];

export const pageTitles: Record<string, { title: string; subtitle: string; icon: LucideIcon }> = {
  "/dashboard": { title: "Command Center", subtitle: "Live security posture across the Medicare platform", icon: Gauge },
  "/alerts": { title: "Alert Queue", subtitle: "Triage and respond to detections in real time", icon: ShieldAlert },
  "/incidents": { title: "Incident Response", subtitle: "Contain, eradicate and recover from security incidents", icon: Siren },
  "/threats": { title: "Threat Landscape", subtitle: "Attack origins, actors and MITRE coverage", icon: Radar },
  "/threat-intel": { title: "Threat Intelligence", subtitle: "Curated indicators and actor attribution", icon: Fingerprint },
  "/vulnerabilities": { title: "Vulnerability Management", subtitle: "CVE exposure across the asset estate", icon: Bug },
  "/assets": { title: "Asset Inventory", subtitle: "Criticality, ownership and risk posture", icon: HardDrive },
  "/firewall": { title: "Firewall Policy", subtitle: "Network enforcement and automated blocking", icon: Flame },
  "/playbooks": { title: "Response Playbooks", subtitle: "Repeatable procedures for the SOC team", icon: ListTree },
  "/automation": { title: "SOAR Automation", subtitle: "n8n workflows connected to the SOC database", icon: Workflow },
  "/ai": { title: "AI Analyst", subtitle: "Investigations grounded on live security telemetry", icon: Bot },
  "/reports": { title: "Reports & Analytics", subtitle: "Executive and operational security reporting", icon: FileText },
  "/logs": { title: "Activity Logs", subtitle: "Immutable stream of platform and security events", icon: Activity },
  "/users": { title: "Users & Roles", subtitle: "Identity lifecycle and role-based access control", icon: Users },
  "/settings": { title: "Platform Settings", subtitle: "Profile, integrations and platform configuration", icon: LockKeyhole },
};

export const quickCommands: NavItem[] = [
  { label: "Open alert queue", href: "/alerts", icon: ShieldAlert },
  { label: "Launch AI Analyst", href: "/ai", icon: Bot },
  { label: "Review incidents", href: "/incidents", icon: Siren },
  { label: "Export security report", href: "/reports", icon: BarChart3 },
  { label: "Firewall policy", href: "/firewall", icon: Network },
  { label: "Asset inventory", href: "/assets", icon: HardDrive },
  { label: "Threat intelligence", href: "/threat-intel", icon: AlertTriangle },
  { label: "Workflow automation", href: "/automation", icon: Workflow },
];

export { ChevronRight };
