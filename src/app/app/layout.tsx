"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Bootstrap from "./Bootstrap";
import {
  Home,
  MessageCircle,
  BookOpen,
  UsersRound,
  Plus,
  Settings,
} from "lucide-react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string) {
  if (href === "/app/feed") return pathname === "/app" || pathname.startsWith("/app/feed");
  return pathname === href || pathname.startsWith(href + "/");
}

type Action = { label: string; href: string } | null;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/app";
  const router = useRouter();

  const { loading, personas, activePersona, error, setActivePersona } =
    useActivePersona();
  const [open, setOpen] = useState(false);

  const { title, action }: { title: string; action: Action } = useMemo(() => {
    if (pathname.startsWith("/app/feed")) {
      return { title: "Feed", action: { label: "Novo", href: "/app/feed/new" } };
    }
    if (pathname.startsWith("/app/chats")) {
      return { title: "Chat", action: null };
    }
    if (pathname.startsWith("/app/wiki/categories")) {
      return { title: "Categorias", action: { label: "Nova", href: "/app/wiki/new" } };
    }
    if (pathname.startsWith("/app/wiki")) {
      return { title: "Wiki", action: { label: "Nova", href: "/app/wiki/new" } };
    }
    if (pathname.startsWith("/app/personas")) {
      return { title: "Personas", action: null };
    }
    if (pathname.startsWith("/app/profile")) {
      return { title: "Perfil", action: null };
    }
    return { title: "Feed", action: { label: "Novo", href: "/app/feed/new" } };
  }, [pathname]);

  const navItems = useMemo(
    () => [
      { href: "/app/feed", label: "Feed", icon: Home },
      { href: "/app/chats", label: "Chat", icon: MessageCircle },
      { href: "/app/wiki", label: "Wiki", icon: BookOpen },
      { href: "/app/personas", label: "Personas", icon: UsersRound },
    ],
    [],
  );

  const canUseAction =
    !!activePersona &&
    (action?.href === "/app/feed/new" || action?.href === "/app/wiki/new");

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl">
        {/* Sidebar desktop */}
        <aside className="hidden w-72 flex-col border-r bg-background md:flex">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Comunidade</div>
                <div className="text-xs text-muted-foreground">
                  Kyodo-like • privada
                </div>
              </div>

              <Button
                variant="secondary"
                size="icon"
                className="rounded-2xl"
                onClick={() => router.push("/app/profile")}
                title="Perfil"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 rounded-2xl border p-3">
              <div className="text-xs text-muted-foreground">Persona ativa</div>
              <div className="mt-1 truncate text-sm font-medium">
                {loading ? "Carregando..." : activePersona?.name ?? "Sem persona"}
              </div>

              <div className="mt-3">
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="secondary" className="w-full rounded-2xl">
                      Trocar persona
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="rounded-2xl">
                    <DialogHeader>
                      <DialogTitle>Escolher persona</DialogTitle>
                    </DialogHeader>

                    {error && <p className="text-sm text-red-400">{error}</p>}

                    <div className="space-y-2">
                      {personas.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Você ainda não tem personas. Crie em /app/personas.
                        </p>
                      ) : (
                        personas.map((p) => (
                          <Card key={p.id} className="rounded-2xl p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">
                                  {p.name} {activePersona?.id === p.id ? "• ativa" : ""}
                                </div>
                                {p.bio && (
                                  <div className="truncate text-xs text-muted-foreground">
                                    {p.bio}
                                  </div>
                                )}
                              </div>

                              <Button
                                size="sm"
                                className="rounded-2xl"
                                variant={activePersona?.id === p.id ? "secondary" : "default"}
                                onClick={async () => {
                                  await setActivePersona(p.id);
                                  setOpen(false);
                                }}
                              >
                                {activePersona?.id === p.id ? "Ok" : "Usar"}
                              </Button>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {action && (
              <div className="mt-3">
                <Button
                  className="w-full rounded-2xl"
                  onClick={() => router.push(action.href)}
                  disabled={!canUseAction && (action.href === "/app/feed/new" || action.href === "/app/wiki/new")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {action.label}
                </Button>
              </div>
            )}
          </div>

          <nav className="px-3 pb-4">
            <div className="space-y-1">
              {navItems.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="block">
                    <div
                      className={cx(
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
            </div>
          </nav>

          <div className="mt-auto p-4">
            <div className="text-[11px] text-muted-foreground">
              Dica: Shift+Enter quebra linha no chat.
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-h-dvh flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
            <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3 md:max-w-2xl">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">{title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {loading
                    ? "Carregando persona..."
                    : activePersona
                      ? `Usando: ${activePersona.name}`
                      : "Sem persona"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {action && (
                  <Button
                    size="sm"
                    className="rounded-2xl"
                    onClick={() => router.push(action.href)}
                    disabled={!canUseAction && (action.href === "/app/feed/new" || action.href === "/app/wiki/new")}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    {action.label}
                  </Button>
                )}

                {/* Trocar persona (mobile) */}
                <div className="md:hidden">
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="secondary" className="rounded-2xl">
                        Trocar
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="rounded-2xl">
                      <DialogHeader>
                        <DialogTitle>Escolher persona</DialogTitle>
                      </DialogHeader>

                      {error && <p className="text-sm text-red-400">{error}</p>}

                      <div className="space-y-2">
                        {personas.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Você ainda não tem personas. Crie em /app/personas.
                          </p>
                        ) : (
                          personas.map((p) => (
                            <Card key={p.id} className="rounded-2xl p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium">
                                    {p.name} {activePersona?.id === p.id ? "• ativa" : ""}
                                  </div>
                                  {p.bio && (
                                    <div className="truncate text-xs text-muted-foreground">
                                      {p.bio}
                                    </div>
                                  )}
                                </div>

                                <Button
                                  size="sm"
                                  className="rounded-2xl"
                                  variant={activePersona?.id === p.id ? "secondary" : "default"}
                                  onClick={async () => {
                                    await setActivePersona(p.id);
                                    setOpen(false);
                                  }}
                                >
                                  {activePersona?.id === p.id ? "Ok" : "Usar"}
                                </Button>
                              </div>
                            </Card>
                          ))
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="mx-auto w-full max-w-md flex-1 px-4 py-4 md:max-w-2xl">
            <Bootstrap>{children}</Bootstrap>
          </main>

          {/* Bottom nav (mobile) */}
          <nav className="sticky bottom-0 z-10 border-t bg-background/85 backdrop-blur md:hidden">
            <div className="mx-auto grid max-w-md grid-cols-4 gap-1 px-2 py-2">
              {navItems.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={cx(
                      "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] transition",
                      active ? "bg-muted font-medium" : "hover:bg-muted/60",
                    )}
                    type="button"
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
