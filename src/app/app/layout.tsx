"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
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
import { useRouter } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, personas, activePersona, error, setActivePersona } =
    useActivePersona();
  const [open, setOpen] = useState(false);

  const title = useMemo(() => {
    if (pathname?.includes("/personas")) return "Personas";
    return "App";
  }, [pathname]);

  const router = useRouter();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      {/* Header fixo */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="flex items-center justify-between p-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold">{title}</div>
            <div className="truncate text-xs text-muted-foreground">
              {loading
                ? "Carregando persona..."
                : activePersona
                  ? `Usando: ${activePersona.name}`
                  : "Sem persona"}
            </div>
          </div>

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
                            {p.name}{" "}
                            {activePersona?.id === p.id ? "• ativa" : ""}
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
                            activePersona?.id === p.id ? "secondary" : "default"
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
      </header>

      {/* Conteúdo */}
      <main className="flex-1 p-4">
        <Bootstrap>{children}</Bootstrap>
      </main>

      {/* Bottom nav simples (placeholder) */}
      <nav className="sticky bottom-0 border-t bg-background/80 backdrop-blur">
        <div className="grid grid-cols-4 gap-2 p-2">
          <Button
            className="rounded-2xl"
            variant="secondary"
            onClick={() => router.push("/app")}
          >
            Home
          </Button>
          <Button
            className="rounded-2xl"
            variant="secondary"
            onClick={() => router.push("/app/personas")}
          >
            Personas
          </Button>

          <Button
            className="rounded-2xl"
            variant="secondary"
            onClick={() => router.push("/app/chats")}
          >
            Chats
          </Button>
          <Button
            className="rounded-2xl"
            variant="secondary"
            onClick={() => router.push("/app/feed")}
          >
            Feed
          </Button>
        </div>
      </nav>
    </div>
  );
}
