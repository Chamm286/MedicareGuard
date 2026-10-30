"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, Boxes, CheckCircle2, CreditCard, Loader2, RefreshCw, Search, ShieldAlert, ShieldCheck, ShoppingBag, Users, XCircle } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { getToken, getUser } from "@/lib/auth";
import { canAccessRoles, roleHome } from "@/lib/access";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { formatStoreDate, formatVnd, orderStatusLabel } from "@/lib/store";

type Stats = {
  products: number;
  orders: number;
  openOrders: number;
  customers: number;
  revenue: number;
  paidOrders: number;
  topProducts: Array<{ sku: string; name: string; quantity: number; revenue: number }>;
  recentOrders: Array<{ id: string; order_number: string; shipping_name: string; total: number; status: string; payment_status: string; risk_score: number; ip_address: string; created_at: string }>;
  fraudEvents: Array<{ id: string; event_type: string; severity: string; ip_address: string; country: string; risk_score: number; created_at: string }>;
};

type Order = {
  id: string;
  order_number: string;
  shipping_name: string;
  shipping_email: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_country: string;
  shipping_country_code: string;
  total: number;
  status: string;
  payment_status: string;
  risk_score: number;
  fraud_flags: string[] | null;
  ip_address: string;
  ip_country: string;
  ip_country_code: string;
  ip_source: string;
  created_at: string;
};

type OrderDetail = Order & {
  items: Array<{ id: string; name: string; sku: string; quantity: number; unit_price: number; line_total: number }>;
  payments: Array<{ provider: string; status: string; amount: number; transaction_ref: string | null; created_at: string }>;
  fraud_flags: string[] | null;
  securityEvents: Array<{ id: string; event_type: string; severity: string; ip_address: string; country: string; risk_score: number; metadata: any; created_at: string }>;
};

const riskTone = (score: number) =>
  score >= 70
    ? "border-critical/30 bg-critical/10 text-critical"
    : score >= 50
      ? "border-high/30 bg-high/10 text-high"
      : "border-low/30 bg-low/10 text-low";

const riskLabel = (score: number) => (score >= 70 ? "Nguy hiểm" : score >= 50 ? "Nghi ngờ" : "An toàn");

const flagLabel: Record<string, string> = {
  foreign_ip: "IP nước ngoài",
  ip_country_mismatch: "IP khác quốc gia giao hàng",
  unknown_ip_country: "Không xác định quốc gia IP",
  high_value_order: "Đơn giá trị cao",
  elevated_value_order: "Đơn giá trị tăng",
  card_high_value: "Thẻ + giá trị cao",
  bulk_quantity: "Mua số lượng lớn",
  order_velocity: "Mua dồn dập",
  invalid_phone: "SĐT không hợp lệ",
  invalid_address: "Địa chỉ không hợp lệ",
  new_account_high_value: "Tài khoản mới mua lớn",
  guest_checkout: "Khách vãng lai",
  missing_client_ip: "Thiếu IP",
};

