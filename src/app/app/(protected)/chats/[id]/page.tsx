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
import { isRichHtmlEmpty } from "@/lib/editor/isRichHtmlEmpty";
import WallpaperBackground from "@/components/ui/WallpaperBackground";

type UiMessage = {
  id: string;
  content: string;
  created_at: string;
  persona_id: string;
  reply_to: string | null;
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

type ReplyDraft = {
  id: string;
  name: string;
  preview: string;
};

type ReplyLookup = {
  id: string;
  author: string;
  preview: string;
};

type TypingPresence = {
  typing: boolean;
  personaId: string;
  personaName: string;
  ts: number;
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

function htmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isMissingColumnError(err: unknown, column: string) {
  if (!err || typeof err !== "object") return false;
  const anyErr = err as any;
  const code = String(anyErr.code ?? "");
  const message = String(anyErr.message ?? "").toLowerCase();
  const details = String(anyErr.details ?? "").toLowerCase();
  const col = column.toLowerCase();
  const mentions =
    message.includes(col) ||
    details.includes(col) ||
    message.includes("column");
  return code === "42703" || (mentions && message.includes("does not exist"));
}

const PAGE_SIZE = 40;

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
  // Fix #2: usar wallpaper_slug (TEXT) em vez de wallpaper_id (UUID FK)
  const [chatWallpaperSlug, setChatWallpaperSlug] = useState<string | null>(
    null,
  );

  const [hasReplyToColumn, setHasReplyToColumn] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pendingNewCount, setPendingNewCount] = useState(0);

  const [replyTo, setReplyTo] = useState<ReplyDraft | null>(null);
  const [replyLookup, setReplyLookup] = useState<Record<string, ReplyLookup>>(
    {},
  );
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);

  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingStopTimeoutRef = useRef<number | null>(null);
  const typingTrackThrottleRef = useRef<number>(0);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );

  const didInitialScrollRef = useRef(false);
  // Fix #3: listRef com min-h-0 no JSX para scroll funcionar no mobile
  const listRef = useRef<HTMLDivElement>(null);

  function scrollToBottom(smooth = false) {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setPendingNewCount(0);
  }

  function performInitialScroll() {
    if (didInitialScrollRef.current) return;
    didInitialScrollRef.current = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToBottom(false));
    });
  }

  function isNearBottom() {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 240;
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

  async function selectMessages(
    validChatId: string,
    opts: { before?: string; limit: number },
  ) {
    const baseCols =
      "id,persona_id,content,created_at,personas!inner(id,user_id,name,avatar_url)";
    const withReplyCols =
      "id,persona_id,content,created_at,reply_to,personas!inner(id,user_id,name,avatar_url)";

    if (hasReplyToColumn) {
      let q = supabase
        .from("messages")
        .select(withReplyCols)
        .eq("chat_id", validChatId);
      if (opts.before) q = q.lt("created_at", opts.before);
      const res = await q
        .order("created_at", { ascending: false })
        .limit(opts.limit);
      if (res.error && isMissingColumnError(res.error, "reply_to")) {
        setHasReplyToColumn(false);
      } else {
        return res;
      }
    }

    let q2 = supabase
      .from("messages")
      .select(baseCols)
      .eq("chat_id", validChatId);
    if (opts.before) q2 = q2.lt("created_at", opts.before);
    return q2.order("created_at", { ascending: false }).limit(opts.limit);
  }

  /** Fix: atualiza last_read_at quando o usuário abre o chat */
  async function markAsRead(validChatId: string) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    // Atualiza last_read_at em chat_participants para este usuário neste chat
    await supabase
      .from("chat_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("chat_id", validChatId)
      .eq("user_id", userData.user.id);
  }

  async function loadInitial(validChatId: string) {
    setLoading(true);
    try {
      // Fix #2: busca wallpaper_slug (TEXT) em vez de wallpaper_id (UUID)
      let chatRes = await supabase
        .from("chats")
        .select("title,wallpaper_slug")
        .eq("id", validChatId)
        .maybeSingle();

      if (
        chatRes.error &&
        isMissingColumnError(chatRes.error, "wallpaper_slug")
      ) {
        chatRes = await supabase
          .from("chats")
          .select("title")
          .eq("id", validChatId)
          .maybeSingle();
      }

      if (chatRes.data?.title) setChatTitle(chatRes.data.title);
      setChatWallpaperSlug(
        (chatRes.data as { wallpaper_slug?: string | null } | null)
          ?.wallpaper_slug ?? null,
      );

      didInitialScrollRef.current = false;

      const res = await selectMessages(validChatId, { limit: PAGE_SIZE });

      if (res.error) {
        toast.error(res.error.message);
        setMessages([]);
        setHasMore(false);
        return;
      }

      const rows = (res.data ?? []) as unknown as MessageRow[];
      const profileMap = await fetchProfilesMap(rows);
      const mapped = mapRows(rows, profileMap).reverse();

      setMessages(mapped);
      setReplyLookup({});
      setHasMore(rows.length === PAGE_SIZE);

      performInitialScroll();

      // Marca como lido ao abrir
      void markAsRead(validChatId);
    } finally {
      setLoading(false);
    }
  }

  async function loadOlder() {
    if (
      !chatId ||
      !isUuid(chatId) ||
      !hasMore ||
      loadingMore ||
      messages.length === 0
    )
      return;
    setLoadingMore(true);
    try {
      const el = listRef.current;
      const prevScrollHeight = el?.scrollHeight ?? 0;
      const prevScrollTop = el?.scrollTop ?? 0;
      const oldest = messages[0];

      const res = await selectMessages(chatId, {
        before: oldest.created_at,
        limit: PAGE_SIZE,
      });

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

      setMessages((prev) => [...mapped, ...prev]);
      setHasMore(rows.length === PAGE_SIZE);

      setTimeout(() => {
        const nextEl = listRef.current;
        if (!nextEl) return;
        nextEl.scrollTop =
          nextEl.scrollHeight - prevScrollHeight + prevScrollTop;
      }, 0);
    } finally {
      setLoadingMore(false);
    }
  }

  async function fetchOneMessage(messageId: string): Promise<UiMessage | null> {
    const baseCols =
      "id,persona_id,content,created_at,personas!inner(id,user_id,name,avatar_url)";
    const withReplyCols =
      "id,persona_id,content,created_at,reply_to,personas!inner(id,user_id,name,avatar_url)";

    if (hasReplyToColumn) {
      const res = await supabase
        .from("messages")
        .select(withReplyCols)
        .eq("id", messageId)
        .maybeSingle();
      if (res.error && isMissingColumnError(res.error, "reply_to")) {
        setHasReplyToColumn(false);
      } else if (!res.error && res.data) {
        const row = res.data as unknown as MessageRow;
        const profileMap = await fetchProfilesMap([row]);
        return mapRows([row], profileMap)[0] ?? null;
      }
    }

    const res2 = await supabase
      .from("messages")
      .select(baseCols)
      .eq("id", messageId)
      .maybeSingle();
    if (res2.error || !res2.data) return null;
    const row2 = res2.data as unknown as MessageRow;
    const profileMap2 = await fetchProfilesMap([row2]);
    return mapRows([row2], profileMap2)[0] ?? null;
  }

  function jumpToMessage(messageId: string) {
    const container = listRef.current;
    if (!container) return;
    const target = container.querySelector<HTMLElement>(
      `[data-message-id="${messageId}"]`,
    );
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(messageId);
    window.setTimeout(() => {
      setHighlightedMessageId((curr) => (curr === messageId ? null : curr));
    }, 1500);
  }

  async function resolveReplyMessage(replyId: string) {
    const existing = messages.find((m) => m.id === replyId);
    if (existing) {
      const author = existing.persona.display_name ?? existing.persona.name;
      const preview = htmlToPlainText(existing.content).slice(0, 100);
      setReplyLookup((prev) => ({
        ...prev,
        [replyId]: { id: replyId, author, preview },
      }));
      jumpToMessage(replyId);
      return;
    }

    if (replyLookup[replyId]) {
      toast.message("Mensagem original não está carregada na conversa.");
      return;
    }

    const fetched = await fetchOneMessage(replyId);
    if (!fetched) {
      toast.error("Não foi possível carregar a mensagem original.");
      return;
    }

    const author = fetched.persona.display_name ?? fetched.persona.name;
    const preview = htmlToPlainText(fetched.content).slice(0, 100);
    setReplyLookup((prev) => ({
      ...prev,
      [replyId]: { id: replyId, author, preview },
    }));
    toast.message(
      "Mensagem original carregada. Role para cima para localizar no histórico.",
    );
  }

  async function sendMessage() {
    if (!chatId || !isUuid(chatId) || !activePersona || sending) return;
    const cleaned = (inputHtml || "").trim();
    if (isRichHtmlEmpty(cleaned)) return;

    setSending(true);
    try {
      const fallbackPrefix = replyTo
        ? `<blockquote><small>Respondendo a ${DOMPurify.sanitize(replyTo.name)}: ${DOMPurify.sanitize(replyTo.preview)}</small></blockquote>`
        : "";
      const contentToSend = hasReplyToColumn
        ? cleaned
        : `${fallbackPrefix}${cleaned}`;

      let insertedId: string | null = null;

      if (hasReplyToColumn) {
        const withReplyRes = await supabase
          .from("messages")
          .insert({
            chat_id: chatId,
            persona_id: activePersona.id,
            content: contentToSend,
            reply_to: replyTo?.id ?? null,
          })
          .select("id")
          .maybeSingle();

        if (withReplyRes.error) {
          if (isMissingColumnError(withReplyRes.error, "reply_to")) {
            setHasReplyToColumn(false);
          } else {
            toast.error(withReplyRes.error.message);
            return;
          }
        } else {
          insertedId = withReplyRes.data?.id ?? null;
        }
      }

      if (!insertedId) {
        const fallbackRes = await supabase
          .from("messages")
          .insert({
            chat_id: chatId,
            persona_id: activePersona.id,
            content: contentToSend,
          })
          .select("id")
          .maybeSingle();

        if (fallbackRes.error) {
          toast.error(fallbackRes.error.message);
          return;
        }
        insertedId = fallbackRes.data?.id ?? null;
      }

      setInputHtml("");
      setReplyTo(null);

      if (typingChannelRef.current) {
        void typingChannelRef.current.track({
          typing: false,
          personaId: activePersona.id,
          personaName: activePersona.name,
          ts: Date.now(),
        } satisfies TypingPresence);
      }

      // Atualiza last_read_at ao enviar também
      void markAsRead(chatId);

      if (insertedId && isNearBottom())
        setTimeout(() => scrollToBottom(true), 0);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (!chatId || !isUuid(chatId)) {
      setLoading(false);
      setMessages([]);
      return;
    }

    void loadInitial(chatId);

    const messageChannel = supabase
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
          const newId = (payload.new as any)?.id;
          if (typeof newId !== "string") return;

          const nearBottom = isNearBottom();
          const one = await fetchOneMessage(newId);
          if (!one) return;

          let inserted = false;
          setMessages((prev) => {
            if (prev.some((m) => m.id === one.id)) return prev;
            inserted = true;
            return [...prev, one];
          });

          if (!inserted) return;
          if (nearBottom) {
            setTimeout(() => scrollToBottom(true), 0);
            // Marca como lido quando nova mensagem chega e está no fim
            void markAsRead(chatId);
          } else {
            setPendingNewCount((prev) => prev + 1);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    if (loading || messages.length === 0) return;
    const t1 = window.setTimeout(() => scrollToBottom(false), 0);
    const t2 = window.setTimeout(() => scrollToBottom(false), 140);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [loading, chatId]);

  useEffect(() => {
    if (!chatId || !isUuid(chatId) || !activePersona) return;

    const typingChannel = supabase.channel(`presence-chat-${chatId}`, {
      config: { presence: { key: activePersona.id } },
    });
    typingChannelRef.current = typingChannel;

    const recalcTypingUsers = () => {
      const presence = typingChannel.presenceState<TypingPresence>();
      const names = Object.values(presence)
        .flatMap((entries) => entries)
        .filter(
          (e) =>
            e.typing &&
            e.personaId !== activePersona.id &&
            Date.now() - Number(e.ts ?? 0) < 3000,
        )
        .map((e) => e.personaName)
        .slice(0, 2);
      setTypingUsers(Array.from(new Set(names)));
    };

    typingChannel
      .on("presence", { event: "sync" }, recalcTypingUsers)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void typingChannel.track({
            typing: false,
            personaId: activePersona.id,
            personaName: activePersona.name,
            ts: Date.now(),
          } satisfies TypingPresence);
          recalcTypingUsers();
        }
      });

    const typingRefreshTimer = window.setInterval(recalcTypingUsers, 1000);

    return () => {
      if (typingStopTimeoutRef.current)
        window.clearTimeout(typingStopTimeoutRef.current);
      window.clearInterval(typingRefreshTimer);
      void typingChannel.untrack();
      supabase.removeChannel(typingChannel);
      typingChannelRef.current = null;
      setTypingUsers([]);
    };
  }, [chatId, activePersona]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    function onScroll() {
      if (isNearBottom()) setPendingNewCount(0);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

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
    // Fix #2: wallpaperSlug em vez de wallpaperId
    <WallpaperBackground
      wallpaperSlug={chatWallpaperSlug}
      className="min-h-dvh w-full"
    >
      {/* Fix #3: flex-col + h-dvh → o listRef com min-h-0 permite scroll real no mobile */}
      <div className="mx-auto flex h-dvh w-full max-w-[1200px] flex-col">
        <header className="shrink-0 border-b bg-background/90 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3 md:px-6">
            <Button
              variant="secondary"
              className="rounded-2xl"
              onClick={() => router.push("/app/chats")}
            >
              Voltar
            </Button>
            <div className="text-center">
              <p className="text-base font-semibold">{chatTitle}</p>
              <p className="text-xs text-muted-foreground">
                {activePersona
                  ? `Falando como ${activePersona.name}`
                  : "Selecione uma persona"}
              </p>
            </div>
            <div className="w-20" />
          </div>
        </header>

        {/* Fix #3: min-h-0 é ESSENCIAL — sem ele o flex-child não respeita a altura do pai e overflow-y-auto não cria scroll */}
        <div
          ref={listRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 md:px-8"
        >
          {!chatId || !isUuid(chatId) ? (
            <p className="text-sm text-muted-foreground">Chat inválido.</p>
          ) : loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <>
              {hasMore ? (
                <div className="flex justify-center">
                  <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => void loadOlder()}
                    disabled={loadingMore}
                  >
                    {loadingMore
                      ? "Carregando mensagens antigas..."
                      : "Carregar mensagens anteriores"}
                  </Button>
                </div>
              ) : (
                <p className="text-center text-xs text-muted-foreground">
                  Você chegou no começo
                </p>
              )}

              {pendingNewCount > 0 && (
                <div className="sticky top-2 z-20 flex justify-center">
                  <button
                    type="button"
                    className="rounded-full border bg-background px-3 py-1 text-xs shadow"
                    onClick={() => scrollToBottom(true)}
                  >
                    {pendingNewCount} novas mensagens
                  </button>
                </div>
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
                  item.m.persona.user_avatar ??
                  item.m.persona.avatar_url ??
                  null;

                return (
                  <div
                    key={item.m.id}
                    data-message-id={item.m.id}
                    className={`flex ${item.mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] transition ${item.mine ? "bg-primary text-primary-foreground" : "bg-muted"} ${highlightedMessageId === item.m.id ? "ring-2 ring-primary" : ""}`}
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
                            {avatar && (
                              <img
                                src={avatar}
                                alt="avatar"
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <span className="text-xs font-semibold opacity-80">
                            {item.m.persona.display_name ?? item.m.persona.name}
                          </span>
                        </button>
                      </UserCardModal>

                      <div className="mb-2">
                        <button
                          type="button"
                          className="text-xs opacity-80 underline"
                          onClick={() =>
                            setReplyTo({
                              id: item.m.id,
                              name:
                                item.m.persona.display_name ??
                                item.m.persona.name,
                              preview: htmlToPlainText(item.m.content).slice(
                                0,
                                80,
                              ),
                            })
                          }
                        >
                          Responder
                        </button>
                      </div>

                      {hasReplyToColumn && item.m.reply_to && (
                        <button
                          type="button"
                          className="mb-2 block w-full rounded-xl border border-border/70 bg-background/60 px-2 py-1 text-left text-xs text-muted-foreground"
                          onClick={() =>
                            void resolveReplyMessage(item.m.reply_to as string)
                          }
                        >
                          {replyLookup[item.m.reply_to] ? (
                            <>
                              Resposta a @{replyLookup[item.m.reply_to].author}:{" "}
                              {replyLookup[item.m.reply_to].preview}
                            </>
                          ) : (
                            "Resposta a uma mensagem (toque para carregar)"
                          )}
                        </button>
                      )}

                      <div
                        className="prose max-w-none break-words text-sm"
                        dangerouslySetInnerHTML={{ __html: safe }}
                      />
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="shrink-0 border-t bg-background/90 backdrop-blur p-3 md:p-4">
          {typingUsers.length > 0 && (
            <div className="mb-2 text-xs text-muted-foreground">
              {typingUsers.join(", ")}{" "}
              {typingUsers.length === 1
                ? "está digitando…"
                : "estão digitando…"}
            </div>
          )}

          {replyTo && (
            <div className="mb-2 flex items-center justify-between rounded-2xl border bg-muted/40 px-3 py-2">
              <div className="min-w-0">
                <div className="text-xs font-semibold">
                  Respondendo a {replyTo.name}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {replyTo.preview}
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
          )}

          <div className="rounded-2xl border bg-background p-2">
            <RichTextEditor
              valueHtml={inputHtml}
              onChangeHtml={(v) => {
                setInputHtml(v);
                if (!activePersona || !typingChannelRef.current) return;
                if (Date.now() - typingTrackThrottleRef.current > 800) {
                  typingTrackThrottleRef.current = Date.now();
                  void typingChannelRef.current.track({
                    typing: true,
                    personaId: activePersona.id,
                    personaName: activePersona.name,
                    ts: Date.now(),
                  } satisfies TypingPresence);
                }
                if (typingStopTimeoutRef.current)
                  window.clearTimeout(typingStopTimeoutRef.current);
                typingStopTimeoutRef.current = window.setTimeout(() => {
                  if (!typingChannelRef.current || !activePersona) return;
                  void typingChannelRef.current.track({
                    typing: false,
                    personaId: activePersona.id,
                    personaName: activePersona.name,
                    ts: Date.now(),
                  } satisfies TypingPresence);
                }, 800);
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
    </WallpaperBackground>
  );
}
