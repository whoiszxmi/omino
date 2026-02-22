import "./globals.css";
import type { Viewport } from "next";
import { Toaster } from "sonner";
import { DM_Serif_Display } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

// ── DM Serif Display — fonte display para h1/h2/h3 e títulos de página ──────
// Carregada via next/font para performance máxima (sem FOUT, self-hosted)
const dmSerifDisplay = DM_Serif_Display({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  manifest: "/manifest.webmanifest",
  themeColor: "#0b0b0f",
};

export const viewport: Viewport = {
  themeColor: "#0b0f19",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${GeistSans.variable} ${GeistMono.variable} ${dmSerifDisplay.variable}`}
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
