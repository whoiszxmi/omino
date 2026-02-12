"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type MyChatItem = {
  id: string;
  type: "group" | "dm" | "public";
  title: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  unread?: boolean;
};

type Props = {
  chats: MyChatItem[];
  onOpen: (chatId: string) => void;
};

export default function MyChatsList({ chats, onOpen }: Props) {
  if (chats.length === 0) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Nenhum chat ainda</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Crie um grupo, inicie um DM ou entre em um chat público.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {chats.map((chat) => (
        <button key={chat.id} type="button" className="w-full text-left" onClick={() => onOpen(chat.id)}>
          <Card className="rounded-2xl border shadow-sm transition hover:bg-muted/40">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="flex-1 text-base">{chat.title ?? "Chat"}</CardTitle>
                {chat.unread ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
              </div>
              <p className="text-sm text-muted-foreground">{chat.last_message_text ?? "Sem mensagens"}</p>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground">
              {chat.last_message_at
                ? new Date(chat.last_message_at).toLocaleString("pt-BR")
                : "Sem atividade recente"}
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}
