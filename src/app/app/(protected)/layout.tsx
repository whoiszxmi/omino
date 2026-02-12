"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreateChooser } from "@/components/app/CreateChooser";
import { ActionToolbar } from "@/components/app/ActionToolbar";
import AllowlistGuard from "@/components/auth/AllowlistGuard";

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
  UserRound,
  Star,
  FileText,
  Menu,
  ChevronRight,
} from "lucide-react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string) {
  if (href === "/app/feed")
    return pathname === "/app" || pathname.startsWith("/app/feed");
  return pathname === href || pathname.startsWith(href + "/");
}

type Action = { label: string; href: string; requiresPersona?: boolean } | null;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/app";
  const router = useRouter();

  const { loading, personas, activePersona, error, setActivePersona } =
    useActivePersona();

  const [createOpen, setCreateOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { title, action }: { title: string; action: Action } = useMemo(() => {
    if (pathname.startsWith("/app/feed")) {
      return {
        title: "Feed",
        action: { label: "Novo", href: "/app/feed/new", requiresPersona: true },
      };
    }
    if (pathname.startsWith("/app/chats")) {
      return { title: "Chats", action: null };
    }
    if (pathname.startsWith("/app/wiki/categories")) {
      return {
        title: "Categorias",
        action: { label: "Nova", href: "/app/wiki/new", requiresPersona: true },
      };
    }
    if (pathname.startsWith("/app/wiki")) {
      return {
        title: "Wiki",
        action: { label: "Nova", href: "/app/wiki/new", requiresPersona: true },
      };
    }
    if (pathname.startsWith("/app/personas")) {
      return { title: "Personas", action: null };
    }
    if (pathname.startsWith("/app/profile")) {
      return { title: "Perfil", action: null };
    }
    return {
      title: "Feed",
      action: { label: "Novo", href: "/app/feed/new", requiresPersona: true },
    };
  }, [pathname]);

  const canUseAction = !action?.requiresPersona || !!activePersona;

  const navItems = useMemo(
    () => [
      { href: "/app/feed", label: "Feed", icon: Home },
      { href: "/app/chats", label: "Chats", icon: MessageCircle },
      { href: "/app/wiki", label: "Wiki", icon: BookOpen },
      { href: "/app/highlights", label: "Destaques", icon: Star },
      { href: "/app/personas", label: "Personas", icon: UsersRound },
      { href: "/app/profile", label: "Perfil", icon: UserRound },
      { href: "/app/drafts", label: "Rascunhos", icon: FileText },
    ],
    [],
  );

  return (
    <AllowlistGuard>
      <div className="min-h-dvh bg-background">
        <div className="mx-auto flex min-h-dvh w-full max-w-[1400px]">
          <aside className="hidden w-72 flex-col border-r bg-background md:flex">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">Comunidade</div>
                  <div className="text-xs text-muted-foreground">Uzure • Inc</div>
                </div>

                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-2xl"
                  onClick={() => router.push("/app/profile")}
                  title="Perfil"
                >
                  <UserRound className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 rounded-2xl border p-3">
                <div className="text-xs text-muted-foreground">Persona ativa</div>
                <div className="mt-1 truncate text-sm font-medium">
                  {loading
                    ? "Carregando..."
                    : (activePersona?.name ?? "Sem persona")}
                </div>

                <div className="mt-3">
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full rounded-2xl"
                      >
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
                                  variant={
                                    activePersona?.id === p.id
                                      ? "secondary"
                                      : "default"
                                  }
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

              <div className="mt-3">
                <Button
                  className="w-full rounded-2xl"
                  onClick={() => setCreateOpen(true)}
                  disabled={!activePersona}
                  title={!activePersona ? "Selecione uma persona" : "Criar"}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar
                </Button>
                {!activePersona && (
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Selecione uma persona para postar/criar wiki.
                  </div>
                )}
              </div>

              {action && (
                <div className="mt-2">
                  <Button
                    variant="secondary"
                    className="w-full rounded-2xl"
                    onClick={() => router.push(action.href)}
                    disabled={!canUseAction}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {action.label} ({title})
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

          <div className="flex min-h-dvh flex-1 flex-col">
            <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6">
                <div className="min-w-0">
                  <div className="truncate text-xl font-semibold">{title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {loading
                      ? "Carregando persona..."
                      : activePersona
                        ? `Usando: ${activePersona.name}`
                        : "Sem persona"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="md:hidden">
                    <Dialog open={open} onOpenChange={setOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="secondary" className="rounded-2xl">
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
                                    variant={
                                      activePersona?.id === p.id
                                        ? "secondary"
                                        : "default"
                                    }
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

                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => router.push("/app/profile")}
                    title="Perfil"
                  >
                    <UserRound className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </header>

            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 md:px-6 md:py-5">
              <Bootstrap>{children}</Bootstrap>
            </main>

            <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="fixed bottom-24 left-4 z-40 rounded-2xl shadow md:hidden"
                  aria-label="Abrir atalhos"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DialogTrigger>

              <DialogContent className="left-0 top-0 h-dvh max-w-[280px] translate-x-0 translate-y-0 rounded-none rounded-r-3xl p-0 md:hidden">
                <DialogHeader className="border-b p-4">
                  <DialogTitle>Atalhos</DialogTitle>
                </DialogHeader>

                <nav className="space-y-2 p-3">
                  {navItems.map((item) => {
                    const active = isActive(pathname, item.href);
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.href}
                        type="button"
                        className={cx(
                          "flex w-full items-center justify-between rounded-2xl px-3 py-3 text-sm transition",
                          active ? "bg-muted font-medium" : "hover:bg-muted/60",
                        )}
                        onClick={() => {
                          router.push(item.href);
                          setMobileNavOpen(false);
                        }}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    );
                  })}
                </nav>
              </DialogContent>
            </Dialog>

            <ActionToolbar hasPersona={!!activePersona} />
            <CreateChooser
              open={createOpen}
              onOpenChange={setCreateOpen}
              hasPersona={!!activePersona}
            />
          </div>
        </div>
      </div>
    </AllowlistGuard>
  );
}
