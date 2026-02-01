"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  persona_id: string;
  personas: { name: string; avatar_url: string | null; user_id: string } | null;
};

export default function ProfilePage() {
  const { activePersona } = useActivePersona();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [followers, setFollowers] = useState<number>(0);
  const [following, setFollowing] = useState<number>(0);

  const [posts, setPosts] = useState<PostRow[]>([]);

  const activePersonaTag = useMemo(() => {
    if (!activePersona) return null;
    return {
      name: activePersona.name,
      bio: (activePersona as any).bio ?? null,
      avatar_url: (activePersona as any).avatar_url ?? null,
    };
  }, [activePersona]);

  async function ensureProfileRow(userId: string) {
    // tenta buscar
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, bio, avatar_url, banner_url")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("ERRO profiles select:", error);
      return null;
    }

    // se não existe (usuário criado antes do trigger), cria
    if (!data) {
      const { data: created, error: insErr } = await supabase
        .from("profiles")
        .upsert(
          { id: userId, username: null, display_name: null, bio: null },
          { onConflict: "id" },
        )
        .select("id, username, display_name, bio, avatar_url, banner_url")
        .single();

      if (insErr) {
        console.error("ERRO profiles upsert:", insErr);
        return null;
      }
      return created as any;
    }

    return data as any;
  }

  async function load() {
    setLoading(true);

    // ✅ checa sessão/usuário
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) console.error("ERRO getUser:", userErr);

    const user = userData.user;
    if (!user) {
      setLoading(false);
      // manda pro login (ajuste essa rota se a sua for diferente)
      location.href = "/login";
      return;
    }

    // ✅ garante que existe linha em profiles
    const profData = await ensureProfileRow(user.id);
    setProfile(profData);

    // followers / following
    const [f1, f2] = await Promise.all([
      supabase
        .from("follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", user.id),
      supabase
        .from("follows")
        .select("following_id", { count: "exact", head: true })
        .eq("follower_id", user.id),
    ]);

    setFollowers(f1.count ?? 0);
    setFollowing(f2.count ?? 0);

    // Posts do usuário (via join personas.user_id)
    const postsRes = await supabase
      .from("posts")
      .select(
        `
        id,
        content,
        created_at,
        persona_id,
        personas!inner (
          name,
          avatar_url,
          user_id
        )
      `,
      )
      .eq("personas.user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (postsRes.error) console.error("ERRO posts:", postsRes.error);
    setPosts((postsRes.data ?? []) as any);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : !profile ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Perfil não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Não consegui carregar seu perfil. Tente recarregar.
          </CardContent>
          <div className="px-4 pb-4">
            <Button className="w-full rounded-2xl" onClick={load}>
              Recarregar
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Banner + avatar */}
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

                {/* Persona ativa (tag explícita) */}
                <div className="mt-3 rounded-2xl border bg-muted/30 p-3">
                  <div className="text-[11px] font-medium text-muted-foreground">
                    Persona ativa
                  </div>

                  {activePersonaTag ? (
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-9 w-9 overflow-hidden rounded-xl border bg-background">
                        {activePersonaTag.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={activePersonaTag.avatar_url}
                            alt="persona avatar"
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {activePersonaTag.name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {activePersonaTag.bio ?? "(sem descrição)"}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="secondary"
                        className="ml-auto rounded-2xl"
                        onClick={() => (location.href = "/app/personas")}
                      >
                        Trocar
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Nenhuma persona selecionada.
                      <Button
                        size="sm"
                        variant="secondary"
                        className="ml-2 rounded-2xl"
                        onClick={() => (location.href = "/app/personas")}
                      >
                        Selecionar
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => (location.href = "/app/profile/edit")}
                  >
                    Editar perfil
                  </Button>

                  <div className="ml-auto flex items-center gap-2 text-xs">
                    <button
                      className="rounded-full border px-3 py-1 text-muted-foreground hover:bg-muted/60"
                      onClick={() => (location.href = "/app/profile/followers")}
                      type="button"
                    >
                      <b className="text-foreground">{followers}</b> seguidores
                    </button>

                    <button
                      className="rounded-full border px-3 py-1 text-muted-foreground hover:bg-muted/60"
                      onClick={() => (location.href = "/app/profile/following")}
                      type="button"
                    >
                      <b className="text-foreground">{following}</b> seguindo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Posts do usuário */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Seus posts</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {posts.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Você ainda não postou nada.
                </div>
              ) : (
                posts.map((p) => (
                  <div key={p.id} className="rounded-2xl border p-3">
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate">
                        {p.personas?.name ?? "Persona"} •{" "}
                        {new Date(p.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>

                    <div
                      className="prose prose-invert max-w-none text-sm"
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
