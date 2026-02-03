import { supabase } from "@/lib/supabase/client";

export type HighlightScope = "profile" | "community";
export type HighlightTargetType = "post" | "wiki";

export type HighlightRow = {
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

type TogglePayload = {
  targetType: HighlightTargetType;
  targetId: string;
  title?: string;
  coverUrl?: string | null;
};

export async function getMyHighlights(
  scope: HighlightScope,
  targetType?: HighlightTargetType,
) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return [] as HighlightRow[];

  let query = supabase
    .from("highlights")
    .select(
      "id, scope, user_id, target_type, target_id, title, cover_url, sort_order, created_at",
    )
    .eq("scope", scope)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (targetType) {
    query = query.eq("target_type", targetType);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Erro ao carregar highlights:", error);
    return [] as HighlightRow[];
  }

  return (data ?? []) as HighlightRow[];
}

export async function getCommunityHighlights(targetType?: HighlightTargetType) {
  let query = supabase
    .from("highlights")
    .select(
      "id, scope, user_id, target_type, target_id, title, cover_url, sort_order, created_at",
    )
    .eq("scope", "community")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (targetType) {
    query = query.eq("target_type", targetType);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Erro ao carregar highlights comunidade:", error);
    return [] as HighlightRow[];
  }

  return (data ?? []) as HighlightRow[];
}

export async function isHighlighted(
  scope: HighlightScope,
  targetType: HighlightTargetType,
  targetId: string,
) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return false;

  const { data, error } = await supabase
    .from("highlights")
    .select("id")
    .eq("scope", scope)
    .eq("user_id", user.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao checar highlight:", error);
    return false;
  }

  return !!data;
}

export async function toggleHighlight(scope: HighlightScope, payload: TogglePayload) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Usuário não autenticado.");

  const { data: existing, error: existingError } = await supabase
    .from("highlights")
    .select("id")
    .eq("scope", scope)
    .eq("user_id", user.id)
    .eq("target_type", payload.targetType)
    .eq("target_id", payload.targetId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { error } = await supabase
      .from("highlights")
      .delete()
      .eq("id", existing.id);

    if (error) throw error;

    return { highlighted: false };
  }

  const { error } = await supabase.from("highlights").insert({
    scope,
    user_id: user.id,
    target_type: payload.targetType,
    target_id: payload.targetId,
    title: payload.title ?? null,
    cover_url: payload.coverUrl ?? null,
  });

  if (error) throw error;

  return { highlighted: true };
}
