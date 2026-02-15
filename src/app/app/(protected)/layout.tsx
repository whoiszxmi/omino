"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreateChooser } from "@/components/app/CreateChooser";
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
  if (href === "/app/feed") {
    return pathname === "/app" || pathname.startsWith("/app/feed");
  }
  return pathname === href || pathname.startsWith(href + "/");
}

type Action = { label: string; href: string; requiresPersona?: boolean } | null;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/app";
  const router = useRouter();

  const { loading, personas, activePersona, error, setActivePersona } =
    useActivePersona();

  const [createOpen, setCreateOpen] = useState(false);
  const [personaDialogOpen, setPersonaDialogOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { title, action }: { title: string; action: Action } = useMemo(() => {
    if (pathname.startsWith("/app/feed")) {
      return {
        title: "Feed",
        action: { label: "Novo", href: "/app/feed/new", requiresPersona: true },
      };
    }
    if (pathname.startsWith("/app/chats"))
      return { title: "Chats", action: null };
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
    if (pathname.startsWith("/app/highlights"))
      return { title: "Destaques", action: null };
    if (pathname.startsWith("/app/personas"))
      return { title: "Personas", action: null };
    if (pathname.startsWith("/app/profile"))
      return { title: "Perfil", action: null };
    if (pathname.startsWith("/app/drafts"))
      return { title: "Rascunhos", action: null };

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
      { href: "/app/drafts", label: "Rascunhos", icon: FileText },
      { href: "/app/profile", label: "Perfil", icon: UserRound },
    ],
    [],
  );

  function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <div className="space-y-1">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cx(
                "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/80 hover:bg-muted",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              <ChevronRight className="h-4 w-4 opacity-30" />
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <AllowlistGuard>
      <div className="min-h-dvh bg-background">
        <div className="flex min-h-dvh w-full">
          {/* Desktop sidebar */}
          <aside className="hidden w-72 flex-col border-r bg-background md:flex">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">Uzure</div>
                  <div className="text-xs text-muted-foreground">
                    Comunidade
                  </div>
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

              <div className="mt-4 rounded-2xl border p-3">
                <div className="text-xs text-muted-foreground">
                  Persona ativa
                </div>
                <div className="mt-1 truncate text-sm font-medium">
                  {loading
                    ? "Carregando..."
                    : activePersona
                      ? activePersona.name
                      : "Sem persona"}
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    className="w-full rounded-2xl"
                    onClick={() => setPersonaDialogOpen(true)}
                  >
                    Trocar persona
                  </Button>

                  <Button
                    className="w-full rounded-2xl"
                    onClick={() => setCreateOpen(true)}
                    disabled={!activePersona}
                    title={!activePersona ? "Selecione uma persona" : "Criar"}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar
                  </Button>

                  {action ? (
                    <Button
                      variant="secondary"
                      className="w-full rounded-2xl"
                      onClick={() => router.push(action.href)}
                      disabled={!canUseAction}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {action.label}
                    </Button>
                  ) : null}

                  {!activePersona ? (
                    <div className="text-[11px] text-muted-foreground">
                      Selecione uma persona para postar/criar wiki.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4">
                <SidebarNav />
              </div>
            </div>
          </aside>

          {/* Main column */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Mobile top bar + drawer */}
            <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur md:hidden">
              <div className="flex items-center gap-2 px-4 py-3">
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-2xl"
                  onClick={() => setMobileNavOpen(true)}
                  title="Menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold">
                    {title}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {loading
                      ? "Carregando persona..."
                      : activePersona
                        ? `Usando: ${activePersona.name}`
                        : "Sem persona"}
                  </div>
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
            </header>

            {/* Desktop top bar */}
            <header className="sticky top-0 z-20 hidden border-b bg-background/80 backdrop-blur md:block">
              <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-4">
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
                  {action ? (
                    <Button
                      className="rounded-2xl"
                      onClick={() => router.push(action.href)}
                      disabled={!canUseAction}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {action.label}
                    </Button>
                  ) : null}

                  <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => setPersonaDialogOpen(true)}
                  >
                    Trocar persona
                  </Button>

                  <Button
                    className="rounded-2xl"
                    onClick={() => setCreateOpen(true)}
                    disabled={!activePersona}
                    title={!activePersona ? "Selecione uma persona" : "Criar"}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar
                  </Button>
                </div>
              </div>
            </header>

            <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-4 md:px-8 md:py-6">
              <Bootstrap>{children}</Bootstrap>
            </main>
          </div>
        </div>

        {/* Mobile Drawer (usando Dialog como sheet simples) */}
        <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <DialogContent className="rounded-2xl p-0">
            <div className="border-b p-4">
              <div className="text-base font-semibold">Menu</div>
              <div className="text-xs text-muted-foreground">
                {loading
                  ? "Carregando..."
                  : activePersona
                    ? `Persona: ${activePersona.name}`
                    : "Sem persona"}
              </div>
            </div>

            <div className="space-y-3 p-4">
              <SidebarNav onNavigate={() => setMobileNavOpen(false)} />

              <div className="rounded-2xl border p-3">
                <div className="text-xs text-muted-foreground">Ações</div>
                <div className="mt-2 grid gap-2">
                  <Button
                    variant="secondary"
                    className="w-full rounded-2xl"
                    onClick={() => {
                      setMobileNavOpen(false);
                      setPersonaDialogOpen(true);
                    }}
                  >
                    Trocar persona
                  </Button>

                  <Button
                    className="w-full rounded-2xl"
                    onClick={() => {
                      setMobileNavOpen(false);
                      setCreateOpen(true);
                    }}
                    disabled={!activePersona}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar
                  </Button>

                  {action ? (
                    <Button
                      variant="secondary"
                      className="w-full rounded-2xl"
                      onClick={() => {
                        setMobileNavOpen(false);
                        router.push(action.href);
                      }}
                      disabled={!canUseAction}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {action.label}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Persona chooser dialog (usado no desktop e mobile) */}
        <Dialog open={personaDialogOpen} onOpenChange={setPersonaDialogOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Escolher persona</DialogTitle>
            </DialogHeader>

            {error ? <p className="text-sm text-red-400">{error}</p> : null}

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
                        {p.bio ? (
                          <div className="truncate text-xs text-muted-foreground">
                            {p.bio}
                          </div>
                        ) : null}
                      </div>

                      <Button
                        size="sm"
                        className="rounded-2xl"
                        variant={
                          activePersona?.id === p.id ? "secondary" : "default"
                        }
                        onClick={async () => {
                          try {
                            await setActivePersona(p.id);
                            setPersonaDialogOpen(false);
                            router.refresh();
                          } catch {
                            // estado de erro já é tratado no hook
                          }
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

        {/* Create chooser (mantém seu fluxo existente) */}
        <CreateChooser
          open={createOpen}
          onOpenChange={setCreateOpen}
          hasPersona={!!activePersona}
        />
      </div>
    </AllowlistGuard>
  );
}
