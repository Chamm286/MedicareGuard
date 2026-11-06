"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, HeartPulse, PackageCheck, Search, ShieldCheck, Sparkles, Stethoscope, Truck } from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { useToast } from "@/components/toast";
import { useDebounced } from "@/lib/api";
import { cn } from "@/lib/utils";
import { storeFetch, useStoreCart, type StoreProduct } from "@/lib/store";

type Category = { category: string; total: number; from_price: number };

export default function StoreHomePage() {
  const { success, error: toastError } = useToast();
  const { addItem } = useStoreCart();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("rating");
  const [search, setSearch] = useState("");
  const query = useDebounced(search, 350);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (category) params.set("category", category);
      if (sort) params.set("sort", sort);
      params.set("limit", "24");
      const [productResponse, categoryResponse] = await Promise.all([
        storeFetch<{ data: StoreProduct[] }>(`/products?${params.toString()}`),
        storeFetch<{ data: Category[] }>("/categories"),
      ]);
      setProducts(productResponse.data);
      setCategories(categoryResponse.data);
    } catch (err) {
      toastError("Không thể tải cửa hàng", err instanceof Error ? err.message : "Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [query, category, sort, toastError]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (product: StoreProduct) => {
    try {
      await addItem(product.id, 1);
      success("Đã thêm vào giỏ", `${product.name} đã được thêm vào giỏ hàng.`);
    } catch (err) {
      toastError("Không thể thêm vào giỏ", err instanceof Error ? err.message : "Vui lòng thử lại.");
    }
  };

  const totalProducts = useMemo(() => categories.reduce((sum, item) => sum + item.total, 0), [categories]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/60 via-white to-white">
      <section className="relative overflow-hidden border-b border-slate-100">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/60 via-transparent to-transparent" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
          <div className="animate-in">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
              <Sparkles className="h-3 w-3" /> Medicare Store · Bảo vệ bởi SOC
            </span>
            <h1 className="mt-5 max-w-2xl font-display text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Thiết bị y tế <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">chính hãng</span> cho mọi gia đình.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-600">
              Từ máy đo huyết áp, máy xông mũi đến vật tư chăm sóc vết thương — mỗi đơn hàng đều được giám sát gian lận theo thời gian thực bởi MedicareGuard SOC và tự động hóa n8n.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#products" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-700 hover:to-cyan-600">Mua sắm ngay <ArrowRight className="h-4 w-4" /></a>
              <Link href="/store/orders" className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700">Tra cứu đơn hàng</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-medium text-slate-500">
              <span className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-emerald-500" /> Hàng chính hãng</span>
              <span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-blue-500" /> Miễn phí ship từ 500.000 ₫</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-cyan-500" /> Chống gian lận thời gian thực</span>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-blue-200/40 to-cyan-200/30 blur-3xl" />
            <div className="relative grid grid-cols-2 gap-4">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
                <img src="/products/may-do-huyet-ap.jpg" alt="Máy đo huyết áp Omron HEM-7000" className="h-52 w-full object-cover" />
                <div className="p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Bán chạy</p><p className="mt-1 text-sm font-semibold text-slate-900">Máy đo huyết áp Omron HEM-7000</p><p className="mt-1 text-xs text-slate-500">1.590.000 ₫</p></div>
              </div>
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><HeartPulse className="h-5 w-5" /></span><div><p className="text-xs font-semibold text-slate-900">Theo dõi sức khỏe</p><p className="text-[10px] text-slate-500">Thiết bị đo tại nhà</p></div></div>
                <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-xs font-semibold text-slate-900">SOC giám sát</p><p className="text-[10px] text-slate-500">Phát hiện gian lận IP</p></div></div>
                <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><PackageCheck className="h-5 w-5" /></span><div><p className="text-xs font-semibold text-slate-900">{totalProducts || 12} sản phẩm</p><p className="text-[10px] text-slate-500">Sẵn hàng tại kho</p></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" id="products">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Danh mục sản phẩm</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-slate-900">Chăm sóc sức khỏe chủ động</h2>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm thiết bị, thương hiệu..." className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:w-64" />
            </div>
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:w-44">
              <option value="rating">Đánh giá cao</option>
              <option value="newest">Mới nhất</option>
              <option value="price_asc">Giá thấp đến cao</option>
              <option value="price_desc">Giá cao đến thấp</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button onClick={() => setCategory("")} className={cn("shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition", !category ? "border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-500/25" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700")}>Tất cả</button>
          {categories.map((item) => (
            <button key={item.category} onClick={() => setCategory(item.category)} className={cn("shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition", category === item.category ? "border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-500/25" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700")}>
              {item.category} <span className="ml-1 text-[10px] opacity-70">{item.total}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-80 animate-pulse rounded-3xl bg-slate-100" />)}
          </div>
        ) : products.length ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => <ProductCard key={product.id} product={product} onAdd={add} />)}
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white py-20 text-center shadow-sm">
            <Stethoscope className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">Không tìm thấy sản phẩm phù hợp.</p>
            <button onClick={() => { setSearch(""); setCategory(""); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700">Xóa bộ lọc</button>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-6 shadow-sm sm:p-8">
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-600">Tích hợp SOC + n8n</p>
              <h3 className="mt-2 font-display text-xl font-bold text-slate-900">Mỗi đơn hàng là một sự kiện an ninh</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Hệ thống ghi nhận IP thực, quốc gia qua Cloudflare, chấm điểm rủi ro và tự động mở cảnh báo SOC. Đơn có dấu hiệu bất thường sẽ được tạm giữ để kiểm tra trước khi xử lý.</p>
              <p className="mt-2 text-[11px] text-slate-500">Gợi ý demo: chọn thanh toán thẻ với đơn từ 3.000.000 ₫ và giao tới quốc gia khác IP để kích hoạt cảnh báo gian lận.</p>
            </div>
            <Link href="/store/cart" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 text-xs font-semibold text-white shadow-lg shadow-blue-500/25">Thử quy trình thanh toán <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
