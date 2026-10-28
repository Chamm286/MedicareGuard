"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Loader2, Minus, Plus, ShieldCheck, ShoppingCart, Star, Truck } from "lucide-react";
import { RatingStars } from "@/components/store/ProductCard";
import { useToast } from "@/components/toast";
import { formatStoreDate, formatVnd, storeFetch, useStoreCart, type StoreProduct } from "@/lib/store";

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const { addItem } = useStoreCart();
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!params?.slug) return;
    setLoading(true);
    storeFetch<{ data: StoreProduct }>(`/products/${params.slug}`)
      .then((response) => setProduct(response.data))
      .catch((err) => toastError("Không tìm thấy sản phẩm", err instanceof Error ? err.message : "Vui lòng thử lại."))
      .finally(() => setLoading(false));
  }, [params?.slug, toastError]);

  const add = async (goToCart = false) => {
    if (!product) return;
    setAdding(true);
    try {
      await addItem(product.id, quantity);
      success("Đã thêm vào giỏ", `${quantity} × ${product.name}`);
      if (goToCart) router.push("/store/cart");
    } catch (err) {
      toastError("Không thể thêm vào giỏ", err instanceof Error ? err.message : "Vui lòng thử lại.");
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><div className="skeleton h-96 rounded-2xl" /></div>;
  }

  if (!product) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-24 text-center">
        <p className="text-sm text-slate-400">Sản phẩm không tồn tại hoặc đã ngừng bán.</p>
        <Link href="/store" className="btn btn-primary h-10 px-5 text-xs"><ArrowLeft className="h-3.5 w-3.5" /> Về cửa hàng</Link>
      </div>
    );
  }

  const discount = product.sale_price ? Math.round((1 - product.sale_price / product.price) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="flex items-center gap-2 text-[11px] text-slate-600">
        <Link href="/store" className="hover:text-brand-300">Cửa hàng</Link><span>/</span>
        <span className="text-slate-500">{product.category}</span><span>/</span>
        <span className="truncate text-slate-400">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="panel overflow-hidden p-0">
            <div className="relative aspect-[4/3] bg-surface-900">
              {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : null}
              {discount > 0 && <span className="absolute left-4 top-4 rounded-full bg-critical px-3 py-1 text-[11px] font-bold text-white">Giảm {discount}%</span>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[BadgeCheck, ShieldCheck, Truck].map((Icon, index) => (
              <div key={index} className="panel flex flex-col items-center gap-2 p-3 text-center">
                <Icon className="h-4 w-4 text-brand-300" />
                <p className="text-[9px] text-slate-500">{["Chính hãng", "Bảo mật SOC", "Giao nhanh"][index]}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300">{product.brand || "Medicare"} · {product.sku}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-white">{product.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <RatingStars rating={product.rating} />
            <span className="text-xs text-slate-400">{product.rating.toFixed(1)} / 5</span>
            <span className="text-xs text-slate-600">({product.reviews?.length || 0} đánh giá)</span>
            <span className="chip border-low/25 bg-low/10 text-low">{product.stock > 0 ? `Còn ${product.stock} sản phẩm` : "Hết hàng"}</span>
          </div>

          <div className="mt-5 flex items-end gap-3">
            <p className="font-display text-3xl font-semibold text-white">{formatVnd(product.effective_price)}</p>
            {product.sale_price && <p className="pb-1 text-sm text-slate-600 line-through">{formatVnd(product.price)}</p>}
          </div>

          <p className="mt-5 text-sm leading-relaxed text-slate-400">{product.description || "Sản phẩm thiết bị y tế được Medicare Store phân phối chính hãng."}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {(product.tags || []).map((tag) => <span key={tag} className="chip border-white/10 bg-white/[0.03] text-slate-400">{tag}</span>)}
          </div>

          <div className="mt-8 panel p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Số lượng</p>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/[0.05]"><Minus className="h-3.5 w-3.5" /></button>
                  <span className="w-10 text-center text-sm font-medium text-white">{quantity}</span>
                  <button onClick={() => setQuantity((value) => Math.min(99, product.stock, value + 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/[0.05]"><Plus className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Tạm tính</p>
                <p className="mt-1 font-display text-lg font-semibold text-white">{formatVnd(product.effective_price * quantity)}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button onClick={() => add(false)} disabled={adding || product.stock <= 0} className="btn btn-secondary h-11 text-sm">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />} Thêm vào giỏ
              </button>
              <button onClick={() => add(true)} disabled={adding || product.stock <= 0} className="btn btn-primary h-11 text-sm">Mua ngay</button>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-600"><ShieldCheck className="h-3 w-3 text-cyan-300" /> Giao dịch được chấm điểm rủi ro và bảo vệ bởi MedicareGuard SOC.</p>
          </div>
        </div>
      </div>

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-white">Đánh giá từ khách hàng</h2>
          <div className="flex items-center gap-1 text-xs text-slate-500"><Star className="h-3.5 w-3.5 fill-medium text-medium" /> {product.rating.toFixed(1)}</div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {product.reviews?.length ? product.reviews.map((review) => (
            <div key={review.id} className="panel p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-200">{review.customer_name || "Khách hàng"}</p>
                <RatingStars rating={review.rating} />
              </div>
              {review.title && <p className="mt-2 text-sm font-medium text-white">{review.title}</p>}
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{review.body}</p>
              <p className="mt-2 text-[10px] text-slate-600">{formatStoreDate(review.created_at)}</p>
            </div>
          )) : <div className="panel p-6 text-xs text-slate-500">Chưa có đánh giá cho sản phẩm này.</div>}
        </div>
      </section>
    </div>
  );
}
