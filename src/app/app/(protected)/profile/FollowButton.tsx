"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function FollowButton({
  targetUserId,
  onChanged,
}: {
  targetUserId: string;
  onChanged?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    setMeId(user?.id ?? null);

    if (!user) {
      setIsFollowing(false);
      setLoading(false);
      return;
    }

    // checa se já sigo
    const { data, error } = await supabase
      .from("follows")
      .select("follower_id, following_id")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .maybeSingle();

    if (error) {
      console.error(error);
      setIsFollowing(false);
      setLoading(false);
      return;
    }

    setIsFollowing(!!data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId]);

  async function toggle() {
    if (!meId) {
      toast.error("Faça login para seguir.");
      return;
    }
    if (meId === targetUserId) return;

    if (busy) return;
    setBusy(true);

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", meId)
          .eq("following_id", targetUserId);

        if (error) throw error;

        setIsFollowing(false);
        onChanged?.();
        toast.success("Você deixou de seguir.");
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: meId,
          following_id: targetUserId,
        });

        if (error) throw error;

        setIsFollowing(true);
        onChanged?.();
        toast.success("Seguindo!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Erro ao atualizar follow.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Button className="rounded-2xl" variant="secondary" disabled>
        Carregando...
      </Button>
    );
  }

  if (!meId || meId === targetUserId) {
    return null;
  }

  return (
    <Button
      className="rounded-2xl"
      variant={isFollowing ? "secondary" : "default"}
      onClick={toggle}
      disabled={busy}
    >
      {isFollowing ? (busy ? "..." : "Seguindo") : busy ? "..." : "Seguir"}
    </Button>
  );
}
