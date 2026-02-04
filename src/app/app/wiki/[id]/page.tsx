"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { renderRichHtml } from "@/lib/render/richText";
import HighlightButtonGroup from "@/components/highlights/HighlightButtonGroup";

type Wiki = {
  id: string;
  title: string;
  summary: string | null;
  cover_url: string | null;
  content_html: string;
  created_at: string;
  updated_at: string;
  persona_id: string | null;
  personas: { name: string; avatar_url: string | null } | null;
};

export default function WikiViewPage({ params }: { params: { id: string } }) {
  const wikiId = params.id;

  const [loading, setLoading] = useState(true);
  const [wiki, setWiki] = useState<Wiki | null>(null);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("wikis")
      .select(
        `
        id,
        title,
        summary,
        cover_url,
        content_html,
        created_at,
        updated_at,
        persona_id,
        personas (
          name,
          avatar_url
        )
      `,
      )
      .eq("id", wikiId)
      .maybeSingle();

    if (error) console.error(error);

    setWiki((data ?? null) as any);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [wikiId]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <Button
          variant="secondary"
          className="rounded-2xl"
          onClick={() => history.back()}
        >
          Voltar
        </Button>

        {wiki ? (
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={() => (location.href = `/app/wiki/edit/${wiki.id}`)}
          >
            Editar
          </Button>
        ) : null}
      </header>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : !wiki ? (
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Wiki não encontrada.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border">
            <div className="aspect-[16/9] bg-muted">
              {wiki.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={wiki.cover_url}
                  alt="cover"
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>

            <div className="p-4">
              <div className="text-lg font-semibold">{wiki.title}</div>

              {wiki.summary ? (
                <div className="mt-1 text-sm text-muted-foreground">
                  {wiki.summary}
                </div>
              ) : null}

              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  Atualizado:{" "}
                  {new Date(wiki.updated_at).toLocaleString("pt-BR")}
                </span>
                {wiki.personas?.name ? (
                  <span className="ml-auto">por {wiki.personas.name}</span>
                ) : null}
              </div>
            </div>
          </div>

          <CardContent>
            <div className="mb-3">
              <HighlightButtonGroup
                targetType="wiki"
                targetId={row.id}
                title={row.title}
              />
            </div>
            <div
              className="prose prose-invert max-w-none text-sm overflow-x-auto break-words"
              dangerouslySetInnerHTML={{
                __html: renderRichHtml(wiki.content_html),
              }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
