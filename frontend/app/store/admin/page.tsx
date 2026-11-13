"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowUpRight,
  Box,
  Boxes,
  CheckCircle2,
  Globe2,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Star,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { api, useApi, useDebounced } from "@/lib/api";
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
  topProducts: Array<{ sku: string; name: string; quantity: number; revenue: number; image_url?: string | null }>;
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
  securityEvents: Array<{ id: string; event_type: string; severity: string; ip_address: string; country: string; risk_score: number; metadata: any; created_at: string }>;
};

type AdminProduct = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  category: string;
  brand: string | null;
  description: string | null;
  price: number;
  sale_price: number | null;
  effective_price: number;
  stock: number;
  image_url: string | null;
  rating: number;
  status: string;
  created_at: string;
  updated_at: string;
};

type ProductSummary = { active: number; draft: number; archived: number; out_of_stock: number; units: number };
type ProductsResponse = { data: AdminProduct[]; summary: ProductSummary; pagination: { total: number } };

type Tab = "overview" | "orders" | "products";

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

const paymentLabel: Record<string, string> = {
  paid: "Đã thanh toán",
  pending: "Chờ thanh toán",
  failed: "Thất bại",
  refunded: "Đã hoàn tiền",
};

const productStatusLabel: Record<string, string> = {
  active: "Đang bán",
  draft: "Nháp",
  archived: "Lưu trữ",
};

const riskMeta = (score: number) =>
  score >= 70
    ? { label: "Nguy hiểm", icon: ShieldAlert, chip: "border-red-200 bg-red-50 text-red-700", dot: "bg-red-500" }
    : score >= 50
      ? { label: "Cảnh báo", icon: AlertTriangle, chip: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" }
      : { label: "An toàn", icon: ShieldCheck, chip: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" };

const severityMeta = (severity: string) => {
  const key = String(severity || "").toLowerCase();
  if (key === "critical") return "border-red-200 bg-red-50 text-red-700";
  if (key === "high") return "border-orange-200 bg-orange-50 text-orange-700";
  if (key === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
};

const statusChip = (status: string) => {
  if (status === "cancelled") return "border-slate-200 bg-slate-100 text-slate-600";
  if (status === "on_hold") return "border-red-200 bg-red-50 text-red-700";
  if (status === "delivered") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "shipped") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (status === "processing") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-indigo-200 bg-indigo-50 text-indigo-700";
};

function RiskBadge({ score }: { score: number }) {
  const meta = riskMeta(score);
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", meta.chip)}>
      <Icon className="h-3 w-3" /> {score} · {meta.label}
    </span>
  );
}

function RiskMeter({ score }: { score: number }) {
  const meta = riskMeta(score);
  const Icon = meta.icon;
  const pct = Math.max(0, Math.min(100, score));
  const barColor = score >= 70 ? "bg-red-500" : score >= 50 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", meta.chip)}>
        <Icon className="h-3 w-3" /> {score}
      </span>
    </div>
  );
}

function LightModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  const sizes = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-5xl" };
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/40 px-4 py-10 backdrop-blur-sm" onClick={onClose}>
      <div className={cn("w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl", sizes[size])} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="font-display text-lg font-semibold text-slate-900">{title}</h3>
            {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100";
const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500";

function ProductEditor({
  open,
  product,
  onClose,
  onSaved,
}: {
  open: boolean;
  product: AdminProduct | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "Thiết bị y tế",
    brand: "",
    description: "",
    price: "",
    salePrice: "",
    stock: "0",
    imageUrl: "",
    status: "active",
  });

  useEffect(() => {
    if (!open) return;
    setForm(
      product
        ? {
            name: product.name,
            sku: product.sku,
            category: product.category || "Thiết bị y tế",
            brand: product.brand || "",
            description: product.description || "",
            price: String(product.price ?? ""),
            salePrice: product.sale_price === null ? "" : String(product.sale_price),
            stock: String(product.stock ?? 0),
            imageUrl: product.image_url || "",
            status: product.status || "active",
          }
        : { name: "", sku: "", category: "Thiết bị y tế", brand: "", description: "", price: "", salePrice: "", stock: "0", imageUrl: "", status: "active" },
    );
  }, [open, product]);

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (!form.name.trim()) {
      toastError("Thiếu tên sản phẩm", "Vui lòng nhập tên sản phẩm.");
      return;
    }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) {
      toastError("Giá không hợp lệ", "Giá bán phải lớn hơn 0.");
      return;
    }
    const salePrice = form.salePrice === "" ? null : Number(form.salePrice);
    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice > price)) {
      toastError("Giá khuyến mãi không hợp lệ", "Giá khuyến mãi phải nhỏ hơn hoặc bằng giá bán.");
      return;
    }
    const body = {
      name: form.name.trim(),
      category: form.category.trim() || "Thiết bị y tế",
      brand: form.brand.trim() || null,
      description: form.description.trim() || null,
      price,
      salePrice,
      stock: Math.max(0, Number.parseInt(form.stock, 10) || 0),
      imageUrl: form.imageUrl.trim() || null,
      status: form.status,
      ...(product ? {} : { sku: form.sku.trim() || undefined }),
    };
    setSaving(true);
    try {
      if (product) {
        await api(`/store/admin/products/${product.id}`, { method: "PATCH", body });
        success("Đã cập nhật sản phẩm", product.name);
      } else {
        await api("/store/admin/products", { method: "POST", body });
        success("Đã thêm sản phẩm", body.name);
      }
      onSaved();
    } catch (err) {
      toastError("Không thể lưu sản phẩm", err instanceof Error ? err.message : "Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <LightModal
      open={open}
      onClose={onClose}
      title={product ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
      description={product ? `SKU ${product.sku}` : "Sản phẩm sẽ xuất hiện trong cửa hàng khi trạng thái là Đang bán."}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
            Hủy
          </button>
          <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-60">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} {product ? "Lưu thay đổi" : "Tạo sản phẩm"}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Tên sản phẩm *</label>
          <input value={form.name} onChange={(event) => set("name", event.target.value)} className={inputClass} placeholder="Ví dụ: Máy đo huyết áp Omron HEM-7121" />
        </div>
        <div>
          <label className={labelClass}>SKU</label>
          <input value={form.sku} onChange={(event) => set("sku", event.target.value)} disabled={Boolean(product)} className={cn(inputClass, product && "bg-slate-50 text-slate-400")} placeholder="Tự động nếu để trống" />
        </div>
        <div>
          <label className={labelClass}>Danh mục</label>
          <input value={form.category} onChange={(event) => set("category", event.target.value)} className={inputClass} placeholder="Thiết bị y tế" />
        </div>
        <div>
          <label className={labelClass}>Thương hiệu</label>
          <input value={form.brand} onChange={(event) => set("brand", event.target.value)} className={inputClass} placeholder="Omron" />
        </div>
        <div>
          <label className={labelClass}>Trạng thái</label>
          <select value={form.status} onChange={(event) => set("status", event.target.value)} className={inputClass}>
            <option value="active">Đang bán</option>
            <option value="draft">Nháp</option>
            <option value="archived">Lưu trữ</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Giá bán (₫) *</label>
          <input value={form.price} onChange={(event) => set("price", event.target.value)} inputMode="numeric" className={inputClass} placeholder="1200000" />
        </div>
        <div>
          <label className={labelClass}>Giá khuyến mãi (₫)</label>
          <input value={form.salePrice} onChange={(event) => set("salePrice", event.target.value)} inputMode="numeric" className={inputClass} placeholder="Để trống nếu không giảm giá" />
        </div>
        <div>
          <label className={labelClass}>Tồn kho</label>
          <input value={form.stock} onChange={(event) => set("stock", event.target.value)} inputMode="numeric" className={inputClass} placeholder="0" />
        </div>
        <div>
          <label className={labelClass}>Ảnh sản phẩm (URL)</label>
          <input value={form.imageUrl} onChange={(event) => set("imageUrl", event.target.value)} className={inputClass} placeholder="https://..." />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Mô tả</label>
          <textarea value={form.description} onChange={(event) => set("description", event.target.value)} rows={3} className={cn(inputClass, "min-h-24 resize-y")} placeholder="Mô tả ngắn về sản phẩm..." />
        </div>
      </div>
    </LightModal>
  );
}

export default function StoreAdminPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [productSearch, setProductSearch] = useState("");
  const [productStatus, setProductStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AdminProduct | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);

  const debouncedSearch = useDebounced(search, 350);
  const debouncedProductSearch = useDebounced(productSearch, 350);

  const orderParams = new URLSearchParams();
  if (debouncedSearch.trim()) orderParams.set("q", debouncedSearch.trim());
  if (statusFilter !== "all") orderParams.set("status", statusFilter);
  orderParams.set("limit", "100");

  const productParams = new URLSearchParams();
  if (debouncedProductSearch.trim()) productParams.set("q", debouncedProductSearch.trim());
  if (productStatus !== "all") productParams.set("status", productStatus);
  productParams.set("limit", "100");

  const stats = useApi<{ data: Stats }>("/store/admin/stats", { refreshInterval: 20000, enabled: ready });
  const orders = useApi<{ data: Order[]; pagination: { total: number } }>(`/store/admin/orders?${orderParams.toString()}`, { refreshInterval: 20000, enabled: ready });
  const products = useApi<ProductsResponse>(`/store/admin/products?${productParams.toString()}`, { enabled: ready });

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
    setIsAdmin(user?.role === "admin");
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

  const ordersRows = orders.data?.data || [];
  const productRows = products.data?.data || [];
  const productSummary = products.data?.summary;

  const filteredOrders = useMemo(() => {
    return ordersRows.filter((order) => {
      if (riskFilter === "danger" && order.risk_score < 70) return false;
      if (riskFilter === "suspicious" && (order.risk_score < 50 || order.risk_score >= 70)) return false;
      if (riskFilter === "safe" && order.risk_score >= 50) return false;
      return true;
    });
  }, [ordersRows, riskFilter]);

  const revenueSeries = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return {
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString("vi-VN", { weekday: "short" }),
        total: 0,
      };
    });
    for (const order of ordersRows) {
      if (order.payment_status !== "paid") continue;
      const day = days.find((item) => item.key === order.created_at.slice(0, 10));
      if (day) day.total += Number(order.total) || 0;
    }
    const max = Math.max(...days.map((day) => day.total), 1);
    return { days, max };
  }, [ordersRows]);

  const dangerOrders = ordersRows.filter((order) => order.risk_score >= 70).length;

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
      await api("/firewall-rules", {
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

  const archiveProduct = async () => {
    if (!archiveTarget) return;
    setArchiveBusy(true);
    try {
      await api(`/store/admin/products/${archiveTarget.id}`, { method: "DELETE" });
      success("Đã lưu trữ sản phẩm", archiveTarget.name);
      setArchiveTarget(null);
      products.refetch();
      stats.refetch();
    } catch (err) {
      toastError("Không thể lưu trữ", err instanceof Error ? err.message : "Vui lòng thử lại.");
    } finally {
      setArchiveBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    );
  }

  const data = stats.data?.data;
  const cards = [
    { label: "Doanh thu đã thanh toán", value: formatVnd(data?.revenue), icon: Wallet, tone: "from-blue-500 to-blue-600", hint: `${data?.paidOrders ?? 0} đơn đã trả tiền` },
    { label: "Tổng đơn hàng", value: data?.orders ?? "—", icon: ShoppingBag, tone: "from-cyan-500 to-teal-500", hint: `${data?.openOrders ?? 0} đơn cần xử lý` },
    { label: "Đơn rủi ro cao", value: dangerOrders, icon: ShieldAlert, tone: "from-red-500 to-rose-600", hint: "Risk score ≥ 70" },
    { label: "Khách hàng", value: data?.customers ?? "—", icon: Users, tone: "from-violet-500 to-purple-600", hint: "Tài khoản cửa hàng" },
    { label: "Sản phẩm đang bán", value: productSummary?.active ?? data?.products ?? "—", icon: Package, tone: "from-emerald-500 to-green-600", hint: `${productSummary?.units ?? 0} sản phẩm trong kho` },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600">
              <Activity className="h-3.5 w-3.5" /> Quản trị cửa hàng
            </div>
            <h1 className="mt-2 font-display text-2xl font-bold text-slate-900 sm:text-3xl">Điều hành Medicare Store</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-500">Theo dõi doanh thu, đơn hàng, rủi ro gian lận và danh mục sản phẩm trong một giao diện thống nhất.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { stats.refetch(); orders.refetch(); products.refetch(); }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", (stats.refreshing || orders.refreshing) && "animate-spin")} /> Làm mới
            </button>
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-105">
              Về SOC <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {cards.map((card) => (
            <div key={card.label} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{card.label}</p>
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm", card.tone)}>
                  <card.icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 font-display text-xl font-bold text-slate-900">{card.value}</p>
              <p className="mt-1 text-[10px] text-slate-400">{card.hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-slate-200">
          {[
            { key: "overview" as const, label: "Tổng quan", icon: TrendingUp },
            { key: "orders" as const, label: "Đơn hàng", icon: ShoppingBag },
            { key: "products" as const, label: "Sản phẩm", icon: Boxes },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                "inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition",
                tab === item.key ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800",
              )}
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </button>
          ))}
          <span className="ml-auto hidden items-center gap-1.5 pb-2 text-[10px] text-slate-400 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Đồng bộ mỗi 20 giây
          </span>
        </div>

        {tab === "overview" && (
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-sm font-semibold text-slate-900">Doanh thu 7 ngày gần nhất</h2>
                    <p className="mt-1 text-[11px] text-slate-500">Chỉ tính các đơn đã thanh toán trong 100 đơn gần nhất.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Tổng 7 ngày</p>
                    <p className="font-display text-lg font-bold text-slate-900">{formatVnd(revenueSeries.days.reduce((sum, day) => sum + day.total, 0))}</p>
                  </div>
                </div>
                <div className="mt-6 flex h-44 items-end gap-2 sm:gap-3">
                  {revenueSeries.days.map((day) => (
                    <div key={day.key} className="group flex flex-1 flex-col items-center gap-2">
                      <div className="relative flex w-full flex-1 items-end">
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-cyan-400 transition-all duration-300 group-hover:from-blue-700 group-hover:to-cyan-300"
                          style={{ height: `${Math.max(4, (day.total / revenueSeries.max) * 100)}%` }}
                        />
                        <span className="absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[9px] font-medium text-white shadow-lg group-hover:block">
                          {formatVnd(day.total)}
                        </span>
                      </div>
                      <span className="text-[9px] font-medium uppercase text-slate-400">{day.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="font-display text-sm font-semibold text-slate-900">Đơn hàng gần đây</h2>
                    <p className="mt-0.5 text-[11px] text-slate-500">Nhấn vào đơn để xem chi tiết và xử lý.</p>
                  </div>
                  <button onClick={() => setTab("orders")} className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700">
                    Xem tất cả <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {ordersRows.slice(0, 5).map((order) => (
                    <button key={order.id} onClick={() => setSelectedId(order.id)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <ShoppingBag className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[11px] font-semibold text-slate-800">{order.order_number}</p>
                        <p className="truncate text-[11px] text-slate-500">{order.shipping_name} · {order.shipping_phone}</p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-xs font-semibold text-slate-900">{formatVnd(order.total)}</p>
                        <p className="text-[10px] text-slate-400">{formatStoreDate(order.created_at)}</p>
                      </div>
                      <RiskBadge score={order.risk_score} />
                    </button>
                  ))}
                  {!ordersRows.length && <p className="px-5 py-10 text-center text-xs text-slate-400">Chưa có đơn hàng nào.</p>}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900"><Star className="h-4 w-4 text-amber-500" /> Bán chạy</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500">Top 5</span>
                </div>
                <div className="mt-4 space-y-3">
                  {(data?.topProducts || []).slice(0, 5).map((product, index) => {
                    const max = Math.max(...(data?.topProducts || []).map((item) => item.revenue), 1);
                    return (
                      <div key={product.sku} className="flex items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">{index + 1}</span>
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="h-10 w-10 shrink-0 rounded-xl border border-slate-100 object-cover" />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><Box className="h-4 w-4" /></span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="min-w-0 truncate font-medium text-slate-700">{product.name}</span>
                            <span className="shrink-0 font-semibold text-slate-900">{formatVnd(product.revenue)}</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${Math.max(6, (product.revenue / max) * 100)}%` }} />
                          </div>
                          <p className="mt-1 text-[9px] text-slate-400">{product.quantity} đã bán</p>
                        </div>
                      </div>
                    );
                  })}
                  {!data?.topProducts?.length && <p className="text-xs text-slate-400">Chưa có dữ liệu bán hàng.</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900"><ShieldAlert className="h-4 w-4 text-red-500" /> Sự kiện gian lận</h2>
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-semibold text-red-600">{(data?.fraudEvents || []).length} sự kiện</span>
                </div>
                <div className="relative mt-4 space-y-3 pl-5">
                  <span className="absolute left-1.5 top-1 bottom-1 w-px bg-slate-200" />
                  {(data?.fraudEvents || []).slice(0, 6).map((event) => (
                    <div key={event.id} className="relative">
                      <span className={cn("absolute -left-[15px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white", event.severity === "critical" ? "bg-red-500" : event.severity === "high" ? "bg-amber-500" : "bg-blue-500")} />
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition hover:border-red-200 hover:bg-red-50/40">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[11px] font-semibold text-slate-700">{event.event_type}</p>
                          <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase", severityMeta(event.severity))}>{event.risk_score}</span>
                        </div>
                        <p className="mt-1 truncate text-[10px] text-slate-400">{event.ip_address} · {event.country} · {formatStoreDate(event.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  {!data?.fraudEvents?.length && <p className="text-xs text-slate-400">Chưa có sự kiện gian lận.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="mt-5">
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1.5fr_0.8fr_0.8fr_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã đơn, tên, email, SĐT..." className={cn(inputClass, "pl-10")} />
              </label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}>
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ xác nhận</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="processing">Đang giao</option>
                <option value="on_hold">Đang giữ kiểm tra</option>
                <option value="shipped">Đã gửi</option>
                <option value="delivered">Đã giao</option>
                <option value="cancelled">Đã hủy</option>
              </select>
              <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} className={inputClass}>
                <option value="all">Tất cả mức rủi ro</option>
                <option value="danger">Nguy hiểm (≥70)</option>
                <option value="suspicious">Cảnh báo (50-69)</option>
                <option value="safe">An toàn (&lt;50)</option>
              </select>
              <button onClick={() => orders.refetch()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-700">
                <RefreshCw className={cn("h-3.5 w-3.5", orders.refreshing && "animate-spin")} /> Tải lại
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-display text-sm font-semibold text-slate-900">Danh sách đơn hàng</h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">{filteredOrders.length} đơn hiển thị · tổng {orders.data?.pagination?.total ?? 0}</p>
                </div>
                {orders.error && <span className="rounded-lg bg-red-50 px-2.5 py-1 text-[10px] font-medium text-red-600">{orders.error}</span>}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[980px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-left">
                      {["Mã đơn", "Khách hàng", "Tổng tiền", "Rủi ro", "Trạng thái", "Thanh toán", "Ngày tạo", "Thao tác"].map((header) => (
                        <th key={header} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="cursor-pointer transition hover:bg-slate-50" onClick={() => setSelectedId(order.id)}>
                        <td className="px-4 py-3.5">
                          <p className="font-mono text-[11px] font-semibold text-slate-800">{order.order_number}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">{order.ip_address} · {order.ip_country}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-xs font-medium text-slate-800">{order.shipping_name}</p>
                          <p className="text-[10px] text-slate-400">{order.shipping_email}</p>
                        </td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-900">{formatVnd(order.total)}</td>
                        <td className="px-4 py-3.5"><RiskMeter score={order.risk_score} /></td>
                        <td className="px-4 py-3.5">
                          <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold", statusChip(order.status))}>{orderStatusLabel[order.status] || order.status}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn("text-[10px] font-medium", order.payment_status === "paid" ? "text-emerald-600" : order.payment_status === "failed" ? "text-red-600" : "text-amber-600")}>
                            {paymentLabel[order.payment_status] || order.payment_status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[10px] text-slate-400">{formatStoreDate(order.created_at)}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button onClick={(event) => { event.stopPropagation(); setSelectedId(order.id); }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-700">Chi tiết</button>
                            {isAdmin && order.risk_score >= 50 && (
                              <button onClick={(event) => { event.stopPropagation(); blockIp(order.ip_address); }} className="rounded-lg border border-red-200 p-1.5 text-red-500 transition hover:bg-red-50" title="Chặn IP">
                                <ShieldAlert className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredOrders.length && (
                      <tr><td colSpan={8} className="px-4 py-12 text-center text-xs text-slate-400">Không có đơn hàng phù hợp với bộ lọc.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 p-4 md:hidden">
                {filteredOrders.map((order) => (
                  <button key={order.id} onClick={() => setSelectedId(order.id)} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-[11px] font-semibold text-slate-800">{order.order_number}</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{order.shipping_name}</p>
                      </div>
                      <RiskBadge score={order.risk_score} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-900">{formatVnd(order.total)}</span>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-semibold", statusChip(order.status))}>{orderStatusLabel[order.status] || order.status}</span>
                    </div>
                    <p className="mt-2 text-[10px] text-slate-400">{order.shipping_phone} · {formatStoreDate(order.created_at)}</p>
                  </button>
                ))}
                {!filteredOrders.length && <p className="py-10 text-center text-xs text-slate-400">Không có đơn hàng phù hợp.</p>}
              </div>
            </div>
          </div>
        )}

        {tab === "products" && (
          <div className="mt-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: "Đang bán", value: productSummary?.active ?? 0, tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                { label: "Nháp", value: productSummary?.draft ?? 0, tone: "bg-slate-50 text-slate-600 border-slate-200" },
                { label: "Lưu trữ", value: productSummary?.archived ?? 0, tone: "bg-zinc-50 text-zinc-600 border-zinc-200" },
                { label: "Hết hàng", value: productSummary?.out_of_stock ?? 0, tone: "bg-red-50 text-red-700 border-red-200" },
                { label: "Tổng tồn kho", value: productSummary?.units ?? 0, tone: "bg-blue-50 text-blue-700 border-blue-200" },
              ].map((chip) => (
                <div key={chip.label} className={cn("rounded-2xl border px-4 py-3", chip.tone)}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{chip.label}</p>
                  <p className="mt-1 font-display text-lg font-bold">{chip.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1.5fr_0.8fr_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Tìm tên, SKU, danh mục, thương hiệu..." className={cn(inputClass, "pl-10")} />
              </label>
              <select value={productStatus} onChange={(event) => setProductStatus(event.target.value)} className={inputClass}>
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang bán</option>
                <option value="draft">Nháp</option>
                <option value="archived">Lưu trữ</option>
              </select>
              {isAdmin && (
                <button onClick={() => { setEditingProduct(null); setEditorOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700">
                  <Plus className="h-4 w-4" /> Thêm sản phẩm
                </button>
              )}
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-display text-sm font-semibold text-slate-900">Danh mục sản phẩm</h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">{productRows.length} sản phẩm hiển thị · tổng {products.data?.pagination?.total ?? 0}</p>
                </div>
                {products.error && <span className="rounded-lg bg-red-50 px-2.5 py-1 text-[10px] font-medium text-red-600">{products.error}</span>}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-left">
                      {["Sản phẩm", "Danh mục", "Giá bán", "Tồn kho", "Trạng thái", "Cập nhật", "Thao tác"].map((header) => (
                        <th key={header} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productRows.map((product) => (
                      <tr key={product.id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="h-11 w-11 rounded-xl border border-slate-100 object-cover" />
                            ) : (
                              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><Box className="h-5 w-5" /></span>
                            )}
                            <div className="min-w-0">
                              <p className="max-w-[260px] truncate text-xs font-semibold text-slate-800">{product.name}</p>
                              <p className="font-mono text-[10px] text-slate-400">{product.sku}{product.brand ? ` · ${product.brand}` : ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">{product.category}</td>
                        <td className="px-4 py-3.5">
                          <p className="text-xs font-semibold text-slate-900">{formatVnd(product.effective_price)}</p>
                          {product.sale_price !== null && <p className="text-[10px] text-slate-400 line-through">{formatVnd(product.price)}</p>}
                        </td>
                        <td className="px-4 py-3.5">
                          {product.stock === 0 ? (
                            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">Hết hàng</span>
                          ) : product.stock < 10 ? (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Sắp hết · {product.stock}</span>
                          ) : (
                            <span className="text-xs text-slate-600">{product.stock}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn(
                            "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold",
                            product.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : product.status === "draft" ? "border-slate-200 bg-slate-50 text-slate-600" : "border-zinc-200 bg-zinc-50 text-zinc-600",
                          )}>
                            {productStatusLabel[product.status] || product.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[10px] text-slate-400">{formatStoreDate(product.updated_at)}</td>
                        <td className="px-4 py-3.5">
                          {isAdmin ? (
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => { setEditingProduct(product); setEditorOpen(true); }} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-blue-300 hover:text-blue-700" title="Chỉnh sửa">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => setArchiveTarget(product)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-red-300 hover:text-red-600" title="Lưu trữ">
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">Chỉ xem</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!productRows.length && (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-xs text-slate-400">Không có sản phẩm phù hợp.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 p-4 md:hidden">
                {productRows.map((product) => (
                  <div key={product.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="h-14 w-14 rounded-xl border border-slate-100 object-cover" />
                      ) : (
                        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><Box className="h-6 w-6" /></span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                        <p className="font-mono text-[10px] text-slate-400">{product.sku}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{formatVnd(product.effective_price)}</span>
                          <span className="text-[10px] text-slate-400">Kho: {product.stock}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold",
                        product.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : product.status === "draft" ? "border-slate-200 bg-slate-50 text-slate-600" : "border-zinc-200 bg-zinc-50 text-zinc-600",
                      )}>{productStatusLabel[product.status] || product.status}</span>
                      {isAdmin && (
                        <div className="flex gap-1.5">
                          <button onClick={() => { setEditingProduct(product); setEditorOpen(true); }} className="rounded-lg border border-slate-200 p-1.5 text-slate-500"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setArchiveTarget(product)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500"><Archive className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!productRows.length && <p className="py-10 text-center text-xs text-slate-400">Không có sản phẩm phù hợp.</p>}
              </div>
            </div>
          </div>
        )}

        {(stats.loading || orders.loading) && (
          <p className="mt-4 flex items-center gap-2 text-[10px] text-slate-400"><Loader2 className="h-3 w-3 animate-spin" /> Đang đồng bộ dữ liệu...</p>
        )}
      </div>

      <LightModal
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        title={detail ? `Đơn hàng ${detail.order_number}` : "Chi tiết đơn hàng"}
        description={detail ? `${formatStoreDate(detail.created_at)} · ${paymentLabel[detail.payment_status] || detail.payment_status}` : undefined}
        size="xl"
        footer={
          detail ? (
            <>
              <button onClick={() => setSelectedId(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">Đóng</button>
              {isAdmin && (
                <>
                  <button disabled={busy === detail.id} onClick={() => updateStatus(detail as unknown as Order, "confirmed")} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60">
                    {busy === detail.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Phê duyệt
                  </button>
                  <button disabled={busy === detail.id} onClick={() => updateStatus(detail as unknown as Order, "cancelled")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60">
                    <XCircle className="h-3.5 w-3.5" /> Hủy đơn
                  </button>
                  <button disabled={busy === detail.ip_address} onClick={() => blockIp(detail.ip_address)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60">
                    <ShieldAlert className="h-3.5 w-3.5" /> Chặn IP
                  </button>
                </>
              )}
            </>
          ) : undefined
        }
      >
        {detailLoading || !detail ? (
          <div className="flex items-center gap-3 py-10 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải chi tiết đơn hàng...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Users className="h-3 w-3" /> Khách hàng</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{detail.shipping_name}</p>
                <p className="text-xs text-slate-500">{detail.shipping_email} · {detail.shipping_phone}</p>
                <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-600"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /> {detail.shipping_address}, {detail.shipping_city}, {detail.shipping_country} ({detail.shipping_country_code})</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Globe2 className="h-3 w-3" /> IP & rủi ro</p>
                <p className="mt-2 font-mono text-sm font-semibold text-slate-900">{detail.ip_address}</p>
                <p className="text-xs text-slate-500">{detail.ip_country} ({detail.ip_country_code}) · nguồn {detail.ip_source}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <RiskBadge score={detail.risk_score} />
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", statusChip(detail.status))}>{orderStatusLabel[detail.status] || detail.status}</span>
                </div>
                {detail.fraud_flags?.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {detail.fraud_flags.map((flag) => <span key={flag} className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-medium text-amber-700">{flagLabel[flag] || flag}</span>)}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Package className="h-3 w-3" /> Sản phẩm đã mua</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-left">
                      {["Sản phẩm", "SKU", "SL", "Đơn giá", "Thành tiền"].map((header) => (
                        <th key={header} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detail.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2.5 text-xs text-slate-700">{item.name}</td>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-slate-400">{item.sku}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-600">{item.quantity}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-600">{formatVnd(item.unit_price)}</td>
                        <td className="px-3 py-2.5 text-xs font-semibold text-slate-900">{formatVnd(item.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">Tổng thanh toán</span>
                <span className="font-display text-base font-bold text-slate-900">{formatVnd(detail.total)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><ShieldAlert className="h-3 w-3" /> Lịch sử sự kiện SOC</p>
              <div className="mt-3 space-y-2">
                {detail.securityEvents.length ? detail.securityEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-slate-700">{event.event_type} · {event.severity}</p>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-bold", severityMeta(event.severity))}>{event.risk_score}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">{event.ip_address} · {event.country} · {formatStoreDate(event.created_at)}</p>
                  </div>
                )) : <p className="text-xs text-slate-400">Chưa có security event cho đơn này.</p>}
              </div>
            </div>
          </div>
        )}
      </LightModal>

      <ProductEditor
        open={editorOpen}
        product={editingProduct}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          setEditorOpen(false);
          products.refetch();
          stats.refetch();
        }}
      />

      <LightModal
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        title="Lưu trữ sản phẩm"
        size="sm"
        footer={
          <>
            <button onClick={() => setArchiveTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">Hủy</button>
            <button onClick={archiveProduct} disabled={archiveBusy} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60">
              {archiveBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Lưu trữ
            </button>
          </>
        }
      >
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500"><Archive className="h-5 w-5" /></span>
          <div>
            <p className="text-sm font-medium text-slate-800">Lưu trữ “{archiveTarget?.name}”?</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Sản phẩm sẽ không còn hiển thị trong cửa hàng. Bạn vẫn có thể khôi phục bằng cách đổi trạng thái sang Đang bán.</p>
          </div>
        </div>
      </LightModal>
    </div>
  );
}
