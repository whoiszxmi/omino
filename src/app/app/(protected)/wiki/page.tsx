"use client";

import { useEffect, useMemo, useState } from "react";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FileText, Folder, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { safeSelect } from "@/lib/supabase/fallback";
import WallpaperBackground from "@/components/ui/WallpaperBackground";

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
  wallpaper_id?: string | null;
};

const FILTER_ALL = "all";
const FILTER_NONE = "none";
const WIKI_PAGE_SIZE = 18;

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
      missingColumn: "wallpaper_id",
      // fallback para schemas sem wallpaper_id
      primary: () => {
        let query = supabase
          .from("wiki_pages")
          .select("id,title,cover_url,category_id,created_at,updated_at,wallpaper_id")
          .order("updated_at", { ascending: false })
          .limit(WIKI_PAGE_SIZE);

        if (cursor) query = query.lt("updated_at", cursor);
        return query;
      },
      fallback: () => {
        let query = supabase
          .from("wiki_pages")
          .select("id,title,cover_url,category_id,created_at,updated_at")
          .order("updated_at", { ascending: false })
          .limit(WIKI_PAGE_SIZE);

        if (cursor) query = query.lt("updated_at", cursor);
        return query;
      },
    });
  }

  async function load() {
    setLoading(true);

    const catRes = await supabase
      .from("wiki_categories")
      .select("id,name,parent_id,created_at")
      .order("name", { ascending: true });

    const wikiRes = await fetchWikiPage();

    if (catRes.error) {
      console.error("ERRO load categories:", catRes.error);
      toast.error(catRes.error.message);
      setLoading(false);
      return;
    }

    if (wikiRes.error) {
      console.error("ERRO load wikis:", wikiRes.error);
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
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce simples
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 180);
    return () => clearTimeout(t);
  }, [search]);

  function goNewWiki() {
    if (!activePersona) {
      toast.error("Selecione uma persona para criar wiki.");
      return;
    }

    // ✅ padronizado: UMA rota
    router.push("/app/wiki/new");
  }

  // categorias raiz (pastas principais)
  const rootCats = useMemo(() => cats.filter((c) => !c.parent_id), [cats]);

  // conta wikis por categoria
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
      // filtro categoria
      if (catFilter === FILTER_NONE) {
        if (w.category_id) return false;
      } else if (catFilter !== FILTER_ALL) {
        if (w.category_id !== catFilter) return false;
      }

      // busca
      if (!q) return true;
      return w.title.toLowerCase().includes(q);
    });
  }, [wikis, searchDebounced, catFilter]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 md:px-6">
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Wiki</h1>
          <p className="truncate text-xs text-muted-foreground">
            {activePersona
              ? `Criando como: ${activePersona.name}`
              : "Sem persona"}
          </p>
        </div>

        {/* ✅ toolbar responsiva (mobile scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] md:overflow-visible md:pb-0">
          <Button
            variant="secondary"
            className="shrink-0 rounded-2xl"
            onClick={() => router.push("/app/drafts")}
            title="Rascunhos"
          >
            <FileText className="mr-2 h-4 w-4" />
            Rascunhos
          </Button>

          <Button
            variant="secondary"
            className="shrink-0 rounded-2xl"
            onClick={() => void load()}
            title="Atualizar"
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>

          <Button
            className="shrink-0 rounded-2xl"
            disabled={!activePersona}
            onClick={goNewWiki}
            title={
              !activePersona ? "Selecione uma persona para criar" : "Nova wiki"
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova wiki
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="shrink-0 rounded-2xl"
            onClick={() => router.push("/app/wiki/categories")}
            title="Pastas"
          >
            <Folder className="mr-2 h-4 w-4" />
            Pastas
          </Button>
        </div>
      </header>

      {/* Busca */}
      <div className="space-y-2">
        <Input
          placeholder="Buscar wiki..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* filtro por pasta */}
        <div className="space-y-2">
          {/* ✅ wrapper para não “vazar” no mobile */}
          <div className="overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
            <Segmented
              type="single"
              value={catFilter}
              onValueChange={(v) => setCatFilter(v || FILTER_ALL)}
              className="min-w-max"
            >
              <SegmentedItem value={FILTER_ALL}>Todas</SegmentedItem>
              <SegmentedItem value={FILTER_NONE}>Sem pasta</SegmentedItem>

              {rootCats.slice(0, 6).map((c) => (
                <SegmentedItem key={c.id} value={c.id} title={c.name}>
                  {c.name}
                </SegmentedItem>
              ))}
            </Segmented>
          </div>
        </div>
      </div>

      {/* Pastas (cards) */}
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Pastas</CardTitle>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-2xl"
            onClick={() => router.push("/app/wiki/categories")}
          >
            Gerenciar
          </Button>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-2xl border bg-muted/40"
                />
              ))}
            </div>
          ) : rootCats.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhuma pasta ainda. Abra <b>Gerenciar</b> para criar.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {rootCats.slice(0, 6).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="rounded-2xl border p-3 text-left transition hover:bg-muted/30"
                  onClick={() => router.push(`/app/wiki/categories/${c.id}`)}
                >
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {wikiCountByCat[c.id] ?? 0} wikis
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wikis */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {catFilter === FILTER_ALL
              ? "Wikis recentes"
              : catFilter === FILTER_NONE
                ? "Wikis sem pasta"
                : "Wikis da pasta"}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded-2xl border bg-muted/40"
                />
              ))}
            </div>
          ) : filteredWikis.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhuma wiki encontrada.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {filteredWikis.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className="aspect-square overflow-hidden rounded-2xl border text-left transition hover:bg-muted/30"
                  onClick={() => router.push(`/app/wiki/${w.id}`)}
                >
                  <div className="flex h-full flex-col">
                    <div className="flex-1 bg-muted/40">
                      {w.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={w.cover_url}
                          alt={w.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <WallpaperBackground wallpaperId={w.wallpaper_id} fallback="#dbeafe" className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          sem capa
                        </WallpaperBackground>
                      )}
                    </div>

                    <div className="p-3">
                      <div className="truncate text-sm font-medium">
                        {w.title}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        Atualizado{" "}
                        {new Date(w.updated_at).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {hasMoreWikis ? (
                <Button
                  variant="secondary"
                  className="w-full rounded-2xl"
                  onClick={() => void loadMoreWikis()}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Carregando..." : "Ver mais"}
                </Button>
              ) : (
                <div className="flex h-10 items-center justify-center rounded-2xl border text-sm text-muted-foreground">
                  Você chegou ao fim
                </div>
              )}
              <Button
                className="w-full rounded-2xl"
                disabled={!activePersona}
                onClick={goNewWiki}
              >
                Criar wiki
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
