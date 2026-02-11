"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FollowButton from "@/components/profile/FollowButton";
import { renderRichHtml } from "@/lib/render/richText";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
};

type PostRow = {
  id: string;
  content: string;
  created_at: string;
  personas: { name: string; avatar_url: string | null } | null;
};

export default function PublicProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [posts, setPosts] = useState<PostRow[]>([]);

  async function loadAll() {
    setLoading(true);

    const uname = decodeURIComponent(params.username).trim().toLowerCase();

    const profRes = await supabase
      .from("profiles")
      .select("id, username, display_name, bio, avatar_url, banner_url")
      .eq("username", uname)
      .maybeSingle();

    if (profRes.error) console.error(profRes.error);

    const p = (profRes.data ?? null) as any;
    setProfile(p);

    if (!p) {
      setFollowers(0);
      setFollowing(0);
      setPosts([]);
      setLoading(false);
      return;
    }

    const [f1, f2] = await Promise.all([
      supabase
        .from("follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", p.id),
      supabase
        .from("follows")
        .select("following_id", { count: "exact", head: true })
        .eq("follower_id", p.id),
    ]);

    setFollowers(f1.count ?? 0);
    setFollowing(f2.count ?? 0);

    // posts do usuário (via join com personas.user_id)
    const postsRes = await supabase
      .from("posts")
      .select(
        `
        id,
        content,
        created_at,
        personas!inner (
          name,
          avatar_url,
          user_id
        )
      `,
      )
      .eq("personas.user_id", p.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (postsRes.error) console.error(postsRes.error);

    setPosts((postsRes.data ?? []) as any);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.username]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Perfil</h1>
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
      ) : !profile ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Usuário não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Confira o username.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border">
            <div className="relative h-28 bg-muted">
              {profile.banner_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.banner_url}
                  alt="banner"
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>

            <div className="flex items-start gap-3 p-4">
              <div className="-mt-10 h-16 w-16 overflow-hidden rounded-2xl border bg-background">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold">
                  {profile.display_name ?? profile.username ?? "Sem nome"}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  @{profile.username ?? "sem-username"}
                </div>

                {profile.bio ? (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {profile.bio}
                  </div>
                ) : null}

                <div className="mt-3 flex items-center gap-2">
                  <FollowButton targetUserId={profile.id} />

                  <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      <b className="text-foreground">{followers}</b> seguidores
                    </span>
                    <span>
                      <b className="text-foreground">{following}</b> seguindo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Posts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {posts.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Sem posts ainda.
                </div>
              ) : (
                posts.map((p) => (
                  <div key={p.id} className="rounded-2xl border p-3">
                    <div className="mb-2 text-xs text-muted-foreground">
                      {p.personas?.name ?? "Persona"} •{" "}
                      {new Date(p.created_at).toLocaleString("pt-BR")}
                    </div>

                    <div
                      className="prose prose-invert max-w-none text-sm overflow-x-auto break-words"
                      dangerouslySetInnerHTML={{
                        __html: renderRichHtml(p.content),
                      }}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
