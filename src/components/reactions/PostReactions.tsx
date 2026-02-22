"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  postId: string;
  /** Tamanho compacto para uso no feed card */
  compact?: boolean;
};

export default function PostReactions({ postId, compact = false }: Props) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // ── carrega estado inicial ────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      const { data: ud } = await supabase.auth.getUser();
      const uid = ud.user?.id ?? null;
      if (!active) return;
      setUserId(uid);

      // total de reações
      const { count: total } = await supabase
        .from("post_reactions")
        .select("id", { count: "exact", head: true })
        .eq("post_id", postId);

      if (!active) return;
      setCount(total ?? 0);

      // se o usuário já reagiu
      if (uid) {
        const { data: mine } = await supabase
          .from("post_reactions")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", uid)
          .maybeSingle();

        if (!active) return;
        setLiked(!!mine);
      }

      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [postId]);

  // ── Realtime: atualiza contagem quando outro usuário reage ────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`reactions-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_reactions",
          filter: `post_id=eq.${postId}`,
        },
        async () => {
          // re-busca contagem total
          const { count: total } = await supabase
            .from("post_reactions")
            .select("id", { count: "exact", head: true })
            .eq("post_id", postId);

          setCount(total ?? 0);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  // ── toggle like ───────────────────────────────────────────────────────────
  async function toggle() {
    if (!userId || busy) return;

    // optimista
    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount((c) => (wasLiked ? Math.max(0, c - 1) : c + 1));
    setBusy(true);

    try {
      if (wasLiked) {
        await supabase
          .from("post_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);
      } else {
        await supabase
          .from("post_reactions")
          .insert({ post_id: postId, user_id: userId, emoji: "❤️" });
      }
    } catch {
      // rollback
      setLiked(wasLiked);
      setCount((c) => (wasLiked ? c + 1 : Math.max(0, c - 1)));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-1 text-muted-foreground/40",
          compact ? "text-xs" : "text-sm",
        )}
      >
        <Heart className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        <span>—</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!userId || busy}
      className={cn(
        "flex items-center gap-1 rounded-full transition",
        "disabled:cursor-not-allowed disabled:opacity-40",
        compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
        liked
          ? "text-rose-500 hover:text-rose-400"
          : "text-muted-foreground hover:text-rose-400",
        busy && "animate-pulse",
      )}
      title={liked ? "Remover like" : "Curtir"}
    >
      <Heart
        className={cn(
          "transition-transform",
          compact ? "h-3.5 w-3.5" : "h-4 w-4",
          liked && "fill-rose-500 scale-110",
          busy && "scale-90",
        )}
      />
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}
