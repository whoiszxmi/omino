import "./globals.css";
import type { Viewport } from "next";
import { Toaster } from "sonner";

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
    <html lang="pt-BR">
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
