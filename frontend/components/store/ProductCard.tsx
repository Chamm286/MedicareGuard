"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, ShoppingCart, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatVnd, type StoreProduct } from "@/lib/store";

export function RatingStars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} className={cn("h-3.5 w-3.5", value <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
      ))}
    </span>
  );
}

export function ProductCard({ product, onAdd }: { product: StoreProduct; onAdd: (product: StoreProduct) => Promise<void> }) {
  const [adding, setAdding] = useState(false);
  const discount = product.sale_price ? Math.round((1 - product.sale_price / product.price) * 100) : 0;

  const add = async () => {
    setAdding(true);
    try {
      await onAdd(product);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/store/product/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-slate-100">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">Không có ảnh</div>
        )}
        {discount > 0 && <span className="absolute left-3 top-3 rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-md">-{discount}%</span>}
        {product.stock <= 10 && product.stock > 0 && <span className="absolute right-3 top-3 rounded-full border border-amber-200 bg-white/90 px-2 py-1 text-[9px] font-semibold text-amber-700 shadow-sm">Sắp hết</span>}
        <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-2 bg-gradient-to-t from-slate-900/70 to-transparent p-4 transition duration-300 group-hover:translate-y-0">
          <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold text-slate-900">Xem chi tiết</span>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600/80">{product.category}</p>
        <Link href={`/store/product/${product.slug}`} className="mt-1 line-clamp-2 min-h-10 font-display text-sm font-semibold leading-snug text-slate-900 transition group-hover:text-blue-700">{product.name}</Link>
        <div className="mt-2 flex items-center gap-2">
          <RatingStars rating={product.rating} />
          <span className="text-[11px] text-slate-500">{product.rating.toFixed(1)}</span>
          <span className="text-slate-300">·</span>
          <span className="text-[11px] text-slate-500">{product.brand || "Medicare"}</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="font-display text-lg font-bold text-slate-900">{formatVnd(product.effective_price)}</p>
            {product.sale_price && <p className="text-[11px] text-slate-400 line-through">{formatVnd(product.price)}</p>}
          </div>
          <button
            onClick={add}
            disabled={adding || product.stock <= 0}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Thêm ${product.name} vào giỏ`}
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
