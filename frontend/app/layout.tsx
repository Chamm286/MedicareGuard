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
    default: "MedicareGuard SOC — Security Operations Center",
    template: "%s · MedicareGuard SOC",
  },
  description:
    "Autonomous Security Operations Center protecting the Medicare healthcare platform with real-time detection, AI-assisted response and n8n SOAR automation.",
  keywords: ["SOC", "cybersecurity", "Medicare", "threat detection", "SIEM", "n8n", "AI analyst"],
  authors: [{ name: "MedicareGuard Security Team" }],
  openGraph: {
    title: "MedicareGuard SOC",
    description: "Autonomous security operations center for the Medicare healthcare platform.",
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
    <html lang="en" className={`dark ${inter.variable} ${space.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <div className="relative z-10 min-h-screen">{children}</div>
      </body>
    </html>
  );
}
