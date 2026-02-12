"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

type Props = {
  chatId: string;
  onJoined?: () => Promise<void> | void;
};

export default function JoinPublicChatButton({ chatId, onJoined }: Props) {
  const [joining, setJoining] = useState(false);

  async function joinChat() {
    if (joining) return;
    setJoining(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      toast.error("Você precisa estar logado.");
      setJoining(false);
      return;
    }

    const { error } = await supabase.from("chat_participants").upsert(
      {
        chat_id: chatId,
        user_id: user.id,
      },
      { onConflict: "chat_id,user_id" },
    );

    if (error) {
      toast.error(error.message);
      setJoining(false);
      return;
    }

    toast.success("Você entrou no chat.");
    await onJoined?.();
    setJoining(false);
  }

  return (
    <Button size="sm" className="rounded-xl" onClick={joinChat} disabled={joining}>
      {joining ? "Entrando..." : "Entrar"}
    </Button>
  );
}
