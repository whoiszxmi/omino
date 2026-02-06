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

type UiMessage = {
  id: string;
  content: string;
  created_at: string;
  persona: { id: string; name: string; avatar_url: string | null };
};

type ChatMeta = {
  id: string;
  type: "group" | "dm";
  title: string | null;
  created_at: string;
  last_message_at: string | null;
};

type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

type MessageRow = {
  id: string;
  chat_id: string;
  persona_id: string;
  content: string;
  created_at: string;
  personas: { id: string; name: string; avatar_url: string | null } | null;
};

type InsertMessageRow = {
  id: string;
  created_at: string;
  persona_id: string;
  content: string;
};

type RealtimeMessageRow = {
  id: string;
  content: string;
  created_at: string;
  persona_id: string;
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

function dayLabel(dateIso: string) {
  const d = new Date(dateIso);
  const now = new Date();

  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();

  const diffDays = (startOf(now) - startOf(d)) / (1000 * 60 * 60 * 24);

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR");
}

export default function ChatRoomPage() {
  const params = useParams<{ id?: string }>();
  const chatId = (params?.id ?? "").toString();

  const router = useRouter();
  const { activePersona } = useActivePersona();
  const activePersonaId = activePersona?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [chatMeta, setChatMeta] = useState<ChatMeta | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [inputHtml, setInputHtml] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [atBottom, setAtBottom] = useState(true);
  const atBottomRef = useRef(true);

  // cache de persona_id -> dados
  const personaCache = useRef<
    Record<string, { name: string; avatar_url: string | null }>
  >({});

  function scrollToBottom(smooth = true) {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }

  function onScroll() {
    const el = listRef.current;
    if (!el) return;

    const threshold = 40;
    const isBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

    setAtBottom(isBottom);
    atBottomRef.current = isBottom;
  }

  async function ensurePersona(personaId: string) {
    if (!personaId) return { name: "Desconhecido", avatar_url: null };

    if (personaCache.current[personaId]) return personaCache.current[personaId];

    const { data, error } = await supabase
      .from("personas")
      .select("id, name, avatar_url")
      .eq("id", personaId)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.error("ERRO ensurePersona:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          raw: error,
        });
      }
      personaCache.current[personaId] = {
        name: "Desconhecido",
        avatar_url: null,
      };
      return personaCache.current[personaId];
    }

    personaCache.current[personaId] = {
      name: data.name,
      avatar_url: data.avatar_url,
    };
    return personaCache.current[personaId];
  }

  async function markAsRead(validChatId: string) {
    const { data: userData } = await supabase.auth.getUser();
    const me = userData.user;
    if (!me) return;

    const { error } = await supabase
      .from("chat_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("chat_id", validChatId)
      .eq("user_id", me.id);

    if (error) {
      console.error("ERRO markAsRead:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        raw: error,
      });
    }
  }

  async function loadChatMeta(validChatId: string) {
    const { data, error } = await supabase
      .from("chats")
      .select("id,type,title,created_at,last_message_at")
      .eq("id", validChatId)
      .maybeSingle();

    if (error) {
      console.error("ERRO loadChatMeta:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        raw: error,
      });
      toast.error(error.message);
      setChatMeta(null);
      return null;
    }

    if (!data) {
      setChatMeta(null);
      return null;
    }

    setChatMeta(data as ChatMeta);
    return data as ChatMeta;
  }

  async function loadMessages(validChatId: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("messages")
      .select(
        `
        id,
        chat_id,
        persona_id,
        content,
        created_at,
        personas (
          id,
          name,
          avatar_url
        )
      `,
      )
      .eq("chat_id", validChatId)
      .order("created_at", { ascending: true })
      .limit(120);

    if (error) {
      const err = error as SupabaseErrorLike;
      console.error("ERRO loadMessages:", {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        raw: err,
      });
      toast.error(err?.message ?? "Erro ao carregar mensagens.");
      setMessages([]);
      setLoading(false);
      return;
    }

    const mapped: UiMessage[] = ((data ?? []) as MessageRow[]).map((row) => {
      const p = row.personas;
      const name = p?.name ?? "Desconhecido";
      const avatar_url = p?.avatar_url ?? null;

      if (row.persona_id) {
        personaCache.current[row.persona_id] = { name, avatar_url };
      }

      return {
        id: row.id,
        content: row.content,
        created_at: row.created_at,
        persona: {
          id: row.persona_id,
          name,
          avatar_url,
        },
      };
    });

    setMessages(mapped);
    setLoading(false);

    setTimeout(() => scrollToBottom(false), 0);
  }

  async function sendMessage() {
    if (!chatId || !isUuid(chatId)) {
      toast.error("Chat inválido. Volte e abra o chat novamente.");
      return;
    }

    if (!activePersona) {
      toast.error("Selecione uma persona para enviar.");
      return;
    }

    if (sending) return;

    const html = (inputHtml || "").trim();
    const cleaned = html
      .replace(/<p>\s*<\/p>/g, "")
      .replace(/<p><br><\/p>/g, "")
      .trim();

    if (!cleaned) return;

    setSending(true);

    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const optimistic: UiMessage = {
      id: optimisticId,
      content: cleaned,
      created_at: new Date().toISOString(),
      persona: {
        id: activePersona.id,
        name: activePersona.name,
        avatar_url: activePersona.avatar_url ?? null,
      },
    };

    setMessages((prev) => [...prev, optimistic]);
    setInputHtml("");
    setTimeout(() => scrollToBottom(true), 0);

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          persona_id: activePersona.id,
          content: cleaned,
        })
        .select("id, created_at, persona_id, content")
        .single();

      if (error) throw error;
      if (!data) throw new Error("Sem retorno do insert.");

      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId
            ? {
                id: (data as InsertMessageRow).id,
                content: (data as InsertMessageRow).content,
                created_at: (data as InsertMessageRow).created_at,
                persona: optimistic.persona,
              }
            : m,
        ),
      );

      // se estou no fim, considera como lido
      if (atBottomRef.current) {
        await markAsRead(chatId);
      }
    } catch (error: unknown) {
      const err = error as SupabaseErrorLike;
      console.error("ERRO sendMessage:", {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        raw: err,
      });

      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInputHtml(html);
      toast.error(err?.message ?? "Não foi possível enviar.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (!chatId || !isUuid(chatId)) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function boot() {
      const meta = await loadChatMeta(chatId);
      if (!meta) {
        setMessages([]);
        setLoading(false);
        return;
      }

      await loadMessages(chatId);
      if (!mounted) return;

      if (atBottomRef.current) {
        await markAsRead(chatId);
      }

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
          (payload) => {
            const row = payload.new as RealtimeMessageRow;

            (async () => {
              const info = await ensurePersona(row.persona_id);

              setMessages((prev) => {
                if (prev.some((m) => m.id === row.id)) return prev;
                return [
                  ...prev,
                  {
                    id: row.id,
                    content: row.content,
                    created_at: row.created_at,
                    persona: {
                      id: row.persona_id,
                      name: info.name,
                      avatar_url: info.avatar_url,
                    },
                  },
                ];
              });

              setTimeout(() => {
                if (atBottomRef.current) scrollToBottom(true);
              }, 0);
            })();
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    const cleanupPromise = boot();

    return () => {
      mounted = false;
      // o channel é removido pelo cleanup retornado dentro do boot via subscribe removal,
      // mas como boot é async, garantimos que o React vai desmontar sem crash.
      void cleanupPromise;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

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
      out.push({
        kind: "msg",
        m,
        mine: !!activePersonaId && m.persona.id === activePersonaId,
      });
    }

    return out;
  }, [messages, activePersonaId]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      {/* Topo */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="flex items-center justify-between p-3">
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={() => router.push("/app/chats")}
          >
            Voltar
          </Button>

          <div className="min-w-0 text-center">
            <div className="truncate text-sm font-semibold">
              {chatMeta?.type === "group"
                ? chatMeta.title ?? "Grupo"
                : "Chat"}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {activePersona
                ? `Falando como: ${activePersona.name}`
                : "Selecione uma persona"}
            </div>
          </div>

          <div className="w-[84px]" />
        </div>
      </header>

      {/* Lista */}
      <div
        ref={listRef}
        onScroll={onScroll}
        className="flex-1 space-y-2 overflow-y-auto px-3 py-3"
      >
        {!chatId || !isUuid(chatId) ? (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Chat inválido. Volte para a lista e abra novamente.
            </div>
            <Button
              type="button"
              variant="secondary"
              className="rounded-2xl"
              onClick={() => router.push("/app/chats")}
            >
              Voltar
            </Button>
          </div>
        ) : loading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : grouped.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Nada ainda. Envie a primeira mensagem.
          </div>
        ) : (
          grouped.map((item, idx) => {
            if (item.kind === "day") {
              return (
                <div key={`day-${idx}`} className="flex justify-center py-2">
                  <span className="rounded-full border px-3 py-1 text-[11px] text-muted-foreground">
                    {item.label}
                  </span>
                </div>
              );
            }

            const { m, mine } = item;

            const safe = DOMPurify.sanitize(renderRichHtml(m.content));

            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {!mine && (
                    <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                      {m.persona.name}
                    </div>
                  )}

                  <div
                    className="prose prose-invert max-w-none text-sm break-words overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: safe }}
                  />
                </div>
              </div>
            );
          })
        )}

        <div ref={bottomRef} />
      </div>

      {/* Botão “ir pro fim” */}
      {!atBottom && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-20 -translate-x-1/2">
          <Button
            type="button"
            className="pointer-events-auto rounded-full"
            variant="secondary"
            onClick={() => scrollToBottom(true)}
          >
            Ir para o fim
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-background p-3 space-y-2">
        <div className="rounded-2xl border bg-background p-2">
          <RichTextEditor
            valueHtml={inputHtml}
            onChangeHtml={setInputHtml}
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

        <div className="flex justify-end">
          <Button
            className="rounded-2xl"
            onClick={sendMessage}
            disabled={!activePersona || sending || !chatId || !isUuid(chatId)}
          >
            {sending ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
