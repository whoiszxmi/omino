"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { toast } from "sonner";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import WallpaperPicker from "@/components/editor/WallpaperPicker";

export default function NewPublicChatPage() {
  const router = useRouter();
  const { activePersona } = useActivePersona();
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [wallpaperId, setWallpaperId] = useState<string | null>(null);

  async function createPublicChat() {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Título é obrigatório.");
      return;
    }

    if (!activePersona) {
      toast.error("Selecione uma persona");
      return;
    }

    setCreating(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      toast.error("Você precisa estar logado.");
      setCreating(false);
      return;
    }

    let chatRes = await supabase
      .from("chats")
      .insert({ title: trimmed, type: "public", wallpaper_id: wallpaperId })
      .select("id")
      .single();

    if (isMissingColumnError(chatRes.error, "wallpaper_id")) {
      chatRes = await supabase
        .from("chats")
        .insert({ title: trimmed, type: "public" })
        .select("id")
        .single();
    }

    const chat = chatRes.data;
    const chatError = chatRes.error;

    if (chatError || !chat) {
      toast.error(chatError?.message ?? "Não foi possível criar o chat público.");
      setCreating(false);
      return;
    }

    const { error: participantError } = await supabase
      .from("chat_participants")
      .insert({
        chat_id: chat.id,
        user_id: user.id,
        role: "owner",
      });

    if (participantError) {
      toast.error(participantError.message);
      setCreating(false);
      return;
    }

    toast.success("Chat público criado.");
    router.push(`/app/chats/${chat.id}`);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 md:px-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl">Novo chat público</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Nome do chat"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <WallpaperPicker value={wallpaperId} onChange={setWallpaperId} label="Wallpaper do chat" />

          <Button
            className="w-full rounded-2xl"
            onClick={() => void createPublicChat()}
            disabled={creating || !title.trim() || !activePersona}
            title={!activePersona ? "Selecione uma persona" : "Criar chat público"}
          >
            <Globe className="mr-2 h-4 w-4" />
            {creating ? "Criando..." : "Criar chat público"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
