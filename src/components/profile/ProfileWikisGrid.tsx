"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Wiki = {
  id: string;
  title: string;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
  category_id: string | null;
};

type Props = {
  personaId: string | null; // persona ativa
};

export default function ProfileWikisGrid({ personaId }: Props) {
  const [loading, setLoading] = useState(true);
  const [wikis, setWikis] = useState<Wiki[]>([]);

  async function load() {
    setLoading(true);

    if (!personaId) {
      setWikis([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("wiki_pages")
      .select(
        "id,title,cover_url,created_at,updated_at,category_id,created_by_persona_id",
      )
      .eq("created_by_persona_id", personaId)
      .order("updated_at", { ascending: false })
      .limit(12);

    if (error) {
      console.error("ERRO load profile wikis:", error);
      setLoading(false);
      return;
    }

    setWikis((data ?? []) as any);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personaId]);

  const empty = !loading && wikis.length === 0;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="text-base">Wikis</CardTitle>
          <div className="text-xs text-muted-foreground">
            Criadas por esta persona
          </div>
        </div>

        <Button
          className="rounded-2xl"
          size="sm"
          disabled={!personaId}
          onClick={() => (location.href = "/app/wiki/new")}
        >
          Nova
        </Button>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : empty ? (
          <div className="text-sm text-muted-foreground">
            Nenhuma wiki ainda. Crie a primeira em <b>Nova</b>.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {wikis.map((w) => (
              <button
                key={w.id}
                type="button"
                className="aspect-square overflow-hidden rounded-2xl border text-left transition hover:bg-muted/30"
                onClick={() => (location.href = `/app/wiki/${w.id}`)}
                title={w.title}
              >
                <div className="flex h-full flex-col">
                  <div className="flex-1 bg-muted/40">
                    {w.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={w.cover_url}
                        alt={w.title}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-2">
                    <div className="truncate text-[11px] font-medium">
                      {w.title}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
