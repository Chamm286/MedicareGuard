"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Copy, KeyRound, LockKeyhole, Pencil, Plus, Power, RefreshCw, Shield, ShieldCheck, UserCheck, UserX, Users as UsersIcon } from "lucide-react";
import { api, buildQuery, useApi, useDebounced } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { cn, formatDate, relativeTime, titleCase } from "@/lib/utils";
import { DataTable, type Column } from "@/components/DataTable";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, Card, ConfirmDialog, ErrorState, Field, Input, Modal, PageHeader, Pagination, SearchInput, Select, Skeleton, StatCard, StatusBadge, Tabs, Toggle } from "@/components/ui";

const ROLE_TONES: Record<string, string> = { admin: "critical", analyst: "info", hunter: "warning", viewer: "neutral" };

export default function UsersPage() {
  const { success, error: toastError } = useToast();
  const me = getUser();
  const [tab, setTab] = useState("team");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const query = useDebounced(search, 300);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [resetting, setResetting] = useState<any>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [roleDetail, setRoleDetail] = useState<any>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; action: () => Promise<void> } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const listPath = useMemo(
    () => `/users${buildQuery({ page, limit: 12, q: query || undefined, role_id: roleFilter || undefined, status: statusFilter || undefined })}`,
    [page, query, roleFilter, statusFilter],
  );
  const { data, loading, error, refetch, refreshing } = useApi<any>(listPath);
  const allUsers = useApi<any>("/users?limit=100");
  const roles = useApi<any>("/roles");

  useEffect(() => setPage(1), [query, roleFilter, statusFilter]);

  const users = data?.data || [];
  const roleList = roles.data?.data || [];
  const everyone = allUsers.data?.data || [];
  const active = everyone.filter((user: any) => user.status === "active").length;
  const admins = everyone.filter((user: any) => user.role === "admin").length;
  const mfa = everyone.filter((user: any) => user.mfaEnabled).length;
  const isAdmin = me?.role === "admin";

  const runConfirm = async () => {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      await confirm.action();
      setConfirm(null);
    } finally {
      setConfirmLoading(false);
    }
  };

  const toggleStatus = (user: any) => {
    const deactivate = user.status === "active";
    setConfirm({
      title: deactivate ? "Deactivate member?" : "Reactivate member?",
      message: deactivate
        ? `${user.fullName} will lose access immediately and all active sessions will be revoked.`
        : `${user.fullName} will regain access to MedicareGuard with their existing role.`,
      action: async () => {
        try {
          await api(`/users/${user.id}/${deactivate ? "deactivate" : "activate"}`, { method: "POST" });
          success(deactivate ? "Member deactivated" : "Member reactivated", user.email);
          refetch();
          allUsers.refetch();
        } catch (err) {
          toastError("Action failed", err instanceof Error ? err.message : "Unknown error");
        }
      },
    });
  };

  const resetPassword = (user: any) => {
    setResetting(user);
    setTempPassword(null);
  };

  const doReset = async (event: FormEvent) => {
    event.preventDefault();
    if (!resetting) return;
    try {
      const response = await api<any>(`/users/${resetting.id}/reset-password`, { method: "POST" });
      setTempPassword(response.temporaryPassword);
      success("Password reset", "All existing sessions were revoked.");
    } catch (err) {
      toastError("Reset failed", err instanceof Error ? err.message : "Unknown error");
    }
  };

  const columns: Column[] = [
    {
      key: "fullName",
      header: "Member",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.fullName} email={row.email} src={row.avatarUrl} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[11.5px] font-medium text-slate-200">{row.fullName}</p>
              {row.id === me?.id && <Badge tone="info">you</Badge>}
            </div>
            <p className="truncate text-[9.5px] text-slate-600">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", width: "110px", render: (row) => <Badge tone={ROLE_TONES[row.role] || "neutral"} dot>{titleCase(row.role)}</Badge> },
    { key: "department", header: "Department", width: "170px", render: (row) => <span className="text-[10px] text-slate-500">{row.department || "—"}</span> },
    { key: "mfa", header: "MFA", width: "70px", render: (row) => row.mfaEnabled ? <span className="flex items-center gap-1 text-[9.5px] text-low"><ShieldCheck className="h-3 w-3" /> on</span> : <span className="flex items-center gap-1 text-[9.5px] text-slate-600"><Shield className="h-3 w-3" /> off</span> },
    { key: "status", header: "Status", width: "90px", render: (row) => <StatusBadge status={row.status} /> },
    { key: "lastLoginAt", header: "Last login", width: "100px", render: (row) => <span className="text-[9.5px] text-slate-600">{row.lastLoginAt ? relativeTime(row.lastLoginAt) : "Never"}</span> },
    {
      key: "actions",
      header: "",
      width: "110px",
      render: (row) => (
        <div className="flex items-center justify-end gap-0.5">
          <button onClick={(event) => { event.stopPropagation(); setEditing(row); }} className="rounded p-1.5 text-slate-600 transition hover:bg-white/[0.06] hover:text-brand-300" aria-label="Edit member"><Pencil className="h-3 w-3" /></button>
          <button onClick={(event) => { event.stopPropagation(); resetPassword(row); }} className="rounded p-1.5 text-slate-600 transition hover:bg-white/[0.06] hover:text-high" aria-label="Reset password"><KeyRound className="h-3 w-3" /></button>
          <button onClick={(event) => { event.stopPropagation(); toggleStatus(row); }} className={cn("rounded p-1.5 transition hover:bg-white/[0.06]", row.status === "active" ? "text-slate-600 hover:text-critical" : "text-slate-600 hover:text-low")} aria-label={row.status === "active" ? "Deactivate member" : "Activate member"}>{row.status === "active" ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        subtitle="Identity lifecycle, role-based access control and authentication posture"
        icon={UsersIcon}
        badge={<Badge tone="info" dot>{everyone.length} members</Badge>}
        actions={
          <>
            <Button icon={RefreshCw} onClick={() => { refetch(); allUsers.refetch(); roles.refetch(); }} loading={refreshing}>Refresh</Button>
            {isAdmin && <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>Add member</Button>}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {allUsers.loading && !allUsers.data ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[112px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Team members" value={everyone.length} hint={`${roleList.length} roles defined`} icon={UsersIcon} tone="brand" />
            <StatCard label="Active accounts" value={active} hint={`${everyone.length - active} disabled`} icon={UserCheck} tone="success" />
            <StatCard label="Administrators" value={admins} hint="Full platform access" icon={LockKeyhole} tone="critical" />
            <StatCard label="MFA adoption" value={`${everyone.length ? Math.round((mfa / everyone.length) * 100) : 0}%`} hint={`${mfa} of ${everyone.length} enrolled`} icon={ShieldCheck} tone="cyan" />
          </>
        )}
      </div>

      <div className="mb-3">
        <Tabs
          tabs={[{ key: "team", label: "Team members", count: data?.pagination?.total, icon: UsersIcon }, { key: "roles", label: "Roles & permissions", count: roleList.length, icon: LockKeyhole }]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "team" ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] p-3.5">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-semibold text-slate-200">Directory</h2>
              <Badge>{data?.pagination?.total || 0}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, department…" className="w-full sm:w-64" />
              <Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="w-32">
                <option value="">All roles</option>
                {roleList.map((role: any) => <option key={role.id} value={role.id}>{titleCase(role.name)}</option>)}
              </Select>
              <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-32">
                <option value="">Any status</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
                <option value="pending">Pending</option>
              </Select>
            </div>
          </div>
          {error && !data ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : (
            <DataTable
              rows={users}
              columns={columns}
              loading={loading && !data}
              emptyTitle="No members match"
              emptyMessage="Adjust the filters or add a new team member."
              footer={data?.pagination ? <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} limit={data.pagination.limit} onPage={setPage} /> : null}
            />
          )}
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {roleList.map((role: any) => (
            <Card key={role.id} className="panel-hover flex flex-col p-4">
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-400/20 bg-brand-500/10 text-brand-300"><Shield className="h-4 w-4" /></div>
                <Badge tone={ROLE_TONES[role.name] || "neutral"}>{role.user_count} member{role.user_count === 1 ? "" : "s"}</Badge>
              </div>
              <h3 className="mt-3 font-display text-[13px] font-semibold text-slate-100">{titleCase(role.name)}</h3>
              <p className="mt-1 line-clamp-2 min-h-[30px] text-[10.5px] leading-relaxed text-slate-600">{role.description || "No description"}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {(role.permissions || []).slice(0, 5).map((permission: string) => <Badge key={permission}>{permission}</Badge>)}
                {(role.permissions?.length || 0) > 5 && <Badge>+{role.permissions.length - 5}</Badge>}
              </div>
              <div className="mt-auto flex items-center justify-between pt-3">
                <span className="text-[9px] text-slate-700">Level {role.level}</span>
                <Button size="sm" variant="ghost" onClick={() => setRoleDetail(role)}>View permissions</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <MemberModal
        open={createOpen || Boolean(editing)}
        member={editing}
        roles={roleList}
        onClose={() => { setCreateOpen(false); setEditing(null); }}
        onSaved={() => { setCreateOpen(false); setEditing(null); refetch(); allUsers.refetch(); roles.refetch(); }}
      />

      <Modal
        open={Boolean(resetting)}
        onClose={() => { setResetting(null); setTempPassword(null); }}
        title="Reset member password"
        description={resetting ? `${resetting.fullName} · ${resetting.email}` : undefined}
        size="sm"
        footer={
          tempPassword ? (
            <Button variant="primary" icon={Check} onClick={() => { setResetting(null); setTempPassword(null); }}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setResetting(null)}>Cancel</Button>
              <Button variant="primary" icon={KeyRound} onClick={doReset}>Reset password</Button>
            </>
          )
        }
      >
        {tempPassword ? (
          <div>
            <p className="text-xs text-slate-400">Share this temporary password securely. All active sessions were revoked.</p>
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-low/25 bg-low/[0.06] p-3">
              <code className="break-all font-mono text-[12px] text-emerald-200">{tempPassword}</code>
              <button onClick={() => { navigator.clipboard.writeText(tempPassword); success("Copied"); }} className="rounded p-1.5 text-low transition hover:bg-low/10" aria-label="Copy password"><Copy className="h-3.5 w-3.5" /></button>
            </div>
            <p className="mt-2 text-[9px] text-slate-700">The member must change this password after signing in.</p>
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-slate-400">A cryptographically random temporary password will be generated. The member will be signed out of every device immediately.</p>
        )}
      </Modal>

      <RolePermissionsModal
        role={roleDetail}
        onClose={() => setRoleDetail(null)}
        onSaved={() => { setRoleDetail(null); roles.refetch(); }}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        title={confirm?.title}
        message={confirm?.message || ""}
        confirmLabel="Confirm"
        loading={confirmLoading}
        danger
      />
    </div>
  );
}

function MemberModal({ open, member, roles, onClose, onSaved }: { open: boolean; member?: any; roles: any[]; onClose: () => void; onSaved: () => void }) {
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", roleId: "", department: "", phone: "", mfaEnabled: false });

  useEffect(() => {
    if (!open) return;
    setForm({
      fullName: member?.fullName || "",
      email: member?.email || "",
      password: "",
      roleId: member?.roleId || roles[0]?.id || "",
      department: member?.department || "",
      phone: member?.phone || "",
      mfaEnabled: Boolean(member?.mfaEnabled),
    });
  }, [open, member, roles]);

  const set = (key: string, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!form.fullName.trim() || !form.email.trim()) return;
    setSaving(true);
    try {
      if (member) {
        await api(`/users/${member.id}`, { method: "PATCH", body: { fullName: form.fullName, roleId: form.roleId, department: form.department, phone: form.phone, mfaEnabled: form.mfaEnabled } });
        success("Member updated", form.fullName);
      } else {
        if (form.password.length < 8) throw new Error("Password must be at least 8 characters");
        await api("/users", { method: "POST", body: { ...form } });
        success("Member added", `${form.fullName} can now sign in.`);
      }
      onSaved();
    } catch (err) {
      toastError(member ? "Update failed" : "Could not add member", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member ? "Edit team member" : "Add team member"}
      description={member ? "Update identity, role and security settings." : "Create an account with a temporary credential."}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={() => submit()}>{member ? "Save changes" : "Add member"}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Field label="Full name"><Input value={form.fullName} onChange={(event) => set("fullName", event.target.value)} placeholder="Dr. Alex Morgan" required /></Field>
        <Field label="Work email"><Input type="email" value={form.email} onChange={(event) => set("email", event.target.value)} placeholder="alex@medicareguard.io" disabled={Boolean(member)} required /></Field>
        {!member && <Field label="Temporary password" hint="Minimum 8 characters"><Input type="password" value={form.password} onChange={(event) => set("password", event.target.value)} placeholder="••••••••" required /></Field>}
        <Field label="Role">
          <Select value={form.roleId} onChange={(event) => set("roleId", event.target.value)}>
            {roles.map((role) => <option key={role.id} value={role.id}>{titleCase(role.name)}</option>)}
          </Select>
        </Field>
        <Field label="Department"><Input value={form.department} onChange={(event) => set("department", event.target.value)} placeholder="Security Operations" /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={(event) => set("phone", event.target.value)} placeholder="+1 555 0100" /></Field>
        <div className={cn("flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5", member ? "md:col-span-2" : "md:col-span-2")}>
          <div>
            <p className="text-[11px] text-slate-300">Require multi-factor authentication</p>
            <p className="text-[9px] text-slate-600">Enforce MFA on the next sign-in.</p>
          </div>
          <Toggle checked={form.mfaEnabled} onChange={(value) => set("mfaEnabled", value)} label="MFA" />
        </div>
      </form>
    </Modal>
  );
}

function RolePermissionsModal({ role, onClose, onSaved }: { role: any; onClose: () => void; onSaved: () => void }) {
  const { success, error: toastError } = useToast();
  const { data } = useApi<any>(role ? "/roles/permissions" : null);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (role) setSelected(role.permissions || []);
  }, [role]);

  const all = data?.data || [];
  const toggle = (permission: string) => setSelected((current) => current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]);

  const save = async () => {
    if (!role) return;
    setSaving(true);
    try {
      await api(`/roles/${role.id}/permissions`, { method: "PATCH", body: { permissions: selected } });
      success("Permissions updated", `${titleCase(role.name)} now has ${selected.length} permissions.`);
      onSaved();
    } catch (err) {
      toastError("Could not update permissions", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(role)}
      onClose={onClose}
      title={role ? `${titleCase(role.name)} permissions` : "Role permissions"}
      description={role?.description || "Control what this role can access across the platform."}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={save}>Save permissions</Button>
        </>
      }
    >
      <p className="mb-3 text-[10px] text-slate-600">{selected.length} of {all.length} permissions selected · {role?.user_count || 0} members affected</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {all.map((permission: string) => {
          const enabled = selected.includes(permission);
          return (
            <button key={permission} onClick={() => toggle(permission)} className={cn("flex items-center justify-between rounded-lg border px-3 py-2 text-left transition", enabled ? "border-brand-400/25 bg-brand-500/[0.07]" : "border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.03]")}>
              <span className={cn("font-mono text-[10px]", enabled ? "text-brand-200" : "text-slate-500")}>{permission}</span>
              <span className={cn("flex h-4 w-4 items-center justify-center rounded border", enabled ? "border-brand-400/40 bg-brand-500/20 text-brand-200" : "border-white/10 text-transparent")}><Check className="h-2.5 w-2.5" /></span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
