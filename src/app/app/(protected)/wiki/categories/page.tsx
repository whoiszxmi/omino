"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { ChevronRight, FolderPlus, Plus, RefreshCw } from "lucide-react";

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
};

type Wiki = {
  id: string;
  category_id: string | null;
};

export default function WikiCategoriesPage() {
  const router = useRouter();
  const { activePersona } = useActivePersona();

  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<Category[]>([]);
  const [wikis, setWikis] = useState<Wiki[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);

    const [catRes, wikiRes] = await Promise.all([
      supabase
        .from("wiki_categories")
        .select("id,name,parent_id,created_at")
        .order("name", { ascending: true }),
      supabase.from("wiki_pages").select("id,category_id").limit(1000),
    ]);

    if (catRes.error) {
      console.error("ERRO load categories:", catRes.error);
      toast.error(catRes.error.message);
      setLoading(false);
      return;
    }
    if (wikiRes.error) {
      console.error("ERRO load wikis:", wikiRes.error);
      // wikis é só pra contagem; não precisa travar a tela
    }

    setCats((catRes.data ?? []) as Category[]);
    setWikis((wikiRes.data ?? []) as Wiki[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const rootCats = useMemo(() => cats.filter((c) => !c.parent_id), [cats]);

  const countByCat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const w of wikis) {
      if (!w.category_id) continue;
      map[w.category_id] = (map[w.category_id] ?? 0) + 1;
    }
    return map;
  }, [wikis]);

  async function createRootCategory() {
    const name = newName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const { error } = await supabase
        .from("wiki_categories")
        .insert({ name, parent_id: null });

      if (error) throw error;

      toast.success("Pasta criada!");
      setNewName("");
      await load();
    } catch (e: unknown) {
      console.error("ERRO create category:", e);
      toast.error(e instanceof Error ? e.message : "Erro ao criar pasta.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 md:px-6">
      <header className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Pastas</h1>
          <p className="truncate text-xs text-muted-foreground">
            Organize suas wikis em categorias
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto">
          <Button
            variant="secondary"
            className="w-full rounded-2xl sm:w-auto"
            onClick={load}
            title="Atualizar"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>

          <Button
            variant="secondary"
            className="w-full rounded-2xl sm:w-auto"
            onClick={() => router.push("/app/wiki")}
          >
            Voltar
          </Button>
          <Button
            className="w-full rounded-2xl sm:w-auto"
            disabled={!activePersona}
            onClick={() => {
              if (!activePersona) {
                toast.error("Selecione uma persona");
                return;
              }
              router.push("/app/wiki/new");
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Wiki
          </Button>
        </div>
      </header>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Criar pasta raiz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Input
              placeholder="Ex: Sistemas, Personagens..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button
              className="rounded-2xl"
              onClick={createRootCategory}
              disabled={creating || !newName.trim()}
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              Criar
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Dica: subpastas são criadas dentro de uma pasta (ao abrir).
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pastas raiz</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : rootCats.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhuma pasta ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {rootCats.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl border p-3 text-left hover:bg-muted/30"
                  onClick={() => router.push(`/app/wiki/categories/${c.id}`)}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {countByCat[c.id] ?? 0} wikis
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
