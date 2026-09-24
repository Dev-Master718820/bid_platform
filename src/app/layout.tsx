import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import "./globals.css";

// Self-hosted (variable weight 100–900, latin). next/font/google would download the font from
// fonts.gstatic.com on every compile, which stalls or fails `next dev` / `next build` on slow networks.
const inter = localFont({ src: "./fonts/InterVariable-latin.woff2", weight: "100 900", variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "ResumeForge — Structured resume generation", template: "%s · ResumeForge" },
  description: "Build a structured professional profile once, generate tailored resumes as JSON, customize templates, and export pixel-perfect PDF and DOCX.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
