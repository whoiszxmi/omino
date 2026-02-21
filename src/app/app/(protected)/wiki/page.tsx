"use client";

import { useEffect, useMemo, useState } from "react";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  FileText,
  Folder,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { safeSelect } from "@/lib/supabase/fallback";
import WallpaperBackground from "@/components/ui/WallpaperBackground";
import { cn } from "@/lib/utils";

// Schema real de `wiki_pages`:
// id, title, content_html, category_id, created_by_persona_id,
// created_at, updated_at, cover_url, wallpaper_id (uuid FK), wallpaper_slug (text),
// wallpaper_mode, theme, text_contrast

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
};

type Wiki = {
  id: string;
  title: string;
  cover_url: string | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  // wallpaper_slug é o campo TEXT para lookup local (zero banda)
  wallpaper_slug: string | null;
};

const FILTER_ALL = "all";
const FILTER_NONE = "none";
const WIKI_PAGE_SIZE = 18;

function WikiCard({ w, onClick }: { w: Wiki; onClick: () => void }) {
  return (
    <button
      type="button"
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card text-left transition hover:shadow-md active:scale-[0.98]"
      onClick={onClick}
    >
      {/* Thumbnail: cover_url real ou wallpaper local (zero banda) */}
      <div className="relative h-28 w-full overflow-hidden bg-muted/30">
        {w.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={w.cover_url}
            alt={w.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : w.wallpaper_slug ? (
          <WallpaperBackground
            wallpaperSlug={w.wallpaper_slug}
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-6 w-6 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">
          {w.title}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {new Date(w.updated_at).toLocaleDateString("pt-BR")}
        </p>
      </div>
    </button>
  );
}

function CategoryCard({
  cat,
  count,
  onClick,
}: {
  cat: Category;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left transition hover:bg-muted/40 active:scale-[0.98]"
      onClick={onClick}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/60">
        <Folder className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{cat.name}</p>
        <p className="text-xs text-muted-foreground">
          {count} {count === 1 ? "wiki" : "wikis"}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
    </button>
  );
}

export default function WikiHomePage() {
  const router = useRouter();
  const { activePersona } = useActivePersona();

  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<Category[]>([]);
  const [wikis, setWikis] = useState<Wiki[]>([]);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [catFilter, setCatFilter] = useState<string>(FILTER_ALL);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreWikis, setHasMoreWikis] = useState(true);

  async function fetchWikiPage(cursor?: string) {
    return safeSelect({
      missingColumn: "wallpaper_slug",
      primary: () => {
        // Busca wallpaper_slug (TEXT) — não wallpaper_id (UUID) para não precisar JOIN
        let q = supabase
          .from("wiki_pages")
          .select(
            "id,title,cover_url,category_id,created_at,updated_at,wallpaper_slug",
          )
          .order("updated_at", { ascending: false })
          .limit(WIKI_PAGE_SIZE);
        if (cursor) q = q.lt("updated_at", cursor);
        return q;
      },
      fallback: () => {
        let q = supabase
          .from("wiki_pages")
          .select("id,title,cover_url,category_id,created_at,updated_at")
          .order("updated_at", { ascending: false })
          .limit(WIKI_PAGE_SIZE);
        if (cursor) q = q.lt("updated_at", cursor);
        return q;
      },
    });
  }

  async function load() {
    setLoading(true);
    const [catRes, wikiRes] = await Promise.all([
      supabase
        .from("wiki_categories")
        .select("id,name,parent_id,created_at")
        .order("name", { ascending: true }),
      fetchWikiPage(),
    ]);

    if (catRes.error) {
      toast.error(catRes.error.message);
      setLoading(false);
      return;
    }
    if (wikiRes.error) {
      toast.error(wikiRes.error.message);
      setLoading(false);
      return;
    }

    const page = (wikiRes.data ?? []) as Wiki[];
    setCats((catRes.data ?? []) as Category[]);
    setWikis(page);
    setHasMoreWikis(page.length === WIKI_PAGE_SIZE);
    setLoading(false);
  }

  async function loadMoreWikis() {
    if (loadingMore || !hasMoreWikis || wikis.length === 0) return;
    setLoadingMore(true);
    const lastUpdatedAt = wikis[wikis.length - 1]?.updated_at;
    const wikiRes = await fetchWikiPage(lastUpdatedAt);
    if (wikiRes.error) {
      toast.error(wikiRes.error.message);
      setLoadingMore(false);
      return;
    }
    const page = (wikiRes.data ?? []) as Wiki[];
    setWikis((prev) => [...prev, ...page]);
    setHasMoreWikis(page.length === WIKI_PAGE_SIZE);
    setLoadingMore(false);
  }

  useEffect(() => {
    void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 180);
    return () => clearTimeout(t);
  }, [search]);

  function goNewWiki() {
    if (!activePersona) {
      toast.error("Selecione uma persona para criar wiki.");
      return;
    }
    router.push("/app/wiki/new");
  }

  const rootCats = useMemo(() => cats.filter((c) => !c.parent_id), [cats]);

  const wikiCountByCat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const w of wikis) {
      if (!w.category_id) continue;
      map[w.category_id] = (map[w.category_id] ?? 0) + 1;
    }
    return map;
  }, [wikis]);

  const filteredWikis = useMemo(() => {
    const q = searchDebounced.toLowerCase();
    return wikis.filter((w) => {
      if (catFilter === FILTER_NONE) {
        if (w.category_id) return false;
      } else if (catFilter !== FILTER_ALL) {
        if (w.category_id !== catFilter) return false;
      }
      if (!q) return true;
      return w.title.toLowerCase().includes(q);
    });
  }, [wikis, searchDebounced, catFilter]);

  const activeCatName =
    catFilter === FILTER_ALL
      ? null
      : catFilter === FILTER_NONE
        ? "Sem pasta"
        : (cats.find((c) => c.id === catFilter)?.name ?? null);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-4 md:px-6">
      {/* Header */}
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10">
              <BookOpen className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Wiki & Biblioteca</h1>
              <p className="text-xs text-muted-foreground">
                {wikis.length} artigo{wikis.length !== 1 ? "s" : ""} ·{" "}
                {rootCats.length} pasta{rootCats.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-2xl"
              onClick={() => void load()}
              disabled={loading}
              title="Atualizar"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="rounded-2xl"
              onClick={() => router.push("/app/drafts")}
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" /> Rascunhos
            </Button>
            <Button
              size="sm"
              className="rounded-2xl"
              disabled={!activePersona}
              onClick={goNewWiki}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Nova wiki
            </Button>
          </div>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-2xl pl-9"
          />
        </div>
      </header>

      {/* Pastas */}
      {!searchDebounced && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Pastas</h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-xl px-2 text-xs"
              onClick={() => router.push("/app/wiki/categories")}
            >
              Gerenciar
            </Button>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-2xl border bg-muted/40"
                />
              ))}
            </div>
          ) : rootCats.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed p-4">
              <Folder className="h-5 w-5 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Nenhuma pasta.{" "}
                <button
                  className="text-primary underline"
                  onClick={() => router.push("/app/wiki/categories")}
                >
                  Criar pasta
                </button>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {rootCats.map((c) => (
                <CategoryCard
                  key={c.id}
                  cat={c}
                  count={wikiCountByCat[c.id] ?? 0}
                  onClick={() => {
                    setCatFilter(c.id);
                    window.scrollTo({ top: 0 });
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Filtros ativos */}
      {(catFilter !== FILTER_ALL || searchDebounced) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtrando por:</span>
          {activeCatName && (
            <span className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs font-medium">
              <Folder className="h-3 w-3" /> {activeCatName}
              <button
                className="ml-1 hover:text-destructive"
                onClick={() => setCatFilter(FILTER_ALL)}
              >
                ×
              </button>
            </span>
          )}
          {searchDebounced && (
            <span className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs font-medium">
              <Search className="h-3 w-3" /> "{searchDebounced}"
              <button
                className="ml-1 hover:text-destructive"
                onClick={() => setSearch("")}
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}

      {/* Filtros rápidos por pasta */}
      {!searchDebounced && rootCats.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
          {(
            [
              { id: FILTER_ALL, label: "Todos" },
              { id: FILTER_NONE, label: "Sem pasta" },
              ...rootCats.slice(0, 8),
            ] as Array<{ id: string; label?: string; name?: string }>
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCatFilter(item.id)}
              className={cn(
                "shrink-0 rounded-xl border px-3 py-1.5 text-xs transition",
                catFilter === item.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:border-primary/40 hover:bg-muted/40",
              )}
            >
              {item.label ?? item.name}
            </button>
          ))}
        </div>
      )}

      {/* Grid de wikis */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {catFilter === FILTER_ALL && !searchDebounced
              ? "Recentes"
              : (activeCatName ??
                (searchDebounced ? `"${searchDebounced}"` : "Wikis"))}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              ({filteredWikis.length})
            </span>
          </h2>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 rounded-xl px-2 text-xs"
            disabled={!activePersona}
            onClick={goNewWiki}
          >
            <Plus className="mr-1 h-3 w-3" /> Nova
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl border bg-muted/40"
              />
            ))}
          </div>
        ) : filteredWikis.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/30" />
            <div>
              <p className="text-sm font-medium">Nenhuma wiki encontrada</p>
              {catFilter !== FILTER_ALL && (
                <button
                  className="mt-1 text-xs text-primary underline"
                  onClick={() => setCatFilter(FILTER_ALL)}
                >
                  Ver todas
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {filteredWikis.map((w) => (
                <WikiCard
                  key={w.id}
                  w={w}
                  onClick={() => router.push(`/app/wiki/${w.id}`)}
                />
              ))}
            </div>
            {hasMoreWikis && (
              <Button
                variant="secondary"
                className="w-full rounded-2xl"
                onClick={() => void loadMoreWikis()}
                disabled={loadingMore}
              >
                {loadingMore ? "Carregando..." : "Ver mais"}
              </Button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
