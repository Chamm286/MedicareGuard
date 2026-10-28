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
        <Star key={value} className={cn("h-3 w-3", value <= Math.round(rating) ? "fill-medium text-medium" : "text-slate-700")} />
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
    <div className="panel panel-hover group flex flex-col overflow-hidden">
      <Link href={`/store/product/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-surface-900">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-700">Không có ảnh</div>
        )}
        {discount > 0 && <span className="absolute left-3 top-3 rounded-full bg-critical px-2 py-1 text-[10px] font-bold text-white">-{discount}%</span>}
        {product.stock <= 10 && product.stock > 0 && <span className="absolute right-3 top-3 rounded-full border border-high/30 bg-surface-950/80 px-2 py-1 text-[9px] font-medium text-high">Sắp hết</span>}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-brand-300/80">{product.category}</p>
        <Link href={`/store/product/${product.slug}`} className="mt-1 line-clamp-2 min-h-10 font-display text-sm font-semibold leading-snug text-slate-100 transition group-hover:text-white">{product.name}</Link>
        <div className="mt-2 flex items-center gap-2">
          <RatingStars rating={product.rating} />
          <span className="text-[10px] text-slate-500">{product.rating.toFixed(1)}</span>
          <span className="text-[10px] text-slate-700">·</span>
          <span className="text-[10px] text-slate-500">{product.brand || "Medicare"}</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="font-display text-base font-semibold text-white">{formatVnd(product.effective_price)}</p>
            {product.sale_price && <p className="text-[10px] text-slate-600 line-through">{formatVnd(product.price)}</p>}
          </div>
          <button
            onClick={add}
            disabled={adding || product.stock <= 0}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/15 text-brand-200 transition hover:bg-brand-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Thêm ${product.name} vào giỏ`}
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