export default function StoreAdminPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const params = new URLSearchParams();
  if (search.trim()) params.set("q", search.trim());
  if (statusFilter !== "all") params.set("status", statusFilter);
  params.set("limit", "100");

  const stats = useApi<{ data: Stats }>("/store/admin/stats", { refreshInterval: 15000, enabled: ready });
  const orders = useApi<{ data: Order[]; pagination: { total: number } }>(`/store/admin/orders?${params.toString()}`, { refreshInterval: 15000, enabled: ready });

  useEffect(() => {
    const user = getUser();
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    if (!canAccessRoles(user, ["admin", "analyst"])) {
      router.replace(roleHome(user?.role));
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    api<{ data: OrderDetail }>(`/store/admin/orders/${selectedId}`)
      .then((response) => setDetail(response.data))
      .catch((err) => toastError("Không thể tải chi tiết", err instanceof Error ? err.message : "Vui lòng thử lại."))
      .finally(() => setDetailLoading(false));
  }, [selectedId, toastError]);

  const filteredOrders = useMemo(() => {
    const rows = orders.data?.data || [];
    return rows.filter((order) => {
      if (riskFilter === "danger" && order.risk_score < 70) return false;
      if (riskFilter === "suspicious" && (order.risk_score < 50 || order.risk_score >= 70)) return false;
      if (riskFilter === "safe" && order.risk_score >= 50) return false;
      return true;
    });
  }, [orders.data, riskFilter]);

  const updateStatus = async (order: Order, status: string) => {
    setBusy(order.id);
    try {
      await api(`/store/admin/orders/${order.id}`, { method: "PATCH", body: { status } });
      success("Đã cập nhật đơn hàng", `${order.order_number} → ${orderStatusLabel[status] || status}`);
      stats.refetch();
      orders.refetch();
      if (selectedId === order.id) {
        const refreshed = await api<{ data: OrderDetail }>(`/store/admin/orders/${order.id}`);
        setDetail(refreshed.data);
      }
    } catch (err) {
      toastError("Không thể cập nhật", err instanceof Error ? err.message : "Vui lòng thử lại.");
    } finally {
      setBusy(null);
    }
  };

  const blockIp = async (ip: string) => {
    setBusy(ip);
    try {
      await api("/firewall", {
        method: "POST",
        body: {
          name: `Block fraud IP ${ip}`,
          description: "Tự động tạo từ Medicare Store fraud review",
          direction: "inbound",
          action: "deny",
          protocol: "any",
          source_ip: ip,
          priority: 10,
          enabled: true,
        },
      });
      success("Đã chặn IP", `${ip} đã được thêm vào firewall deny rule.`);
    } catch (err) {
      toastError("Không thể chặn IP", err instanceof Error ? err.message : "Vui lòng thử lại.");
    } finally {
      setBusy(null);
    }
  };

  if (!ready) return <div className="mx-auto max-w-7xl px-4 py-12"><div className="skeleton h-96 rounded-2xl" /></div>;

  const data = stats.data?.data;
  const cards = [
    { label: "Doanh thu đã thanh toán", value: formatVnd(data?.revenue), icon: CreditCard, tone: "text-low" },
    { label: "Đơn hàng", value: data?.orders ?? "—", icon: ShoppingBag, tone: "text-brand-300" },
    { label: "Đơn cần xử lý", value: data?.openOrders ?? "—", icon: AlertTriangle, tone: "text-high" },
    { label: "Khách hàng", value: data?.customers ?? "—", icon: Users, tone: "text-cyan-300" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Quản trị · SOC</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-white">Điều hành Medicare Store</h1>
          <p className="mt-1 text-xs text-slate-500">Quản lý đơn hàng, rủi ro gian lận, IP và trạng thái xử lý theo thời gian thực.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { stats.refetch(); orders.refetch(); }} className="btn btn-secondary h-9 px-3 text-xs"><RefreshCw className="h-3.5 w-3.5" /> Làm mới</button>
          <Link href="/dashboard" className="btn btn-primary h-9 px-3 text-xs">Về SOC <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="panel p-4">
            <div className="flex items-start justify-between"><p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{card.label}</p><card.icon className={cn("h-4 w-4", card.tone)} /></div>
            <p className="mt-2 font-display text-2xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã đơn, tên, email..." className="input h-10 pl-10" />
        </label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select h-10">
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Chờ xác nhận</option>
          <option value="confirmed">Đã xác nhận</option>
          <option value="processing">Đang giao</option>
          <option value="on_hold">Đang giữ kiểm tra</option>
          <option value="shipped">Đã gửi</option>
          <option value="delivered">Đã giao</option>
          <option value="cancelled">Đã hủy</option>
        </select>
        <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="select h-10">
          <option value="all">Tất cả mức rủi ro</option>
          <option value="danger">Nguy hiểm (≥70)</option>
          <option value="suspicious">Nghi ngờ (50-69)</option>
          <option value="safe">An toàn (&lt;50)</option>
        </select>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.65fr_0.85fr]">
        <div className="panel overflow-hidden p-0">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Danh sách đơn hàng</h2>
              <p className="panel-subtitle">{filteredOrders.length} đơn hiển thị · tổng {orders.data?.pagination?.total ?? 0}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="table-th">Mã đơn</th>
                  <th className="table-th">Khách hàng</th>
                  <th className="table-th">SĐT</th>
                  <th className="table-th">Tổng tiền</th>
                  <th className="table-th">Rủi ro</th>
                  <th className="table-th">Trạng thái</th>
                  <th className="table-th">Ngày tạo</th>
                  <th className="table-th">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="table-row cursor-pointer" onClick={() => setSelectedId(order.id)}>
                    <td className="table-td">
                      <p className="font-mono text-xs text-white">{order.order_number}</p>
                      <p className="mt-0.5 text-[10px] text-slate-600">{order.ip_address} · {order.ip_country}</p>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-200">{order.shipping_name}</p>
                        {order.risk_score >= 50 && <span className="chip border-critical/25 bg-critical/10 text-critical">Cảnh báo</span>}
                      </div>
                      <p className="text-[10px] text-slate-600">{order.shipping_email}</p>
                    </td>
                    <td className="table-td text-xs text-slate-300">{order.shipping_phone}</td>
                    <td className="table-td text-xs font-medium text-white">{formatVnd(order.total)}</td>
                    <td className="table-td">
                      <span className={cn("chip", riskTone(order.risk_score))}>{order.risk_score} · {riskLabel(order.risk_score)}</span>
                    </td>
                    <td className="table-td">
                      <span className={cn("chip", order.status === "on_hold" ? "border-critical/25 bg-critical/10 text-critical" : order.status === "cancelled" ? "border-slate-500/25 bg-slate-500/10 text-slate-300" : "border-low/25 bg-low/10 text-low")}>
                        {orderStatusLabel[order.status] || order.status}
                      </span>
                    </td>
                    <td className="table-td text-[10px] text-slate-500">{formatStoreDate(order.created_at)}</td>
                    <td className="table-td">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedId(order.id); }} className="btn btn-secondary h-8 px-2 text-[10px]">Chi tiết</button>
                    </td>
                  </tr>
                ))}
                {!filteredOrders.length && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-xs text-slate-600">Không có đơn hàng phù hợp.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-white"><ShieldAlert className="h-4 w-4 text-high" /> Sự kiện gian lận</h2>
            <div className="mt-3 space-y-2">
              {(data?.fraudEvents || []).length ? data?.fraudEvents.map((event) => (
                <div key={event.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between gap-2"><p className="text-[11px] font-medium text-slate-200">{event.event_type}</p><span className={cn("chip", riskTone(event.risk_score))}>{event.risk_score}</span></div>
                  <p className="mt-1 text-[10px] text-slate-600">{event.ip_address} · {event.country} · {formatStoreDate(event.created_at)}</p>
                </div>
              )) : <p className="text-xs text-slate-600">Chưa có sự kiện gian lận.</p>}
            </div>
          </div>
          <div className="panel p-5">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-white"><Boxes className="h-4 w-4 text-brand-300" /> Bán chạy</h2>
            <div className="mt-3 space-y-2">
              {(data?.topProducts || []).map((product) => (
                <div key={product.sku} className="flex items-center justify-between gap-2 text-[11px]"><span className="min-w-0 truncate text-slate-300">{product.name}</span><span className="shrink-0 text-slate-500">{product.quantity} · {formatVnd(product.revenue)}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedId(null)}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/[0.08] bg-slate-950 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {detailLoading || !detail ? (
              <div className="flex items-center gap-3 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải chi tiết đơn hàng...</div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Chi tiết đơn hàng</p>
                    <h2 className="mt-1 font-mono text-xl font-semibold text-white">{detail.order_number}</h2>
                    <p className="mt-1 text-xs text-slate-500">{formatStoreDate(detail.created_at)} · {detail.payment_status}</p>
                  </div>
                  <button onClick={() => setSelectedId(null)} className="btn btn-secondary h-9 px-3 text-xs">Đóng</button>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Khách hàng</p>
                    <p className="mt-1 text-sm font-medium text-white">{detail.shipping_name}</p>
                    <p className="text-xs text-slate-400">{detail.shipping_email} · {detail.shipping_phone}</p>
                    <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-slate-500">Địa chỉ giao hàng</p>
                    <p className="mt-1 text-xs text-slate-300">{detail.shipping_address}, {detail.shipping_city}, {detail.shipping_country} ({detail.shipping_country_code})</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">IP & GeoIP</p>
                    <p className="mt-1 font-mono text-sm text-white">{detail.ip_address}</p>
                    <p className="text-xs text-slate-400">{detail.ip_country} ({detail.ip_country_code}) · nguồn {detail.ip_source}</p>
                    <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-slate-500">Rủi ro</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={cn("chip", riskTone(detail.risk_score))}>{detail.risk_score} · {riskLabel(detail.risk_score)}</span>
                      {detail.risk_score >= 50 && <span className="chip border-critical/25 bg-critical/10 text-critical">Fraud Alert</span>}
                    </div>
                    {detail.fraud_flags?.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {detail.fraud_flags.map((flag) => <span key={flag} className="chip border-high/20 bg-high/10 text-high">{flagLabel[flag] || flag}</span>)}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Sản phẩm đã mua</p>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[620px]">
                      <thead><tr className="border-b border-white/[0.06]"><th className="table-th">Sản phẩm</th><th className="table-th">SKU</th><th className="table-th">SL</th><th className="table-th">Đơn giá</th><th className="table-th">Thành tiền</th></tr></thead>
                      <tbody>
                        {detail.items.map((item) => (
                          <tr key={item.id} className="table-row">
                            <td className="table-td text-xs text-slate-200">{item.name}</td>
                            <td className="table-td font-mono text-[10px] text-slate-500">{item.sku}</td>
                            <td className="table-td text-xs text-slate-300">{item.quantity}</td>
                            <td className="table-td text-xs text-slate-300">{formatVnd(item.unit_price)}</td>
                            <td className="table-td text-xs font-medium text-white">{formatVnd(item.line_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex justify-between border-t border-white/[0.06] pt-3 text-sm">
                    <span className="text-slate-400">Tổng thanh toán</span>
                    <span className="font-display font-semibold text-white">{formatVnd(detail.total)}</span>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Lịch sử sự kiện SOC</p>
                  <div className="mt-3 space-y-2">
                    {detail.securityEvents.length ? detail.securityEvents.map((event) => (
                      <div key={event.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-medium text-slate-200">{event.event_type} · {event.severity}</p>
                          <span className={cn("chip", riskTone(event.risk_score))}>{event.risk_score}</span>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-600">{event.ip_address} · {event.country} · {formatStoreDate(event.created_at)}</p>
                      </div>
                    )) : <p className="text-xs text-slate-600">Chưa có security event cho đơn này.</p>}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                  <button disabled={busy === detail.id} onClick={() => updateStatus(detail as unknown as Order, "confirmed")} className="btn btn-primary h-10 px-4 text-xs">
                    {busy === detail.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Phê duyệt
                  </button>
                  <button disabled={busy === detail.id} onClick={() => updateStatus(detail as unknown as Order, "cancelled")} className="btn btn-secondary h-10 px-4 text-xs">
                    <XCircle className="h-3.5 w-3.5" /> Từ chối / Hủy đơn
                  </button>
                  <button disabled={busy === detail.ip_address} onClick={() => blockIp(detail.ip_address)} className="btn btn-secondary h-10 px-4 text-xs text-critical">
                    <ShieldAlert className="h-3.5 w-3.5" /> Chặn IP
                  </button>
                  {detail.risk_score >= 50 && <span className="ml-auto self-center text-[10px] text-high">Đơn này đang được SOC theo dõi.</span>}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {stats.loading && <p className="mt-4 flex items-center gap-2 text-[10px] text-slate-600"><Loader2 className="h-3 w-3 animate-spin" /> Đang đồng bộ dữ liệu...</p>}
    </div>
  );
}
