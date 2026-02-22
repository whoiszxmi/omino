"use client";

import { useRouter } from "next/navigation";
import { useSubchats } from "@/lib/subchats/useSubchats";
import { getWallpaperStyle } from "@/components/ui/WallpaperBackground";
import { MapPin, Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  parentId: string;
  /** ID do criador do chat pai — só ele pode criar subchats */
  createdBy: string | null;
  currentUserId: string | null;
  onCreateSubchat?: () => void;
};

export default function SubchatList({
  parentId,
  createdBy,
  currentUserId,
  onCreateSubchat,
}: Props) {
  const router = useRouter();
  const { subchats, loading } = useSubchats(parentId);
  const canCreate = !!currentUserId && currentUserId === createdBy;

  if (loading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          Localizações ({subchats.length})
        </p>
        {canCreate && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 rounded-lg px-2 text-xs"
            onClick={onCreateSubchat}
          >
            <Plus className="h-3.5 w-3.5" />
            Nova localização
          </Button>
        )}
      </div>

      {subchats.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhuma localização ainda.
          {canCreate && (
            <span
              className="ml-1 cursor-pointer text-primary underline-offset-2 hover:underline"
              onClick={onCreateSubchat}
            >
              Criar primeira.
            </span>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {subchats.map((sub) => {
            const wallStyle = getWallpaperStyle(sub.wallpaper_slug);
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => router.push(`/app/chats/${sub.id}`)}
                className={cn(
                  "group relative overflow-hidden rounded-xl border border-white/10 text-left transition-all",
                  "hover:shadow-lg hover:border-white/20 hover:scale-[1.01]",
                )}
              >
                {/* Wallpaper de fundo */}
                <div
                  className="absolute inset-0 z-0"
                  style={wallStyle ?? { background: "hsl(var(--muted))" }}
                />
                {/* Overlay escuro */}
                <div className="absolute inset-0 z-0 bg-black/40 transition-all group-hover:bg-black/30" />

                {/* Conteúdo */}
                <div className="relative z-10 flex flex-col gap-1 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="line-clamp-1 font-semibold text-white drop-shadow">
                      {sub.title ?? "Localização"}
                    </span>
                    <MessageSquare className="h-4 w-4 shrink-0 text-white/60" />
                  </div>
                  {sub.last_message_text && (
                    <p className="line-clamp-1 text-xs text-white/70">
                      {sub.last_message_text}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
