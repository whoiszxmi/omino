"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Row = {
  id: string;
  title: string;
  created_at: string;
  category_id: string | null;
  wiki_categories: { name: string } | null;
};

export default function WikiHomePage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("wiki_pages")
      .select(
        `
        id,
        title,
        created_at,
        category_id,
        wiki_categories ( name )
      `
      )
      .order("created_at", { ascending: false })
      .limit(100);

    setLoading(false);

    if (error) {
      console.error(error);
      return;
    }

    setRows((data ?? []) as any);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((r) =>
    r.title.toLowerCase().includes(q.trim().toLowerCase())
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Wiki</h1>
          <p className="text-xs text-muted-foreground">Biblioteca da comunidade</p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="rounded-2xl" onClick={() => (location.href = "/app/wiki/categories")}>
            Categorias
          </Button>
          <Button className="rounded-2xl" onClick={() => (location.href = "/app/wiki/new")}>
            Nova
          </Button>
        </div>
      </header>

      <Input
        placeholder="Buscar página..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Nada ainda</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Crie a primeira página da wiki.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card
              key={r.id}
              className="rounded-2xl cursor-pointer"
              onClick={() => (location.href = `/app/wiki/${r.id}`)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{r.title}</CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{new Date(r.created_at).toLocaleString("pt-BR")}</span>
                  {r.wiki_categories?.name && (
                    <span className="rounded-full border px-2 py-0.5">
                      {r.wiki_categories.name}
                    </span>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
