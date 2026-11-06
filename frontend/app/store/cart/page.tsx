"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Loader2, Minus, Plus, ShieldCheck, ShoppingBag, Tag, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { formatVnd, useStoreCart } from "@/lib/store";

export default function CartPage() {
  const { cart, loading, error, updateItem, removeItem, applyCoupon } = useStoreCart();
  const { success, error: toastError } = useToast();
  const [coupon, setCoupon] = useState("");
  const [applying, setApplying] = useState(false);
  const [busyItem, setBusyItem] = useState<string | null>(null);

  const setQuantity = async (itemId: string, quantity: number) => {
    setBusyItem(itemId);
    try {
      await updateItem(itemId, quantity);
    } catch (err) {
      toastError("Không thể cập nhật giỏ hàng", err instanceof Error ? err.message : "Vui lòng thử lại.");
    } finally {
      setBusyItem(null);
    }
  };

  const remove = async (itemId: string) => {
    setBusyItem(itemId);
    try {
      await removeItem(itemId);
      success("Đã xóa sản phẩm", "Sản phẩm đã được xóa khỏi giỏ hàng.");
    } catch (err) {
      toastError("Không thể xóa sản phẩm", err instanceof Error ? err.message : "Vui lòng thử lại.");
    } finally {
      setBusyItem(null);
    }
  };

  const submitCoupon = async () => {
    if (!coupon.trim()) return;
    setApplying(true);
    try {
      const next = await applyCoupon(coupon.trim());
      success(next.discount > 0 ? "Đã áp dụng mã" : "Đã xóa mã", next.discount > 0 ? `Bạn tiết kiệm ${formatVnd(next.discount)}.` : "Mã giảm giá đã được gỡ.");
    } catch (err) {
      toastError("Mã giảm giá không hợp lệ", err instanceof Error ? err.message : "Vui lòng thử lại.");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><div className="h-96 animate-pulse rounded-3xl bg-slate-100" /></div>;
  }

  if (error) {
    return <div className="mx-auto max-w-3xl px-4 py-24 text-center text-sm text-slate-600">{error}</div>;
  }

  const items = cart?.items || [];
  const shipping = (cart?.subtotal || 0) >= 500000 ? 0 : 30000;
  const tax = Math.round((cart?.total || 0) * 0.08);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Giỏ hàng</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-slate-900">Sản phẩm đã chọn</h1>
        </div>
        <Link href="/store" className="text-sm font-medium text-slate-500 transition hover:text-blue-700">Tiếp tục mua sắm →</Link>
      </div>

      {!items.length ? (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white py-20 text-center shadow-sm">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600"><ShoppingBag className="h-8 w-8" /></span>
          <div><p className="text-base font-semibold text-slate-900">Giỏ hàng đang trống</p><p className="mt-1 text-sm text-slate-500">Thêm thiết bị y tế bạn cần để bắt đầu.</p></div>
          <Link href="/store" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25">Khám phá cửa hàng <ArrowRight className="h-4 w-4" /></Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                <Link href={`/store/product/${item.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                  {item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> : null}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600/80">{item.category}</p>
                      <Link href={`/store/product/${item.slug}`} className="mt-0.5 block truncate text-sm font-semibold text-slate-900 hover:text-blue-700">{item.name}</Link>
                      <p className="mt-1 text-[11px] text-slate-500">SKU {item.sku} · còn {item.stock}</p>
                    </div>
                    <button onClick={() => remove(item.id)} disabled={busyItem === item.id} className="text-slate-400 transition hover:text-rose-600" aria-label="Xóa sản phẩm"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setQuantity(item.id, item.quantity - 1)} disabled={busyItem === item.id || item.quantity <= 1} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-40"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-8 text-center text-sm font-bold text-slate-900">{busyItem === item.id ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : item.quantity}</span>
                      <button onClick={() => setQuantity(item.id, item.quantity + 1)} disabled={busyItem === item.id || item.quantity >= item.stock} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-40"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{formatVnd(item.line_total)}</p>
                      <p className="text-[11px] text-slate-500">{formatVnd(item.unit_price)} / sản phẩm</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-display text-base font-bold text-slate-900">Tóm tắt đơn hàng</h2>
              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between text-slate-600"><span>Tạm tính ({cart?.itemCount} sản phẩm)</span><span className="font-medium">{formatVnd(cart?.subtotal)}</span></div>
                <div className="flex justify-between text-slate-600"><span>Giảm giá</span><span className={cart?.discount ? "font-semibold text-emerald-600" : ""}>-{formatVnd(cart?.discount)}</span></div>
                <div className="flex justify-between text-slate-600"><span>Phí giao hàng</span><span>{shipping ? formatVnd(shipping) : <span className="font-semibold text-emerald-600">Miễn phí</span>}</span></div>
                <div className="flex justify-between text-slate-600"><span>Thuế VAT (8%)</span><span className="font-medium">{formatVnd(tax)}</span></div>
                <div className="flex justify-between border-t border-slate-100 pt-3 text-lg font-bold text-slate-900"><span>Tổng cộng</span><span>{formatVnd((cart?.total || 0) + shipping + tax)}</span></div>
              </div>
              <Link href="/store/checkout" className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-700 hover:to-cyan-600">Tiến hành thanh toán <ArrowRight className="h-4 w-4" /></Link>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-cyan-600" /> Thanh toán mô phỏng, an toàn cho demo</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Tag className="h-4 w-4 text-blue-600" /> Mã giảm giá</h3>
              <div className="mt-3 flex gap-2">
                <input value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} placeholder="MEDICARE10" className="h-10 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                <button onClick={submitCoupon} disabled={applying || !coupon.trim()} className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-50">{applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Áp dụng"}</button>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">Thử: MEDICARE10, VIP20, FREESHIP</p>
              {cart?.couponCode && <p className="mt-2 text-[11px] font-semibold text-emerald-600">Đang áp dụng: {cart.couponCode}</p>}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
