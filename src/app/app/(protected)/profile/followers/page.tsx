"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FollowListItem from "@/components/profile/FollowListItem";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type FollowerRow = { follower_id: string };

export default function FollowersPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Profile[]>([]);

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return setLoading(false);

    const idsRes = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (idsRes.error) {
      setLoading(false);
      return;
    }

    const ids = ((idsRes.data ?? []) as FollowerRow[]).map((row) => row.follower_id);
    if (ids.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const profilesRes = await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", ids);
    if (profilesRes.error) {
      setLoading(false);
      return;
    }

    const map = new Map((profilesRes.data ?? []).map((profile) => [profile.id, profile as Profile]));
    setRows(ids.map((id) => map.get(id)).filter((item): item is Profile => !!item));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-4 p-4 md:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Seguidores</h1>
        <Button variant="secondary" className="rounded-2xl" onClick={() => (location.href = "/app/profile")}>Voltar</Button>
      </header>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : rows.length === 0 ? (
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-base">Sem seguidores</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Ninguém seguiu você ainda.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((profile) => (
            <FollowListItem key={profile.id} profile={profile} onOpenProfile={(username) => (location.href = `/app/u/${username}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
