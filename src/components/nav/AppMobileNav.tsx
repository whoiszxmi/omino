"use client";

import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { appNavItems } from "@/components/nav/nav-items";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

function isActive(pathname: string, href: string) {
  if (href === "/app/feed") return pathname === "/app" || pathname.startsWith("/app/feed");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function pageTitle(pathname: string) {
  if (pathname.startsWith("/app/chats")) return "Chats";
  if (pathname.startsWith("/app/wiki")) return "Wiki";
  if (pathname.startsWith("/app/highlights")) return "Destaques";
  if (pathname.startsWith("/app/personas")) return "Personas";
  if (pathname.startsWith("/app/profile")) return "Perfil";
  if (pathname.startsWith("/app/drafts")) return "Rascunhos";
  return "Feed";
}

export function AppMobileNav({ className }: { className?: string }) {
  const pathname = usePathname() ?? "/app";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const title = useMemo(() => pageTitle(pathname), [pathname]);

  return (
    <header className={cn("sticky top-0 z-30 border-b bg-background/90 px-4 py-3 backdrop-blur", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-base font-semibold">{title}</p>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="secondary" size="icon" className="rounded-2xl" aria-label="Abrir menu">
              <Menu className="h-4 w-4" />
            </Button>
          </DialogTrigger>

          <DialogContent className="left-0 top-0 h-dvh max-w-[290px] translate-x-0 translate-y-0 rounded-none rounded-r-3xl p-0">
            <DialogHeader className="border-b p-4 text-left">
              <DialogTitle>Menu</DialogTitle>
            </DialogHeader>

            <nav className="space-y-2 p-3">
              {appNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);

                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => {
                      router.push(item.href);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition",
                      active ? "bg-primary/10 text-primary" : "hover:bg-muted/60",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
