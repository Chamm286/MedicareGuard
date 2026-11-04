import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StoreFooter, StoreHeader } from "@/components/store/StoreHeader";
import { ToastProvider } from "@/components/toast";

export const metadata: Metadata = {
  title: "Medicare Store — Thiết bị y tế chính hãng",
  description: "Mua sắm thiết bị y tế, vật tư chăm sóc sức khỏe và thực phẩm bổ sung tại Medicare Store.",
};

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col">
        <StoreHeader />
        <main className="flex-1">{children}</main>
        <StoreFooter />
      </div>
    </ToastProvider>
  );
}
