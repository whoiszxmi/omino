"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BookOpen, PenLine, Search, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import WallpaperBackground from "@/components/ui/WallpaperBackground";

// ─── tipos ────────────────────────────────────────────────────────────────────

type ResultPost = {
  kind: "post";
  id: string;
  snippet: string;
  persona_name: string;
  persona_avatar: string | null;
  wallpaper_slug: string | null;
  created_at: string;
};

type ResultWiki = {
  kind: "wiki";
  id: string;
  title: string;
  snippet: string;
  persona_name: string;
  wallpaper_slug: string | null;
  category_name: string | null;
};

type ResultPersona = {
  kind: "persona";
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  username: string | null;
};

type Result = ResultPost | ResultWiki | ResultPersona;
type Filter = "all" | "post" | "wiki" | "persona";

// ─── helpers ──────────────────────────────────────────────────────────────────

function htmlToText(html: string, max = 160) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark key={i} className="rounded bg-primary/20 px-0.5 text-primary">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function relTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return "hoje";
  if (d === 1) return "ontem";
  if (d < 30) return `${d}d atrás`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

// ─── cartões de resultado ─────────────────────────────────────────────────────

function PostCard({
  r,
  query,
  onClick,
}: {
  r: ResultPost;
  query: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full overflow-hidden rounded-xl border bg-card text-left transition hover:shadow-md active:scale-[0.99]"
    >
      {r.wallpaper_slug && (
        <div className="h-8 w-full">
          <WallpaperBackground
            wallpaperSlug={r.wallpaper_slug}
            className="h-full w-full"
          />
        </div>
      )}
      <div className="p-3 space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-[9px] font-bold">
            {r.persona_avatar ? (
              <img
                src={r.persona_avatar}
                alt={r.persona_name}
                className="h-full w-full object-cover"
              />
            ) : (
              r.persona_name.charAt(0)
            )}
          </div>
          <span className="text-xs font-medium">{r.persona_name}</span>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {relTime(r.created_at)}
          </span>
          <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
            Post
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {highlight(r.snippet, query)}
        </p>
      </div>
    </button>
  );
}

function WikiCard({
  r,
  query,
  onClick,
}: {
  r: ResultWiki;
  query: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full overflow-hidden rounded-xl border bg-card text-left transition hover:shadow-md active:scale-[0.99]"
    >
      {r.wallpaper_slug && (
        <div className="h-8 w-full">
          <WallpaperBackground
            wallpaperSlug={r.wallpaper_slug}
            className="h-full w-full"
          />
        </div>
      )}
      <div className="p-3 space-y-1">
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 shrink-0 text-blue-500" />
          <span className="text-xs font-semibold">
            {highlight(r.title, query)}
          </span>
          <span className="ml-auto rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            Wiki
          </span>
        </div>
        {r.category_name && (
          <p className="text-[10px] text-muted-foreground">
            📁 {r.category_name}
          </p>
        )}
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {highlight(r.snippet, query)}
        </p>
      </div>
    </button>
  );
}

