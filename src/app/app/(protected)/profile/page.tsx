"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { renderRichHtml } from "@/lib/render/richText";
import HighlightButtonGroup from "@/components/highlights/HighlightButtonGroup";
import { getMyHighlights, type Highlight } from "@/lib/highlights/highlights";
import ProfileWikisGrid from "@/components/profile/ProfileWikisGrid";
import { CreateChooser } from "@/components/app/CreateChooser";

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
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [followers, setFollowers] = useState<number>(0);
  const [following, setFollowing] = useState<number>(0);

  const [posts, setPosts] = useState<PostRow[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(true);

  const [tab, setTab] = useState<"posts" | "wikis" | "highlights">("posts");
  const [createOpen, setCreateOpen] = useState(false);

  function handleHighlightToggle(
    scope: "profile" | "community",
    highlighted: boolean,
    payload: {
      targetType: "post" | "wiki";
      targetId: string;
      title?: string;
      coverUrl?: string | null;
    },
  ) {
    if (scope !== "profile") return;

    if (!highlighted) {
      setHighlights((prev) =>
        prev.filter(
          (item) =>
            !(
              item.scope === "profile" &&
              item.target_type === payload.targetType &&
              item.target_id === payload.targetId
            ),
        ),
      );
      return;
    }

    const newRow: Highlight = {
      id: crypto.randomUUID(),
      scope: "profile",
      user_id: "me",
      target_type: payload.targetType,
      target_id: payload.targetId,
      title: payload.title ?? null,
      cover_url: payload.coverUrl ?? null,
      sort_order: 0,
      created_at: new Date().toISOString(),
    };

    setHighlights((prev) => {
      const exists = prev.some(
        (item) =>
          item.scope === "profile" &&
          item.target_type === payload.targetType &&
          item.target_id === payload.targetId,
      );
      return exists ? prev : [newRow, ...prev];
    });
  }

  const activePersonaTag = useMemo(() => {
    if (!activePersona) return null;
    return {
      name: activePersona.name,
      bio: (activePersona as any).bio ?? null,
      avatar_url: (activePersona as any).avatar_url ?? null,
    };
  }, [activePersona]);

  async function ensureProfileRow(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, bio, avatar_url, banner_url")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("ERRO profiles select:", error);
      return null;
    }

    if (!data) {
      const { data: created, error: insErr } = await supabase
        .from("profiles")
        .upsert({ id: userId }, { onConflict: "id" })
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

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setLoading(false);
      router.replace("/app/login");
      return;
      return;
    }

    // profile
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

    // posts do usuário (via join personas.user_id)
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
      .limit(20);

    if (postsRes.error) console.error("ERRO posts:", postsRes.error);
    setPosts((postsRes.data ?? []) as any);

    // highlights
    setHighlightsLoading(true);
    const Highlights = await getMyHighlights("profile");
    setHighlights(Highlights);
    setHighlightsLoading(false);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const canCreate = !!activePersona;

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
          {/* Header do perfil + criar */}
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-lg font-semibold">Seu perfil</div>
              <div className="truncate text-xs text-muted-foreground">
                {activePersona ? `Ativo: ${activePersona.name}` : "Sem persona"}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() => router.push("/app/profile/edit")}
              >
                Editar
              </Button>

              <Button
                className="rounded-2xl"
                onClick={() => setCreateOpen(true)}
                disabled={!canCreate}
                title={
                  !canCreate ? "Selecione uma persona para criar" : "Criar"
                }
              >
                Criar
              </Button>
            </div>
          </div>

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

                {/* Persona ativa bem explícita */}
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
                        onClick={() => router.push("/app/personas")}
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
                        onClick={() => router.push("/app/personas")}
                      >
                        Selecionar
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs">
                  <button
                    className="rounded-full border px-3 py-1 text-muted-foreground hover:bg-muted/60"
                    onClick={() => router.push("/app/profile/followers")}
                    type="button"
                  >
                    <b className="text-foreground">{followers}</b> seguidores
                  </button>

                  <button
                    className="rounded-full border px-3 py-1 text-muted-foreground hover:bg-muted/60"
                    onClick={() => router.push("/app/profile/following")}
                    type="button"
                  >
                    <b className="text-foreground">{following}</b> seguindo
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Abas (Amino-like) */}
          <Card className="rounded-2xl">
            <CardContent className="p-3">
              <ToggleGroup
                type="single"
                value={tab}
                onValueChange={(v) => setTab((v as any) || "posts")}
                className="flex flex-wrap gap-2"
              >
                <ToggleGroupItem value="posts" className="rounded-2xl border">
                  Posts
                </ToggleGroupItem>
                <ToggleGroupItem value="wikis" className="rounded-2xl border">
                  Wikis
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="highlights"
                  className="rounded-2xl border"
                >
                  Destaques
                </ToggleGroupItem>
              </ToggleGroup>
            </CardContent>
          </Card>

          {/* Conteúdo da aba */}
          {tab === "wikis" ? (
            <ProfileWikisGrid personaId={activePersona?.id ?? null} />
          ) : tab === "highlights" ? (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Destaques</CardTitle>
              </CardHeader>
              <CardContent>
                {highlightsLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="aspect-square rounded-2xl border bg-muted/40 animate-pulse"
                      />
                    ))}
                  </div>
                ) : highlights.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Você ainda não adicionou destaques.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {highlights.map((item) => {
                      const isWiki = item.target_type === "wiki";
                      const title = item.title ?? (isWiki ? "Wiki" : "Post");

                      return (
                        <button
                          key={item.id}
                          type="button"
                          className="aspect-square overflow-hidden rounded-2xl border text-left transition hover:bg-muted/30"
                          onClick={() => {
                            router.push(
                              isWiki
                                ? `/app/wiki/${item.target_id}`
                                : `/app/post/${item.target_id}`,
                            );
                          }}
                        >
                          <div className="flex h-full flex-col">
                            <div className="flex-1 bg-muted/40">
                              {item.cover_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.cover_url}
                                  alt={title}
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>
                            <div className="space-y-2 p-3">
                              <span className="inline-flex rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                                {isWiki ? "Wiki" : "Post"}
                              </span>
                              <div className="truncate text-sm font-medium">
                                {title}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Seus posts</CardTitle>
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-2xl"
                  onClick={() => router.push("/app/feed/new")}
                  disabled={!activePersona}
                >
                  Novo
                </Button>
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

                        <button
                          className="rounded-full border px-2 py-0.5 text-[11px] hover:bg-muted/60"
                          type="button"
                          onClick={() => router.push(`/app/post/${p.id}`)}
                        >
                          Abrir
                        </button>
                      </div>

                      <div
                        className="prose prose-invert max-w-none text-sm overflow-x-auto break-words"
                        dangerouslySetInnerHTML={{
                          __html: renderRichHtml(p.content),
                        }}
                      />

                      <div className="mt-3">
                        <HighlightButtonGroup
                          targetType="post"
                          targetId={p.id}
                          title={`Post de ${p.personas?.name ?? "Persona"}`}
                          onToggle={handleHighlightToggle}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* CreateChooser (Post ou Wiki) */}
          <CreateChooser open={createOpen} onOpenChange={setCreateOpen} />
        </>
      )}
    </div>
  );
}
