"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ChevronRight, FolderPlus, Plus, RefreshCw } from "lucide-react";

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
  updated_at: string;
};

export default function WikiCategoryPage() {
  const params = useParams<{ id: string }>();
  const categoryId = params?.id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<Category[]>([]);
  const [wikis, setWikis] = useState<Wiki[]>([]);

  const [creating, setCreating] = useState(false);
  const [subName, setSubName] = useState("");

  async function load() {
    setLoading(true);

    const [catRes, wikiRes] = await Promise.all([
      supabase
        .from("wiki_categories")
        .select("id,name,parent_id,created_at")
        .order("name", { ascending: true }),
      supabase
        .from("wiki_pages")
        .select("id,title,cover_url,category_id,updated_at")
        .eq("category_id", categoryId)
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
  }, [categoryId]);

  const current = useMemo(
    () => cats.find((c) => c.id === categoryId) ?? null,
    [cats, categoryId],
  );

  const children = useMemo(
    () => cats.filter((c) => c.parent_id === categoryId),
    [cats, categoryId],
  );

  async function createSubfolder() {
    const name = subName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const { error } = await supabase
        .from("wiki_categories")
        .insert({ name, parent_id: categoryId } as any);

      if (error) throw error;

      toast.success("Subpasta criada!");
      setSubName("");
      await load();
    } catch (e: any) {
      console.error("ERRO create subfolder:", e);
      toast.error(e?.message ?? "Erro ao criar subpasta.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">
            {current?.name ?? "Pasta"}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            Subpastas e wikis desta categoria
          </p>
        </div>

        <div className="flex gap-2">
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
            variant="secondary"
            className="rounded-2xl"
            onClick={() => router.push("/app/wiki/categories")}
          >
            Voltar
          </Button>
        </div>
      </header>

      <div className="flex gap-2">
        <Button
          className="w-full rounded-2xl"
          onClick={() => router.push(`/app/wiki/new?folder=${categoryId}`)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova wiki aqui
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Criar subpasta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Regras, Técnicas..."
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
            />
            <Button
              className="rounded-2xl"
              variant="secondary"
              onClick={createSubfolder}
              disabled={creating || !subName.trim()}
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              Criar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Subpastas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : children.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhuma subpasta.
            </div>
          ) : (
            <div className="space-y-2">
              {children.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl border p-3 text-left hover:bg-muted/30"
                  onClick={() => router.push(`/app/wiki/categories/${c.id}`)}
                >
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Wikis nesta pasta</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : wikis.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhuma wiki ainda.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {wikis.slice(0, 18).map((w) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
