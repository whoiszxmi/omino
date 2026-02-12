"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppPageSkeleton } from "@/components/app/AppPageSkeleton";
import type { DraftRow } from "@/lib/drafts/types";

function resolvePath(draft: DraftRow) {
  if (draft.scope === "post") {
    if (draft.draft_key === "new") return "/app/feed/new";
    if (draft.draft_key.startsWith("edit:")) {
      const id = draft.draft_key.replace("edit:", "");
      return `/app/post/${id}/edit`;
    }
    return "/app/feed/new";
  }

  if (draft.draft_key === "new") return "/app/wiki/new";
  if (draft.draft_key.startsWith("edit:")) {
    const id = draft.draft_key.replace("edit:", "");
    return `/app/wiki/${id}/edit`;
  }
  return "/app/wiki/new";
}

export default function DraftsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);

  async function load() {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) {
      setDrafts([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("drafts")
      .select("id,user_id,persona_id,scope,draft_key,title,content_html,cover_url,updated_at,created_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100);

    setDrafts((data ?? []) as DraftRow[]);
    setLoading(false);
  }

  async function deleteDraft(draftId: string) {
    await supabase.from("drafts").delete().eq("id", draftId);
    await load();
  }

  useEffect(() => {
    void load();
  }, []);

  const grouped = useMemo(
    () => ({
      post: drafts.filter((draft) => draft.scope === "post"),
      wiki: drafts.filter((draft) => draft.scope === "wiki"),
    }),
    [drafts],
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Rascunhos</h1>
        <Button variant="secondary" className="rounded-2xl" onClick={() => router.push("/app/feed")}>Voltar</Button>
      </header>

      {loading ? (
        <AppPageSkeleton compact />
      ) : drafts.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-sm text-muted-foreground">Nenhum rascunho salvo.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader><CardTitle className="text-base">Feed ({grouped.post.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {grouped.post.map((draft) => (
                <div key={draft.id} className="rounded-xl border p-3">
                  <p className="text-sm font-medium">{draft.title ?? "Sem título"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(draft.updated_at).toLocaleString("pt-BR")}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" className="rounded-xl" onClick={() => router.push(resolvePath(draft))}>Abrir</Button>
                    <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => void deleteDraft(draft.id)}>Excluir</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm">
            <CardHeader><CardTitle className="text-base">Wiki ({grouped.wiki.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {grouped.wiki.map((draft) => (
                <div key={draft.id} className="rounded-xl border p-3">
                  <p className="text-sm font-medium">{draft.title ?? "Sem título"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(draft.updated_at).toLocaleString("pt-BR")}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" className="rounded-xl" onClick={() => router.push(resolvePath(draft))}>Abrir</Button>
                    <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => void deleteDraft(draft.id)}>Excluir</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
