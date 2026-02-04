"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PostComments from "@/app/app/feed/PostComments";
import HighlightButtonGroup from "@/components/highlights/HighlightButtonGroup";
import { renderRichHtml } from "@/lib/render/richText";
import {
  getCommunityHighlights,
  type HighlightRow,
  type HighlightTargetType,
} from "@/lib/highlights/highlights";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Post = {
  id: string;
  content: string;
  created_at: string;
  persona: {
    id: string;
    name: string;
    avatar_url?: string | null;
  };
};

export default function FeedPage() {
  const { activePersona } = useActivePersona();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(true);
  const [highlights, setHighlights] = useState<HighlightRow[]>([]);
  const [highlightFilter, setHighlightFilter] = useState<
    "all" | HighlightTargetType
  >("all");

  // cache: persona_id -> { name, avatar_url }
  const personaCache = useRef<
    Record<string, { name: string; avatar_url: string | null }>
  >({});

  async function loadPosts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
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
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("ERRO loadPosts:", error);
      setLoading(false);
      return;
    }

    const mapped: Post[] = (data ?? []).map((row: any) => ({
      id: row.id,
      content: row.content,
      created_at: row.created_at,
      persona: {
        id: row.persona_id,
        name: row.personas?.name ?? "Desconhecido",
        avatar_url: row.personas?.avatar_url ?? null,
      },
    }));

    for (const p of mapped) {
      personaCache.current[p.persona.id] = {
        name: p.persona.name,
        avatar_url: p.persona.avatar_url ?? null,
      };
    }

    setPosts(mapped);
    setLoading(false);
  }

  useEffect(() => {
    loadPosts();
    loadHighlights();
  }, []);

  async function loadHighlights() {
    setHighlightsLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setHighlights([]);
      setHighlightsLoading(false);
      return;
    }

    const data = await getCommunityHighlights();
    const limited = data.slice(0, 8);
    const missingWikiTitles = limited
      .filter((item) => item.target_type === "wiki" && !item.title)
      .map((item) => item.target_id);

    let wikiTitles = new Map<string, string>();
    if (missingWikiTitles.length > 0) {
      const { data: wikiData } = await supabase
        .from("wiki_pages")
        .select("id, title")
        .in("id", missingWikiTitles);

      wikiTitles = new Map(
        (wikiData ?? []).map((row) => [row.id, row.title]),
      );
    }

    const normalized = limited.map((item) => {
      if (item.title) return item;
      if (item.target_type === "wiki") {
        return {
          ...item,
          title: wikiTitles.get(item.target_id) ?? "Wiki",
        };
      }
      return { ...item, title: "Post" };
    });

    setHighlights(normalized);
    setHighlightsLoading(false);
  }

  const filteredHighlights =
    highlightFilter === "all"
      ? highlights
      : highlights.filter((item) => item.target_type === highlightFilter);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Feed</h1>
          <p className="truncate text-xs text-muted-foreground">
            Postando como: {activePersona?.name ?? "—"}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={loadPosts}
          >
            Atualizar
          </Button>
          <Button
            className="rounded-2xl"
            onClick={() => (location.href = "/app/feed/new")}
            disabled={!activePersona}
          >
            Novo
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <>
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
                <ToggleGroupItem
                  value="all"
                  aria-label="Todos"
                  className="rounded-2xl border"
                >
                  Todos
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="post"
                  aria-label="Posts"
                  className="rounded-2xl border"
                >
                  Posts
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="wiki"
                  aria-label="Wikis"
                  className="rounded-2xl border"
                >
                  Wikis
                </ToggleGroupItem>
              </ToggleGroup>

              {highlightsLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="aspect-square rounded-2xl border bg-muted/40 animate-pulse"
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
                    const title =
                      item.title ?? (isWiki ? "Wiki" : "Post");

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="aspect-square overflow-hidden rounded-2xl border text-left transition hover:bg-muted/30"
                        onClick={() => {
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
                            ) : null}
                          </div>
                          <div className="space-y-2 p-3">
                            <span className="inline-flex rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                              {isWiki ? "Wiki" : "Post"}
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
        </>
      )}

      {!loading && posts.length === 0 ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Nada por aqui ainda</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Crie o primeiro post clicando em <b>Novo</b>.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card
              key={p.id}
              className="rounded-2xl cursor-pointer"
              onClick={() => (location.href = `/app/post/${p.id}`)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{p.persona.name}</CardTitle>
                <div className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleString("pt-BR")}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div
                  className="prose prose-invert max-w-none text-sm overflow-x-auto break-words"
                  dangerouslySetInnerHTML={{
                    __html: renderRichHtml(p.content),
                  }}
                />

                <div onClick={(event) => event.stopPropagation()}>
                  <HighlightButtonGroup
                    targetType="post"
                    targetId={p.id}
                    title={`Post de ${p.persona.name}`}
                  />
                </div>

                {/* ✅ comentários do post */}
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
