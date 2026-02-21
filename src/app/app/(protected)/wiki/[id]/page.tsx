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
import { AppPageSkeleton } from "@/components/app/AppPageSkeleton";
import WallpaperBackground from "@/components/ui/WallpaperBackground";
import { parseDocContent } from "@/lib/content/docMeta";
import { resolveForegroundTheme, type UiTheme } from "@/lib/ui/isDarkColor";
import { safeSelect } from "@/lib/supabase/fallback";

type WikiRow = {
  id: string;
  title: string;
  content_html: string;
  cover_url: string | null;
  category_id: string | null;
  created_by_persona_id: string;
  created_at: string;
  updated_at: string;
  wallpaper_id?: string | null;
  ui_theme?: UiTheme | null;
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

    const query = await safeSelect({
      missingColumn: "ui_theme",
      // fallback para schemas que ainda não têm ui_theme
      primary: () =>
        supabase
          .from("wiki_pages")
          .select(`id,title,content_html,cover_url,category_id,created_by_persona_id,created_at,updated_at,wallpaper_id,ui_theme,personas(id,name,avatar_url),wiki_categories(id,name,parent_id)`)
          .eq("id", wikiId)
          .maybeSingle(),
      fallback: () =>
        supabase
          .from("wiki_pages")
          .select(`id,title,content_html,cover_url,category_id,created_by_persona_id,created_at,updated_at,wallpaper_id,personas(id,name,avatar_url),wiki_categories(id,name,parent_id)`)
          .eq("id", wikiId)
          .maybeSingle(),
    });

    if (query.error) {
      toast.error(query.error.message);
      setWiki(null);
      setLoading(false);
      return;
    }

    if (!query.data) {
      setWiki(null);
      setLoading(false);
      return;
    }

    setWiki(query.data as unknown as WikiRow);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [wikiId]);

  const parsed = useMemo(() => parseDocContent(wiki?.content_html ?? ""), [wiki?.content_html]);
  const safeHtml = useMemo(() => renderRichHtml(wiki?.content_html ?? ""), [wiki?.content_html]);
  const tone = resolveForegroundTheme({
    wallpaperId: wiki?.wallpaper_id,
    backgroundColor: parsed.backgroundColor,
    uiTheme: wiki?.ui_theme,
  });
  const darkMode = tone === "light";

  if (loading) {
    return <div className="min-h-dvh w-full px-3 sm:px-4 md:px-6 py-4 md:py-8"><AppPageSkeleton compact /></div>;
  }

  if (!wiki) {
    return (
      <div className="min-h-dvh w-full px-3 sm:px-4 md:px-6 py-4 md:py-8">
        <div className="mx-auto w-full max-w-5xl">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader><CardTitle className="text-base">Wiki não encontrada</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>Essa wiki pode ter sido removida ou você não tem acesso.</div>
              <Button variant="secondary" className="w-full rounded-2xl" onClick={() => router.push("/app/wiki")}>Voltar para Wiki</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <WallpaperBackground wallpaperId={wiki.wallpaper_id} fallback={parsed.backgroundColor} className={`min-h-dvh w-full px-3 sm:px-4 md:px-6 py-4 md:py-8 ${darkMode ? "text-white" : "text-foreground"}`}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="flex items-center justify-between gap-2">
          <Button variant="secondary" className="rounded-2xl shadow-sm" onClick={() => router.push("/app/wiki")}>Voltar</Button>
          <div className="flex items-center gap-2">
            {wiki.category_id ? <Button variant="secondary" className="rounded-2xl shadow-sm" onClick={() => router.push(`/app/wiki/categories/${wiki.category_id}`)}>Pasta</Button> : null}
            {canEdit ? <Button className="rounded-2xl shadow-sm" onClick={() => router.push(`/app/wiki/${wiki.id}/edit`)}>Editar</Button> : null}
          </div>
        </header>

        <div className="overflow-hidden rounded-2xl border border-white/20 bg-transparent backdrop-blur-[1px]">
          <WallpaperBackground wallpaperId={wiki.wallpaper_id} fallback={parsed.backgroundColor} className="relative h-48 md:h-72 w-full">
            {wiki.cover_url ? <img src={wiki.cover_url} alt={wiki.title} className="h-full w-full object-cover" /> : null}
          </WallpaperBackground>

          <div className="p-4 md:p-6">
            <div className={`text-xs ${darkMode ? "text-white/75" : "text-muted-foreground"}`}>{wiki.wiki_categories?.name ? `Pasta: ${wiki.wiki_categories.name}` : "Sem pasta"}</div>
            <h1 className="mt-1 text-2xl md:text-4xl font-semibold leading-snug">{wiki.title}</h1>
            <div className={`mt-2 flex flex-wrap items-center gap-2 text-xs md:text-sm ${darkMode ? "text-white/80" : "text-muted-foreground"}`}>
              <span>Atualizado em {new Date(wiki.updated_at).toLocaleString("pt-BR")}</span>
              <span>•</span>
              <span>Por {wiki.personas?.name ?? "Persona"}</span>
            </div>
            <div className="mt-3"><HighlightButtonGroup targetType="wiki" targetId={wiki.id} title={wiki.title} coverUrl={wiki.cover_url} /></div>
          </div>
        </div>

        <Card className="rounded-2xl border-white/20 shadow-sm bg-transparent backdrop-blur-[1px]">
          <CardHeader className="pb-2"><CardTitle className={`text-base ${darkMode ? "text-white" : ""}`}>Conteúdo</CardTitle></CardHeader>
          <CardContent
            className={`prose max-w-none rich-preserve overflow-x-auto break-words text-base md:text-lg leading-7 md:leading-8 ${darkMode ? "prose-invert prose-a:text-white/90 prose-a:underline" : ""}`}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        </Card>
      </div>
    </WallpaperBackground>
  );
}
