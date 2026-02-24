"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppPageSkeleton } from "@/components/app/AppPageSkeleton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import RichTextEditor from "@/components/editor/RichTextEditor";
import DraftStatusBar from "@/components/drafts/DraftStatusBar";
import DraftRestoreDialog from "@/components/drafts/DraftRestoreDialog";
import { useDraftAutosave } from "@/lib/drafts/useDraftAutosave";
import {
  buildDocContent,
  DEFAULT_DOC_BACKGROUND,
  parseDocContent,
} from "@/lib/content/docMeta";
import { isRichHtmlEmpty } from "@/lib/editor/isRichHtmlEmpty";
import WallpaperPicker from "@/components/editor/WallpaperPicker";
import WallpaperBackground from "@/components/ui/WallpaperBackground";
import { safeSelect } from "@/lib/supabase/fallback";
import CategorySelect from "@/components/wiki/CategorySelect";
import { renderRichHtml } from "@/lib/render/richText";
import { BookOpen, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type WikiRow = {
  id: string;
  title: string;
  content_html: string;
  cover_url: string | null;
  category_id: string | null;
  created_by_persona_id: string;
  wallpaper_slug?: string | null;
};

// ─── Preview ao vivo ──────────────────────────────────────────────────────────

function WikiPreview({
  wallpaperSlug,
  title,
  contentHtml,
  personaName,
}: {
  wallpaperSlug: string | null;
  title: string;
  contentHtml: string;
  personaName: string;
}) {
  const isEmpty = !contentHtml.trim() || contentHtml.trim() === "<p></p>";

  return (
    <div className="overflow-hidden rounded-2xl border shadow-sm">
      {wallpaperSlug ? (
        <WallpaperBackground
          wallpaperSlug={wallpaperSlug}
          className="h-24 w-full"
        />
      ) : (
        <div className="flex h-24 w-full items-center justify-center bg-muted/30">
          <BookOpen className="h-6 w-6 text-muted-foreground/30" />
        </div>
      )}
      <div className="space-y-2 p-4">
        <p className="text-base font-bold leading-snug">
          {title.trim() || (
            <span className="italic text-muted-foreground">Título...</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">Por {personaName}</p>
        {isEmpty ? (
          <p className="text-xs italic text-muted-foreground">
            O conteúdo aparecerá aqui...
          </p>
        ) : (
          <div
            className="prose prose-sm max-w-none break-words text-sm line-clamp-6"
            dangerouslySetInnerHTML={{ __html: renderRichHtml(contentHtml) }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function WikiEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const wikiId = params.id;
  const { activePersona } = useActivePersona();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wiki, setWiki] = useState<WikiRow | null>(null);
  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string>(
    DEFAULT_DOC_BACKGROUND,
  );
  const [wallpaperSlug, setWallpaperSlug] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // FIX: Use um ref para memorizar o initialDraft após o primeiro carregamento
  // Isso previne que o useDraftAutosave redetecte rascunhos após mudanças no wiki
  const initialDraftRef = useRef<{
    title: string | null;
    contentHtml: string;
    coverUrl: string | null;
  } | null>(null);

  // FIX: Só cria o initialDraft uma vez após o wiki carregar
  const initialDraft = useMemo(() => {
    if (initialDraftRef.current) {
      return initialDraftRef.current;
    }

    if (wiki) {
      const draft = {
        title: wiki?.title ?? null,
        contentHtml: wiki?.content_html ?? "",
        coverUrl: wiki?.wallpaper_slug ?? wiki?.cover_url ?? null,
      };
      initialDraftRef.current = draft;
      return draft;
    }

    // Retorna valores vazios enquanto carrega
    return {
      title: null,
      contentHtml: "",
      coverUrl: null,
    };
  }, [wiki]);

  const drafts = useDraftAutosave({
    scope: "wiki",
    draftKey: `edit:${wikiId}`,
    personaId: activePersona?.id ?? null,
    initialValue: initialDraft,
    value: { title, contentHtml, coverUrl: wallpaperSlug ?? backgroundColor },
    enabled: !!wiki, // FIX: Só habilita após o wiki carregar
    onRestore: (draft) => {
      setTitle(draft.title ?? "");
      setContentHtml(draft.contentHtml);
      const saved = draft.coverUrl ?? null;
      if (saved && !saved.startsWith("#")) setWallpaperSlug(saved);
    },
  });

  const canEdit = useMemo(
    () =>
      !!wiki &&
      !!activePersona &&
      wiki.created_by_persona_id === activePersona.id,
    [wiki, activePersona],
  );

  useEffect(() => {
    async function load() {
      const wikiRes = await safeSelect({
        missingColumn: "wallpaper_slug",
        primary: () =>
          supabase
            .from("wiki_pages")
            .select(
              "id,title,content_html,cover_url,category_id,created_by_persona_id,wallpaper_slug",
            )
            .eq("id", wikiId)
            .maybeSingle(),
        fallback: () =>
          supabase
            .from("wiki_pages")
            .select(
              "id,title,content_html,cover_url,category_id,created_by_persona_id",
            )
            .eq("id", wikiId)
            .maybeSingle(),
      });

      if (!wikiRes.error && wikiRes.data) {
        const row = wikiRes.data as unknown as WikiRow;
        setWiki(row);
        const parsed = parseDocContent(row.content_html ?? "");
        setTitle(row.title ?? "");
        setContentHtml(parsed.bodyHtml);
        setBackgroundColor(parsed.backgroundColor);
        setCoverUrl(row.cover_url ?? null);
        setCategoryId(row.category_id ?? null);
        setWallpaperSlug(row.wallpaper_slug ?? null);
      }

      setLoading(false);
    }

    void load();
  }, [wikiId]);

  async function uploadCover(file: File) {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) throw new Error("Não logado.");

    const ext = file.name.split(".").pop() || "png";
    const path = `wikis/${user.id}/covers/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("media")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  async function saveWiki() {
    if (!wiki || !canEdit) return toast.error("Sem permissão para editar.");
    if (!title.trim()) return toast.error("Título é obrigatório.");

    const sanitized = contentHtml.trim();
    if (isRichHtmlEmpty(sanitized)) return toast.error("Conteúdo obrigatório.");

    const contentWithBg = buildDocContent({
      bodyHtml: sanitized,
      backgroundColor,
    });

    setSaving(true);

    // Tenta salvar com wallpaper_slug; fallback sem se coluna não existir
    let updateRes = await supabase
      .from("wiki_pages")
      .update({
        title: title.trim(),
        content_html: contentWithBg,
        cover_url: coverUrl,
        category_id: categoryId,
        wallpaper_slug: wallpaperSlug,
      })
      .eq("id", wiki.id);

    if (updateRes.error?.code === "42703") {
      updateRes = await supabase
        .from("wiki_pages")
        .update({
          title: title.trim(),
          content_html: contentWithBg,
          cover_url: coverUrl,
          category_id: categoryId,
        })
        .eq("id", wiki.id);
    }

    setSaving(false);

    if (updateRes.error) return toast.error(updateRes.error.message);

    await drafts.discard();
    toast.success("Wiki atualizada!");
    router.push(`/app/wiki/${wiki.id}`);
  }

  if (loading) return <AppPageSkeleton compact />;
  if (!wiki)
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Wiki não encontrada.
      </div>
    );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Editar Wiki</h1>
          <p className="text-xs text-muted-foreground">
            Editando como: {activePersona?.name ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-2xl"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? (
              <>
                <EyeOff className="h-4 w-4" /> Editor
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" /> Preview
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={() => router.push(`/app/wiki/${wiki.id}`)}
          >
            Voltar
          </Button>
        </div>
      </header>

      <DraftStatusBar
        status={drafts.status}
        dirty={drafts.dirty}
        onSaveNow={() => drafts.flush()}
        onDiscard={() => drafts.discard()}
      />

      <div
        className={cn(
          "gap-6",
          showPreview ? "grid grid-cols-1 md:grid-cols-2" : "flex flex-col",
        )}
      >
        {/* ── Editor ──────────────────────────────────────────────────────── */}
        <Card className="rounded-2xl">
          <CardContent className="space-y-4 pt-5">
            {/* Capa por upload */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Imagem de capa (opcional)
              </label>
              <div
                className="overflow-hidden rounded-xl border bg-muted"
                style={{ height: coverUrl ? 160 : 64 }}
              >
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverUrl}
                    alt="cover"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Nenhuma capa
                  </div>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => coverInputRef.current?.click()}
                >
                  {coverUrl ? "Trocar capa" : "Adicionar capa"}
                </Button>
                {coverUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setCoverUrl(null)}
                  >
                    Remover
                  </Button>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  void uploadCover(file)
                    .then((url) => setCoverUrl(url))
                    .catch((err: unknown) =>
                      toast.error(
                        err instanceof Error ? err.message : "Falha no upload",
                      ),
                    );
                }}
              />
            </div>

            {/* Título */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Título
              </label>
              <Input
                placeholder="Título da wiki"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Categoria
              </label>
              <CategorySelect value={categoryId} onChange={setCategoryId} />
            </div>

            {/* Wallpaper picker colapsável */}
            <WallpaperPicker
              value={wallpaperSlug}
              onChange={setWallpaperSlug}
              label="Plano de fundo da wiki"
              defaultOpen={!!wallpaperSlug}
            />

            {/* Conteúdo */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Conteúdo
              </label>
              <RichTextEditor
                valueHtml={contentHtml}
                onChangeHtml={setContentHtml}
                placeholder="Edite o conteúdo da wiki..."
                folder="wikis"
                imageInsertMode="both"
                enableTables
              />
            </div>

            <Button
              className="w-full rounded-2xl"
              onClick={() => void saveWiki()}
              disabled={saving || !canEdit}
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </CardContent>
        </Card>

        {/* ── Preview ao vivo ─────────────────────────────────────────────── */}
        {showPreview && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Preview — como aparece na biblioteca
            </p>
            <WikiPreview
              wallpaperSlug={wallpaperSlug}
              title={title}
              contentHtml={contentHtml}
              personaName={activePersona?.name ?? "Persona"}
            />
          </div>
        )}
      </div>

      <DraftRestoreDialog
        open={!!drafts.restoreCandidate}
        onRestore={drafts.restore}
        onDiscard={() => void drafts.discard()}
      />
    </div>
  );
}
