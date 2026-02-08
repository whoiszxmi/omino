"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { appNav } from "@/components/app/nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils"; // se não tiver cn, te passo fallback
import { Plus } from "lucide-react";

function isActive(pathname: string, href: string) {
  if (href === "/app/feed")
    return pathname === "/app" || pathname.startsWith("/app/feed");
  return pathname.startsWith(href);
}

export default function AppShell({
  children,
  title,
  actionHref,
  actionLabel = "Novo",
}: {
  children: ReactNode;
  title?: string;
  actionHref?: string; // ex: /app/feed/new, /app/wiki/new
  actionLabel?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-64 flex-col border-r p-4 md:flex">
          <div className="mb-4">
            <div className="text-lg font-semibold">Uzure</div>
            <div className="text-xs text-muted-foreground">
              Comunidade privada
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {appNav.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="block">
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition",
                      active ? "bg-muted font-medium" : "hover:bg-muted/60",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-4">
            {actionHref && (
              <Link href={actionHref} className="block">
                <Button className="w-full rounded-2xl">
                  <Plus className="mr-2 h-4 w-4" />
                  {actionLabel}
                </Button>
              </Link>
            )}
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-h-dvh flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
            <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3 md:max-w-2xl">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">
                  {title ?? "App"}
                </div>
              </div>

              {actionHref && (
                <Link href={actionHref}>
                  <Button className="rounded-2xl" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    {actionLabel}
                  </Button>
                </Link>
              )}
            </div>
          </header>

          <main className="mx-auto w-full max-w-md flex-1 px-4 py-4 md:max-w-2xl">
            {children}
          </main>

          {/* Bottom Nav (mobile) */}
          <nav className="sticky bottom-0 z-10 border-t bg-background/90 backdrop-blur md:hidden">
            <div className="mx-auto grid max-w-md grid-cols-4 gap-1 px-2 py-2">
              {appNav.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="block">
                    <div
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs transition",
                        active ? "bg-muted font-medium" : "hover:bg-muted/60",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
