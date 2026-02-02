"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DOMPurify from "isomorphic-dompurify";
import PostComments from "@/app/app/feed/PostComments";

type Post = {
  id: string;
  content: string;
  created_at: string;
  persona: {
    id: string;
    name: string;
    avatar_url?: string | null;
  };
};

export default function FeedPage() {
  const { activePersona } = useActivePersona();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);

  // cache: persona_id -> { name, avatar_url }
  const personaCache = useRef<
    Record<string, { name: string; avatar_url: string | null }>
  >({});

  async function loadPosts() {
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
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("ERRO loadPosts:", error);
      setLoading(false);
      return;
    }

    const mapped: Post[] = (data ?? []).map((row: any) => ({
      id: row.id,
      content: row.content,
      created_at: row.created_at,
      persona: {
        id: row.persona_id,
        name: row.personas?.name ?? "Desconhecido",
        avatar_url: row.personas?.avatar_url ?? null,
      },
    }));

    for (const p of mapped) {
      personaCache.current[p.persona.id] = {
        name: p.persona.name,
        avatar_url: p.persona.avatar_url ?? null,
      };
    }

    setPosts(mapped);
    setLoading(false);
  }

  useEffect(() => {
    loadPosts();
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Feed</h1>
          <p className="truncate text-xs text-muted-foreground">
            Postando como: {activePersona?.name ?? "—"}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={loadPosts}
          >
            Atualizar
          </Button>
          <Button
            className="rounded-2xl"
            onClick={() => (location.href = "/app/feed/new")}
            disabled={!activePersona}
          >
            Novo
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : posts.length === 0 ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Nada por aqui ainda</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Crie o primeiro post clicando em <b>Novo</b>.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card key={p.id} className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{p.persona.name}</CardTitle>
                <div className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleString("pt-BR")}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div
                  className="prose prose-invert max-w-none text-sm overflow-x-auto break-words"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(p.content),
                  }}
                />

                {/* ✅ comentários do post */}
                <PostComments postId={p.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
