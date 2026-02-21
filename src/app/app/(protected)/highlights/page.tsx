"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCommunityHighlights,
  type Highlight,
  type HighlightTargetType,
} from "@/lib/highlights/highlights";
import { BookOpen, PenLine, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Schema real de `highlights`:
// id, scope, user_id, target_type, target_id, title, cover_url,
// sort_order, created_at, wallpaper_id, wallpaper_slug
// NÃO TEM: author_name

type FilterType = "all" | HighlightTargetType;

function HighlightCard({ item }: { item: Highlight }) {
  const router = useRouter();
  const isWiki = item.target_type === "wiki";
  const title =
    item.title?.trim() || (isWiki ? "Wiki sem título" : "Post sem título");

  return (
    <button
      type="button"
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card text-left transition hover:shadow-md active:scale-[0.98]"
      onClick={() =>
        router.push(
          isWiki
            ? `/app/wiki/${item.target_id}`
            : `/app/post/${item.target_id}`,
        )
      }
    >
      {/* Thumbnail */}
      <div className="relative h-32 w-full overflow-hidden bg-muted/40">
        {item.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.cover_url}
            alt={title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/30 to-muted/60">
            {isWiki ? (
              <BookOpen className="h-8 w-8 text-muted-foreground/30" />
            ) : (
              <PenLine className="h-8 w-8 text-muted-foreground/30" />
            )}
          </div>
        )}

        {/* Badge de tipo */}
        <span
          className={cn(
            "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            isWiki
              ? "bg-blue-500/90 text-white"
              : "bg-violet-500/90 text-white",
          )}
        >
          {isWiki ? "Wiki" : "Post"}
        </span>
      </div>

      {/* Título */}
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">
          {title}
        </p>
      </div>
    </button>
  );
}

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
    return highlights.filter((h) => h.target_type === filter);
  }, [filter, highlights]);

  const postCount = highlights.filter((h) => h.target_type === "post").length;
  const wikiCount = highlights.filter((h) => h.target_type === "wiki").length;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-5 p-4 md:p-6">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10">
          <Star className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Destaques</h1>
          <p className="text-xs text-muted-foreground">
            {highlights.length} conteúdo{highlights.length !== 1 ? "s" : ""} em
            destaque
          </p>
        </div>
      </header>

      {/* Filtros com contagens */}
      <ToggleGroup
        type="single"
        value={filter}
        onValueChange={(v) => setFilter((v as FilterType) || "all")}
        className="flex flex-wrap gap-2"
      >
        <ToggleGroupItem
          value="all"
          className="h-8 rounded-xl border px-3 text-sm"
        >
          Todos ({highlights.length})
        </ToggleGroupItem>
        <ToggleGroupItem
          value="post"
          className="h-8 rounded-xl border px-3 text-sm"
        >
          Posts ({postCount})
        </ToggleGroupItem>
        <ToggleGroupItem
          value="wiki"
          className="h-8 rounded-xl border px-3 text-sm"
        >
          Wikis ({wikiCount})
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-2xl border bg-muted/40"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
          <Star className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Nenhum destaque{filter !== "all" ? " neste filtro" : ""}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {filtered.map((item) => (
            <HighlightCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
