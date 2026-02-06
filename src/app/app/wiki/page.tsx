"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Folder, Plus, RefreshCw } from "lucide-react";

// Se você quiser que "Novo" abra o chooser (Post ou Wiki), descomente:
// import { CreateChooser } from "@/components/app/CreateChooser";

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
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const FILTER_ALL = "all";
const FILTER_NONE = "none";

export default function WikiHomePage() {
  const router = useRouter();
  const { activePersona } = useActivePersona();

  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<Category[]>([]);
  const [wikis, setWikis] = useState<Wiki[]>([]);

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  const [catFilter, setCatFilter] = useState<string>(FILTER_ALL);

  // Se quiser "Novo" abrir chooser:
  // const [createOpen, setCreateOpen] = useState(false);

  async function load() {
    setLoading(true);

    const [catRes, wikiRes] = await Promise.all([
      supabase
        .from("wiki_categories")
        .select("id,name,parent_id,created_at")
        .order("name", { ascending: true }),
      supabase
        .from("wiki_pages")
        .select("id,title,cover_url,category_id,created_at,updated_at")
        .order("updated_at", { ascending: false })
        .limit(80),
    ]);

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

    setCats((catRes.data ?? []) as any);
    setWikis((wikiRes.data ?? []) as any);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // debounce simples
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 180);
    return () => clearTimeout(t);
  }, [search]);

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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Wiki</h1>
          <p className="truncate text-xs text-muted-foreground">
            {activePersona
              ? `Criando como: ${activePersona.name}`
              : "Sem persona"}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={load}
            title="Atualizar"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>

          <Button
            className="rounded-2xl"
            disabled={!activePersona}
            onClick={() => router.push("/app/wiki/new")}
            title={
              !activePersona ? "Selecione uma persona para criar" : "Nova wiki"
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova
          </Button>

          {/* Se quiser usar o chooser:
          <Button
            className="rounded-2xl"
            disabled={!activePersona}
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo
          </Button>
          <CreateChooser open={createOpen} onOpenChange={setCreateOpen} />
          */}
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
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={catFilter}
            onValueChange={(v) => setCatFilter(v || FILTER_ALL)}
            className="flex flex-wrap gap-2"
          >
            <ToggleGroupItem value={FILTER_ALL} className="rounded-2xl border">
              Todas
            </ToggleGroupItem>
            <ToggleGroupItem value={FILTER_NONE} className="rounded-2xl border">
              Sem pasta
            </ToggleGroupItem>

            {rootCats.slice(0, 6).map((c) => (
              <ToggleGroupItem
                key={c.id}
                value={c.id}
                className="rounded-2xl border"
                title={c.name}
              >
                {c.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <Button
            type="button"
            variant="secondary"
            className="ml-auto rounded-2xl"
            onClick={() => router.push("/app/wiki/categories")}
            title="Ver todas as pastas"
          >
            <Folder className="mr-2 h-4 w-4" />
            Pastas
          </Button>
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
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-2xl border bg-muted/40 animate-pulse"
                />
              ))}
            </div>
          ) : rootCats.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhuma pasta ainda. Abra <b>Gerenciar</b> para criar.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
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

      {/* Wikis (cards quadrados) */}
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
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-2xl border bg-muted/40 animate-pulse"
                />
              ))}
            </div>
          ) : filteredWikis.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhuma wiki encontrada.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {filteredWikis.slice(0, 18).map((w) => (
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
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          sem capa
                        </div>
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
            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                className="w-full rounded-2xl"
                onClick={() => router.push("/app/wiki")}
              >
                Ver mais
              </Button>
              <Button
                className="w-full rounded-2xl"
                disabled={!activePersona}
                onClick={() => router.push("/app/wiki/new")}
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
