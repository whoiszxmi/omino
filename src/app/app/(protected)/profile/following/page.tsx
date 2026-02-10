"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export default function FollowingPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Profile[]>([]);

  async function load() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setLoading(false);
      return;
    }

    // ids de quem EU sigo
    const { data: idsData, error: idsErr } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (idsErr) {
      console.error(idsErr);
      setLoading(false);
      return;
    }

    const ids = (idsData ?? []).map((x: any) => x.following_id).filter(Boolean);

    if (ids.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const { data: profs, error: pErr } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", ids);

    if (pErr) {
      console.error(pErr);
      setLoading(false);
      return;
    }

    const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
    const ordered = ids.map((id) => map.get(id)).filter(Boolean) as any[];

    setRows(ordered);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Seguindo</h1>
        <Button
          variant="secondary"
          className="rounded-2xl"
          onClick={() => (location.href = "/app/profile")}
        >
          Voltar
        </Button>
      </header>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : rows.length === 0 ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Você não segue ninguém</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Comece seguindo alguém pelo perfil público.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <Card
              key={p.id}
              className="rounded-2xl cursor-pointer"
              onClick={() => {
                if (p.username) location.href = `/app/u/${p.username}`;
              }}
            >
              <CardContent className="flex items-center gap-3 p-3">
                <div className="h-10 w-10 overflow-hidden rounded-2xl border bg-muted">
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.avatar_url}
                      alt="avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {p.display_name ?? p.username ?? "Sem nome"}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    @{p.username ?? "sem-username"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
