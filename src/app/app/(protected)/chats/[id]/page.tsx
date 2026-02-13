"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Button } from "@/components/ui/button";
import RichTextEditor from "@/components/editor/RichTextEditor";
import DOMPurify from "isomorphic-dompurify";
import { toast } from "sonner";
import { renderRichHtml } from "@/lib/render/richText";
import UserCardModal from "@/components/profile/UserCardModal";
import { X } from "lucide-react";

type UiMessage = {
  id: string;
  content: string;
  created_at: string;
  persona_id: string;
  reply_to?: string | null;
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
  reply_to?: string | null;
  personas: {
    id: string;
    user_id: string | null;
    name: string;
    avatar_url: string | null;
  };
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

function dayLabel(dateIso: string) {
  const d = new Date(dateIso);
  return d.toLocaleDateString("pt-BR");
}

const PAGE_SIZE = 50;

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

  // paginação
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // reply
  const [replyTo, setReplyTo] = useState<UiMessage | null>(null);

  // typing
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<number | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  function scrollToBottom(smooth = false) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }

  function isNearBottom() {
    const el = listRef.current;
    if (!el) return true;
    const threshold = 240;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }

  async function fetchProfilesMap(rows: MessageRow[]) {
    const userIds = Array.from(
      new Set(
        rows.map((r) => r.personas.user_id).filter((x): x is string => !!x),
      ),
    );
    if (userIds.length === 0) return new Map<string, ProfileRow>();
    const profilesRes = await supabase
      .from("profiles")
      .select("id,username,display_name,avatar_url")
      .in("id", userIds);
    if (profilesRes.error) return new Map<string, ProfileRow>();
    return new Map(
      (profilesRes.data ?? []).map((p) => [p.id, p as ProfileRow]),
    );
  }

  function mapRows(
    rows: MessageRow[],
    profileMap: Map<string, ProfileRow>,
  ): UiMessage[] {
    return rows.map((row) => {
      const uid = row.personas.user_id;
      const profile = uid ? profileMap.get(uid) : undefined;
      return {
        id: row.id,
        content: row.content,
        created_at: row.created_at,
        persona_id: row.persona_id,
        reply_to: row.reply_to ?? null,
        persona: {
          id: row.personas.id,
          name: row.personas.name,
          avatar_url: row.personas.avatar_url,
          user_id: row.personas.user_id,
          username: profile?.username ?? null,
          display_name: profile?.display_name ?? null,
          user_avatar: profile?.avatar_url ?? null,
        },
      };
    });
  }

  async function loadInitial(validChatId: string) {
    setLoading(true);
    try {
      // título
      const chatRes = await supabase
        .from("chats")
        .select("title")
        .eq("id", validChatId)
        .maybeSingle();
      if (chatRes.data?.title) setChatTitle(chatRes.data.title);

      // últimas N
      const res = await supabase
        .from("messages")
        .select(
          "id,persona_id,content,created_at,reply_to,personas!inner(id,user_id,name,avatar_url)",
        )
        .eq("chat_id", validChatId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (res.error) {
        toast.error(res.error.message);
        setMessages([]);
        setHasMore(false);
        return;
      }

      const rows = (res.data ?? []) as unknown as MessageRow[];
      const profileMap = await fetchProfilesMap(rows);

      // como veio DESC, inverte para render ASC
      const mapped = mapRows(rows, profileMap).reverse();

      setMessages(mapped);
      setHasMore(rows.length === PAGE_SIZE);

      // ✅ ao entrar: vai pro final
      setTimeout(() => scrollToBottom(false), 0);
    } finally {
      setLoading(false);
    }
  }

  async function loadOlder() {
    if (!chatId || !isUuid(chatId)) return;
    if (!hasMore || loadingMore) return;
    if (messages.length === 0) return;

    setLoadingMore(true);
    try {
      const topEl = listRef.current;
      const prevScrollHeight = topEl?.scrollHeight ?? 0;

      const oldest = messages[0];

      const res = await supabase
        .from("messages")
        .select(
          "id,persona_id,content,created_at,reply_to,personas!inner(id,user_id,name,avatar_url)",
        )
        .eq("chat_id", chatId)
        .lt("created_at", oldest.created_at) // carrega mais antigas
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (res.error) {
        toast.error(res.error.message);
        setHasMore(false);
        return;
      }

      const rows = (res.data ?? []) as unknown as MessageRow[];
      const profileMap = await fetchProfilesMap(rows);
      const mapped = mapRows(rows, profileMap).reverse();

      if (mapped.length === 0) {
        setHasMore(false);
        return;
      }

      // prepend
      setMessages((prev) => [...mapped, ...prev]);
      setHasMore(rows.length === PAGE_SIZE);

      // mantém posição (não “pula”)
      setTimeout(() => {
        const el = listRef.current;
        if (!el) return;
        const nextScrollHeight = el.scrollHeight;
        el.scrollTop = nextScrollHeight - prevScrollHeight + el.scrollTop;
      }, 0);
    } finally {
      setLoadingMore(false);
    }
  }

  async function fetchOneMessage(messageId: string): Promise<UiMessage | null> {
    const res = await supabase
      .from("messages")
      .select(
        "id,persona_id,content,created_at,reply_to,personas!inner(id,user_id,name,avatar_url)",
      )
      .eq("id", messageId)
      .maybeSingle();

    if (res.error || !res.data) return null;

    const row = res.data as unknown as MessageRow;
    const profileMap = await fetchProfilesMap([row]);
    return mapRows([row], profileMap)[0] ?? null;
  }

  async function sendMessage() {
    if (!chatId || !isUuid(chatId)) return;
    if (!activePersona || sending) return;

    const cleaned = (inputHtml || "").replace(/<p>\s*<\/p>/g, "").trim();
    if (!cleaned) return;

    setSending(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          persona_id: activePersona.id,
          content: cleaned,
          reply_to: replyTo?.id ?? null,
        })
        .select("id")
        .maybeSingle();

      if (error) {
        toast.error(error.message);
        return;
      }

      setInputHtml("");
      setReplyTo(null);

      // otimização: já adiciona sem reload pesado
      if (data?.id) {
        const one = await fetchOneMessage(data.id);
        if (one) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === one.id)) return prev;
            return [...prev, one];
          });
          setTimeout(() => scrollToBottom(true), 0);
        }
      }
    } finally {
      setSending(false);
    }
  }

  // typing (broadcast leve)
  function sendTyping(isTyping: boolean) {
    const now = Date.now();
    // evita spam
    if (isTyping && now - lastTypingSentRef.current < 1200) return;
    lastTypingSentRef.current = now;

    void supabase.channel(`chat-${chatId}`).send({
      type: "broadcast",
      event: "typing",
      payload: {
        personaId: activePersona?.id ?? null,
        name: activePersona?.name ?? "Alguém",
        typing: isTyping,
      },
    });
  }

  // ✅ load + realtime
  useEffect(() => {
    if (!chatId || !isUuid(chatId)) {
      setLoading(false);
      setMessages([]);
      return;
    }

    void loadInitial(chatId);

    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          // não recarrega tudo — busca só a msg
          const newId = (payload.new as any)?.id as string | undefined;
          if (!newId) return;

          const nearBottom = isNearBottom();

          const one = await fetchOneMessage(newId);
          if (!one) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === one.id)) return prev;
            return [...prev, one];
          });

          // se a pessoa está no fim do chat, auto-scroll
          if (nearBottom) setTimeout(() => scrollToBottom(true), 0);
        },
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        const p = payload.payload as any;
        if (!p?.personaId || p.personaId === activePersona?.id) return;

        setTypingUsers((prev) => {
          const name = (p.name as string) || "Alguém";
          if (p.typing) {
            if (prev.includes(name)) return prev;
            return [...prev, name].slice(0, 3);
          }
          return prev.filter((x) => x !== name);
        });

        // auto-clear depois de 3s (se o client não mandar “typing=false”)
        window.clearTimeout(typingTimeoutRef.current ?? undefined);
        typingTimeoutRef.current = window.setTimeout(
          () => setTypingUsers([]),
          3000,
        );
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // ok
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, activePersona?.id]);

  // infinite scroll pra cima (carrega antigas)
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    function onScroll() {
      if (el.scrollTop < 180) {
        void loadOlder();
      }
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, hasMore, loadingMore]);

  const grouped = useMemo(() => {
    const out: Array<
      | { kind: "day"; label: string }
      | { kind: "msg"; m: UiMessage; mine: boolean }
    > = [];
    let lastDay = "";

    for (const m of messages) {
      const label = dayLabel(m.created_at);
      if (label !== lastDay) {
        out.push({ kind: "day", label });
        lastDay = label;
      }
      out.push({ kind: "msg", m, mine: m.persona_id === activePersona?.id });
    }

    return out;
  }, [messages, activePersona?.id]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={() => router.push("/app/chats")}
          >
            Voltar
          </Button>

          <div className="text-center">
            <p className="text-lg font-semibold">{chatTitle}</p>
            <p className="text-xs text-muted-foreground">
              {activePersona
                ? `Falando como ${activePersona.name}`
                : "Selecione uma persona"}
            </p>
          </div>

          <div className="w-20" />
        </div>
      </header>

      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4 md:px-8"
      >
        {!chatId || !isUuid(chatId) ? (
          <p className="text-sm text-muted-foreground">Chat inválido.</p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            {loadingMore ? (
              <p className="text-center text-xs text-muted-foreground">
                Carregando mensagens antigas…
              </p>
            ) : hasMore ? (
              <p className="text-center text-xs text-muted-foreground">
                Role para cima para carregar mais
              </p>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                Início do chat
              </p>
            )}

            {grouped.map((item, idx) => {
              if (item.kind === "day") {
                return (
                  <div key={`day-${idx}`} className="flex justify-center">
                    <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                      {item.label}
                    </span>
                  </div>
                );
              }

              const safe = DOMPurify.sanitize(renderRichHtml(item.m.content));
              const avatar =
                item.m.persona.user_avatar ?? item.m.persona.avatar_url ?? null;

              return (
                <div
                  key={item.m.id}
                  className={`flex ${item.mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] ${item.mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    <UserCardModal
                      user={{
                        username: item.m.persona.username,
                        display_name:
                          item.m.persona.display_name ?? item.m.persona.name,
                        avatar_url: avatar,
                      }}
                    >
                      <button
                        type="button"
                        className="mb-2 flex items-center gap-2 text-left"
                      >
                        <div className="h-6 w-6 overflow-hidden rounded-full border bg-background/50">
                          {avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={avatar}
                              alt="avatar"
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <span className="text-xs font-semibold opacity-80">
                          {item.m.persona.display_name ?? item.m.persona.name}
                        </span>
                      </button>
                    </UserCardModal>

                    {/* ações da msg */}
                    <div className="mb-2 flex gap-2">
                      <button
                        type="button"
                        className="text-xs opacity-80 underline"
                        onClick={() => setReplyTo(item.m)}
                      >
                        Responder
                      </button>
                    </div>

                    <div
                      className="prose max-w-none break-words text-sm"
                      dangerouslySetInnerHTML={{ __html: safe }}
                    />
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className="border-t bg-background p-3 md:p-4">
        {/* typing */}
        {typingUsers.length > 0 ? (
          <div className="mb-2 text-xs text-muted-foreground">
            {typingUsers.join(", ")}{" "}
            {typingUsers.length === 1 ? "está digitando…" : "estão digitando…"}
          </div>
        ) : null}

        {/* reply preview */}
        {replyTo ? (
          <div className="mb-2 flex items-center justify-between rounded-2xl border bg-muted/40 px-3 py-2">
            <div className="min-w-0">
              <div className="text-xs font-semibold">Respondendo</div>
              <div className="truncate text-xs text-muted-foreground">
                {replyTo.persona.display_name ?? replyTo.persona.name}
              </div>
            </div>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-2xl"
              onClick={() => setReplyTo(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        <div className="rounded-2xl border bg-background p-2">
          <RichTextEditor
            valueHtml={inputHtml}
            onChangeHtml={(v) => {
              setInputHtml(v);

              // typing start/stop com debounce
              if (activePersona) {
                sendTyping(true);
                window.clearTimeout(typingTimeoutRef.current ?? undefined);
                typingTimeoutRef.current = window.setTimeout(
                  () => sendTyping(false),
                  1400,
                );
              }
            }}
            placeholder={
              activePersona
                ? `Mensagem como ${activePersona.name}`
                : "Selecione uma persona"
            }
            compact
            bucket="media"
            folder="chats"
            imageInsertMode="both"
            enableTables={false}
            aminoStyle
          />
        </div>

        <div className="mt-2 flex justify-end">
          <Button
            className="rounded-2xl"
            onClick={() => void sendMessage()}
            disabled={!activePersona || sending}
          >
            {sending ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
