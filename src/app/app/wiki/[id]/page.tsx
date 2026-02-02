"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { renderRichHtml } from "@/lib/render/richText";

type Row = {
  id: string;
  title: string;
  content_html: string;
  created_at: string;
  updated_at: string;
  category_id: string | null;
  wiki_categories: { name: string } | null;
  created_by_persona_id: string;
};

export default function WikiViewPage({ params }: { params: { id: string } }) {
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("wiki_pages")
      .select(
        `
        id,
        title,
        content_html,
        created_at,
        updated_at,
        category_id,
        created_by_persona_id,
        wiki_categories ( name )
      `
      )
      .eq("id", params.id)
      .single();

    setLoading(false);

    if (error) {
      console.error(error);
      return;
    }

    setRow(data as any);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Wiki</h1>
        <Button variant="secondary" className="rounded-2xl" onClick={() => (location.href = "/app/wiki")}>
          Voltar
        </Button>
      </header>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : !row ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Essa página não existe.
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{row.title}</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {row.wiki_categories?.name && (
                <span className="rounded-full border px-2 py-0.5">
                  {row.wiki_categories.name}
                </span>
              )}
              <span>
                Atualizado: {new Date(row.updated_at).toLocaleString("pt-BR")}
              </span>
            </div>
          </CardHeader>

          <CardContent>
            <div
              className="prose prose-invert max-w-none text-sm overflow-x-auto break-words"
              dangerouslySetInnerHTML={{
                __html: renderRichHtml(row.content_html),
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
