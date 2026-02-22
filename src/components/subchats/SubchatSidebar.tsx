"use client";

import { useRouter } from "next/navigation";
import { useSubchats, useParentChat } from "@/lib/subchats/useSubchats";
import { MapPin, ChevronRight, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** ID do chat atualmente aberto */
  currentChatId: string;
  /** parent_id do chat atual (null se for o pai) */
  parentId: string | null;
  /** created_by do chat pai */
  createdBy: string | null;
};

export default function SubchatSidebar({
  currentChatId,
  parentId,
  createdBy,
}: Props) {
  const router = useRouter();

  // Se estamos num subchat, o pai é parentId; se no pai, o pai é currentChatId
  const rootId = parentId ?? currentChatId;
  const parent = useParentChat(rootId);
  const { subchats } = useSubchats(rootId);

  if (!parent && subchats.length === 0) return null;

  return (
    <nav className="hidden w-52 shrink-0 md:block">
      <div className="sticky top-24 space-y-1 rounded-2xl border bg-card/80 p-3 shadow-sm backdrop-blur-sm">
        <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Globe className="h-3 w-3" />
          Regiões
        </p>

        {/* Chat pai (macrorregiã) */}
        {parent && (
          <button
            type="button"
            onClick={() => router.push(`/app/chats/${parent.id}`)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-muted/60",
              (parentId === null || currentChatId === parent.id) &&
                "bg-primary/10 font-semibold text-primary",
            )}
          >
            <Globe className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <span className="line-clamp-1">
              {parent.title ?? "Macrorregiã"}
            </span>
          </button>
        )}

        {/* Subchats filhos */}
        {subchats.length > 0 && (
          <div className="mt-1 space-y-0.5 border-l border-muted/50 pl-2 ml-2">
            {subchats.map((sub) => {
              const isActive = sub.id === currentChatId;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => router.push(`/app/chats/${sub.id}`)}
                  className={cn(
                    "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-muted/60",
                    isActive && "bg-primary/10 font-semibold text-primary",
                    !isActive && "text-muted-foreground",
                  )}
                >
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="line-clamp-1">
                    {sub.title ?? "Localização"}
                  </span>
                  {isActive && (
                    <ChevronRight className="ml-auto h-3 w-3 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
