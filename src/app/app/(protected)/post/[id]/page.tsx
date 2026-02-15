"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppPageSkeleton } from "@/components/app/AppPageSkeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import HighlightButtonGroup from "@/components/highlights/HighlightButtonGroup";
import PostComments from "@/app/app/(protected)/feed/PostComments";
import { renderRichHtml } from "@/lib/render/richText";

type PostRow = {
  id: string;
  content: string;
  created_at: string;
  persona_id: string;
  personas?: { id: string; name: string; avatar_url: string | null } | null;
};

export default function PostViewPage() {
  const params = useParams<{ id: string }>();
  const postId = params?.id as string;

  const router = useRouter();
  const { activePersona } = useActivePersona();

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<PostRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canEdit = useMemo(() => {
    if (!post || !activePersona) return false;
    return post.persona_id === activePersona.id;
  }, [post, activePersona]);

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

    setPost((data ?? null) as PostRow | null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);


  async function deletePost() {
    if (!post || !activePersona || deleting) return;

    setDeleting(true);
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", post.id)
      .eq("persona_id", activePersona.id);

    setDeleting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Post excluído.");
    router.push("/app/feed");
  }
  const safeHtml = useMemo(() => renderRichHtml(post?.content ?? ""), [post?.content]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-4 p-4">
        <AppPageSkeleton compact />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-4 p-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Post não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>Esse post pode ter sido removido ou você não tem acesso.</div>
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

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-4 p-4">
      {/* Top actions */}
      <header className="flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          className="rounded-2xl shadow-sm"
          onClick={() => router.push("/app/feed")}
        >
          Voltar
        </Button>

        {canEdit ? (
          <div className="flex items-center gap-2">
            <Button className="rounded-2xl shadow-sm" onClick={() => router.push(`/app/post/${post.id}/edit`)}>
              Editar
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" className="rounded-2xl shadow-sm">Excluir</Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl shadow-sm">
                <DialogHeader>
                  <DialogTitle>Excluir post</DialogTitle>
                  <DialogDescription>Essa ação não pode ser desfeita.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="destructive" className="rounded-xl" onClick={() => void deletePost()} disabled={deleting}>
                    {deleting ? "Excluindo..." : "Confirmar exclusão"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </header>

      {/* Post card */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-sm">
                {post.personas?.name ?? "Persona"}
              </CardTitle>
              <div className="text-xs text-muted-foreground">
                {new Date(post.created_at).toLocaleString("pt-BR")}
              </div>
            </div>

            {/* mini avatar */}
            <div className="h-9 w-9 overflow-hidden rounded-xl border bg-background">
              {post.personas?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.personas.avatar_url}
                  alt="avatar"
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div
            className="prose max-w-none text-base leading-7 overflow-x-auto break-words"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />

          <HighlightButtonGroup
            targetType="post"
            targetId={post.id}
            title={`Post de ${post.personas?.name ?? "Persona"}`}
          />
        </CardContent>
      </Card>

      {/* Comments */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Comentários</CardTitle>
        </CardHeader>
        <CardContent>
          <PostComments postId={post.id} />
        </CardContent>
      </Card>
    </div>
  );
}
