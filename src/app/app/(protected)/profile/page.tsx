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
import {
  getMyHighlights,
  normalizeHighlights,
  type Highlight,
  type NormalizedHighlight,
} from "@/lib/highlights/highlights";
import ProfileWikisGrid from "@/components/profile/ProfileWikisGrid";
import { CreateChooser } from "@/components/app/CreateChooser";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit2,
  PenLine,
  Plus,
  Star,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import WallpaperBackground from "@/components/ui/WallpaperBackground";

// ─── tipos ─────────────────────────────────────────────────────────────────────

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
  wallpaper_slug: string | null;
  personas: { name: string; avatar_url: string | null; user_id: string } | null;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function htmlToText(html: string, max = 200) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d === 0) return "hoje";
  if (d === 1) return "ontem";
  if (d < 30) return `${d}d atrás`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

// ─── PostPreviewCard ──────────────────────────────────────────────────────────
// Fix #14: previews colapsados em vez de HTML completo

function PostPreviewCard({ p, onOpen }: { p: PostRow; onOpen: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const preview = htmlToText(p.content);

  return (
    <div className="overflow-hidden rounded-xl border transition hover:shadow-sm">
      {/* Faixa wallpaper */}
      {p.wallpaper_slug && (
        <div className="h-10 w-full cursor-pointer" onClick={onOpen}>
          <WallpaperBackground
            wallpaperSlug={p.wallpaper_slug}
            className="h-full w-full"
          />
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Meta */}
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="font-medium text-foreground">
              {p.personas?.name ?? "Persona"}
            </span>
            <span>·</span>
            <span>{relTime(p.created_at)}</span>
          </span>
          <button
            type="button"
            onClick={onOpen}
            className="rounded-full border px-2 py-0.5 text-[11px] hover:bg-muted/60 transition"
          >
            Abrir
          </button>
        </div>

        {/* Conteúdo — colapsado por padrão (Fix #14) */}
        {!expanded ? (
          <p className="line-clamp-2 text-sm text-foreground/80">{preview}</p>
        ) : (
          <div
            className="prose prose-sm max-w-none break-words text-sm"
            dangerouslySetInnerHTML={{ __html: renderRichHtml(p.content) }}
          />
        )}

        {/* Toggle */}
        <button
          type="button"
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Recolher
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> Ver mais
            </>
          )}
        </button>

        <div className="border-t pt-2">
          <HighlightButtonGroup
            targetType="post"
            targetId={p.id}
            title={`Post de ${p.personas?.name ?? "Persona"}`}
          />
        </div>
      </div>
    </div>
  );
}

// ─── HighlightGrid ────────────────────────────────────────────────────────────

