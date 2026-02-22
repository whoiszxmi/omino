"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import {
  buildDocContent,
  DEFAULT_DOC_BACKGROUND,
  parseDocContent,
} from "@/lib/content/docMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import RichTextEditor from "@/components/editor/RichTextEditor";
import DraftStatusBar from "@/components/drafts/DraftStatusBar";
import DraftRestoreDialog from "@/components/drafts/DraftRestoreDialog";
import { useDraftAutosave } from "@/lib/drafts/useDraftAutosave";
import { AppPageSkeleton } from "@/components/app/AppPageSkeleton";
import { isRichHtmlEmpty } from "@/lib/editor/isRichHtmlEmpty";
import WallpaperPicker from "@/components/editor/WallpaperPicker";
import { safeSelect } from "@/lib/supabase/fallback";
import WallpaperBackground from "@/components/ui/WallpaperBackground";
import { renderBodyHtml } from "@/lib/render/richText";
import { Eye, EyeOff } from "lucide-react";

type PostRow = {
  id: string;
  content: string;
  created_at: string;
  persona_id: string;
  wallpaper_slug?: string | null;
  personas?: { id: string; name: string; avatar_url: string | null } | null;
};

export default function PostEditPage() {
  const params = useParams<{ id: string }>();
  const postId = params?.id as string;

  const router = useRouter();
  const { activePersona } = useActivePersona();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [post, setPost] = useState<PostRow | null>(null);
  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [backgroundColor, setBackgroundColor] = useState<string>(
    DEFAULT_DOC_BACKGROUND,
  );
  const [wallpaperSlug, setWallpaperSlug] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const canEdit = useMemo(
    () => !!post && !!activePersona && post.persona_id === activePersona.id,
    [post, activePersona],
  );

  const canSave = useMemo(() => {
    return !!title.trim() && !isRichHtmlEmpty(contentHtml);
  }, [contentHtml, title]);

  const drafts = useDraftAutosave({
    scope: "post",
    draftKey: `edit:${postId}`,
    personaId: activePersona?.id ?? null,
    initialValue: {
      title: null,
      contentHtml: post?.content ?? "",
      coverUrl: null,
    },
    value: { title, contentHtml, coverUrl: wallpaperSlug ?? backgroundColor },
    enabled: !!post,
    onRestore: (draft) => {
      setTitle(draft.title ?? "");
      setContentHtml(draft.contentHtml);
    },
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      const query = await safeSelect({
        missingColumn: "wallpaper_slug",
        primary: () =>
          supabase
            .from("posts")
            .select(
              "id,content,created_at,persona_id,wallpaper_slug,personas(id,name,avatar_url)",
            )
            .eq("id", postId)
            .maybeSingle(),
        fallback: () =>
          supabase
            .from("posts")
            .select(
              "id,content,created_at,persona_id,personas(id,name,avatar_url)",
            )
            .eq("id", postId)
            .maybeSingle(),
      });

      if (query.error) {
        toast.error(query.error.message);
        setPost(null);
        setLoading(false);
        return;
      }

      if (!query.data) {
        setPost(null);
        setLoading(false);
        return;
      }

      const row = query.data as unknown as PostRow;
      const parsed = parseDocContent(row.content ?? "");
      setPost(row);
      setTitle(parsed.title);
      setContentHtml(parsed.bodyHtml);
      setBackgroundColor(parsed.backgroundColor);
      setWallpaperSlug(row.wallpaper_slug ?? null);
      setLoading(false);
    }

    void load();
  }, [postId]);

  async function save() {
    if (!post) return;
    if (!activePersona) return toast.error("Selecione uma persona.");
    if (!canEdit)
      return toast.error("Você não tem permissão para editar esse post.");
    if (!title.trim()) return toast.error("Título é obrigatório.");
    if (!canSave) return toast.error("Escreva alguma coisa antes de salvar.");

    const payload = buildDocContent({
      title,
      bodyHtml: contentHtml.trim(),
      backgroundColor,
    });

    setSaving(true);
    try {
      let updateRes = await supabase
        .from("posts")
        .update({ content: payload, wallpaper_slug: wallpaperSlug })
        .eq("id", post.id);

      if (updateRes.error?.code === "42703") {
        updateRes = await supabase
          .from("posts")
          .update({ content: payload })
          .eq("id", post.id);
      }

      if (updateRes.error) throw updateRes.error;

      await drafts.discard();
      toast.success("Post atualizado!");
      router.push(`/app/post/${post.id}`);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Não foi possível salvar.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AppPageSkeleton compact />;

  if (!post) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Post não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>Esse post pode ter sido removido.</div>
            <Button
              variant="secondary"
              className="w-full rounded-2xl"
              onClick={() => router.push("/app/feed")}
            >
              Voltar para o Feed
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Sem Permissão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>Para editar, use a persona dona desse post.</div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() => router.push(`/app/post/${post.id}`)}
              >
                Voltar
              </Button>
              <Button
                className="rounded-2xl"
                onClick={() => router.push("/app/personas")}
              >
                Trocar Persona
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 p-4 md:p-6">
      <header className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">Editar post</h1>
          <p className="truncate text-xs text-muted-foreground">
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
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {showPreview ? "Editor" : "Preview"}
          </Button>
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={() => router.push(`/app/post/${post.id}`)}
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

      {showPreview ? (
        <WallpaperBackground
          wallpaperSlug={wallpaperSlug}
          fallback={backgroundColor}
          className="min-h-[400px] rounded-2xl p-6"
          mode="inline"
        >
          <div className="rounded-2xl bg-card/90 p-6 shadow-sm backdrop-blur-sm">
            <h1 className="mb-2 text-2xl font-bold">{title || "Sem título"}</h1>
            <div
              className="prose prose-sm max-w-none break-words"
              dangerouslySetInnerHTML={{ __html: renderBodyHtml(contentHtml) }}
            />
          </div>
        </WallpaperBackground>
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="space-y-4 pt-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Título
              </label>
              <Input
                placeholder="Título do post"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <WallpaperPicker
              value={wallpaperSlug}
              onChange={setWallpaperSlug}
              label="Plano de fundo do post"
            />

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Conteúdo
              </label>
              <RichTextEditor
                valueHtml={contentHtml}
                onChangeHtml={setContentHtml}
                placeholder="Edite seu post..."
                folder="posts"
                imageInsertMode="both"
                enableTables={false}
              />
            </div>

            <Button
              className="w-full rounded-2xl"
              onClick={() => void save()}
              disabled={saving || !canSave}
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </CardContent>
        </Card>
      )}

      <DraftRestoreDialog
        open={!!drafts.restoreCandidate}
        onRestore={drafts.restore}
        onDiscard={() => void drafts.discard()}
      />
    </div>
  );
}
