import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SolCheck — AI Wallet Advisor, Rent Reclaim & Savings Vault on Solana",
  description:
    "Instant on-chain Solana wallet X-Ray, live ecosystem research via Firecrawl, natural 30s voice briefings via ElevenLabs, 1-click SPL rent reclaim, and non-custodial Anchor savings vaults on Solana Mobile.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
