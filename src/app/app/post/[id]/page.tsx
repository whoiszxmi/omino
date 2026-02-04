"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { renderRichHtml } from "@/lib/render/richText";
import PostComments from "@/app/app/feed/PostComments";
import HighlightButtonGroup from "@/components/highlights/HighlightButtonGroup";

type PostRow = {
  id: string;
  content: string;
  created_at: string;
  persona_id: string;
  personas: { name: string; avatar_url: string | null } | null;
};

export default function PostViewPage({ params }: { params: { id: string } }) {
  const [post, setPost] = useState<PostRow | null>(null);
  const [loading, setLoading] = useState(true);

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
          name,
          avatar_url
        )
      `,
      )
      .eq("id", params.id)
      .single();

    setLoading(false);

    if (error) {
      console.error("Erro ao carregar post:", error);
      return;
    }

    setPost(data as PostRow);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Post</h1>
        <Button
          variant="secondary"
          className="rounded-2xl"
          onClick={() => history.back()}
        >
          Voltar
        </Button>
      </header>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : !post ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Esse post não existe.
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {post.personas?.name ?? "Persona"}
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              {new Date(post.created_at).toLocaleString("pt-BR")}
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <div
              className="prose prose-invert max-w-none text-sm overflow-x-auto break-words"
              dangerouslySetInnerHTML={{
                __html: renderRichHtml(post.content),
              }}
            />

            <HighlightButtonGroup
              targetType="post"
              targetId={post.id}
              title={`Post de ${post.personas?.name ?? "Persona"}`}
            />

            <PostComments postId={post.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
