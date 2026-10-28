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
    <div>
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-hero-radial opacity-80" />
        <div className="absolute inset-0 grid-surface opacity-30" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
          <div className="animate-in">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-brand-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-200">
              <Sparkles className="h-3 w-3" /> Medicare Store · Bảo vệ bởi SOC
            </span>
            <h1 className="mt-5 max-w-2xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Thiết bị y tế <span className="text-gradient-accent">chính hãng</span> cho mọi gia đình.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-400">
              Từ máy đo huyết áp, máy xông mũi đến vật tư chăm sóc vết thương — mỗi đơn hàng đều được giám sát gian lận theo thời gian thực bởi MedicareGuard SOC và tự động hóa n8n.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#products" className="btn btn-primary h-11 px-5 text-sm">Mua sắm ngay <ArrowRight className="h-4 w-4" /></a>
              <Link href="/store/orders" className="btn btn-secondary h-11 px-5 text-sm">Tra cứu đơn hàng</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-low" /> Hàng chính hãng</span>
              <span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-brand-300" /> Miễn phí ship từ 500.000 ₫</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-cyan-300" /> Chống gian lận thời gian thực</span>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-brand-500/20 to-cyan-500/10 blur-3xl" />
            <div className="relative grid grid-cols-2 gap-4">
              <div className="panel overflow-hidden p-0">
                <img src="/products/may-do-huyet-ap.jpg" alt="Máy đo huyết áp Omron HEM-7000" className="h-52 w-full object-cover" />
                <div className="p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-brand-300">Bán chạy</p><p className="mt-1 text-sm font-semibold text-white">Máy đo huyết áp Omron HEM-7000</p><p className="mt-1 text-xs text-slate-400">1.590.000 ₫</p></div>
              </div>
              <div className="mt-8 space-y-4">
                <div className="panel flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-low/10 text-low"><HeartPulse className="h-5 w-5" /></span><div><p className="text-xs font-medium text-white">Theo dõi sức khỏe</p><p className="text-[10px] text-slate-500">Thiết bị đo tại nhà</p></div></div>
                <div className="panel flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-xs font-medium text-white">SOC giám sát</p><p className="text-[10px] text-slate-500">Phát hiện gian lận IP</p></div></div>
                <div className="panel flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-300"><PackageCheck className="h-5 w-5" /></span><div><p className="text-xs font-medium text-white">{totalProducts || 12} sản phẩm</p><p className="text-[10px] text-slate-500">Sẵn hàng tại kho</p></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" id="products">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300">Danh mục sản phẩm</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-white">Chăm sóc sức khỏe chủ động</h2>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm thiết bị, thương hiệu..." className="input h-10 w-full pl-9 sm:w-64" />
            </div>
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="select h-10 sm:w-44">
              <option value="rating">Đánh giá cao</option>
              <option value="newest">Mới nhất</option>
              <option value="price_asc">Giá thấp đến cao</option>
              <option value="price_desc">Giá cao đến thấp</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button onClick={() => setCategory("")} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-xs transition", !category ? "border-brand-400/40 bg-brand-500/15 text-brand-200" : "border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200")}>Tất cả</button>
          {categories.map((item) => (
            <button key={item.category} onClick={() => setCategory(item.category)} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-xs transition", category === item.category ? "border-brand-400/40 bg-brand-500/15 text-brand-200" : "border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200")}>
              {item.category} <span className="text-[10px] text-slate-600">{item.total}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => <div key={index} className="skeleton h-80 rounded-2xl" />)}
          </div>
        ) : products.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => <ProductCard key={product.id} product={product} onAdd={add} />)}
          </div>
        ) : (
          <div className="panel mt-8 flex flex-col items-center justify-center gap-3 py-20 text-center">
            <Stethoscope className="h-10 w-10 text-slate-700" />
            <p className="text-sm text-slate-400">Không tìm thấy sản phẩm phù hợp.</p>
            <button onClick={() => { setSearch(""); setCategory(""); }} className="btn btn-secondary h-9 px-4 text-xs">Xóa bộ lọc</button>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="panel relative overflow-hidden p-6 sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 via-transparent to-cyan-500/10" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Tích hợp SOC + n8n</p>
              <h3 className="mt-2 font-display text-xl font-semibold text-white">Mỗi đơn hàng là một sự kiện an ninh</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">Hệ thống ghi nhận IP thực, quốc gia qua Cloudflare, chấm điểm rủi ro và tự động mở cảnh báo SOC. Đơn có dấu hiệu bất thường sẽ được tạm giữ để kiểm tra trước khi xử lý.</p>
              <p className="mt-2 text-[10px] text-slate-600">Gợi ý demo: chọn thanh toán thẻ với đơn từ 3.000.000 ₫ và giao tới quốc gia khác IP để kích hoạt cảnh báo gian lận.</p>
            </div>
            <Link href="/store/cart" className="btn btn-primary h-10 shrink-0 px-5 text-xs">Thử quy trình thanh toán <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
