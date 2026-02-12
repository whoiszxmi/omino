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

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function dayLabel(dateIso: string) {
  const d = new Date(dateIso);
  return d.toLocaleDateString("pt-BR");
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

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  function scrollToBottom(smooth = true) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }

  async function loadMessages(validChatId: string) {
    setLoading(true);

    const chatRes = await supabase.from("chats").select("title").eq("id", validChatId).maybeSingle();
    if (chatRes.data?.title) setChatTitle(chatRes.data.title);

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
      const profilesRes = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .in("id", userIds);

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

    if (error) {
      toast.error(error.message);
      setSending(false);
      return;
    }

    setInputHtml("");
    await loadMessages(chatId);
    setSending(false);
  }

    if (error) {
      toast.error(error.message);
      return;
    }

    void loadMessages(chatId);

    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        () => {
          void loadMessages(chatId);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  const grouped = useMemo(() => {
    const out: Array<{ kind: "day"; label: string } | { kind: "msg"; m: UiMessage; mine: boolean }> = [];
    let lastDay = "";
    for (const m of messages) {
      const label = dayLabel(m.created_at);
      if (label !== lastDay) {
        out.push({ kind: "day", label });
        lastDay = label;
      }
      out.push({ kind: "msg", m, mine: m.persona.id === activePersona?.id });
    }
    return out;
  }, [messages, activePersona?.id]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <Button variant="secondary" className="rounded-2xl" onClick={() => router.push("/app/chats")}>Voltar</Button>
          <div className="text-center">
            <p className="text-lg font-semibold">{chatTitle}</p>
            <p className="text-xs text-muted-foreground">{activePersona ? `Falando como ${activePersona.name}` : "Selecione uma persona"}</p>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 md:px-8">
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
