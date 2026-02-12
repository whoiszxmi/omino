"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { appNavItems } from "@/components/nav/nav-items";

function isActive(pathname: string, href: string) {
  if (href === "/app/feed") return pathname === "/app" || pathname.startsWith("/app/feed");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname() ?? "/app";

  return (
    <aside className={cn("w-[260px] shrink-0 border-r bg-background", className)}>
      <div className="sticky top-0 flex h-dvh flex-col p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Uzure</h2>
          <p className="text-xs text-muted-foreground">Comunidade privada</p>
        </div>

        <nav className="space-y-1">
          {appNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition",
                  active ? "bg-primary/10 text-primary" : "hover:bg-muted/60",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
