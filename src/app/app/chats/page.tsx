"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Button } from "@/components/ui/button";
import RichTextEditor from "@/components/editor/RichTextEditor";
import { renderRichHtml } from "@/lib/render/richText";

const CHAT_ID = "30377141-83e8-4d30-a8e8-1004688c5809";

type Message = {
  id: string;
  content: string; // HTML
  created_at: string;
  persona: {
    id: string;
    name: string;
    avatar_url?: string | null;
  };
  optimistic?: boolean;
};

export default function ChatPage() {
  const { activePersona } = useActivePersona();

  const [messages, setMessages] = useState<Message[]>([]);
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // cache: persona_id -> { name, avatar_url }
  const personaCache = useRef<
    Record<string, { name: string; avatar_url: string | null }>
  >({});

  // auto-scroll só quando o usuário está “no fim”
  const stickToBottomRef = useRef(true);

  const activePersonaId = activePersona?.id ?? null;

  function isNearBottom() {
    const el = scrollerRef.current;
    if (!el) return true;
    const threshold = 140;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }

  function scrollToBottom(smooth = true) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }

  async function ensurePersona(personaId: string) {
    if (personaCache.current[personaId]) return personaCache.current[personaId];

    const { data, error } = await supabase
      .from("personas")
      .select("id, name, avatar_url")
      .eq("id", personaId)
      .maybeSingle();

    if (error || !data) {
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

  async function loadMessages() {
    setLoading(true);

    const { data, error } = await supabase
      .from("messages")
      .select(
        `
        id,
        content,
        created_at,
        persona_id,
        personas (
          name,
          avatar_url
        )
      `
      )
      .eq("chat_id", CHAT_ID)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      console.error("ERRO loadMessages:", error);
      setLoading(false);
      return;
    }

    const mapped: Message[] = (data ?? []).map((row: any) => ({
      id: row.id,
      content: row.content,
      created_at: row.created_at,
      persona: {
        id: row.persona_id,
        name: row.personas?.name ?? "Desconhecido",
        avatar_url: row.personas?.avatar_url ?? null,
      },
    }));

    for (const msg of mapped) {
      personaCache.current[msg.persona.id] = {
        name: msg.persona.name,
        avatar_url: msg.persona.avatar_url ?? null,
      };
    }

    setMessages(mapped);
    setLoading(false);

    stickToBottomRef.current = true;
    setTimeout(() => scrollToBottom(false), 0);
  }

  async function sendMessage() {
    const content = html.trim();
    if (!content || content === "<p></p>") return;

    if (!activePersona) return;

    // se está no fim, mantém “grudado”
    stickToBottomRef.current = isNearBottom();

    // alimenta cache com sua persona
    personaCache.current[activePersona.id] = {
      name: activePersona.name,
      avatar_url: (activePersona as any).avatar_url ?? null,
    };

    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const optimistic: Message = {
      id: optimisticId,
      content,
      created_at: new Date().toISOString(),
      persona: {
        id: activePersona.id,
        name: activePersona.name,
        avatar_url: (activePersona as any).avatar_url ?? null,
      },
      optimistic: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setHtml("");

    setTimeout(() => {
      if (stickToBottomRef.current) scrollToBottom(true);
    }, 0);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        chat_id: CHAT_ID,
        persona_id: activePersona.id,
        content, // HTML
      })
      .select("id, content, created_at, persona_id")
      .single();

    if (error) {
      console.error("ERRO AO ENVIAR:", error);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setHtml(content);
      return;
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === optimisticId
          ? {
              id: data.id,
              content: data.content,
              created_at: data.created_at,
              persona: {
                id: data.persona_id,
                name: activePersona.name,
                avatar_url: (activePersona as any).avatar_url ?? null,
              },
            }
          : m
      )
    );
  }

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`chat-realtime-${CHAT_ID}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${CHAT_ID}`,
        },
        (payload) => {
          const row = payload.new as any;

          // não “puxa” se o usuário está lendo histórico
          stickToBottomRef.current = isNearBottom();

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
              if (stickToBottomRef.current) scrollToBottom(true);
            }, 0);
          })();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rendered = useMemo(() => {
    return messages.map((m) => {
      const isMine = !!activePersonaId && m.persona?.id === activePersonaId;
      return { ...m, _isMine: isMine };
    });
  }, [messages, activePersonaId]);

  function handleScroll() {
    stickToBottomRef.current = isNearBottom();
  }

  // Enter para enviar / Shift+Enter quebra linha
  function onEditorKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex-1 space-y-2 overflow-y-auto p-4"
      >
        {loading && (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        )}

        {rendered.map((m: any) => (
          <div
            key={m.id}
            className={`flex ${m._isMine ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                m._isMine ? "bg-primary text-primary-foreground" : "bg-muted"
              } ${m.optimistic ? "opacity-70" : ""}`}
            >
              {!m._isMine && (
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  {m.persona?.name}
                </div>
              )}

              <div
                className="prose prose-invert max-w-none text-sm"
                dangerouslySetInnerHTML={{
                  __html: renderRichHtml(m.content),
                }}
              />
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3 space-y-2">
        <div className="text-xs text-muted-foreground">
          {activePersona
            ? `Mensagem como ${activePersona.name}`
            : "Selecione uma persona"}
          <span className="ml-2 opacity-70">• Shift+Enter quebra linha</span>
        </div>

        {/* wrapper para capturar Enter/Shift+Enter */}
        <div onKeyDown={onEditorKeyDown}>
          <RichTextEditor
            valueHtml={html}
            onChangeHtml={setHtml}
            placeholder={activePersona ? "Escreva..." : "Selecione uma persona"}
            folder="chat"
            bucket="media"
            compact
            imageInsertMode="both"
          />
        </div>

        <Button
          className="w-full rounded-2xl"
          onClick={sendMessage}
          disabled={!activePersona || !html.trim() || html.trim() === "<p></p>"}
        >
          Enviar
        </Button>
      </div>
    </div>
  );
}
