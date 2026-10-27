"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(isAuthenticated() ? "/dashboard" : "/login");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-950">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-400/30 bg-brand-500/10">
          <span className="absolute inset-0 animate-pulse-ring rounded-2xl border border-brand-400/30" />
          <span className="font-display text-xl font-bold text-brand-300">MG</span>
        </div>
        <p className="text-sm text-slate-500">Establishing secure session…</p>
      </div>
    </div>
  );
}
