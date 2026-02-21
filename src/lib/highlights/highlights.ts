import { supabase } from "@/lib/supabase/client";

export type HighlightScope = "profile" | "community";
export type HighlightTargetType = "post" | "wiki";

export type Highlight = {
  id: string;
  scope: HighlightScope;
  user_id: string;
  target_type: HighlightTargetType;
  target_id: string;
  title: string | null;
  cover_url: string | null;
  sort_order: number;
  created_at: string;
};

// Tipo com title garantido como string (não-nulo)
export type NormalizedHighlight = Highlight & {
  title: string;
  isRemoved?: boolean;
};

type GetOpts = {
  type?: HighlightTargetType;
  limit?: number;
};

/**
 * Normaliza highlights: garante title como string e marca isRemoved
 * caso o post/wiki alvo tenha sido deletado.
 *
 * Esta função estava ausente e causava ReferenceError em runtime
 * em feed/page.tsx e profile/page.tsx.
 */
export async function normalizeHighlights(
  items: Highlight[],
): Promise<NormalizedHighlight[]> {
  if (items.length === 0) return [];

  const postIds = items
    .filter((h) => h.target_type === "post")
    .map((h) => h.target_id);
  const wikiIds = items
    .filter((h) => h.target_type === "wiki")
    .map((h) => h.target_id);

  const [postsRes, wikiRes] = await Promise.all([
    postIds.length
      ? supabase.from("posts").select("id").in("id", postIds)
      : Promise.resolve({ data: [] as { id: string }[], error: null }),
    wikiIds.length
      ? supabase.from("wiki_pages").select("id").in("id", wikiIds)
      : Promise.resolve({ data: [] as { id: string }[], error: null }),
  ]);

  const validPostIds = new Set((postsRes.data ?? []).map((r) => r.id));
  const validWikiIds = new Set((wikiRes.data ?? []).map((r) => r.id));

  return items.map((item): NormalizedHighlight => {
    const isRemoved =
      item.target_type === "post"
        ? !validPostIds.has(item.target_id)
        : !validWikiIds.has(item.target_id);

    return {
      ...item,
      title:
        item.title?.trim() || (item.target_type === "wiki" ? "Wiki" : "Post"),
      isRemoved,
    };
  });
}

export async function getCommunityHighlights(opts: GetOpts = {}) {
  let q = supabase
    .from("highlights")
    .select(
      "id, scope, user_id, target_type, target_id, title, cover_url, sort_order, created_at",
    )
    .eq("scope", "community")
    .order("sort_order", { ascending: false })
    .order("created_at", { ascending: false });
  if (opts.type) q = q.eq("target_type", opts.type);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) {
    console.error("ERRO getCommunityHighlights:", error);
    return [];
  }
  return (data ?? []) as Highlight[];
}

export async function getMyHighlights(
  scope: HighlightScope,
  opts: GetOpts = {},
) {
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) return [];
  let q = supabase
    .from("highlights")
    .select(
      "id, scope, user_id, target_type, target_id, title, cover_url, sort_order, created_at",
    )
    .eq("scope", scope)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .order("created_at", { ascending: false });
  if (opts.type) q = q.eq("target_type", opts.type);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) {
    console.error("ERRO getMyHighlights:", error);
    return [];
  }
  return (data ?? []) as Highlight[];
}

export async function isHighlighted(
  scope: HighlightScope,
  targetType: HighlightTargetType,
  targetId: string,
) {
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) return null;
  const { data, error } = await supabase
    .from("highlights")
    .select("id")
    .eq("scope", scope)
    .eq("user_id", user.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();
  if (error) {
    console.error("ERRO isHighlighted:", error);
    return null;
  }
  return data?.id ?? null;
}

export async function toggleHighlight(params: {
  scope: HighlightScope;
  targetType: HighlightTargetType;
  targetId: string;
  title?: string | null;
  coverUrl?: string | null;
}) {
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) throw new Error("Não logado.");
  const existingId = await isHighlighted(
    params.scope,
    params.targetType,
    params.targetId,
  );
  if (existingId) {
    const { error } = await supabase
      .from("highlights")
      .delete()
      .eq("id", existingId);
    if (error) throw error;
    return { highlighted: false as const };
  }
  const { error } = await supabase.from("highlights").insert({
    scope: params.scope,
    user_id: user.id,
    target_type: params.targetType,
    target_id: params.targetId,
    title: params.title ?? null,
    cover_url: params.coverUrl ?? null,
  });
  if (error) throw error;
  return { highlighted: true as const };
}
