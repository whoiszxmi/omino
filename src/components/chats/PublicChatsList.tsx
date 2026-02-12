"use client";

import { Globe, UsersRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import JoinPublicChatButton from "@/components/chats/JoinPublicChatButton";

export type PublicChatItem = {
  id: string;
  title: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  participant: boolean;
  membersCount: number;
};

type Props = {
  chats: PublicChatItem[];
  onOpen: (chatId: string) => void;
  onJoined: (chatId: string) => Promise<void> | void;
};

export default function PublicChatsList({ chats, onOpen, onJoined }: Props) {
  if (chats.length === 0) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Nenhum chat público</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Ainda não existem chats públicos criados.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {chats.map((chat) => (
        <Card key={chat.id} className="rounded-2xl border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{chat.title ?? "Chat público"}</CardTitle>
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                <Globe className="mr-1 h-3 w-3" /> Público
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{chat.last_message_text ?? "Sem mensagens ainda"}</p>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-2 pt-0">
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>{chat.last_message_at ? `Atualizado em ${new Date(chat.last_message_at).toLocaleString("pt-BR")}` : "Sem atividade"}</p>
              <p className="inline-flex items-center gap-1"><UsersRound className="h-3.5 w-3.5" /> {chat.membersCount} membros</p>
            </div>
            {chat.participant ? (
              <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => onOpen(chat.id)}>
                Abrir
              </Button>
            ) : (
              <JoinPublicChatButton chatId={chat.id} onJoined={() => onJoined(chat.id)} />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
