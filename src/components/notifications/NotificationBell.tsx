"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  getNotifications,
  getUnreadCount,
  markAllRead,
  notificationHref,
  notificationLabel,
  relativeTime,
  type Notification,
} from "@/lib/notifications/notifications";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // ── carrega userId e contagem inicial ────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: ud } = await supabase.auth.getUser();
      const uid = ud.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const count = await getUnreadCount();
      setUnread(count);
    }
    void init();
  }, []);

  // ── Realtime: atualiza badge quando chega notificação nova ───────────────
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          setUnread((n) => n + 1);
          // Se o popover estiver aberto, atualiza a lista em tempo real
          setNotifications((prevNotifications) => {
            const n = payload.new as any;
            if (!n?.id) return prevNotifications;

            // ✅ CORRIGIDO: Usar apenas propriedades que existem no tipo Notification
            const newItem: Notification = {
              id: n.id,
              user_id: n.user_id ?? userId, // ← Obrigatório
              type: n.type,
              target_type: n.target_type ?? null,
              target_id: n.target_id ?? null,
              payload: n.payload ?? {}, // ← Obrigatório
              read: false,
              created_at: n.created_at,
            };
            return [newItem, ...prevNotifications];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // ── fecha ao clicar fora ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // ── abre popover e carrega notificações ──────────────────────────────────
  async function handleOpen() {
    setOpen((v) => !v);
    if (!open && userId) {
      setLoading(true);
      const [data] = await Promise.all([getNotifications(20), markAllRead()]);
      setNotifications(data);
      setUnread(0);
      setLoading(false);
    }
  }

  if (!userId) return null;

  return (
    <div ref={ref} className="relative">
      {/* Sino */}
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-2xl transition",
          "hover:bg-muted/60 active:scale-95",
          open && "bg-muted/60",
        )}
        title="Notificações"
      >
        <Bell className="h-4 w-4" />
        {/* Badge de não-lidas */}
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border bg-popover shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold">Notificações</span>
            {notifications.some((n) => !n.read) && (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={async () => {
                  await markAllRead();
                  setNotifications((prevNotifications) =>
                    prevNotifications.map((n) => ({ ...n, read: true })),
                  );
                  setUnread(0);
                }}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-xl bg-muted/40"
                  />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma notificação ainda.
              </div>
            ) : (
              <div className="p-1.5 space-y-0.5">
                {notifications.map((n) => {
                  const href = notificationHref(n);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-muted/60",
                        !n.read && "bg-primary/5",
                      )}
                      onClick={() => {
                        setOpen(false);
                        if (href) router.push(href);
                      }}
                    >
                      {/* Ícone tipo */}
                      <span className="mt-0.5 text-base leading-none">
                        {n.type === "post_reaction"
                          ? "❤️"
                          : n.type === "post_comment"
                            ? "💬"
                            : n.type === "new_follower"
                              ? "👤"
                              : n.type === "chat_mention"
                                ? "📢"
                                : "🔔"}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-xs leading-snug",
                            !n.read && "font-semibold text-foreground",
                            n.read && "text-muted-foreground",
                          )}
                        >
                          {notificationLabel(n)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {relativeTime(n.created_at)}
                        </p>
                      </div>

                      {/* Ponto de não-lido */}
                      {!n.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
