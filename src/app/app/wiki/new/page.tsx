"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import RichTextEditor from "@/components/editor/RichTextEditor";
import { useSearchParams } from "next/navigation";

type Folder = { id: string; name: string; parent_id: string | null };

export default function NewWikiPage() {
  const { activePersona } = useActivePersona();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [contentHtml, setContentHtml] = useState<string>("");

  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);

  const canPublish = useMemo(() => {
    return !!title.trim() && !!contentHtml.trim();
  }, [title, contentHtml]);

  const search = useSearchParams();

  useEffect(() => {
    const f = search.get("folder");
    if (f) setFolderId(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFolders() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const { data, error } = await supabase
      .from("wiki_folders")
      .select("id, name, parent_id")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setFolders((data ?? []) as any);
  }

  useEffect(() => {
    loadFolders();
  }, []);

  async function uploadCover(file: File) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) throw new Error("Não logado.");

    if (file.size > 2_500_000) {
      throw new Error("Capa muito grande. Use até ~2.5MB.");
    }

    const ext = file.name.split(".").pop() || "png";
    const path = `wikis/${user.id}/covers/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("media").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/*",
    });

    if (error) throw error;

    const { data } = supabase.storage.from("media").getPublicUrl(path);
    return data.publicUrl;
  }

  async function onPickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const url = await uploadCover(file);
      setCoverUrl(url);
      toast.success("Capa enviada!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Falha ao enviar capa.");
    }
  }

  async function createWiki() {
    const t = title.trim();
    const s = summary.trim();

    if (!t) {
      toast.error("Título é obrigatório.");
      return;
    }

    if (!contentHtml.trim()) {
      toast.error("Escreva o conteúdo da wiki.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      toast.error("Faça login novamente.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("wikis").insert({
      user_id: user.id,
      persona_id: activePersona?.id ?? null,
      folder_id: folderId,
      title: t,
      summary: s || null,
      cover_url: coverUrl,
      content_html: contentHtml,
      is_published: true,
    });

    setSaving(false);

    if (error) {
      console.error(error);
      toast.error(error.message);
      return;
    }

    toast.success("Wiki criada!");
    location.href = "/app/wiki";
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Nova Wiki</h1>
        <Button
          variant="secondary"
          className="rounded-2xl"
          onClick={() => (location.href = "/app/wiki")}
        >
          Voltar
        </Button>
      </header>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">
            Criando como: {activePersona?.name ?? "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Capa */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Capa (opcional)</div>

            <div className="overflow-hidden rounded-2xl border bg-muted">
              <div className="relative aspect-[16/9]">
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverUrl}
                    alt="cover"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                    Sem capa
                  </div>
                )}
              </div>
            </div>

            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickCover}
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="rounded-2xl"
                onClick={() => coverInputRef.current?.click()}
              >
                Enviar capa
              </Button>

              {coverUrl && (
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-2xl"
                  onClick={() => setCoverUrl(null)}
                >
                  Remover
                </Button>
              )}
            </div>
          </div>

          {/* Título */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Título *</div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Sistema de Maldições"
            />
          </div>

          {/* Resumo */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              Resumo (opcional)
            </div>
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Uma descrição curta para aparecer na lista."
            />
          </div>

          {/* Pasta */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              Pasta (opcional)
            </div>

            <select
              className="w-full rounded-2xl border bg-background px-3 py-2 text-sm"
              value={folderId ?? ""}
              onChange={(e) => setFolderId(e.target.value || null)}
            >
              <option value="">Sem pasta</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.parent_id ? "↳ " : ""}
                  {f.name}
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant="secondary"
              className="rounded-2xl"
              onClick={() => (location.href = "/app/wiki/folders")}
            >
              Gerenciar pastas
            </Button>
          </div>

          {/* Editor */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Conteúdo *</div>

            <RichTextEditor
              valueHtml={contentHtml}
              onChangeHtml={setContentHtml}
              placeholder="Escreva sua wiki... (use tabelas para fichas)"
              folder="wikis"
              imageInsertMode="both"
              enableTables
            />
          </div>

          <Button
            className="w-full rounded-2xl"
            onClick={createWiki}
            disabled={saving || !canPublish}
          >
            {saving ? "Publicando..." : "Publicar Wiki"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
