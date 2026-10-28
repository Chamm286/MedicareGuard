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
    return <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><div className="skeleton h-96 rounded-2xl" /></div>;
  }

  if (error) {
    return <div className="mx-auto max-w-3xl px-4 py-24 text-center text-sm text-slate-400">{error}</div>;
  }

  const items = cart?.items || [];
  const shipping = (cart?.subtotal || 0) >= 500000 ? 0 : 30000;
  const tax = Math.round((cart?.total || 0) * 0.08);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300">Giỏ hàng</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-white">Sản phẩm đã chọn</h1>
        </div>
        <Link href="/store" className="text-xs text-slate-500 hover:text-brand-300">Tiếp tục mua sắm</Link>
      </div>

      {!items.length ? (
        <div className="panel mt-8 flex flex-col items-center gap-4 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-300"><ShoppingBag className="h-7 w-7" /></span>
          <div><p className="text-sm font-medium text-white">Giỏ hàng đang trống</p><p className="mt-1 text-xs text-slate-500">Thêm thiết bị y tế bạn cần để bắt đầu.</p></div>
          <Link href="/store" className="btn btn-primary h-10 px-5 text-xs">Khám phá cửa hàng <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="panel flex gap-4 p-4">
                <Link href={`/store/product/${item.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-900">
                  {item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> : null}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-[0.14em] text-brand-300/80">{item.category}</p>
                      <Link href={`/store/product/${item.slug}`} className="mt-0.5 block truncate text-sm font-medium text-slate-100 hover:text-white">{item.name}</Link>
                      <p className="mt-1 text-[10px] text-slate-600">SKU {item.sku} · còn {item.stock}</p>
                    </div>
                    <button onClick={() => remove(item.id)} disabled={busyItem === item.id} className="text-slate-600 transition hover:text-critical" aria-label="Xóa sản phẩm"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setQuantity(item.id, item.quantity - 1)} disabled={busyItem === item.id || item.quantity <= 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/[0.05] disabled:opacity-40"><Minus className="h-3 w-3" /></button>
                      <span className="w-8 text-center text-sm text-white">{busyItem === item.id ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : item.quantity}</span>
                      <button onClick={() => setQuantity(item.id, item.quantity + 1)} disabled={busyItem === item.id || item.quantity >= item.stock} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/[0.05] disabled:opacity-40"><Plus className="h-3 w-3" /></button>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{formatVnd(item.line_total)}</p>
                      <p className="text-[10px] text-slate-600">{formatVnd(item.unit_price)} / sản phẩm</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="space-y-4">
            <div className="panel p-5">
              <h2 className="font-display text-sm font-semibold text-white">Tóm tắt đơn hàng</h2>
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-400"><span>Tạm tính ({cart?.itemCount} sản phẩm)</span><span>{formatVnd(cart?.subtotal)}</span></div>
                <div className="flex justify-between text-slate-400"><span>Giảm giá</span><span className={cart?.discount ? "text-low" : ""}>-{formatVnd(cart?.discount)}</span></div>
                <div className="flex justify-between text-slate-400"><span>Phí giao hàng</span><span>{shipping ? formatVnd(shipping) : <span className="text-low">Miễn phí</span>}</span></div>
                <div className="flex justify-between text-slate-400"><span>Thuế VAT (8%)</span><span>{formatVnd(tax)}</span></div>
                <div className="flex justify-between border-t border-white/[0.06] pt-3 text-base font-semibold text-white"><span>Tổng cộng</span><span>{formatVnd((cart?.total || 0) + shipping + tax)}</span></div>
              </div>
              <Link href="/store/checkout" className="btn btn-primary mt-5 h-11 w-full text-sm">Tiến hành thanh toán <ArrowRight className="h-4 w-4" /></Link>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-600"><ShieldCheck className="h-3 w-3 text-cyan-300" /> Thanh toán mô phỏng, an toàn cho demo</p>
            </div>

            <div className="panel p-5">
              <h3 className="flex items-center gap-2 text-xs font-medium text-slate-200"><Tag className="h-3.5 w-3.5 text-brand-300" /> Mã giảm giá</h3>
              <div className="mt-3 flex gap-2">
                <input value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} placeholder="MEDICARE10" className="input h-9 flex-1 text-xs" />
                <button onClick={submitCoupon} disabled={applying || !coupon.trim()} className="btn btn-secondary h-9 px-3 text-xs">{applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Áp dụng"}</button>
              </div>
              <p className="mt-2 text-[10px] text-slate-600">Thử: MEDICARE10, VIP20, FREESHIP</p>
              {cart?.couponCode && <p className="mt-2 text-[10px] text-low">Đang áp dụng: {cart.couponCode}</p>}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
