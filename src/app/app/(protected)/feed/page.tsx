"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PostComments from "@/app/app/(protected)/feed/PostComments";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import HighlightButtonGroup from "@/components/highlights/HighlightButtonGroup";
import {
  getCommunityHighlights,
  normalizeHighlights,
  type NormalizedHighlight,
  type HighlightTargetType,
} from "@/lib/highlights/highlights";
import { renderRichHtml, renderBodyHtml } from "@/lib/render/richText";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Loader2,
  PenLine,
  RefreshCw,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import WallpaperBackground from "@/components/ui/WallpaperBackground";
import { parseDocContent } from "@/lib/content/docMeta";

// ─── tipos ────────────────────────────────────────────────────────────────────

// posts schema: id, persona_id, content, created_at,
// wallpaper_slug (TEXT), wallpaper_id (UUID FK) — sem title, sem cover_url
type Post = {
  id: string;
  content: string;
  created_at: string;
  wallpaper_slug: string | null;
  parsedTitle: string;
  persona: { id: string; name: string; avatar_url?: string | null };
};

const PAGE_SIZE = 20;

// ─── helpers ─────────────────────────────────────────────────────────────────

function htmlToText(html: string, maxLen = 240) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  if (h < 24) return `${h}h`;
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ p }: { p: Post }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  // Para o preview, extrai o bodyHtml (sem a section wrapper) e converte para texto
  const parsed = useMemo(() => parseDocContent(p.content), [p.content]);
  const preview = htmlToText(parsed.bodyHtml || p.content);

  return (
    <Card className="overflow-hidden rounded-2xl transition hover:shadow-md">
      {/* Faixa de wallpaper */}
      {p.wallpaper_slug && (
        <div
          className="h-16 w-full cursor-pointer"
          onClick={() => router.push(`/app/post/${p.id}`)}
        >
          <WallpaperBackground
            wallpaperSlug={p.wallpaper_slug}
            className="h-full w-full"
          />
        </div>
      )}

      <CardContent className="space-y-2 p-4">
        {/* Meta */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
            {p.persona.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.persona.avatar_url}
                alt={p.persona.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[10px] font-bold text-muted-foreground">
                {p.persona.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">{p.persona.name}</span>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {relTime(p.created_at)}
          </span>
        </div>

        {/* Título do post, se existir */}
        {parsed.title && (
          <p
            className="cursor-pointer text-sm font-semibold leading-snug"
            onClick={() => router.push(`/app/post/${p.id}`)}
          >
            {parsed.title}
          </p>
        )}

        {/* Preview colapsado */}
        {!expanded && (
          <p
            className="line-clamp-3 cursor-pointer text-sm text-foreground/80"
            onClick={() => router.push(`/app/post/${p.id}`)}
          >
            {preview}
          </p>
        )}

        {/* Conteúdo expandido */}
        {expanded && (
          <div
            className="prose prose-sm max-w-none break-words text-sm"
            dangerouslySetInnerHTML={{ __html: renderBodyHtml(p.content) }}
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Expandir / recolher */}
        <button
          type="button"
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Recolher
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> Ver mais
            </>
          )}
        </button>

        {/* Ações */}
        <div
          className="flex items-center gap-2 border-t pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          <HighlightButtonGroup
            targetType="post"
            targetId={p.id}
            title={p.parsedTitle || "Post"}
          />
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-7 rounded-xl px-2 text-xs"
            onClick={() => router.push(`/app/post/${p.id}`)}
          >
            Abrir
          </Button>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <PostComments postId={p.id} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Highlight Card ───────────────────────────────────────────────────────────

function HighlightCard({ item }: { item: NormalizedHighlight }) {
  const router = useRouter();
  const isWiki = item.target_type === "wiki";
  return (
    <button
      type="button"
      className="group overflow-hidden rounded-2xl border bg-card text-left transition hover:shadow-md active:scale-[0.98]"
      onClick={() =>
        router.push(
          isWiki
            ? `/app/wiki/${item.target_id}`
            : `/app/post/${item.target_id}`,
        )
      }
    >
      <div className="relative h-20 w-full overflow-hidden bg-muted/40">
        {item.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.cover_url}
            alt={item.title ?? ""}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {isWiki ? (
              <BookOpen className="h-5 w-5 text-muted-foreground/30" />
            ) : (
              <PenLine className="h-5 w-5 text-muted-foreground/30" />
            )}
          </div>
        )}
        <span
          className={cn(
            "absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
            isWiki
              ? "bg-blue-500/90 text-white"
              : "bg-violet-500/90 text-white",
          )}
        >
          {isWiki ? "Wiki" : "Post"}
        </span>
      </div>
      <div className="p-2">
        <p className="line-clamp-2 text-[11px] font-semibold leading-snug">
          {item.title || (isWiki ? "Wiki sem título" : "Post sem título")}
        </p>
      </div>
    </button>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function FeedPage() {
  const router = useRouter();
  const { activePersona } = useActivePersona();

  // ── posts state ──────────────────────────────────────────────────────────
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // cursor = created_at do post mais antigo já carregado
  const cursorRef = useRef<string | null>(null);

  // ── highlights state ─────────────────────────────────────────────────────
  const [highlights, setHighlights] = useState<NormalizedHighlight[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(true);
  const [highlightFilter, setHighlightFilter] = useState<
    "all" | HighlightTargetType
  >("all");
  const [showAllHighlights, setShowAllHighlights] = useState(false);

  // ── loaders ───────────────────────────────────────────────────────────────

  const fetchPosts = useCallback(async (cursor: string | null) => {
    // cursor-based pagination: busca PAGE_SIZE posts mais antigos que o cursor
    let q = supabase
      .from("posts")
      .select(
        "id, content, created_at, wallpaper_slug, persona_id, personas(name, avatar_url)",
      )
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (cursor) q = q.lt("created_at", cursor);

    const { data, error } = await q;
    if (error) throw error;

    return (data ?? []).map(
      (row: any): Post => ({
        id: row.id,
        content: row.content,
        created_at: row.created_at,
        wallpaper_slug: row.wallpaper_slug ?? null,
        parsedTitle: parseDocContent(row.content ?? "").title ?? "",
        persona: {
          id: row.persona_id,
          name: row.personas?.name ?? "Desconhecido",
          avatar_url: row.personas?.avatar_url ?? null,
        },
      }),
    );
  }, []);

  async function loadInitial() {
    setLoading(true);
    cursorRef.current = null;
    try {
      const page = await fetchPosts(null);
      setPosts(page);
      setHasMore(page.length === PAGE_SIZE);
      cursorRef.current = page[page.length - 1]?.created_at ?? null;
    } catch (e: any) {
      console.error("ERRO loadPosts:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (loadingMore || !hasMore || !cursorRef.current) return;
    setLoadingMore(true);
    try {
      const page = await fetchPosts(cursorRef.current);
      if (page.length === 0) {
        setHasMore(false);
        return;
      }
      setPosts((prev) => {
        // dedup por id
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...page.filter((p) => !ids.has(p.id))];
      });
      setHasMore(page.length === PAGE_SIZE);
      cursorRef.current = page[page.length - 1]?.created_at ?? null;
    } catch (e: any) {
      console.error("ERRO loadMore:", e);
    } finally {
      setLoadingMore(false);
    }
  }

  async function loadHighlights() {
    setHighlightsLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setHighlights([]);
      setHighlightsLoading(false);
      return;
    }
    const data = await getCommunityHighlights();
    const normalized = await normalizeHighlights((data ?? []).slice(0, 12));
    setHighlights(normalized.filter((h) => !h.isRemoved));
    setHighlightsLoading(false);
  }

  // ── Infinite scroll via IntersectionObserver ──────────────────────────────
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore]);

  useEffect(() => {
    void loadInitial();
    void loadHighlights();
    // Refresh automático a cada 60s para garantir que posts novos aparecem
    // mesmo se o realtime falhar
    const interval = setInterval(() => void loadInitial(), 60_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: novo post aparece no topo automaticamente
  useEffect(() => {
    const channel = supabase
      .channel("feed-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        async (payload) => {
          const row = payload.new as any;
          const { data: p } = await supabase
            .from("personas")
            .select("name, avatar_url")
            .eq("id", row.persona_id)
            .maybeSingle();
          const newPost: Post = {
            id: row.id,
            content: row.content,
            created_at: row.created_at,
            wallpaper_slug: row.wallpaper_slug ?? null,
            parsedTitle: parseDocContent(row.content ?? "").title ?? "",
            persona: {
              id: row.persona_id,
              name: p?.name ?? "Desconhecido",
              avatar_url: p?.avatar_url ?? null,
            },
          };
          setPosts((prev) => {
            if (prev.some((x) => x.id === newPost.id)) return prev;
            return [newPost, ...prev];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── highlights filtrados ──────────────────────────────────────────────────
  const filteredHighlights =
    highlightFilter === "all"
      ? highlights
      : highlights.filter((h) => h.target_type === highlightFilter);

  const visibleHighlights = showAllHighlights
    ? filteredHighlights
    : filteredHighlights.slice(0, 6);

  // ─── render ──────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">Feed</h1>
          <p className="truncate text-xs text-muted-foreground">
            {activePersona
              ? `Como: ${activePersona.name}`
              : "Selecione uma persona"}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-2xl"
            onClick={() => {
              void loadInitial();
              void loadHighlights();
            }}
            disabled={loading}
            title="Atualizar"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="rounded-2xl"
            onClick={() => router.push("/app/drafts")}
          >
            Rascunhos
          </Button>
          <Button
            size="sm"
            className="rounded-2xl"
            onClick={() => router.push("/app/feed/new")}
            disabled={!activePersona}
          >
            Novo post
          </Button>
        </div>
      </header>

      {/* Destaques */}
      <section className="space-y-3 rounded-2xl border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold">Destaques</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-xl px-2 text-xs"
            onClick={() => router.push("/app/highlights")}
          >
            Ver todos
          </Button>
        </div>

        <ToggleGroup
          type="single"
          value={highlightFilter}
          onValueChange={(v) =>
            setHighlightFilter((v as "all" | HighlightTargetType) || "all")
          }
          className="flex gap-1.5"
        >
          {(
            [
              { value: "all", label: "Todos" },
              { value: "post", label: "Posts" },
              { value: "wiki", label: "Wikis" },
            ] as const
          ).map(({ value, label }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              className="h-7 rounded-xl border px-3 text-xs"
            >
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {highlightsLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border bg-muted/40"
              />
            ))}
          </div>
        ) : filteredHighlights.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum destaque ainda.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {visibleHighlights.map((item) => (
                <HighlightCard key={item.id} item={item} />
              ))}
            </div>
            {filteredHighlights.length > 6 && (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowAllHighlights((v) => !v)}
              >
                {showAllHighlights ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Recolher
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />{" "}
                    {filteredHighlights.length - 6} mais
                  </>
                )}
              </button>
            )}
          </>
        )}
      </section>

      {/* Posts */}
      <section className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl border bg-muted/40"
            />
          ))
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <p className="text-sm font-medium">Nada por aqui ainda</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Crie o primeiro post clicando em <b>Novo post</b>.
            </p>
          </div>
        ) : (
          posts.map((p) => <PostCard key={p.id} p={p} />)
        )}
      </section>

      {/* Sentinel de paginação — IntersectionObserver observa este elemento */}
      <div ref={sentinelRef} className="flex justify-center py-4">
        {loadingMore && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando mais posts...
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Você chegou ao fim do feed.
          </p>
        )}
      </div>
    </div>
  );
}
