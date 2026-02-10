"use client";

import { useEffect, useMemo, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card } from "@/components/ui/card";
import {
  getCommunityHighlights,
  type Highlight,
  type HighlightTargetType,
} from "@/lib/highlights/highlights";

type FilterType = "all" | HighlightTargetType;

export default function HighlightsPage() {
  const [loading, setLoading] = useState(true);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const data = await getCommunityHighlights();
      if (!active) return;
      setHighlights(data);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return highlights;
    return highlights.filter((item) => item.target_type === filter);
  }, [filter, highlights]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Destaques</h1>
          <p className="text-xs text-muted-foreground">
            Conteúdos em destaque na comunidade
          </p>
        </div>
      </header>

      <ToggleGroup
        type="single"
        value={filter}
        onValueChange={(value) => setFilter((value as FilterType) || "all")}
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

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="aspect-square rounded-2xl border bg-muted/40 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl p-4 text-sm text-muted-foreground">
          Nenhum destaque encontrado.
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((item) => {
            const isWiki = item.target_type === "wiki";
            const title = item.title ?? (isWiki ? "Wiki" : "Post");

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
                    <div className="truncate text-sm font-medium">{title}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
