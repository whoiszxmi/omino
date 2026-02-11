"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import RichTextEditor from "@/components/editor/RichTextEditor";

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

  const [contentHtml, setContentHtml] = useState("");

  const canEdit = useMemo(() => {
    if (!post || !activePersona) return false;
    return post.persona_id === activePersona.id;
  }, [post, activePersona]);

  const canSave = useMemo(() => {
    const html = (contentHtml || "").trim();
    const sanitized = html
      .replace(/<p>\s*<\/p>/g, "")
      .replace(/<p><br><\/p>/g, "")
      .trim();
    return !!sanitized;
  }, [contentHtml]);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select(
        `
        id,
        content,
        created_at,
        persona_id,
        personas (
          id,
          name,
          avatar_url
        )
      `,
      )
      .eq("id", postId)
      .maybeSingle();

    if (error) {
      console.error("ERRO load post:", error);
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

    setPost(data as any);
    setContentHtml((data as any).content ?? "");
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function save() {
    if (!post) return;
    if (!activePersona) return toast.error("Selecione uma persona.");
    if (!canEdit)
      return toast.error("Você não tem permissão para editar esse post.");
    if (!canSave) return toast.error("Escreva alguma coisa antes de salvar.");

    const html = contentHtml.trim();
    const sanitized = html
      .replace(/<p>\s*<\/p>/g, "")
      .replace(/<p><br><\/p>/g, "")
      .trim();

    setSaving(true);
    try {
      const { error } = await supabase
        .from("posts")
        .update({ content: sanitized })
        .eq("id", post.id);

      if (error) throw error;

      toast.success("Post atualizado!");
      router.push(`/app/post/${post.id}`);
    } catch (e: any) {
      console.error("ERRO save post:", e);
      toast.error(e?.message ?? "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

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

  // sem permissão
  if (!canEdit) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Sem permissão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              Para editar, você precisa estar usando a persona dona desse post.
            </div>
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
                Trocar persona
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">Editar post</h1>
          <p className="truncate text-xs text-muted-foreground">
            Editando como: {activePersona?.name ?? "—"}
          </p>
        </div>

        <Button
          variant="secondary"
          className="rounded-2xl"
          onClick={() => router.push(`/app/post/${post.id}`)}
        >
          Voltar
        </Button>
      </header>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Conteúdo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <RichTextEditor
            valueHtml={contentHtml}
            onChangeHtml={setContentHtml}
            placeholder="Edite seu post..."
            folder="posts"
            imageInsertMode="both"
            enableTables={false}
          />

          <Button
            className="w-full rounded-2xl"
            onClick={save}
            disabled={saving || !canSave}
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
