import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MedicareGuard SOC — Trung tâm vận hành an ninh",
    template: "%s · MedicareGuard SOC",
  },
  description:
    "Trung tâm Điều hành An ninh Tự động bảo vệ nền tảng chăm sóc sức khỏe của Medicare bằng khả năng phát hiện theo thời gian thực, phản hồi được hỗ trợ bởi AI và tự động hóa SOAR n8n.",
  keywords: ["SOC", "an ninh mạng", "Medicare", "phát hiện mối đe dọa", "SIEM", "n8n", "chuyên viên AI"],
  authors: [{ name: "Đội ngũ an ninh MedicareGuard" }],
  openGraph: {
    title: "MedicareGuard SOC",
    description: "Trung tâm điều hành an ninh tự động dành cho nền tảng chăm sóc sức khỏe của Medicare.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#05070d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`dark ${inter.variable} ${space.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <div className="relative z-10 min-h-screen">{children}</div>
      </body>
    </html>
  );
}
