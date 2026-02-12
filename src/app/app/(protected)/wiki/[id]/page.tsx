"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import HighlightButtonGroup from "@/components/highlights/HighlightButtonGroup";
import { renderRichHtml } from "@/lib/render/richText";

type WikiRow = {
  id: string;
  title: string;
  content_html: string;
  cover_url: string | null;
  category_id: string | null;
  created_by_persona_id: string;
  created_at: string;
  updated_at: string;
  personas?: { id: string; name: string; avatar_url: string | null } | null;
  wiki_categories?: {
    id: string;
    name: string;
    parent_id: string | null;
  } | null;
};

export default function WikiViewPage() {
  const params = useParams<{ id: string }>();
  const wikiId = params?.id as string;

  const router = useRouter();
  const { activePersona } = useActivePersona();

  const [loading, setLoading] = useState(true);
  const [wiki, setWiki] = useState<WikiRow | null>(null);

  const canEdit = useMemo(() => {
    if (!wiki || !activePersona) return false;
    return wiki.created_by_persona_id === activePersona.id;
  }, [wiki, activePersona]);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("wiki_pages")
      .select(
        `
        id,
        title,
        content_html,
        cover_url,
        category_id,
        created_by_persona_id,
        created_at,
        updated_at,
        personas (
          id,
          name,
          avatar_url
        ),
        wiki_categories (
          id,
          name,
          parent_id
        )
      `,
      )
      .eq("id", wikiId)
      .maybeSingle();

    if (error) {
      console.error("ERRO load wiki:", error);
      toast.error(error.message);
      setWiki(null);
      setLoading(false);
      return;
    }

    if (!data) {
      setWiki(null);
      setLoading(false);
      return;
    }

    setWiki(data as any);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wikiId]);

  const safeHtml = useMemo(() => renderRichHtml(wiki?.content_html ?? ""), [wiki?.content_html]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
        <AppPageSkeleton compact />
      </div>
    );
  }

  if (!wiki) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Wiki não encontrada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>Essa wiki pode ter sido removida ou você não tem acesso.</div>
            <Button
              variant="secondary"
              className="w-full rounded-2xl"
              onClick={() => router.push("/app/wiki")}
            >
              Voltar para Wiki
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      {/* Top actions */}
      <header className="flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          className="rounded-2xl"
          onClick={() => router.push("/app/wiki")}
        >
          Voltar
        </Button>

        <div className="flex items-center gap-2">
          {wiki.category_id ? (
            <Button
              variant="secondary"
              className="rounded-2xl"
              onClick={() =>
                router.push(`/app/wiki/categories/${wiki.category_id}`)
              }
              title="Abrir pasta"
            >
              Pasta
            </Button>
          ) : null}

          {canEdit ? (
            <Button
              className="rounded-2xl"
              onClick={() => router.push(`/app/wiki/${wiki.id}/edit`)}
            >
              Editar
            </Button>
          ) : null}
        </div>
      </header>

      {/* Cover + title */}
      <div className="overflow-hidden rounded-2xl border bg-background">
        <div className="relative aspect-[16/9] bg-muted">
          {wiki.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={wiki.cover_url}
              alt={wiki.title}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <div className="p-4">
          <div className="text-xs text-muted-foreground">
            {wiki.wiki_categories?.name
              ? `Pasta: ${wiki.wiki_categories.name}`
              : "Sem pasta"}
          </div>

          <h1 className="mt-1 text-lg font-semibold leading-snug">
            {wiki.title}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              Atualizado em {new Date(wiki.updated_at).toLocaleString("pt-BR")}
            </span>
            <span>•</span>
            <span>Por {wiki.personas?.name ?? "Persona"}</span>
          </div>

          <div className="mt-3">
            <HighlightButtonGroup
              targetType="wiki"
              targetId={wiki.id}
              title={wiki.title}
              coverUrl={wiki.cover_url}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Conteúdo</CardTitle>
        </CardHeader>
        <CardContent
          className="prose prose-invert max-w-none text-sm overflow-x-auto break-words"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </Card>
    </div>
  );
}
