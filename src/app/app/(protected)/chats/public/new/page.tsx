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

// ✅ resolve “missing column” do PostgREST (42703)
function isMissingColumnError(err: unknown, column: string) {
  if (!err || typeof err !== "object") return false;
  const anyErr = err as any;
  const code = String(anyErr.code ?? "");
  const message = String(anyErr.message ?? "").toLowerCase();
  const details = String(anyErr.details ?? "").toLowerCase();
  const col = column.toLowerCase();

  const mentions =
    message.includes(col) || details.includes(col) || message.includes("column");

  return code === "42703" || (mentions && message.includes("does not exist"));
}

export default function NewPublicChatPage() {
  const router = useRouter();
  const { activePersona } = useActivePersona();

  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [wallpaperId, setWallpaperId] = useState<string | null>(null);

  async function createPublicChat() {
    const trimmed = title.trim();
    if (!trimmed) return toast.error("Título é obrigatório.");
    if (!activePersona) return toast.error("Selecione uma persona");

    setCreating(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        toast.error(userErr.message);
        return;
      }
      const user = userData.user;
      if (!user) {
        toast.error("Você precisa estar logado.");
        return;
      }

      // ✅ tenta com wallpaper_id, cai fora se coluna não existir
      let chatRes = await supabase
        .from("chats")
        .insert({ title: trimmed, type: "public", wallpaper_id: wallpaperId })
        .select("id")
        .maybeSingle();

      if (chatRes.error && isMissingColumnError(chatRes.error, "wallpaper_id")) {
        chatRes = await supabase
          .from("chats")
          .insert({ title: trimmed, type: "public" })
          .select("id")
          .maybeSingle();
      }

      // ✅ fallback extra (se seu schema antigo não tiver a coluna "type")
      if (chatRes.error && isMissingColumnError(chatRes.error, "type")) {
        chatRes = await supabase
          .from("chats")
          .insert({ title: trimmed })
          .select("id")
          .maybeSingle();
      }

      if (chatRes.error || !chatRes.data?.id) {
        // se o banco ainda reclamar do check constraint, deixa claro
        const msg = chatRes.error?.message ?? "";
        if (msg.includes("chats_type_check") || msg.includes("violates check constraint")) {
          toast.error(
            "Seu banco ainda não está aceitando type='public'. Ajuste o CHECK constraint ou use um RPC para criar chat público.",
          );
        } else {
          toast.error(msg || "Não foi possível criar o chat público.");
        }
        return;
      }

      const chatId = chatRes.data.id;

      // garante que o criador entra como owner
      const { error: participantError } = await supabase
        .from("chat_participants")
        .insert({
          chat_id: chatId,
          user_id: user.id,
          role: "owner",
        });

      // fallback se coluna role não existir (schemas antigos)
      if (participantError && isMissingColumnError(participantError, "role")) {
        const { error: participantError2 } = await supabase
          .from("chat_participants")
          .insert({
            chat_id: chatId,
            user_id: user.id,
          });

        if (participantError2) {
          toast.error(participantError2.message);
          return;
        }
      } else if (participantError) {
        toast.error(participantError.message);
        return;
      }

      toast.success("Chat público criado.");
      router.push(`/app/chats/${chatId}`);
    } finally {
      setCreating(false);
    }
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

          <WallpaperPicker
            value={wallpaperId}
            onChange={setWallpaperId}
            label="Wallpaper do chat"
          />

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
