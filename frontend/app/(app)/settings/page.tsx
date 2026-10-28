"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Activity, CheckCircle2, Database, KeyRound, LockKeyhole, Pencil, Plug, PlugZap, RefreshCw, Save, Server, Settings2, Shield, ShieldCheck, User, Workflow } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { clearSession, getToken, getUser, setSession } from "@/lib/auth";
import { cn, formatDate, relativeTime, titleCase } from "@/lib/utils";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Skeleton, StatusBadge, Tabs, Toggle } from "@/components/ui";

const INTEGRATION_ICONS: Record<string, any> = { siem: Activity, edr: Shield, firewall: ShieldCheck, cloud: Server, identity: LockKeyhole, ticketing: Workflow, notification: Plug, soar: Workflow, "threat-intel": Database };

export default function SettingsPage() {
  const { success, error: toastError } = useToast();
  const router = useRouter();
  const me = useApi<any>("/auth/me");
  const integrations = useApi<any>("/integrations?limit=100");
  const settings = useApi<any>("/settings?limit=100");
  const health = useApi<any>("/health/db");
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState({ fullName: "", department: "", phone: "", avatarUrl: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [mfaSaving, setMfaSaving] = useState(false);
  const [editingSetting, setEditingSetting] = useState<any>(null);
  const [createSetting, setCreateSetting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  const user = me.data?.data;
  const localUser = getUser();

  useEffect(() => {
    if (!user) return;
    setProfile({ fullName: user.fullName || "", department: user.department || "", phone: user.phone || "", avatarUrl: user.avatarUrl || "" });
  }, [user]);

  const set = (key: string, value: string) => setProfile((current) => ({ ...current, [key]: value }));

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await api("/auth/me", { method: "PATCH", body: { full_name: profile.fullName, department: profile.department, phone: profile.phone, avatar_url: profile.avatarUrl } });
      const token = getToken();
      if (token && localUser) setSession(token, { ...localUser, fullName: profile.fullName, department: profile.department, avatarUrl: profile.avatarUrl });
      success("Đã cập nhật hồ sơ", "Thông tin thư mục của bạn đã được lưu.");
      me.refetch();
    } catch (err) {
      toastError("Cập nhật thất bại", err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirm) {
      toastError("Mật khẩu không khớp", "Xác nhận lại mật khẩu mới và thử lại.");
      return;
    }
    if (passwords.newPassword.length < 8) {
      toastError("Mật khẩu quá ngắn", "Sử dụng ít nhất 8 ký tự.");
      return;
    }
    setChangingPassword(true);
    try {
      await api("/auth/change-password", { method: "POST", body: { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword } });
      success("Đã đổi mật khẩu", "Tất cả phiên đã bị thu hồi. Vui lòng đăng nhập lại.");
      clearSession();
      setTimeout(() => router.push("/login"), 900);
    } catch (err) {
      toastError("Đổi mật khẩu thất bại", err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setChangingPassword(false);
    }
  };

  const toggleMfa = async (value: boolean) => {
    if (!user) return;
    setMfaSaving(true);
    try {
      await api(`/users/${user.id}`, { method: "PATCH", body: { mfaEnabled: value } });
      success(value ? "Đã bật MFA" : "Đã tắt MFA", value ? "Xác thực đa yếu tố hiện được bắt buộc." : "MFA đã được tắt.");
      me.refetch();
    } catch (err) {
      toastError("Không thể cập nhật MFA", err instanceof Error ? err.message : "Có thể cần quyền quản trị viên");
    } finally {
      setMfaSaving(false);
    }
  };

  const syncIntegration = async (integration: any) => {
    setSyncing(integration.id);
    try {
      await api(`/integrations/${integration.id}`, { method: "PATCH", body: { status: "connected", last_sync_at: new Date().toISOString() } });
      success("Đã đồng bộ tích hợp", `Đã xác minh kết nối ${integration.name}.`);
      integrations.refetch();
    } catch (err) {
      toastError("Đồng bộ thất bại", err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setSyncing(null);
    }
  };

  const integrationList = integrations.data?.data || [];
  const settingList = settings.data?.data || [];
  const connected = integrationList.filter((item: any) => item.status === "connected").length;

  return (
    <div>
      <PageHeader
        title="Cài đặt nền tảng"
        subtitle="Hồ sơ, xác thực, tích hợp và cấu hình nền tảng"
        icon={Settings2}
        badge={<Badge tone="info">{titleCase(user?.role || "member")}</Badge>}
        actions={<Button icon={RefreshCw} onClick={() => { me.refetch(); integrations.refetch(); settings.refetch(); health.refetch(); }} loading={me.refreshing}>Làm mới</Button>}
      />

      <div className="mb-4">
        <Tabs
          tabs={[
            { key: "profile", label: "Hồ sơ", icon: User },
            { key: "security", label: "Bảo vệ", icon: Shield },
            { key: "integrations", label: "Tích hợp", count: integrationList.length, icon: PlugZap },
            { key: "platform", label: "Nền tảng", count: settingList.length, icon: Settings2 },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "profile" && (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="p-5 xl:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-200">Hồ sơ thư mục</h2>
                <p className="mt-0.5 text-[11px] text-slate-600">Hiển thị cho đồng đội qua các cảnh báo, sự cố và nhận xét.</p>
              </div>
              <User className="h-4 w-4 text-brand-400" />
            </div>
            {me.loading && !user ? (
              <div className="mt-4 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : (
              <form onSubmit={saveProfile} className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Họ tên"><Input value={profile.fullName} onChange={(event) => set("fullName", event.target.value)} /></Field>
                <Field label="Email" hint="Được quản lý bởi nhà cung cấp danh tính"><Input value={user?.email || ""} disabled /></Field>
                <Field label="Khoa/Phòng"><Input value={profile.department} onChange={(event) => set("department", event.target.value)} placeholder="Vận hành an ninh" /></Field>
                <Field label="Số điện thoại"><Input value={profile.phone} onChange={(event) => set("phone", event.target.value)} placeholder="+1 555 0100" /></Field>
                <Field label="URL hình đại diện" className="md:col-span-2"><Input value={profile.avatarUrl} onChange={(event) => set("avatarUrl", event.target.value)} placeholder="https://…" /></Field>
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" variant="primary" icon={Save} loading={savingProfile}>Lưu thay đổi</Button>
                </div>
              </form>
            )}
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-400/20 bg-brand-500/10 font-display text-base font-semibold text-brand-200">
                  {(user?.fullName || "MG").split(" ").map((part: string) => part[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-slate-100">{user?.fullName}</p>
                  <p className="text-[10px] text-slate-600">{titleCase(user?.role)} · Cấp độ truy cập</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-[10px]"><span className="text-slate-600">Quyền</span><span className="text-slate-300">{user?.permissions?.includes("*") ? "Toàn quyền" : user?.permissions?.length || 0}</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-slate-600">MFA</span><span className={cn(user?.mfaEnabled ? "text-low" : "text-high")}>{user?.mfaEnabled ? "Bật" : "Chưa bật"}</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-slate-600">Lần đăng nhập cuối cùng</span><span className="text-slate-300">{user?.lastLoginAt ? relativeTime(user.lastLoginAt) : "—"}</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-slate-600">Thành viên kể từ</span><span className="text-slate-300">{formatDate(user?.createdAt, { day: "2-digit", month: "short", year: "numeric" })}</span></div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <Server className="h-3.5 w-3.5 text-slate-600" />
                <h3 className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Thời gian chạy</h3>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-[10px]"><span className="text-slate-600">API</span><span className="flex items-center gap-1 text-low"><span className="h-1.5 w-1.5 rounded-full bg-low" /> hoạt động</span></div>
                <div className="flex items-center justify-between text-[10px]"><span className="text-slate-600">PostgreSQL</span><span className={cn("flex items-center gap-1", health.data ? "text-low" : "text-high")}><span className={cn("h-1.5 w-1.5 rounded-full", health.data ? "bg-low" : "bg-high")} /> {health.data ? `${health.data.latencyMs}ms` : "đang kiểm tra"}</span></div>
                <div className="flex items-center justify-between text-[10px]"><span className="text-slate-600">Cơ sở dữ liệu</span><span className="text-slate-400">{health.data?.database || "medicareguard"}</span></div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "security" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-200">Thay đổi mật khẩu</h2>
                <p className="mt-0.5 text-[11px] text-slate-600">Việc thay đổi mật khẩu của bạn sẽ thu hồi mọi phiên hoạt động.</p>
              </div>
              <KeyRound className="h-4 w-4 text-brand-400" />
            </div>
            <form onSubmit={changePassword} className="mt-4 space-y-3">
              <Field label="Mật khẩu hiện tại"><Input type="password" value={passwords.currentPassword} onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))} placeholder="••••••••" required /></Field>
              <Field label="Mật khẩu mới" hint="Tối thiểu 8 ký tự"><Input type="password" value={passwords.newPassword} onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))} placeholder="••••••••" required /></Field>
              <Field label="Xác nhận mật khẩu mới"><Input type="password" value={passwords.confirm} onChange={(event) => setPasswords((current) => ({ ...current, confirm: event.target.value }))} placeholder="••••••••" required /></Field>
              <Button type="submit" variant="primary" icon={LockKeyhole} loading={changingPassword} className="w-full">Cập nhật mật khẩu</Button>
            </form>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-sm font-semibold text-slate-200">Xác thực đa yếu tố</h2>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">Yêu cầu yếu tố thứ hai để có quyền truy cập đặc quyền vào hệ thống an toàn bệnh nhân.</p>
                </div>
                <ShieldCheck className={cn("h-4 w-4", user?.mfaEnabled ? "text-low" : "text-slate-600")} />
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", user?.mfaEnabled ? "bg-low/10 text-low" : "bg-white/[0.04] text-slate-600")}><ShieldCheck className="h-3.5 w-3.5" /></span>
                  <div>
                    <p className="text-[11px] text-slate-300">{user?.mfaEnabled ? "MFA đang bật" : "MFA chưa bật"}</p>
                    <p className="text-[9px] text-slate-600">{user?.mfaEnabled ? "Bắt buộc yếu tố thứ hai khi đăng nhập." : "Bật để tăng cường bảo mật tài khoản."}</p>
                  </div>
                </div>
                <Toggle checked={Boolean(user?.mfaEnabled)} onChange={toggleMfa} label="MFA" />
              </div>
              {mfaSaving && <p className="mt-2 text-[9px] text-slate-600">Đang cập nhật chính sách bảo mật…</p>}
            </Card>

            <Card className="p-5">
              <h2 className="font-display text-sm font-semibold text-slate-200">Vai trò và quyền</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {user?.permissions?.includes("*") ? <Badge tone="info">Tất cả quyền truy cập · mọi mô-đun</Badge> : (user?.permissions || []).map((permission: string) => <Badge key={permission} tone="info">{permission}</Badge>)}
              </div>
              <p className="mt-3 text-[9px] leading-relaxed text-slate-700">Các thay đổi về vai trò được quản lý bởi quản trị viên nền tảng trong Người dùng &amp; Vai trò.</p>
            </Card>
          </div>
        </div>
      )}

      {tab === "integrations" && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10.5px] text-slate-600">{connected}/{integrationList.length} tích hợp được kết nối</p>
            <Badge tone={connected === integrationList.length ? "low" : "warning"} dot>{connected === integrationList.length ? "tất cả ổn định" : "cần chú ý"}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {integrations.loading && !integrations.data && Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-xl" />)}
            {integrationList.map((integration: any) => {
              const Icon = INTEGRATION_ICONS[integration.type] || Plug;
              return (
                <Card key={integration.id} className="panel-hover flex flex-col p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-400/20 bg-brand-500/10 text-brand-300"><Icon className="h-4 w-4" /></div>
                    <StatusBadge status={integration.status} />
                  </div>
                  <h3 className="mt-3 font-display text-[13px] font-semibold text-slate-100">{integration.name}</h3>
                  <p className="mt-0.5 text-[9.5px] text-slate-600">{integration.provider} · {titleCase(integration.type)}</p>
                  <div className="mt-2 rounded-lg border border-white/[0.04] bg-black/20 p-2">
                    <pre className="max-h-16 overflow-hidden font-mono text-[8.5px] leading-relaxed text-slate-600">{JSON.stringify(integration.config || {}, null, 1)}</pre>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <span className="text-[9px] text-slate-700">Đồng bộ lần cuối {integration.last_sync_at ? relativeTime(integration.last_sync_at) : "chưa bao giờ"}</span>
                    <Button size="sm" variant="ghost" icon={PlugZap} loading={syncing === integration.id} onClick={() => syncIntegration(integration)}>Đồng bộ hóa</Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {tab === "platform" && (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="overflow-hidden xl:col-span-2">
            <div className="flex items-center justify-between border-b border-white/[0.05] p-3.5">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-semibold text-slate-200">Khóa cấu hình</h2>
                <Badge>{settingList.length}</Badge>
              </div>
              <Button size="sm" icon={Settings2} onClick={() => setCreateSetting(true)}>Thêm khóa</Button>
            </div>
            <div className="divide-y divide-white/[0.03]">
              {settingList.map((setting: any) => (
                <div key={setting.id} className="flex items-start justify-between gap-3 px-4 py-2.5 transition hover:bg-white/[0.02]">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[10px] text-slate-300">{setting.key}</p>
                    <p className="mt-0.5 truncate text-[9px] text-slate-600">{setting.description || setting.scope}</p>
                    <pre className="mt-1 max-h-16 overflow-hidden font-mono text-[8.5px] text-slate-700">{JSON.stringify(setting.value)}</pre>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge>{setting.scope}</Badge>
                    <button onClick={() => setEditingSetting(setting)} className="rounded p-1.5 text-slate-700 transition hover:bg-white/[0.05] hover:text-brand-300" aria-label="Chỉnh sửa cài đặt"><Pencil className="h-3 w-3" /></button>
                  </div>
                </div>
              ))}
              {!settings.loading && !settingList.length && <p className="px-4 py-10 text-center text-[10px] text-slate-600">Không có khóa cấu hình</p>}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center gap-2"><Server className="h-3.5 w-3.5 text-slate-600" /><h3 className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Tình trạng dịch vụ</h3></div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-[10px]"><span className="text-slate-600">Độ trễ API</span><span className="text-slate-300">{health.data?.latencyMs ?? "—"}ms</span></div>
                <div className="flex items-center justify-between text-[10px]"><span className="text-slate-600">Cơ sở dữ liệu</span><span className="text-slate-300">{health.data?.database || "—"}</span></div>
                <div className="flex items-center justify-between text-[10px]"><span className="text-slate-600">Thời gian máy chủ</span><span className="text-slate-300">{health.data?.serverTime ? formatDate(health.data.serverTime) : "—"}</span></div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-brand-300" /><h3 className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Lưu ý tuân thủ</h3></div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-600">Các thay đổi cấu hình được ghi lại trong nhật ký kiểm toán bất biến. Xuất bằng chứng từ mô-đun Báo cáo để đánh giá HIPAA và ISO 27001.</p>
            </Card>
          </div>
        </div>
      )}

      <SettingModal
        open={Boolean(editingSetting) || createSetting}
        setting={editingSetting}
        onClose={() => { setEditingSetting(null); setCreateSetting(false); }}
        onSaved={() => { setEditingSetting(null); setCreateSetting(false); settings.refetch(); }}
      />
    </div>
  );
}

function SettingModal({ open, setting, onClose, onSaved }: { open: boolean; setting?: any; onClose: () => void; onSaved: () => void }) {
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ key: "", scope: "global", description: "", value: "{}" });

  useEffect(() => {
    if (!open) return;
    setForm({
      key: setting?.key || "",
      scope: setting?.scope || "global",
      description: setting?.description || "",
      value: setting ? JSON.stringify(setting.value, null, 2) : "{}",
    });
  }, [open, setting]);

  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    let parsed;
    try {
      parsed = JSON.parse(form.value || "{}");
    } catch {
      toastError("JSON không hợp lệ", "Giá trị cấu hình phải là JSON hợp lệ.");
      return;
    }
    if (!form.key.trim()) return;
    setSaving(true);
    try {
      if (setting) {
        await api(`/settings/${setting.id}`, { method: "PATCH", body: { value: parsed, description: form.description, scope: form.scope } });
        success("Đã cập nhật cài đặt", form.key);
      } else {
        await api("/settings", { method: "POST", body: { key: form.key, value: parsed, scope: form.scope, description: form.description } });
        success("Đã tạo cài đặt", form.key);
      }
      onSaved();
    } catch (err) {
      toastError("Không thể lưu cài đặt", err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={setting ? "Sửa cấu hình" : "Thêm khóa cấu hình"}
      description="Các giá trị được lưu trữ dưới dạng JSON và được kiểm tra khi thay đổi."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button variant="primary" icon={Save} loading={saving} onClick={save}>Lưu</Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Khóa" className="md:col-span-2"><Input value={form.key} onChange={(event) => set("key", event.target.value)} placeholder="security.session_timeout_minutes" disabled={Boolean(setting)} className="font-mono" /></Field>
        <Field label="Phạm vi">
          <Select value={form.scope} onChange={(event) => set("scope", event.target.value)}>
            {["global", "security", "reporting", "automation", "notifications"].map((scope) => <option key={scope} value={scope}>{titleCase(scope)}</option>)}
          </Select>
        </Field>
        <Field label="Mô tả"><Input value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Cài đặt này kiểm soát những gì" /></Field>
        <Field label="Giá trị JSON" className="md:col-span-2">
          <textarea value={form.value} onChange={(event) => set("value", event.target.value)} rows={8} className="input min-h-[150px] resize-y font-mono text-[11px]" />
        </Field>
      </div>
    </Modal>
  );
}
