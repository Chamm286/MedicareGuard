"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info" | "warning";
type Toast = { id: number; title: string; message?: string; tone: ToastTone };

type ToastContextValue = {
  toast: (title: string, options?: { message?: string; tone?: ToastTone }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle };
const STYLES = {
  success: "border-low/25 bg-low/[0.08] text-emerald-200",
  error: "border-critical/25 bg-critical/[0.08] text-red-200",
  info: "border-brand-400/25 bg-brand-500/[0.08] text-brand-100",
  warning: "border-medium/25 bg-medium/[0.08] text-amber-100",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => setToasts((items) => items.filter((item) => item.id !== id)), []);

  const toast = useCallback(
    (title: string, options?: { message?: string; tone?: ToastTone }) => {
      const id = Date.now() + Math.random();
      setToasts((items) => [...items.slice(-3), { id, title, message: options?.message, tone: options?.tone || "info" }]);
      setTimeout(() => remove(id), 4800);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, message) => toast(title, { message, tone: "success" }),
      error: (title, message) => toast(title, { message, tone: "error" }),
      info: (title, message) => toast(title, { message, tone: "info" }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[200] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((item) => {
          const Icon = ICONS[item.tone];
          return (
            <div key={item.id} className={cn("pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-xl animate-in", STYLES[item.tone])}>
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                {item.message && <p className="mt-0.5 text-xs opacity-70">{item.message}</p>}
              </div>
              <button onClick={() => remove(item.id)} className="rounded p-0.5 opacity-60 transition hover:opacity-100" aria-label="Đóng">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
};
