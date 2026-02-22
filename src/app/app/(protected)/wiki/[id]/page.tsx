"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { safeSelect } from "@/lib/supabase/fallback";
import { cn } from "@/lib/utils";
import { AlignLeft, BookOpen, ChevronRight, Edit2, Trash2 } from "lucide-react";

// ─── tipos ─────────────────────────────────────────────────────────────────────

type WikiRow = {
  id: string;
  title: string;
  content_html: string;
  cover_url: string | null;
  category_id: string | null;
  created_by_persona_id: string;
  created_at: string;
  updated_at: string;
  wallpaper_slug?: string | null; // Fix #2: TEXT slug para renderização local
  personas?: { id: string; name: string; avatar_url: string | null } | null;
  wiki_categories?: {
    id: string;
    name: string;
    parent_id: string | null;
  } | null;
};

// ─── Geração de TOC a partir do HTML ─────────────────────────────────────────
// Fix #15: extrai headings do content_html para gerar índice de navegação.

type TocItem = {
  id: string;
  text: string;
  level: 1 | 2 | 3;
};

function extractToc(html: string): TocItem[] {
  if (typeof window === "undefined") return []; // SSR guard

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const headings = Array.from(doc.querySelectorAll("h1, h2, h3"));

  return headings.map((el, i) => {
    const level = parseInt(el.tagName[1] ?? "2", 10) as 1 | 2 | 3;
    const text = el.textContent?.trim() ?? `Seção ${i + 1}`;
    const id = `toc-heading-${i}`;
    return { id, text, level };
  });
}

/** Injeta IDs nos headings do HTML para que as âncoras funcionem */
function injectHeadingIds(html: string): string {
  let counter = 0;
  return html.replace(/<(h[123])[^>]*>/gi, (match, tag) => {
    const id = `toc-heading-${counter++}`;
    // remove id existente e injeta o novo
    const cleaned = match.replace(/\s*id="[^"]*"/i, "");
    return cleaned.replace(`<${tag}`, `<${tag} id="${id}"`);
  });
}

// ─── TOC Sidebar ──────────────────────────────────────────────────────────────

function TableOfContents({
  items,
  activeId,
}: {
  items: TocItem[];
  activeId: string | null;
}) {
  if (items.length === 0) return null;

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = 80; // altura do header sticky
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }

  return (
    <nav className="space-y-0.5">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <AlignLeft className="h-3 w-3" /> Índice
      </p>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => scrollTo(item.id)}
          className={cn(
            "block w-full rounded-lg px-2 py-1 text-left text-xs transition hover:bg-muted/60",
            item.level === 1 && "font-semibold",
            item.level === 2 && "pl-4 text-muted-foreground",
            item.level === 3 && "pl-7 text-muted-foreground/70",
            activeId === item.id && "bg-primary/10 text-primary",
          )}
        >
          {item.text}
        </button>
      ))}
    </nav>
  );
}

// ─── Hook: qual heading está visível ─────────────────────────────────────────

