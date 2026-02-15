"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parseDocContent } from "@/lib/content/docMeta";
import { FileText } from "lucide-react";
import WallpaperBackground from "@/components/ui/WallpaperBackground";
import { safeSelect } from "@/lib/supabase/fallback";

// ⚠️ ajuste se necessário
import PostComments from "@/app/app/(protected)/feed/PostComments";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import HighlightButtonGroup from "@/components/highlights/HighlightButtonGroup";
import {
  getCommunityHighlights,
  type Highlight,
  type HighlightTargetType,
  type NormalizedHighlight,
} from "@/lib/highlights/highlights";

type Post = {
  id: string;
  content: string;
  created_at: string;
  title: string;
  excerpt: string;
  coverColor: string;
  wallpaperId: string | null;
  persona: {
    id: string;
    name: string;
    avatar_url?: string | null;
  };
};


function toExcerpt(html: string) {
  const plain = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= 220) return plain;
  return `${plain.slice(0, 220).trim()}...`;
}

export default function FeedPage() {
  const { activePersona } = useActivePersona();

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);

  const [highlightsLoading, setHighlightsLoading] = useState(true);
  const [highlights, setHighlights] = useState<NormalizedHighlight[]>([]);
  const [highlightFilter, setHighlightFilter] = useState<
    "all" | HighlightTargetType
  >("all");

  // cache: persona_id -> { name, avatar_url }
  const personaCache = useRef<
    Record<string, { name: string; avatar_url: string | null }>
  >({});

  async function loadPosts() {
    setLoading(true);

    const res = await safeSelect({
      missingColumn: "wallpaper_id",
      // fallback para ambientes sem wallpaper_id
      primary: () =>
        supabase
          .from("posts")
          .select(
            `
              id,
              content,
              created_at,
              persona_id,
              wallpaper_id,
              personas:personas (
                id,
                name,
                avatar_url
              )
            `,
          )
          .order("created_at", { ascending: false })
          .limit(50),
      fallback: () =>
        supabase
          .from("posts")
          .select(
            `
              id,
              content,
              created_at,
              persona_id,
              personas:personas (
                id,
                name,
                avatar_url
              )
            `,
          )
          .order("created_at", { ascending: false })
          .limit(50),
    });

    if (res.error) {
      console.error("ERRO loadPosts:", res.error);
      setPosts([]);
      setLoading(false);
      return;
    }

    const mapped: Post[] = (res.data ?? []).map((row: any) => {
    const parsed = parseDocContent(row.content ?? "");
    const derivedTitle = parsed.title?.trim() || "Sem título";

    return {
      id: row.id,
      content: row.content,
      created_at: row.created_at,
      title: derivedTitle,
      excerpt: toExcerpt(parsed.bodyHtml || row.content || ""),
      coverColor: parsed.backgroundColor,
      // ✅ aqui pode não existir, então “?? null” resolve
      wallpaperId: (row as any).wallpaper_id ?? null,
      persona: {
        id: row.persona_id,
        name: row.personas?.name ?? "Desconhecido",
        avatar_url: row.personas?.avatar_url ?? null,
      },
    };
  });

    for (const p of mapped) {
      personaCache.current[p.persona.id] = {
        name: p.persona.name,
        avatar_url: p.persona.avatar_url ?? null,
      };
    }

    setPosts(mapped);
    setLoading(false);
  }


  async function normalizeHighlights(items: Highlight[]): Promise<NormalizedHighlight[]> {
    const wikiIds = items
      .filter((item) => item.target_type === "wiki" && !item.title?.trim())
      .map((item) => item.target_id);
    const postIds = items
      .filter((item) => item.target_type === "post" && !item.title?.trim())
      .map((item) => item.target_id);

    let wikiTitleMap = new Map<string, string>();
    let postTitleMap = new Map<string, string>();

    if (wikiIds.length > 0) {
      const { data } = await supabase
        .from("wiki_pages")
        .select("id,title")
        .in("id", wikiIds);
      wikiTitleMap = new Map(
        (data ?? []).map((row: any) => [String(row.id), (row.title as string) ?? ""]),
      );
    }

    if (postIds.length > 0) {
      const postRes = await safeSelect({
        missingColumn: "wallpaper_id",
        // fallback para ambientes sem colunas novas no posts
        primary: () =>
          supabase.from("posts").select("id,content,wallpaper_id").in("id", postIds),
        fallback: () =>
          supabase.from("posts").select("id,content").in("id", postIds),
      });

      postTitleMap = new Map(
        ((postRes.data ?? []) as Array<{ id: string; content?: string | null }>).map((row) => {
          const parsed = parseDocContent(row.content ?? "");
          return [row.id, parsed.title?.trim() || ""];
        }),
      );
    }

    return items.map((item) => {
      const original = item.title?.trim();
      if (original) return { ...item, title: original };

      if (item.target_type === "wiki") {
        const realTitle = wikiTitleMap.get(item.target_id)?.trim();
        if (!realTitle) {
          return { ...item, title: "Wiki removida", isRemoved: true };
        }
        return { ...item, title: realTitle };
      }

      const postTitle = postTitleMap.get(item.target_id)?.trim();
      if (!postTitle) {
        return { ...item, title: "Post removido", isRemoved: true };
      }
      return { ...item, title: postTitle };
    });
  }


  async function loadHighlights() {
    setHighlightsLoading(true);

    // se não está logado, não mostra destaques (por enquanto)
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setHighlights([]);
      setHighlightsLoading(false);
      return;
    }

    const data = await getCommunityHighlights();
    const limited = (data ?? []).slice(0, 8);
    const normalized = await normalizeHighlights(limited);

    setHighlights(normalized);
    setHighlightsLoading(false);
  }

  useEffect(() => {
    void loadPosts();
    void loadHighlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredHighlights =
    highlightFilter === "all"
      ? highlights
      : highlights.filter((item) => item.target_type === highlightFilter);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1200px] flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Feed</h1>
          <p className="truncate text-xs text-muted-foreground">
            Postando como: {activePersona?.name ?? "—"}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            variant="secondary"
            className="w-full rounded-2xl sm:w-auto"
            onClick={() => (location.href = "/app/drafts")}
          >
            Rascunhos
          </Button>

          <Button
            variant="secondary"
            className="w-full rounded-2xl sm:w-auto"
            onClick={() => {
              void loadPosts();
              void loadHighlights();
            }}
          >
            Atualizar
          </Button>

          <Button
            className="w-full rounded-2xl sm:w-auto"
            onClick={() => (location.href = "/app/feed/new")}
            disabled={!activePersona}
            title={!activePersona ? "Selecione uma persona" : "Novo post"}
          >
            Novo
          </Button>
        </div>
      </header>

      {/* Destaques */}
      {!loading && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Destaques da comunidade</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <ToggleGroup
              type="single"
              value={highlightFilter}
              onValueChange={(value) =>
                setHighlightFilter(
                  (value as "all" | HighlightTargetType) || "all",
                )
              }
              className="flex flex-wrap gap-2"
            >
              <ToggleGroupItem value="all" className="rounded-2xl border">
                Todos
              </ToggleGroupItem>
              <ToggleGroupItem value="post" className="rounded-2xl border">
                Posts
              </ToggleGroupItem>
              <ToggleGroupItem value="wiki" className="rounded-2xl border">
                Wikis
              </ToggleGroupItem>
            </ToggleGroup>

            {highlightsLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="aspect-square animate-pulse rounded-2xl border bg-muted/40"
                  />
                ))}
              </div>
            ) : filteredHighlights.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Nenhum destaque ainda.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredHighlights.map((item) => {
                  const isWiki = item.target_type === "wiki";
                  const title = item.title;
                  const disabled = !!item.isRemoved;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`aspect-square overflow-hidden rounded-2xl border text-left transition ${disabled ? "cursor-not-allowed opacity-75" : "hover:bg-muted/30"}`}
                      onClick={() => {
                        if (disabled) return;
                        location.href = isWiki
                          ? `/app/wiki/${item.target_id}`
                          : `/app/post/${item.target_id}`;
                      }}
                    >
                      <div className="flex h-full flex-col">
                        <div className="flex-1 bg-muted/40">
                          {item.cover_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.cover_url}
                              alt={title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <WallpaperBackground
                              wallpaperId={isWiki ? "frostBlue" : "royalGrid"}
                              fallback="#dbeafe"
                              className="h-full w-full"
                            />
                          )}
                        </div>

                        <div className="space-y-2 p-3">
                          <span className="inline-flex rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                            {item.isRemoved ? "Removido" : isWiki ? "Wiki" : "Post"}
                          </span>

                          <div className="truncate text-sm font-medium">
                            {title}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de posts */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : posts.length === 0 ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Nada por aqui ainda</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Crie o primeiro post clicando em <b>Novo</b>.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {posts.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer rounded-2xl shadow-sm"
              onClick={() => (location.href = `/app/post/${p.id}`)}
            >
              <CardHeader className="space-y-2 pb-2">
                <CardTitle className="line-clamp-2 text-base">
                  {p.title}
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                  por @{p.persona.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleString("pt-BR")}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="relative aspect-[16/9] overflow-hidden rounded-xl border bg-muted/30">
                  <WallpaperBackground
                    wallpaperId={p.wallpaperId}
                    fallback={p.coverColor || "#f8fafc"}
                    className="h-full w-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground/70" />
                  </div>
                </div>

                <p className="line-clamp-4 text-sm text-muted-foreground">
                  {p.excerpt || "Sem prévia disponível."}
                </p>
                <p className="text-sm font-medium text-primary">Ler mais</p>

                {/* ✅ Botões de destaque (não deve navegar ao clicar) */}
                <div onClick={(e) => e.stopPropagation()}>
                  <HighlightButtonGroup
                    targetType="post"
                    targetId={p.id}
                    title={p.title}
                  />
                </div>

                {/* ✅ comentários do post (não deve navegar ao clicar) */}
                <div onClick={(event) => event.stopPropagation()}>
                  <PostComments postId={p.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
