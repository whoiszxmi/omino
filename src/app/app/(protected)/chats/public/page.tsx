"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

type PublicChat = {
  id: string;
  title: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
};

export default function PublicChatsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [chats, setChats] = useState<PublicChat[]>([]);

  async function loadChats() {
    setLoading(true);
    const { data, error } = await supabase
      .from("chats")
      .select("id,title,last_message_text,last_message_at")
      .eq("type", "public")
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) {
      toast.error(error.message);
    }

    setChats((data ?? []) as PublicChat[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadChats();
  }, []);

  async function enterChat(chatId: string) {
    setJoiningId(chatId);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      toast.error("Você precisa estar logado.");
      setJoiningId(null);
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
      setJoiningId(null);
      return;
    }

    router.push(`/app/chats/${chatId}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Chats públicos</h1>
          <p className="text-sm text-muted-foreground">Descubra e entre em conversas abertas.</p>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <Button variant="secondary" className="w-full rounded-2xl sm:w-auto" onClick={() => void loadChats()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
          <Button className="w-full rounded-2xl sm:w-auto" onClick={() => router.push("/app/chats/public/new") }>
            <Plus className="mr-2 h-4 w-4" /> Novo público
          </Button>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : chats.length === 0 ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Nenhum chat público ainda</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Crie o primeiro para iniciar a comunidade.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {chats.map((chat) => (
            <Card key={chat.id} className="rounded-2xl border">
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-lg">{chat.title ?? "Chat público"}</CardTitle>
                <p className="text-sm text-muted-foreground">{chat.last_message_text ?? "Sem mensagens ainda"}</p>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-0">
                <p className="text-xs text-muted-foreground">
                  {chat.last_message_at
                    ? `Atualizado em ${new Date(chat.last_message_at).toLocaleString("pt-BR")}`
                    : "Sem atividade"}
                </p>
                <Button className="w-full rounded-2xl sm:w-auto" onClick={() => void enterChat(chat.id)} disabled={joiningId === chat.id}>
                  <Globe className="mr-2 h-4 w-4" />
                  {joiningId === chat.id ? "Entrando..." : "Entrar"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
