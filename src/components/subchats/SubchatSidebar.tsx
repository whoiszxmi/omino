"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSubchats, useParentChat } from "@/lib/subchats/useSubchats";
import { MapPin, ChevronRight, Globe, Map, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  currentChatId: string;
  parentId: string | null;
  createdBy: string | null;
};

export default function SubchatSidebar({ currentChatId, parentId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const rootId = parentId ?? currentChatId;
  const parent = useParentChat(rootId);
  const { subchats } = useSubchats(rootId);

  // Sem filhos e sem pai — não renderiza
  if (!parent && subchats.length === 0) return null;

  return (
    <>
      {/* Botão flutuante no header — aparece só quando há subchats */}
      <Button
        size="sm"
        variant="secondary"
        className="gap-1.5 rounded-2xl"
        onClick={() => setOpen(true)}
      >
        <Map className="h-4 w-4" />
        <span className="hidden sm:inline">Regiões</span>
        {subchats.length > 0 && (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
            {subchats.length}
          </span>
        )}
      </Button>

      {/* Overlay drawer */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed left-0 top-0 z-40 flex h-full w-64 flex-col overflow-y-auto border-r bg-card/95 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Globe className="h-4 w-4" /> Regiões
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="space-y-1 p-3">
              {/* Chat pai */}
              {parent && (
                <button
                  type="button"
                  onClick={() => {
                    router.push(`/app/chats/${parent.id}`);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-muted/60",
                    (parentId === null || currentChatId === parent.id) &&
                      "bg-primary/10 font-semibold text-primary",
                  )}
                >
                  <Globe className="h-4 w-4 shrink-0 opacity-70" />
                  <span className="line-clamp-1">
                    {parent.title ?? "Macrorregiã"}
                  </span>
                </button>
              )}

              {/* Subchats */}
              {subchats.length > 0 && (
                <div className="mt-1 space-y-0.5 border-l-2 border-muted/50 pl-3 ml-2">
                  {subchats.map((sub) => {
                    const isActive = sub.id === currentChatId;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          router.push(`/app/chats/${sub.id}`);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm transition hover:bg-muted/60",
                          isActive &&
                            "bg-primary/10 font-semibold text-primary",
                          !isActive && "text-muted-foreground",
                        )}
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="line-clamp-1">
                          {sub.title ?? "Localização"}
                        </span>
                        {isActive && (
                          <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
