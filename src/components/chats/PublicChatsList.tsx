"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import JoinPublicChatButton from "@/components/chats/JoinPublicChatButton";

export type PublicChatItem = {
  id: string;
  title: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  participant: boolean;
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
        <CardContent className="text-sm text-muted-foreground">
          Ainda não existem chats públicos criados.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {chats.map((chat) => (
        <Card key={chat.id} className="rounded-2xl border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{chat.title ?? "Chat público"}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {chat.last_message_text ?? "Sem mensagens ainda"}
            </p>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-2 pt-0">
            <p className="text-xs text-muted-foreground">
              {chat.last_message_at
                ? `Atualizado em ${new Date(chat.last_message_at).toLocaleString("pt-BR")}`
                : "Sem atividade"}
            </p>
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
