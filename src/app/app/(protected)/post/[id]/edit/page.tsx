"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { buildDocContent, DEFAULT_DOC_BACKGROUND, parseDocContent } from "@/lib/content/docMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import RichTextEditor from "@/components/editor/RichTextEditor";
import BackgroundPresetPicker from "@/components/editor/BackgroundPresetPicker";
import DraftStatusBar from "@/components/drafts/DraftStatusBar";
import DraftRestoreDialog from "@/components/drafts/DraftRestoreDialog";
import { useDraftAutosave } from "@/lib/drafts/useDraftAutosave";

type PostRow = {
  id: string;
  content: string;
  created_at: string;
  persona_id: string;
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
  const [backgroundColor, setBackgroundColor] = useState<string>(DEFAULT_DOC_BACKGROUND);

  const canEdit = useMemo(
    () => !!post && !!activePersona && post.persona_id === activePersona.id,
    [post, activePersona],
  );

  const canSave = useMemo(() => {
    const html = (contentHtml || "")
      .trim()
      .replace(/<p>\s*<\/p>/g, "")
      .replace(/<p><br><\/p>/g, "")
      .trim();
    return !!title.trim() && !!html;
  }, [contentHtml, title]);

  const drafts = useDraftAutosave({
    scope: "post",
    draftKey: `edit:${postId}`,
    personaId: activePersona?.id ?? null,
    initialValue: { title: null, contentHtml: post?.content ?? "", coverUrl: null },
    value: { title, contentHtml, coverUrl: backgroundColor },
    enabled: !!post,
    onRestore: (draft) => {
      setTitle(draft.title ?? "");
      setContentHtml(draft.contentHtml);
      setBackgroundColor(draft.coverUrl ?? DEFAULT_DOC_BACKGROUND);
    },
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select("id,content,created_at,persona_id,personas(id,name,avatar_url)")
        .eq("id", postId)
        .maybeSingle();

      if (error) {
        toast.error(error.message);
        setPost(null);
        setLoading(false);
        return;
      }

      if (!data) {
        setPost(null);
        setLoading(false);
        return;
      }

      const row = data as unknown as PostRow;
      const parsed = parseDocContent(row.content ?? "");
      setPost(row);
      setTitle(parsed.title);
      setContentHtml(parsed.bodyHtml);
      setBackgroundColor(parsed.backgroundColor);
      setLoading(false);
    }

    void load();
  }, [postId]);

  async function save() {
    if (!post) return;
    if (!activePersona) return toast.error("Selecione uma persona.");
    if (!canEdit) return toast.error("Você não tem permissão para editar esse post.");
    if (!title.trim()) return toast.error("Título é obrigatório.");
    if (!canSave) return toast.error("Escreva alguma coisa antes de salvar.");

    const sanitized = contentHtml
      .trim()
      .replace(/<p>\s*<\/p>/g, "")
      .replace(/<p><br><\/p>/g, "")
      .trim();

    const payload = buildDocContent({
      title,
      bodyHtml: sanitized,
      backgroundColor,
    });

    setSaving(true);
    try {
      const { error } = await supabase
        .from("posts")
        .update({ content: payload })
        .eq("id", post.id);
      if (error) throw error;

      await drafts.discard();
      toast.success("Post atualizado!");
      router.push(`/app/post/${post.id}`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Não foi possível salvar.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Carregando...</div>;

  if (!post) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-base">Post não encontrado</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>Esse post pode ter sido removido.</div>
            <Button variant="secondary" className="w-full rounded-2xl" onClick={() => router.push("/app/feed")}>Voltar para o Feed</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-base">Sem permissão</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>Para editar, você precisa estar usando a persona dona desse post.</div>
            <div className="flex gap-2">
              <Button variant="secondary" className="rounded-2xl" onClick={() => router.push(`/app/post/${post.id}`)}>Voltar</Button>
              <Button className="rounded-2xl" onClick={() => router.push("/app/personas")}>Trocar persona</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <header className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">Editar post</h1>
          <p className="truncate text-xs text-muted-foreground">Editando como: {activePersona?.name ?? "—"}</p>
        </div>
        <Button variant="secondary" className="rounded-2xl" onClick={() => router.push(`/app/post/${post.id}`)}>Voltar</Button>
      </header>

      <DraftStatusBar status={drafts.status} dirty={drafts.dirty} onSaveNow={() => drafts.flush()} onDiscard={() => drafts.discard()} />

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Conteúdo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Título do post" value={title} onChange={(event) => setTitle(event.target.value)} />

          <BackgroundPresetPicker value={backgroundColor} onChange={setBackgroundColor} />

          <div className="rounded-2xl p-2" style={{ backgroundColor }}>
            <RichTextEditor valueHtml={contentHtml} onChangeHtml={setContentHtml} placeholder="Edite seu post..." folder="posts" imageInsertMode="both" enableTables={false} />
          </div>

          <Button className="w-full rounded-2xl" onClick={() => void save()} disabled={saving || !canSave}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </CardContent>
      </Card>

      <DraftRestoreDialog open={!!drafts.restoreCandidate} onRestore={drafts.restore} onDiscard={() => void drafts.discard()} />
    </div>
  );
}
