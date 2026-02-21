"use client";

import { usePathname, useRouter } from "next/navigation";
import { appNavItems } from "@/components/nav/nav-items";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/app/feed")
    return pathname === "/app" || pathname.startsWith("/app/feed");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * AppBottomNav — barra de navegação inferior para mobile.
 * Mostra as 5 abas principais. As demais ficam acessíveis por outras rotas.
 */
export function AppMobileNav({ className }: { className?: string }) {
  const pathname = usePathname() ?? "/app";
  const router = useRouter();

  // Exibe só as primeiras 5 abas na barra inferior
  const primaryItems = appNavItems.slice(0, 5);

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        className,
      )}
    >
      <div className="mx-auto flex max-w-lg items-center">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          return (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-2xl transition",
                  active && "bg-primary/10",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      {/* Safe area para iPhones */}
      <div className="h-safe-area-inset-bottom" />
    </nav>
  );
}

/**
 * AppMobileHeader — header superior com título da página atual.
 * Mantido para compatibilidade mas pode ser usado independentemente.
 */
export function AppMobileHeader({ className }: { className?: string }) {
  const pathname = usePathname() ?? "/app";

  const title = (() => {
    if (pathname.startsWith("/app/chats")) return "Chats";
    if (pathname.startsWith("/app/wiki")) return "Wiki & Biblioteca";
    if (pathname.startsWith("/app/highlights")) return "Destaques";
    if (pathname.startsWith("/app/personas")) return "Personas";
    if (pathname.startsWith("/app/profile")) return "Perfil";
    if (pathname.startsWith("/app/drafts")) return "Rascunhos";
    return "Feed";
  })();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b bg-background/90 px-4 py-3 backdrop-blur",
        className,
      )}
    >
      <p className="text-base font-semibold">{title}</p>
    </header>
  );
}