function PersonaCard({
  r,
  query,
  onClick,
}: {
  r: ResultPersona;
  query: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-sm font-bold">
        {r.avatar_url ? (
          <img
            src={r.avatar_url}
            alt={r.name}
            className="h-full w-full object-cover"
          />
        ) : (
          r.name.charAt(0).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {highlight(r.name, query)}
        </p>
        {r.username && (
          <p className="text-xs text-muted-foreground">@{r.username}</p>
        )}
        {r.bio && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {highlight(r.bio, query)}
          </p>
        )}
      </div>
      <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
        Persona
      </span>
    </button>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // foca o input ao montar
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // debounce da busca
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();

    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounceRef.current = setTimeout(() => void doSearch(q, filter), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filter]);

  async function doSearch(q: string, f: Filter) {
    setLoading(true);
    setSearched(true);

    const ilike = `%${q}%`;
    const out: Result[] = [];

    await Promise.all([
      // ── posts ──────────────────────────────────────────────────────────
      (f === "all" || f === "post") &&
        (async () => {
          const { data } = await supabase
            .from("posts")
            .select(
              "id, content, created_at, wallpaper_slug, persona_id, personas(name, avatar_url)",
            )
            .ilike("content", ilike)
            .order("created_at", { ascending: false })
            .limit(10);

          for (const row of data ?? []) {
            out.push({
              kind: "post",
              id: row.id,
              snippet: htmlToText(row.content),
              persona_name: (row.personas as any)?.name ?? "Desconhecido",
              persona_avatar: (row.personas as any)?.avatar_url ?? null,
              wallpaper_slug: row.wallpaper_slug ?? null,
              created_at: row.created_at,
            });
          }
        })(),

      // ── wikis ──────────────────────────────────────────────────────────
      (f === "all" || f === "wiki") &&
        (async () => {
          const { data } = await supabase
            .from("wiki_pages")
            .select(
              "id, title, content_html, wallpaper_slug, wiki_categories(name)",
            )
            .or(`title.ilike.${ilike},content_html.ilike.${ilike}`)
            .order("updated_at", { ascending: false })
            .limit(10);

          for (const row of data ?? []) {
            out.push({
              kind: "wiki",
              id: row.id,
              title: row.title,
              snippet: htmlToText(row.content_html ?? ""),
              wallpaper_slug: row.wallpaper_slug ?? null,
              category_name: (row.wiki_categories as any)?.name ?? null,
              persona_name: "",
            });
          }
        })(),

      // ── personas ───────────────────────────────────────────────────────
      (f === "all" || f === "persona") &&
        (async () => {
          const { data } = await supabase
            .from("personas")
            .select(
              "id, name, bio, avatar_url, user_id, profiles!inner(username)",
            )
            .or(`name.ilike.${ilike},bio.ilike.${ilike}`)
            .limit(10);

          for (const row of data ?? []) {
            out.push({
              kind: "persona",
              id: row.id,
              name: row.name,
              bio: row.bio ?? null,
              avatar_url: row.avatar_url ?? null,
              username: (row.profiles as any)?.username ?? null,
            });
          }
        })(),
    ]);

    // ordena: personas primeiro, depois wikis, depois posts
    const order: Filter[] = ["persona", "wiki", "post"];
    out.sort(
      (a, b) =>
        order.indexOf(a.kind as Filter) - order.indexOf(b.kind as Filter),
    );

    setResults(out);
    setLoading(false);
  }

  function navigateTo(r: Result) {
    switch (r.kind) {
      case "post":
        router.push(`/app/post/${r.id}`);
        break;
      case "wiki":
        router.push(`/app/wiki/${r.id}`);
        break;
      case "persona":
        router.push(`/app/personas`);
        break;
    }
  }

  const counts = {
    post: results.filter((r) => r.kind === "post").length,
    wiki: results.filter((r) => r.kind === "wiki").length,
    persona: results.filter((r) => r.kind === "persona").length,
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 p-4">
      {/* Título */}
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-muted-foreground" />
        <h1 className="page-title">Busca</h1>
      </div>

      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar posts, wikis, personas..."
          className="rounded-2xl pl-9 pr-4"
        />
      </div>

      {/* Filtros */}
      <ToggleGroup
        type="single"
        value={filter}
        onValueChange={(v) => setFilter((v as Filter) || "all")}
        className="flex gap-1.5"
      >
        {(
          [
            { value: "all", label: "Tudo", icon: Search },
            { value: "post", label: "Posts", icon: PenLine },
            { value: "wiki", label: "Wikis", icon: BookOpen },
            { value: "persona", label: "Personas", icon: Users },
          ] as const
        ).map(({ value, label, icon: Icon }) => (
          <ToggleGroupItem
            key={value}
            value={value}
            className="flex-1 gap-1 rounded-xl border text-xs"
          >
            <Icon className="h-3 w-3" /> {label}
            {value !== "all" && searched && counts[value] > 0 && (
              <span className="ml-0.5 rounded-full bg-primary/10 px-1 py-0.5 text-[9px] font-bold text-primary">
                {counts[value]}
              </span>
            )}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {/* Resultados */}
      {!searched && (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
          <Search className="h-10 w-10 opacity-20" />
          <p className="text-sm">Digite ao menos 2 caracteres para buscar</p>
          <p className="text-xs opacity-70">
            Posts, wikis e personas da comunidade
          </p>
        </div>
      )}

      {searched && loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border bg-muted/40"
            />
          ))}
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Search className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm font-medium">Nenhum resultado para</p>
          <p className="text-sm text-muted-foreground">"{query}"</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Tente termos diferentes ou outro filtro.
          </p>
        </div>
      )}

      {searched && !loading && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {results.length} resultado{results.length > 1 ? "s" : ""} para "
            {query}"
          </p>
          {results.map((r, i) => {
            if (r.kind === "post")
              return (
                <PostCard
                  key={i}
                  r={r}
                  query={query}
                  onClick={() => navigateTo(r)}
                />
              );
            if (r.kind === "wiki")
              return (
                <WikiCard
                  key={i}
                  r={r}
                  query={query}
                  onClick={() => navigateTo(r)}
                />
              );
            return (
              <PersonaCard
                key={i}
                r={r}
                query={query}
                onClick={() => navigateTo(r)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
