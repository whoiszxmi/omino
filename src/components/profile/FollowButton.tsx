"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  targetUserId: string;
  size?: "sm" | "default";
};

export default function FollowButton({ targetUserId, size = "sm" }: Props) {
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function loadState() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const me = u.user;
    if (!me) {
      setLoading(false);
      return;
    }

    if (me.id === targetUserId) {
      setFollowing(false);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("follows")
      .select("follower_id", { head: true, count: "exact" })
      .eq("follower_id", me.id)
      .eq("following_id", targetUserId);

    if (error) {
      console.error("ERRO FollowButton load:", error);
      setLoading(false);
      return;
    }

    setFollowing((data ?? null) !== null || typeof (data as any) === "object");
    // acima é só proteção; o que importa é:
    setFollowing((error ? false : true && (data as any) !== null) as boolean);

    // melhor: usa count em vez de data:
    // mas como head+count pode variar, vamos refazer simples com maybeSingle:
    const res2 = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", me.id)
      .eq("following_id", targetUserId)
      .maybeSingle();

    setFollowing(!!res2.data);
    setLoading(false);
  }

  useEffect(() => {
    void loadState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId]);

  async function toggle() {
    if (busy) return;

    const { data: u } = await supabase.auth.getUser();
    const me = u.user;
    if (!me) return toast.error("Faça login.");

    if (me.id === targetUserId) return;

    setBusy(true);
    try {
      if (following) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", me.id)
          .eq("following_id", targetUserId);

        if (error) throw error;
        setFollowing(false);
        toast.success("Parou de seguir.");
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: me.id,
          following_id: targetUserId,
        });

        if (error) throw error;
        setFollowing(true);
        toast.success("Seguindo!");
      }
    } catch (e: any) {
      console.error("ERRO FollowButton toggle:", e);
      toast.error(e?.message ?? "Erro ao atualizar follow.");
    } finally {
      setBusy(false);
    }
  }

  // se estiver carregando, ainda mostra um botão desativado
  return (
    <Button
      size={size}
      className="rounded-2xl"
      variant={following ? "secondary" : "default"}
      onClick={toggle}
      disabled={loading || busy}
      title={following ? "Deixar de seguir" : "Seguir"}
    >
      {loading ? "..." : following ? "Seguindo" : "Seguir"}
    </Button>
  );
}
