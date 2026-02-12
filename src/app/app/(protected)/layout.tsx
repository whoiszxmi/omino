"use client";

import React, { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreateChooser } from "@/components/app/CreateChooser";
import { ActionToolbar } from "@/components/app/ActionToolbar";
import { AppSidebar } from "@/components/nav/AppSidebar";
import { AppMobileNav } from "@/components/nav/AppMobileNav";
import AllowlistGuard from "@/components/auth/AllowlistGuard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Bootstrap from "./Bootstrap";
import { Plus } from "lucide-react";

function pageTitle(pathname: string) {
  if (pathname.startsWith("/app/chats")) return "Chats";
  if (pathname.startsWith("/app/wiki/categories")) return "Categorias";
  if (pathname.startsWith("/app/wiki")) return "Wiki";
  if (pathname.startsWith("/app/highlights")) return "Destaques";
  if (pathname.startsWith("/app/personas")) return "Personas";
  if (pathname.startsWith("/app/profile")) return "Perfil";
  if (pathname.startsWith("/app/drafts")) return "Rascunhos";
  return "Feed";
}

type Action = { label: string; href: string; requiresPersona?: boolean } | null;

function pageAction(pathname: string): Action {
  if (pathname.startsWith("/app/feed")) {
    return { label: "Novo", href: "/app/feed/new", requiresPersona: true };
  }
  if (pathname.startsWith("/app/wiki")) {
    return { label: "Nova", href: "/app/wiki/new", requiresPersona: true };
  }
  return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/app";
  const router = useRouter();

  const { loading, personas, activePersona, error, setActivePersona } =
    useActivePersona();

  const [createOpen, setCreateOpen] = useState(false);
  const [personaOpen, setPersonaOpen] = useState(false);

  const action = useMemo(() => pageAction(pathname), [pathname]);
  const canUseAction = !action?.requiresPersona || !!activePersona;

  return (
    <AllowlistGuard>
      <div className="flex min-h-dvh w-full overflow-x-hidden bg-background">
        <AppSidebar className="hidden md:flex" />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppMobileNav className="md:hidden" />

          <div className="hidden border-b md:block">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-8">
              <div>
                <h1 className="text-xl font-semibold">{pageTitle(pathname)}</h1>
                <p className="text-xs text-muted-foreground">
                  {loading
                    ? "Carregando persona..."
                    : activePersona
                      ? `Usando: ${activePersona.name}`
                      : "Sem persona"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Dialog open={personaOpen} onOpenChange={setPersonaOpen}>
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
                                variant={activePersona?.id === p.id ? "secondary" : "default"}
                                onClick={async () => {
                                  await setActivePersona(p.id);
                                  setPersonaOpen(false);
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

                {action ? (
                  <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => router.push(action.href)}
                    disabled={!canUseAction}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {action.label}
                  </Button>
                ) : null}

                <Button
                  className="rounded-2xl"
                  onClick={() => setCreateOpen(true)}
                  disabled={!activePersona}
                >
                  <Plus className="mr-2 h-4 w-4" /> Criar
                </Button>
              </div>
            </div>
          </div>

          <main className="min-w-0 flex-1 px-4 py-4 md:px-8 md:py-6">
            <Bootstrap>{children}</Bootstrap>
          </main>

          <ActionToolbar hasPersona={!!activePersona} />
          <CreateChooser
            open={createOpen}
            onOpenChange={setCreateOpen}
            hasPersona={!!activePersona}
          />
        </div>
      </div>
    </AllowlistGuard>
  );
}
