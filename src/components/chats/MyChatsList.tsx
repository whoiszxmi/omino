"use client";

import { MessageCircle, Users, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export type MyChatItem = {
  id: string;
  type: "group" | "dm" | "public";
  title: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  unread?: boolean;
  unread_count?: number;
};

type Props = {
  chats: MyChatItem[];
  onOpen: (chatId: string) => void;
};

function ChatTypeIcon({ type }: { type: MyChatItem["type"] }) {
  if (type === "group")
    return <Users className="h-4 w-4 text-muted-foreground" />;
  if (type === "public")
    return <Globe className="h-4 w-4 text-muted-foreground" />;
  return <MessageCircle className="h-4 w-4 text-muted-foreground" />;
}

function timeLabel(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffD = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  if (diffH < 24) return `${diffH}h`;
  if (diffD < 7) return `${diffD}d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function MyChatsList({ chats, onOpen }: Props) {
  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
        <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium">Nenhum chat ainda</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Crie um grupo, inicie um DM ou entre em um chat público.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {chats.map((chat) => {
        const hasUnread = chat.unread || (chat.unread_count ?? 0) > 0;
        const unreadCount = chat.unread_count ?? (chat.unread ? 1 : 0);

        return (
          <button
            key={chat.id}
            type="button"
            className={cn(
              "group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition",
              "hover:bg-muted/60 active:bg-muted/80",
              hasUnread && "bg-primary/5",
            )}
            onClick={() => onOpen(chat.id)}
          >
            {/* Avatar placeholder com ícone de tipo */}
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
                hasUnread ? "border-primary/40 bg-primary/10" : "bg-muted/50",
              )}
            >
              <ChatTypeIcon type={chat.type} />
            </div>

            {/* Conteúdo */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "truncate text-sm",
                    hasUnread ? "font-semibold" : "font-medium",
                  )}
                >
                  {chat.title ?? "Chat"}
                </span>
                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                  {timeLabel(chat.last_message_at)}
                </span>
              </div>
              <p
                className={cn(
                  "truncate text-xs",
                  hasUnread ? "text-foreground/70" : "text-muted-foreground",
                )}
              >
                {chat.last_message_text ?? "Sem mensagens"}
              </p>
            </div>

            {/* Badge de não-lidas */}
            {unreadCount > 0 && (
              <div className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
