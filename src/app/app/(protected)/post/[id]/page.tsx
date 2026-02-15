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
import { parseDocContent } from "@/lib/content/docMeta";
import WallpaperBackground from "@/components/ui/WallpaperBackground";
import { resolveForegroundTheme, type UiTheme } from "@/lib/ui/isDarkColor";
import { safeSelect } from "@/lib/supabase/fallback";

type PostRow = {
  id: string;
  content: string;
  created_at: string;
  persona_id: string;
  wallpaper_id?: string | null;
  ui_theme?: UiTheme | null;
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

    const query = await safeSelect({
      missingColumn: "ui_theme",
      // fallback para bancos sem ui_theme/wallpaper_id ainda aplicados
      primary: () =>
        supabase
          .from("posts")
          .select(`id,content,created_at,persona_id,wallpaper_id,ui_theme,personas(id,name,avatar_url)`)
          .eq("id", postId)
          .maybeSingle(),
      fallback: () =>
        supabase
          .from("posts")
          .select(`id,content,created_at,persona_id,wallpaper_id,personas(id,name,avatar_url)`)
          .eq("id", postId)
          .maybeSingle(),
    });

    if (query.error) {
      toast.error(query.error.message);
      setPost(null);
      setLoading(false);
      return;
    }

    setPost((query.data ?? null) as PostRow | null);
    setLoading(false);
  }

  useEffect(() => {
    void load();
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

  const parsed = useMemo(() => parseDocContent(post?.content ?? ""), [post?.content]);
  const safeHtml = useMemo(() => renderRichHtml(post?.content ?? ""), [post?.content]);
  const postTitle = parsed.title?.trim() || "Post";
  const tone = resolveForegroundTheme({
    wallpaperId: post?.wallpaper_id,
    backgroundColor: parsed.backgroundColor,
    uiTheme: post?.ui_theme,
  });
  const darkMode = tone === "light";

  if (loading) {
    return <div className="min-h-dvh w-full px-3 sm:px-4 md:px-6 py-4 md:py-8"><AppPageSkeleton compact /></div>;
  }

  if (!post) {
    return (
      <div className="min-h-dvh w-full px-3 sm:px-4 md:px-6 py-4 md:py-8">
        <div className="mx-auto w-full max-w-5xl">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Post não encontrado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>Esse post pode ter sido removido ou você não tem acesso.</div>
              <Button variant="secondary" className="w-full rounded-2xl" onClick={() => router.push("/app/feed")}>Voltar para o Feed</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <WallpaperBackground wallpaperId={post.wallpaper_id} fallback={parsed.backgroundColor} className={`min-h-dvh w-full px-3 sm:px-4 md:px-6 py-4 md:py-8 ${darkMode ? "text-white" : "text-foreground"}`}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="flex items-center justify-between gap-2">
          <Button variant="secondary" className="rounded-2xl shadow-sm" onClick={() => router.push("/app/feed")}>Voltar</Button>

          {canEdit ? (
            <div className="flex items-center gap-2">
              <Button className="rounded-2xl shadow-sm" onClick={() => router.push(`/app/post/${post.id}/edit`)}>Editar</Button>
              <Dialog>
                <DialogTrigger asChild><Button variant="destructive" className="rounded-2xl shadow-sm">Excluir</Button></DialogTrigger>
                <DialogContent className="rounded-2xl shadow-sm">
                  <DialogHeader>
                    <DialogTitle>Excluir post</DialogTitle>
                    <DialogDescription>Essa ação não pode ser desfeita.</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="destructive" className="rounded-xl" onClick={() => void deletePost()} disabled={deleting}>{deleting ? "Excluindo..." : "Confirmar exclusão"}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : null}
        </header>

        <Card className="rounded-2xl border-white/20 shadow-sm bg-transparent backdrop-blur-[1px]">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-xl md:text-3xl">{parsed.title || "Sem título"}</CardTitle>
                <div className={`text-xs md:text-sm ${darkMode ? "text-white/80" : "text-muted-foreground"}`}>{new Date(post.created_at).toLocaleString("pt-BR")}</div>
              </div>
              <div className="h-10 w-10 overflow-hidden rounded-xl border border-white/25 bg-black/10">
                {post.personas?.avatar_url ? <img src={post.personas.avatar_url} alt="avatar" className="h-full w-full object-cover" /> : null}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div
              className={`prose max-w-none rich-preserve overflow-x-auto break-words text-base md:text-lg leading-7 md:leading-8 ${darkMode ? "prose-invert prose-a:text-white/90 prose-a:underline" : ""}`}
              dangerouslySetInnerHTML={{ __html: safeHtml }}
            />

            <HighlightButtonGroup targetType="post" targetId={post.id} title={postTitle} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-white/20 shadow-sm bg-transparent backdrop-blur-[1px]">
          <CardHeader className="pb-2"><CardTitle className={`text-base ${darkMode ? "text-white" : ""}`}>Comentários</CardTitle></CardHeader>
          <CardContent><PostComments postId={post.id} /></CardContent>
        </Card>
      </div>
    </WallpaperBackground>
  );
}
