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

    const { error } = await supabase.rpc("join_public_chat", {
      p_chat_id: chatId,
    });

    if (error) {
      toast.error(
        error.message.includes("join_public_chat")
          ? "Não foi possível entrar no chat público agora."
          : error.message,
      );
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