function HighlightGrid({
  highlights,
  loading,
}: {
  highlights: NormalizedHighlight[];
  loading: boolean;
}) {
  const router = useRouter();
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-xl border bg-muted/40"
          />
        ))}
      </div>
    );
  }
  if (highlights.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nenhum destaque adicionado ainda.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {highlights.map((item) => {
        const isWiki = item.target_type === "wiki";
        const title = item.title ?? (isWiki ? "Wiki" : "Post");
        return (
          <button
            key={item.id}
            type="button"
            className="group overflow-hidden rounded-xl border text-left transition hover:shadow-md active:scale-[0.98]"
            onClick={() =>
              router.push(
                isWiki
                  ? `/app/wiki/${item.target_id}`
                  : `/app/post/${item.target_id}`,
              )
            }
          >
            <div className="relative h-20 bg-muted/40">
              {item.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.cover_url}
                  alt={title}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  {isWiki ? (
                    <BookOpen className="h-5 w-5 text-muted-foreground/30" />
                  ) : (
                    <PenLine className="h-5 w-5 text-muted-foreground/30" />
                  )}
                </div>
              )}
              <span
                className={cn(
                  "absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white",
                  isWiki ? "bg-blue-500/90" : "bg-violet-500/90",
                )}
              >
                {isWiki ? "Wiki" : "Post"}
              </span>
            </div>
            <div className="p-2">
              <p className="line-clamp-2 text-[11px] font-semibold leading-snug">
                {title}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { activePersona } = useActivePersona();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [highlights, setHighlights] = useState<NormalizedHighlight[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(true);
  const [tab, setTab] = useState<"posts" | "wikis" | "highlights">("posts");
  const [createOpen, setCreateOpen] = useState(false);

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
    }

    const profData = await ensureProfileRow(user.id);
    setProfile(profData);

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

    // Fix #14: inclui wallpaper_slug para renderizar faixa no card
    const postsRes = await supabase
      .from("posts")
      .select(
        "id, content, created_at, persona_id, wallpaper_slug, personas!inner(name, avatar_url, user_id)",
      )
      .eq("personas.user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (postsRes.error) console.error("ERRO posts:", postsRes.error);
    setPosts((postsRes.data ?? []) as any);

    setHighlightsLoading(true);
    const raw = await getMyHighlights("profile");
    const normalized = await normalizeHighlights(raw);
    setHighlights(normalized.filter((h) => !h.isRemoved));
    setHighlightsLoading(false);

    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const displayName = profile?.display_name ?? profile?.username ?? "Sem nome";
  const username = profile?.username ?? "sem-username";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 p-4">
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border bg-muted/40"
            />
          ))}
        </div>
      ) : !profile ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Perfil não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Não conseguimos carregar seu perfil. Tente recarregar.</p>
            <Button className="w-full rounded-full" onClick={load}>
              Recarregar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <h1 className="page-title">Perfil</h1>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full gap-1.5"
                onClick={() => router.push("/app/profile/edit")}
              >
                <Edit2 className="h-3.5 w-3.5" /> Editar
              </Button>
              <Button
                size="sm"
                className="rounded-full gap-1.5"
                onClick={() => setCreateOpen(true)}
                disabled={!activePersona}
              >
                <Plus className="h-3.5 w-3.5" /> Criar
              </Button>
            </div>
          </div>

          {/* ── Banner + avatar + info ─────────────────────────────────────── */}
          <div className="overflow-hidden rounded-2xl border card-raised">
            {/* Banner */}
            <div className="relative h-32 bg-gradient-to-br from-primary/20 to-accent/30">
              {profile.banner_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.banner_url}
                  alt="banner"
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            {/* Info */}
            <div className="px-4 pb-4">
              {/* Avatar sobrepõe o banner */}
              <div className="-mt-8 mb-3 h-16 w-16 overflow-hidden rounded-2xl border-2 border-background bg-muted shadow-md">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary/10">
                    <UserRound className="h-7 w-7 text-primary/50" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-semibold leading-tight">
                  {displayName}
                </h2>
                <p className="text-xs text-muted-foreground">@{username}</p>
                {profile.bio && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {profile.bio}
                  </p>
                )}
              </div>

              {/* Seguidores */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition hover:bg-muted/60"
                  onClick={() => router.push("/app/profile/followers")}
                >
                  <Users className="h-3 w-3" />
                  <b>{followers}</b> seguidores
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition hover:bg-muted/60"
                  onClick={() => router.push("/app/profile/following")}
                >
                  <b>{following}</b> seguindo
                </button>
              </div>

              {/* Persona ativa — compacta */}
              {activePersona && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border bg-muted/20 px-3 py-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
                    {activePersona.avatar_url ? (
                      <img
                        src={activePersona.avatar_url}
                        alt={activePersona.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-bold">
                        {activePersona.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs">
                    Usando <b>{activePersona.name}</b>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-6 rounded-lg px-2 text-xs"
                    onClick={() => router.push("/app/personas")}
                  >
                    Trocar
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ── Tabs ──────────────────────────────────────────────────────── */}
          <ToggleGroup
            type="single"
            value={tab}
            onValueChange={(v) => setTab((v as any) || "posts")}
            className="flex gap-2"
          >
            {[
              { value: "posts", label: "Posts", icon: PenLine },
              { value: "wikis", label: "Wikis", icon: BookOpen },
              { value: "highlights", label: "Destaques", icon: Star },
            ].map(({ value, label, icon: Icon }) => (
              <ToggleGroupItem
                key={value}
                value={value}
                className="flex-1 gap-1.5 rounded-xl border text-xs"
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {/* ── Conteúdo das tabs ─────────────────────────────────────────── */}

          {tab === "posts" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {posts.length === 0
                    ? "Nenhum post"
                    : `${posts.length} post${posts.length > 1 ? "s" : ""}`}
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-full gap-1.5"
                  onClick={() => router.push("/app/feed/new")}
                  disabled={!activePersona}
                >
                  <Plus className="h-3.5 w-3.5" /> Novo
                </Button>
              </div>

              {posts.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Você ainda não postou nada.
                </div>
              ) : (
                posts.map((p) => (
                  <PostPreviewCard
                    key={p.id}
                    p={p}
                    onOpen={() => router.push(`/app/post/${p.id}`)}
                  />
                ))
              )}
            </div>
          )}

          {tab === "wikis" && (
            <ProfileWikisGrid personaId={activePersona?.id ?? null} />
          )}

          {tab === "highlights" && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Seus destaques</p>
              <HighlightGrid
                highlights={highlights}
                loading={highlightsLoading}
              />
            </div>
          )}

          <CreateChooser
            open={createOpen}
            onOpenChange={setCreateOpen}
            hasPersona={!!activePersona}
          />
        </>
      )}
    </div>
  );
}
