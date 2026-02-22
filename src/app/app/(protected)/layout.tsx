"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ActivePersonaProvider,
  useActivePersona,
  type Persona,
} from "@/lib/persona/ActivePersonaContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreateChooser } from "@/components/app/CreateChooser";
import AllowlistGuard from "@/components/auth/AllowlistGuard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Bootstrap from "./Bootstrap";
import NotificationBell from "@/components/notifications/NotificationBell";
import {
  Home,
  MessageCircle,
  BookOpen,
  UsersRound,
  Plus,
  UserRound,
  Star,
  FileText,
  ChevronRight,
  ChevronDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── helpers ──────────────────────────────────────────────────────────────────

function isActive(pathname: string, href: string) {
  if (href === "/app/feed")
    return pathname === "/app" || pathname.startsWith("/app/feed");
  return pathname === href || pathname.startsWith(href + "/");
}

function personaColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 48%)`;
}

function PersonaAvatar({
  persona,
  size = 28,
}: {
  persona: Persona;
  size?: number;
}) {
  const bg = personaColor(persona.id);
  const initials = persona.name.slice(0, 2).toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        fontSize: size * 0.38,
      }}
    >
      {persona.avatar_url ? (
        <img
          src={persona.avatar_url}
          alt={persona.name}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}

function PersonaSwitcher({
  personas,
  activePersona,
  setActivePersona,
  onGoCreate,
}: {
  personas: Persona[];
  activePersona: Persona | null;
  setActivePersona: (id: string) => Promise<void>;
  onGoCreate: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition",
          "hover:bg-muted/60 active:scale-95",
          open && "bg-muted/60",
        )}
      >
        {activePersona ? (
          <>
            <PersonaAvatar persona={activePersona} size={20} />
            <span className="max-w-[100px] truncate font-medium">
              {activePersona.name}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Sem persona</span>
        )}
        <ChevronDown
          className={cn(
            "h-3 w-3 text-muted-foreground transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1.5 w-56 rounded-2xl border bg-popover shadow-lg">
            <div className="p-1.5">
              {personas.length === 0 ? (
                <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                  Nenhuma persona.{" "}
                  <button
                    className="text-primary underline"
                    onClick={() => {
                      setOpen(false);
                      onGoCreate();
                    }}
                  >
                    Criar agora
                  </button>
                </div>
              ) : (
                personas.map((p) => {
                  const isSelected = activePersona?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition",
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted/60",
                      )}
                      onClick={async () => {
                        await setActivePersona(p.id);
                        setOpen(false);
                      }}
                    >
                      <PersonaAvatar persona={p} size={26} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{p.name}</div>
                        {p.bio && (
                          <div className="truncate text-[10px] text-muted-foreground">
                            {p.bio}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── nav ──────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/app/feed", label: "Feed", icon: Home },
  { href: "/app/chats", label: "Chats", icon: MessageCircle },
  { href: "/app/wiki", label: "Wiki", icon: BookOpen },
  { href: "/app/highlights", label: "Destaques", icon: Star },
  { href: "/app/personas", label: "Personas", icon: UsersRound },
  { href: "/app/drafts", label: "Rascunhos", icon: FileText },
  { href: "/app/profile", label: "Perfil", icon: UserRound },
] as const;

const BOTTOM_TABS = [
  { href: "/app/feed", label: "Feed", icon: Home },
  { href: "/app/chats", label: "Chats", icon: MessageCircle },
  { href: "/app/wiki", label: "Wiki", icon: BookOpen },
  { href: "/app/highlights", label: "Destaques", icon: Star },
  { href: "/app/personas", label: "Personas", icon: UsersRound },
] as const;

type Action = { label: string; href: string; requiresPersona?: boolean } | null;

// ─── inner ────────────────────────────────────────────────────────────────────

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/app";
  const router = useRouter();
  const { loading, personas, activePersona, setActivePersona } =
    useActivePersona();
  const [createOpen, setCreateOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isChatRoom = /^\/app\/chats\/[^/]+$/.test(pathname);

  const { title, action }: { title: string; action: Action } = useMemo(() => {
    if (pathname.startsWith("/app/feed"))
      return {
        title: "Feed",
        action: {
          label: "Novo post",
          href: "/app/feed/new",
          requiresPersona: true,
        },
      };
    if (pathname.startsWith("/app/chats"))
      return { title: "Chats", action: null };
    if (pathname.startsWith("/app/wiki/categories"))
      return {
        title: "Categorias",
        action: {
          label: "Nova wiki",
          href: "/app/wiki/new",
          requiresPersona: true,
        },
      };
    if (pathname.startsWith("/app/wiki"))
      return {
        title: "Wiki",
        action: {
          label: "Nova wiki",
          href: "/app/wiki/new",
          requiresPersona: true,
        },
      };
    if (pathname.startsWith("/app/highlights"))
      return { title: "Destaques", action: null };
    if (pathname.startsWith("/app/personas"))
      return { title: "Personas", action: null };
    if (pathname.startsWith("/app/profile"))
      return { title: "Perfil", action: null };
    if (pathname.startsWith("/app/drafts"))
      return { title: "Rascunhos", action: null };
    if (pathname.startsWith("/app/search"))
      return { title: "Busca", action: null };
    return {
      title: "Feed",
      action: {
        label: "Novo post",
        href: "/app/feed/new",
        requiresPersona: true,
      },
    };
  }, [pathname]);

  const canUseAction = !action?.requiresPersona || !!activePersona;

  function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <div className="space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition",
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-foreground/80 hover:bg-muted",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="h-3.5 w-3.5 opacity-40" />}
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
          <aside className="hidden w-72 shrink-0 flex-col border-r bg-background md:flex">
            <div className="flex flex-col gap-4 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold tracking-tight">
                    Uzure
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Comunidade
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl"
                  onClick={() => router.push("/app/profile")}
                  title="Perfil"
                >
                  <UserRound className="h-4 w-4" />
                </Button>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-3">
                <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Persona ativa
                </div>
                {loading ? (
                  <div className="h-7 w-32 animate-pulse rounded-full bg-muted" />
                ) : (
                  <PersonaSwitcher
                    personas={personas}
                    activePersona={activePersona}
                    setActivePersona={setActivePersona}
                    onGoCreate={() => router.push("/app/personas")}
                  />
                )}
                <div className="mt-3 grid gap-2">
                  <Button
                    className="w-full rounded-full"
                    onClick={() => setCreateOpen(true)}
                    disabled={!activePersona}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Criar
                  </Button>
                  {action && (
                    <Button
                      variant="secondary"
                      className="w-full rounded-full"
                      onClick={() => router.push(action.href)}
                      disabled={!canUseAction}
                    >
                      <Plus className="mr-2 h-4 w-4" /> {action.label}
                    </Button>
                  )}
                </div>
              </div>

              <SidebarNav />
            </div>
          </aside>

          {/* Main column */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Mobile top bar */}
            <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur md:hidden">
              <div className="flex items-center gap-2 px-4 py-2.5">
                {loading ? (
                  <div className="h-7 w-24 animate-pulse rounded-full bg-muted" />
                ) : (
                  <PersonaSwitcher
                    personas={personas}
                    activePersona={activePersona}
                    setActivePersona={setActivePersona}
                    onGoCreate={() => router.push("/app/personas")}
                  />
                )}

                <span className="flex-1 truncate text-sm font-semibold">
                  {title}
                </span>

                {/* ← Sino de notificações (Sprint 4 #21) */}
                <NotificationBell />

                {action && (
                  <Button
                    size="sm"
                    className="rounded-full px-3"
                    onClick={() => router.push(action.href)}
                    disabled={!canUseAction}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl"
                  onClick={() => setCreateOpen(true)}
                  disabled={!activePersona}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </header>

            {/* Desktop top bar */}
            <header className="sticky top-0 z-20 hidden border-b bg-background/85 backdrop-blur md:block">
              <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-3">
                <div className="min-w-0">
                  <div className="text-xl font-semibold">{title}</div>
                  {activePersona && (
                    <div className="text-xs text-muted-foreground">
                      Usando: {activePersona.name}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {action && (
                    <Button
                      className="rounded-full"
                      onClick={() => router.push(action.href)}
                      disabled={!canUseAction}
                    >
                      <Plus className="mr-2 h-4 w-4" /> {action.label}
                    </Button>
                  )}
                  {/* ← Sino de notificações (Sprint 4 #21) */}
                  <NotificationBell />
                  <Button
                    className="rounded-full"
                    onClick={() => setCreateOpen(true)}
                    disabled={!activePersona}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Criar
                  </Button>
                </div>
              </div>
            </header>

            <main
              className={cn(
                "mx-auto w-full max-w-[1200px] flex-1 px-4 py-4 md:px-8 md:py-6",
                !isChatRoom && "pb-24 md:pb-6",
              )}
            >
              <Bootstrap>{children}</Bootstrap>
            </main>
          </div>
        </div>

        {/* Bottom Tab Bar mobile */}
        {!isChatRoom && (
          <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur md:hidden">
            <div className="mx-auto grid max-w-lg grid-cols-5 px-1 pb-safe">
              {BOTTOM_TABS.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] transition",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-2xl transition",
                        active && "bg-primary/10",
                      )}
                    >
                      <Icon
                        className={cn("h-5 w-5", active && "stroke-[2.2px]")}
                      />
                    </div>
                    <span
                      className={cn("font-medium", active && "text-primary")}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}

        <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
          <DialogContent className="rounded-2xl p-0">
            <div className="border-b p-4">
              <div className="text-base font-semibold">Menu</div>
            </div>
            <div className="p-4">
              <SidebarNav onNavigate={() => setMenuOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>

        <CreateChooser
          open={createOpen}
          onOpenChange={setCreateOpen}
          hasPersona={!!activePersona}
        />
      </div>
    </AllowlistGuard>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ActivePersonaProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </ActivePersonaProvider>
  );
}
