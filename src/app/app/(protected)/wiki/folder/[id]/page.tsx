"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Folder = { id: string; name: string; parent_id: string | null };
type Wiki = {
  id: string;
  title: string;
  summary: string | null;
  cover_url: string | null;
  updated_at: string;
  folder_id: string | null;
};

export default function WikiFolderPage({ params }: { params: { id: string } }) {
  const folderId = params.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState<Folder | null>(null);
  const [subfolders, setSubfolders] = useState<Folder[]>([]);
  const [wikis, setWikis] = useState<Wiki[]>([]);

  async function load() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setLoading(false);
      router.replace("/app/login");
      return;
    }

    const [folderRes, subsRes, wRes] = await Promise.all([
      supabase
        .from("wiki_folders")
        .select("id, name, parent_id")
        .eq("id", folderId)
        .maybeSingle(),
      supabase
        .from("wiki_folders")
        .select("id, name, parent_id")
        .eq("user_id", user.id)
        .eq("parent_id", folderId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("wikis")
        .select("id, title, summary, cover_url, updated_at, folder_id")
        .eq("user_id", user.id)
        .eq("folder_id", folderId)
        .order("updated_at", { ascending: false })
        .limit(50),
    ]);

    if (folderRes.error) console.error(folderRes.error);
    if (subsRes.error) console.error(subsRes.error);
    if (wRes.error) console.error(wRes.error);

    setFolder((folderRes.data ?? null) as Folder | null);
    setSubfolders((subsRes.data ?? []) as Folder[]);
    setWikis((wRes.data ?? []) as Wiki[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">
            {folder?.name ?? "Pasta"}
          </h1>
          <p className="text-xs text-muted-foreground">Organização da Wiki</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={() => router.back()}
          >
            Voltar
          </Button>
          <Button
            className="rounded-2xl"
            onClick={() => router.push(`/app/wiki/new?folder=${folderId}`)}
          >
            Nova
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <>
          {subfolders.length > 0 && (
            <>
              <div className="text-sm font-semibold">Subpastas</div>
              <div className="grid grid-cols-2 gap-3">
                {subfolders.map((f) => (
                  <button
                    key={f.id}
                    className="rounded-2xl border bg-background p-3 text-left hover:bg-muted/30"
                    onClick={() => router.push(`/app/wiki/folder/${f.id}`)}
                    type="button"
                  >
                    <div className="text-sm font-medium line-clamp-2">
                      {f.name}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Abrir
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="text-sm font-semibold">Wikis</div>

          {wikis.length === 0 ? (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Sem wikis aqui</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Crie uma wiki nesta pasta clicando em <b>Nova</b>.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {wikis.map((w) => (
                <button
                  key={w.id}
                  className="overflow-hidden rounded-2xl border bg-background text-left hover:bg-muted/30"
                  onClick={() => router.push(`/app/wiki/${w.id}`)}
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