function useActiveHeading(ids: string[]) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [ids]);

  return activeId;
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function WikiViewPage() {
  const params = useParams<{ id: string }>();
  const wikiId = params?.id as string;

  const router = useRouter();
  const { activePersona } = useActivePersona();

  const [loading, setLoading] = useState(true);
  const [wiki, setWiki] = useState<WikiRow | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canEdit = useMemo(() => {
    if (!wiki || !activePersona) return false;
    return wiki.created_by_persona_id === activePersona.id;
  }, [wiki, activePersona]);

  async function load() {
    setLoading(true);

    // Fix #2: busca wallpaper_slug (TEXT) em vez de wallpaper_id (UUID)
    const query = await safeSelect({
      missingColumn: "wallpaper_slug",
      primary: () =>
        supabase
          .from("wiki_pages")
          .select(
            "id,title,content_html,cover_url,category_id,created_by_persona_id,created_at,updated_at,wallpaper_slug,personas(id,name,avatar_url),wiki_categories(id,name,parent_id)",
          )
          .eq("id", wikiId)
          .maybeSingle(),
      fallback: () =>
        supabase
          .from("wiki_pages")
          .select(
            "id,title,content_html,cover_url,category_id,created_by_persona_id,created_at,updated_at,personas(id,name,avatar_url),wiki_categories(id,name,parent_id)",
          )
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

  async function deleteWiki() {
    if (!wiki || !activePersona || deleting) return;
    setDeleting(true);
    const { error } = await supabase
      .from("wiki_pages")
      .delete()
      .eq("id", wiki.id)
      .eq("created_by_persona_id", activePersona.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Wiki excluída.");
    router.push("/app/wiki");
  }

  useEffect(() => {
    void load();
  }, [wikiId]);

  // ── TOC + headings ──────────────────────────────────────────────────────
  const processedHtml = useMemo(
    () =>
      wiki?.content_html
        ? injectHeadingIds(renderRichHtml(wiki.content_html))
        : "",
    [wiki?.content_html],
  );

  const toc = useMemo(() => extractToc(processedHtml), [processedHtml]);
  const headingIds = useMemo(() => toc.map((t) => t.id), [toc]);
  const activeId = useActiveHeading(headingIds);

  // ─── loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-dvh w-full px-3 py-4 sm:px-4 md:px-6 md:py-8">
        <AppPageSkeleton compact />
      </div>
    );
  }

  if (!wiki) {
    return (
      <div className="min-h-dvh w-full px-3 py-4 sm:px-4 md:px-6 md:py-8">
        <div className="mx-auto w-full max-w-5xl">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Wiki não encontrada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Essa wiki pode ter sido removida ou você não tem acesso.</p>
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
      </div>
    );
  }

  return (
    <WallpaperBackground
      wallpaperSlug={wiki.wallpaper_slug ?? null}
      className="min-h-dvh w-full px-3 py-4 sm:px-4 md:px-6 md:py-8"
    >
      <div className="mx-auto w-full max-w-6xl">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="mb-4 flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={() => router.push("/app/wiki")}
          >
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            {/* Mobile: toggle TOC */}
            {toc.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 rounded-2xl md:hidden"
                onClick={() => setTocOpen((v) => !v)}
              >
                <AlignLeft className="h-4 w-4" />
                Índice
              </Button>
            )}
            {wiki.category_id && (
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() =>
                  router.push(`/app/wiki/categories/${wiki.category_id}`)
                }
              >
                <BookOpen className="mr-1.5 h-4 w-4" /> Categoria
              </Button>
            )}
            {canEdit && (
              <>
                <Button
                  className="gap-1.5 rounded-2xl"
                  onClick={() => router.push(`/app/wiki/${wiki.id}/edit`)}
                >
                  <Edit2 className="h-4 w-4" /> Editar
                </Button>
                {!confirmDelete ? (
                  <Button
                    variant="destructive"
                    className="gap-1.5 rounded-2xl"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="h-4 w-4" /> Excluir
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="destructive"
                      className="rounded-2xl"
                      onClick={() => void deleteWiki()}
                      disabled={deleting}
                    >
                      {deleting ? "Excluindo..." : "Confirmar"}
                    </Button>
                    <Button
                      variant="secondary"
                      className="rounded-2xl"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </header>

        {/* ── Layout principal: conteúdo + sidebar (desktop) ──────────────── */}
        <div className="flex gap-6">
          {/* ── Conteúdo ──────────────────────────────────────────────────── */}
          <article className="min-w-0 flex-1 space-y-4">
            {/* Cover / wallpaper thumbnail */}
            <div className="overflow-hidden rounded-2xl border border-white/20 bg-card/80 backdrop-blur-sm shadow-sm">
              <div className="relative h-44 md:h-64 w-full overflow-hidden bg-muted/30">
                {wiki.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={wiki.cover_url}
                    alt={wiki.title}
                    className="h-full w-full object-cover"
                  />
                ) : wiki.wallpaper_slug ? (
                  <WallpaperBackground
                    wallpaperSlug={wiki.wallpaper_slug}
                    className="h-full w-full"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <BookOpen className="h-10 w-10 text-muted-foreground/20" />
                  </div>
                )}
              </div>

              <div className="p-4 md:p-6 space-y-2">
                {wiki.wiki_categories?.name && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ChevronRight className="h-3 w-3" />
                    {wiki.wiki_categories.name}
                  </div>
                )}

                {/* Título usa fonte display automaticamente via h1 */}
                <h1 className="text-2xl md:text-4xl">{wiki.title}</h1>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Por{" "}
                    <b className="text-foreground">
                      {wiki.personas?.name ?? "Persona"}
                    </b>
                  </span>
                  <span>·</span>
                  <span>
                    Atualizado em{" "}
                    {new Date(wiki.updated_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>

                <div className="pt-1">
                  <HighlightButtonGroup
                    targetType="wiki"
                    targetId={wiki.id}
                    title={wiki.title}
                    coverUrl={wiki.cover_url}
                  />
                </div>
              </div>
            </div>

            {/* Mobile TOC inline */}
            {toc.length > 0 && tocOpen && (
              <div className="rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm md:hidden">
                <TableOfContents items={toc} activeId={activeId} />
              </div>
            )}

            {/* Conteúdo da wiki */}
            <div className="rounded-2xl border border-white/20 bg-card/80 p-4 shadow-sm backdrop-blur-sm md:p-6">
              <div
                className="prose prose-sm max-w-none break-words leading-7 md:prose-base md:leading-8"
                dangerouslySetInnerHTML={{ __html: processedHtml }}
              />
            </div>
          </article>

          {/* ── Sidebar TOC (desktop) ──────────────────────────────────────── */}
          {toc.length > 0 && (
            <aside className="hidden w-56 shrink-0 md:block">
              <div className="sticky top-24 rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm">
                <TableOfContents items={toc} activeId={activeId} />
              </div>
            </aside>
          )}
        </div>
      </div>
    </WallpaperBackground>
  );
}
