"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UsersRound } from "lucide-react";
import RichTextEditor from "@/components/editor/RichTextEditor";
import DOMPurify from "isomorphic-dompurify";
import { toast } from "sonner";
import { renderRichHtml } from "@/lib/render/richText";
import UserCardModal from "@/components/profile/UserCardModal";
import { useChatPresence } from "@/lib/chats/useChatPresence";

type UiMessage = {
  id: string;
  content: string;
  created_at: string;
  persona: {
    id: string;
    name: string;
    avatar_url: string | null;
    user_id: string | null;
    username: string | null;
    display_name: string | null;
    user_avatar: string | null;
  };
};

type MessageRow = {
  id: string;
  persona_id: string;
  content: string;
  created_at: string;
  personas: { id: string; user_id: string; name: string; avatar_url: string | null };
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type ParticipantRow = {
  role: string | null;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default function ChatRoomPage() {
  const params = useParams<{ id?: string }>();
  const chatId = (params?.id ?? "").toString();
  const router = useRouter();
  const { activePersona } = useActivePersona();

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [inputHtml, setInputHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [chatTitle, setChatTitle] = useState("Chat");
  const [isOwner, setIsOwner] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);

  const { onlineUsers, onlineCount, presenceEnabled } = useChatPresence(chatId);

  const bottomRef = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => {
    const out: Array<{ kind: "day"; label: string } | { kind: "msg"; m: UiMessage; mine: boolean }> = [];
    let lastDay = "";
    for (const message of messages) {
      const day = new Date(message.created_at).toLocaleDateString("pt-BR");
      if (day !== lastDay) {
        out.push({ kind: "day", label: day });
        lastDay = day;
      }
      out.push({ kind: "msg", m: message, mine: message.persona.id === activePersona?.id });
    }
    return out;
  }, [messages, activePersona?.id]);

  function scrollToBottom(smooth = true) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }

  async function loadMessages(validChatId: string) {
    setLoading(true);

    const { data: chatData } = await supabase.from("chats").select("title").eq("id", validChatId).maybeSingle();
    if (chatData?.title) setChatTitle(chatData.title);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (user) {
      const participantRes = await supabase
        .from("chat_participants")
        .select("role")
        .eq("chat_id", validChatId)
        .eq("user_id", user.id)
        .maybeSingle();

      const participant = participantRes.data as ParticipantRow | null;
      setIsOwner((participant?.role ?? "") === "owner");
    }

    const { data, error } = await supabase
      .from("messages")
      .select("id,persona_id,content,created_at,personas!inner(id,user_id,name,avatar_url)")
      .eq("chat_id", validChatId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      toast.error(error.message);
      setMessages([]);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as unknown as MessageRow[];
    const userIds = [...new Set(rows.map((row) => row.personas.user_id))];
    let profileMap = new Map<string, ProfileRow>();

    if (userIds.length > 0) {
      const profilesRes = await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", userIds);
      if (!profilesRes.error) {
        profileMap = new Map((profilesRes.data ?? []).map((profile) => [profile.id, profile as ProfileRow]));
      }
    }

    setMessages(
      rows.map((row) => {
        const profile = profileMap.get(row.personas.user_id);
        return {
          id: row.id,
          content: row.content,
          created_at: row.created_at,
          persona: {
            id: row.persona_id,
            name: row.personas.name,
            avatar_url: row.personas.avatar_url,
            user_id: row.personas.user_id,
            username: profile?.username ?? null,
            display_name: profile?.display_name ?? null,
            user_avatar: profile?.avatar_url ?? null,
          },
        };
      }),
    );

    setLoading(false);
    setTimeout(() => scrollToBottom(false), 0);
  }

  async function sendMessage() {
    if (!chatId || !activePersona || sending) return;

    const cleaned = (inputHtml || "").replace(/<p>\s*<\/p>/g, "").trim();
    if (!cleaned) return;

    setSending(true);
    const { error } = await supabase.from("messages").insert({
      chat_id: chatId,
      persona_id: activePersona.id,
      content: cleaned,
    });

    setSending(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setInputHtml("");
    await loadMessages(chatId);
  }

  async function deleteChat() {
    if (!chatId || deletingChat) return;

    setDeletingChat(true);

    const rpcResult = await supabase.rpc("delete_chat", { p_chat_id: chatId });
    if (rpcResult.error) {
      await supabase.from("messages").delete().eq("chat_id", chatId);
      await supabase.from("chat_participants").delete().eq("chat_id", chatId);
      const removeChatRes = await supabase.from("chats").delete().eq("id", chatId);
      if (removeChatRes.error) {
        setDeletingChat(false);
        return toast.error(removeChatRes.error.message);
      }
    }

    setDeletingChat(false);
    toast.success("Chat excluído.");
    router.push("/app/chats");
  }

  useEffect(() => {
    if (!chatId || !isUuid(chatId)) {
      setLoading(false);
      return;
    }

    void loadMessages(chatId);

    const channel = supabase
      .channel(`chat-${chatId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` }, () => {
        void loadMessages(chatId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <Button variant="secondary" className="rounded-2xl" onClick={() => router.push("/app/chats")}>Voltar</Button>
          <div className="text-center">
            <p className="text-lg font-semibold">{chatTitle}</p>
            <p className="text-xs text-muted-foreground">{activePersona ? `Falando como ${activePersona.name}` : "Selecione uma persona"}</p>
            <div className="mt-1 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <UsersRound className="h-3.5 w-3.5" /> Online: {onlineCount}
              {presenceEnabled && onlineUsers.length > 0 ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <button type="button" className="rounded-full border px-2 py-0.5 text-[10px] hover:bg-muted">ver todos</button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl">
                    <DialogHeader><DialogTitle>Membros online</DialogTitle></DialogHeader>
                    <div className="space-y-2">
                      {onlineUsers.map((member) => (
                        <UserCardModal
                          key={member.user_id}
                          user={{
                            username: member.username,
                            display_name: member.display_name,
                            avatar_url: member.avatar_url,
                          }}
                        >
                          <button type="button" className="flex w-full items-center gap-2 rounded-xl border p-2 text-left">
                            <div className="h-7 w-7 overflow-hidden rounded-full border bg-muted">
                              {member.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={member.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                              ) : null}
                            </div>
                            <div className="truncate text-sm">{member.display_name ?? member.username ?? "Usuário"}</div>
                          </button>
                        </UserCardModal>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              ) : null}
            </div>
            {presenceEnabled && onlineUsers.length > 0 ? (
              <div className="mt-1 flex items-center justify-center gap-1">
                {onlineUsers.slice(0, 6).map((member) => (
                  <UserCardModal
                    key={`mini-${member.user_id}`}
                    user={{
                      username: member.username,
                      display_name: member.display_name,
                      avatar_url: member.avatar_url,
                    }}
                  >
                    <button type="button" className="h-6 w-6 overflow-hidden rounded-full border bg-muted" aria-label={`Abrir perfil de ${member.display_name ?? member.username ?? "usuário"}`}>
                      {member.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={member.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                      ) : null}
                    </button>
                  </UserCardModal>
                ))}
              </div>
            ) : null}
          </div>
          {isOwner ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" className="rounded-2xl">Excluir chat</Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Excluir chat</DialogTitle>
                  <DialogDescription>Essa ação remove mensagens e participantes.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="destructive" className="rounded-xl" onClick={() => void deleteChat()} disabled={deletingChat}>
                    {deletingChat ? "Excluindo..." : "Confirmar exclusão"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="w-20" />
          )}
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 md:px-8">
        {!chatId || !isUuid(chatId) ? (
          <p className="text-sm text-muted-foreground">Chat inválido.</p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          grouped.map((item, idx) => {
            if (item.kind === "day") {
              return (
                <div key={`day-${idx}`} className="flex justify-center">
                  <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">{item.label}</span>
                </div>
              );
            }

            const safe = DOMPurify.sanitize(renderRichHtml(item.m.content));
            return (
              <div key={item.m.id} className={`flex ${item.mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] ${item.mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <UserCardModal
                    user={{
                      username: item.m.persona.username,
                      display_name: item.m.persona.display_name ?? item.m.persona.name,
                      avatar_url: item.m.persona.user_avatar ?? item.m.persona.avatar_url,
                    }}
                  >
                    <button type="button" className="mb-2 flex items-center gap-2 text-left">
                      <div className="h-6 w-6 overflow-hidden rounded-full border bg-background/50">
                        {item.m.persona.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.m.persona.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <span className="text-xs font-semibold opacity-80">{item.m.persona.name}</span>
                    </button>
                  </UserCardModal>

                  <div className="prose max-w-none break-words text-sm" dangerouslySetInnerHTML={{ __html: safe }} />
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t bg-background p-3 md:p-4">
        <div className="rounded-2xl border bg-background p-2">
          <RichTextEditor
            valueHtml={inputHtml}
            onChangeHtml={setInputHtml}
            placeholder={activePersona ? `Mensagem como ${activePersona.name}` : "Selecione uma persona"}
            compact
            bucket="media"
            folder="chats"
            imageInsertMode="both"
            enableTables={false}
            aminoStyle
          />
        </div>
        <div className="mt-2 flex justify-end">
          <Button className="rounded-2xl" onClick={() => void sendMessage()} disabled={!activePersona || sending}>
            {sending ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
