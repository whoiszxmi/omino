import { supabase } from "@/lib/supabase/client";

// ─── tipos ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "post_reaction"
  | "post_comment"
  | "new_follower"
  | "highlight_community"
  | "chat_mention";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  target_type: string | null;
  target_id: string | null;
  payload: Record<string, any>;
  read: boolean;
  created_at: string;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

export async function getNotifications(limit = 30): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("ERRO getNotifications:", error);
    return [];
  }

  return (data ?? []) as Notification[];
}

export async function getUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("read", false);

  if (error) return 0;
  return count ?? 0;
}

export async function markAllRead(): Promise<void> {
  await supabase.rpc("mark_notifications_read");
}

// ─── formatters ───────────────────────────────────────────────────────────────

export function notificationLabel(n: Notification): string {
  switch (n.type) {
    case "post_reaction":
      return `Alguém curtiu seu post ${n.payload.emoji ?? "❤️"}`;
    case "post_comment":
      return `${n.payload.commenter_name ?? "Alguém"} comentou no seu post`;
    case "new_follower":
      return `${n.payload.follower_name ?? "Alguém"} começou a te seguir`;
    case "highlight_community":
      return "Seu conteúdo foi destacado na comunidade";
    case "chat_mention":
      return `${n.payload.author_name ?? "Alguém"} te mencionou no chat`;
    default:
      return "Nova notificação";
  }
}

export function notificationHref(n: Notification): string | null {
  if (!n.target_id) return null;
  switch (n.target_type) {
    case "post":
      return `/app/post/${n.target_id}`;
    case "wiki":
      return `/app/wiki/${n.target_id}`;
    case "user":
      return `/app/u/${n.target_id}`;
    case "chat":
      return `/app/chats/${n.target_id}`;
    default:
      return null;
  }
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  if (h < 24) return `${h}h`;
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}
