import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { BottomNav, Header } from "@/components/Header";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-jb" });

export const metadata: Metadata = {
  title: { default: "Beursradar — AI Trading & Analyse", template: "%s · Beursradar" },
  description:
    "Multi-asset analyseplatform voor aandelen, ETF's en crypto: 4-pijler analyse, AI-tradingsignalen, executieplannen en backtesting.",
};

export const viewport: Viewport = { themeColor: "#0b0e14", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" data-theme="dark" suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen">
        <Providers>
          <Header />
          <main className="mx-auto w-full max-w-[1600px] px-3 pb-10 pt-4 sm:px-6">{children}</main>
          <footer className="mx-auto max-w-[1600px] px-6 pb-28 text-center text-xs text-muted md:pb-8">
            Beursradar is een analysetool, geen financieel advies. Handel altijd op eigen risico. Data kan vertraagd of
            gesimuleerd (mock) zijn wanneer externe API&apos;s niet beschikbaar zijn.
          </footer>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
