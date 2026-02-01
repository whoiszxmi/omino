"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CHAT_ID = "30377141-83e8-4d30-a8e8-1004688c5809";

type Message = {
  id: string;
  content: string;
  created_at: string;
  persona: {
    id: string;
    name: string;
    avatar_url?: string | null;
  };
};

export default function ChatPage() {
  const { activePersona } = useActivePersona();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ✅ cache precisa ficar DENTRO do componente (useRef não pode ser no topo do arquivo)
  const personaCache = useRef<
    Record<string, { name: string; avatar_url: string | null }>
  >({});

  const activePersonaId = activePersona?.id ?? null;

  function scrollToBottom(smooth = true) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }

  // ✅ garante (e cacheia) nome/avatar de uma persona
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
      `,
      )
      .eq("chat_id", CHAT_ID)
      .order("created_at", { ascending: true });

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

    // ✅ alimenta o cache com o que veio do join
    for (const msg of mapped) {
      personaCache.current[msg.persona.id] = {
        name: msg.persona.name,
        avatar_url: msg.persona.avatar_url ?? null,
      };
    }

    setMessages(mapped);
    setLoading(false);

    // primeiro load: sem animação
    setTimeout(() => scrollToBottom(false), 0);
  }

  async function sendMessage() {
    const content = text.trim();
    if (!content) return;

    if (!activePersona) {
      console.error("Sem persona ativa");
      return;
    }

    // garante cache da sua persona (pra não virar "…" no realtime em outras abas)
    personaCache.current[activePersona.id] = {
      name: activePersona.name,
      avatar_url: (activePersona as any).avatar_url ?? null,
    };

    // otimista: cria uma mensagem local instantaneamente
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
    };

    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setTimeout(() => scrollToBottom(true), 0);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        chat_id: CHAT_ID,
        persona_id: activePersona.id,
        content,
      })
      .select("id, content, created_at, persona_id")
      .single();

    if (error) {
      console.error("ERRO AO ENVIAR:", error);
      // remove a otimista se falhar
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      // restaura texto pra não perder
      setText(content);
      return;
    }

    // substitui a otimista pelo registro real
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
          : m,
      ),
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

          (async () => {
            const info = await ensurePersona(row.persona_id);

            setMessages((prev) => {
              // evita duplicar (realtime + otimista + reload)
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

            setTimeout(() => scrollToBottom(true), 0);
          })();
        },
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

  useEffect(() => {
    if (!loading) scrollToBottom(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {loading && (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        )}

        {rendered.map((m: any) => (
          <div
            key={m.id}
            className={`flex ${m._isMine ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                m._isMine ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {!m._isMine && (
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  {m.persona?.name}
                </div>
              )}
              <div>{m.content}</div>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t p-3">
        <Input
          placeholder={
            activePersona
              ? `Mensagem como ${activePersona.name}`
              : "Selecione uma persona"
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <Button onClick={sendMessage} disabled={!activePersona || !text.trim()}>
          Enviar
        </Button>
      </div>
    </div>
  );
}
