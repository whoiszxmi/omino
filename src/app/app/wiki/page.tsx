"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import HighlightButtonGroup from "@/components/highlights/HighlightButtonGroup";

type Wiki = {
  id: string;
  title: string;
  summary: string | null;
  cover_url: string | null;
  updated_at: string;
  folder_id: string | null;
};

export default function WikiLibraryPage() {
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [wikis, setWikis] = useState<Wiki[]>([]);

  async function load() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setLoading(false);
      location.href = "/login";
      return;
    }

    const [fRes, wRes] = await Promise.all([
      supabase
        .from("wiki_folders")
        .select("id, name, parent_id")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),

      supabase
        .from("wikis")
        .select("id, title, summary, cover_url, updated_at, folder_id")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(24),
    ]);

    if (fRes.error) console.error(fRes.error);
    if (wRes.error) console.error(wRes.error);

    setFolders((fRes.data ?? []) as any);
    setWikis((wRes.data ?? []) as any);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const rootFolders = useMemo(
    () => folders.filter((f) => !f.parent_id),
    [folders],
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Wiki</h1>
          <p className="text-xs text-muted-foreground">
            Pastas e páginas da comunidade
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="rounded-2xl" onClick={load}>
            Atualizar
          </Button>
          <Button
            className="rounded-2xl"
            onClick={() => (location.href = "/app/wiki/new")}
          >
            Nova
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <>
          {/* Pastas */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Pastas</div>
            <Button
              variant="secondary"
              size="sm"
              className="rounded-2xl"
              onClick={() => (location.href = "/app/wiki/folders")}
            >
              Gerenciar
            </Button>
          </div>

          {rootFolders.length === 0 ? (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Sem pastas</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Crie pastas para organizar sistemas, lore, personagens…
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {rootFolders.map((f) => (
                <button
                  key={f.id}
                  className="rounded-2xl border bg-background p-3 text-left hover:bg-muted/30"
                  onClick={() => (location.href = `/app/wiki/folder/${f.id}`)}
                  type="button"
                >
                  <div className="text-sm font-medium line-clamp-2">
                    {f.name}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Abrir pasta
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Recentes */}
          <div className="mt-2 text-sm font-semibold">Recentes</div>

          {wikis.length === 0 ? (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Nada por aqui ainda</CardTitle>
              </CardHeader>
              <CardContent
                className="pt-0"
                onClick={(event) => event.stopPropagation()}
              >
                <HighlightButtonGroup
                  targetType="wiki"
                  targetId={r.id}
                  title={r.title}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {wikis.map((w) => (
                <button
                  key={w.id}
                  className="overflow-hidden rounded-2xl border bg-background text-left hover:bg-muted/30"
                  onClick={() => (location.href = `/app/wiki/${w.id}`)}
                  type="button"
                >
                  <div className="aspect-square bg-muted">
                    {w.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={w.cover_url}
                        alt="cover"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-2">
                    <div className="line-clamp-1 text-sm font-medium">
                      {w.title}
                    </div>
                    <div className="line-clamp-2 text-xs text-muted-foreground">
                      {w.summary ?? "—"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
