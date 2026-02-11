"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RichTextEditor from "@/components/editor/RichTextEditor";
import { toast } from "sonner";

type Folder = { id: string; name: string; parent_id: string | null };

type WikiRow = {
  id: string;
  title: string;
  content_html: string;
  cover_url: string | null;
  category_id: string | null;
  created_by_persona_id: string;
  updated_at: string;
};

export default function EditWikiPage() {
  const params = useParams<{ id: string }>();
  const wikiId = params?.id as string;

  const router = useRouter();
  const { activePersona } = useActivePersona();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [wiki, setWiki] = useState<WikiRow | null>(null);

  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const [folders, setFolders] = useState<Folder[]>([]);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const canSave = useMemo(() => {
    return !!title.trim() && !!contentHtml.trim() && !saving;
  }, [title, contentHtml, saving]);

  const canEdit = useMemo(() => {
    if (!wiki || !activePersona) return false;
    return wiki.created_by_persona_id === activePersona.id;
  }, [wiki, activePersona]);

  async function loadFolders() {
    const { data, error } = await supabase
      .from("wiki_categories")
      .select("id,name,parent_id")
      .order("name", { ascending: true });

    if (error) {
      console.error("ERRO load folders:", error);
      return;
    }
    setFolders((data ?? []) as any);
  }

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("wiki_pages")
      .select(
        "id,title,content_html,cover_url,category_id,created_by_persona_id,updated_at",
      )
      .eq("id", wikiId)
      .maybeSingle();

    if (error) {
      console.error("ERRO load wiki:", error);
      toast.error(error.message);
      setWiki(null);
      setLoading(false);
      return;
    }

    if (!data) {
      setWiki(null);
      setLoading(false);
      return;
    }

    const w = data as any as WikiRow;
    setWiki(w);

    setTitle(w.title ?? "");
    setContentHtml(w.content_html ?? "");
    setCategoryId(w.category_id ?? null);
    setCoverUrl(w.cover_url ?? null);

    setLoading(false);
  }

  useEffect(() => {
    loadFolders();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wikiId]);

  async function uploadCover(file: File) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) throw new Error("Não logado.");

    if (file.size > 2_500_000)
      throw new Error("Capa muito grande (até ~2.5MB).");

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
      toast.success("Capa atualizada!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Falha ao enviar capa.");
    }
  }

  async function save() {
    if (!wiki) return;
    if (!activePersona) return toast.error("Selecione uma persona.");
    if (!canEdit) return toast.error("Você não pode editar esta wiki.");

    const t = title.trim();
    const html = contentHtml.trim();

    if (!t) return toast.error("Título é obrigatório.");
    if (!html) return toast.error("Conteúdo é obrigatório.");

    setSaving(true);
    try {
      const { error } = await supabase
        .from("wiki_pages")
        .update({
          title: t,
          content_html: html,
          cover_url: coverUrl,
          category_id: categoryId,
        })
        .eq("id", wiki.id);

      if (error) throw error;

      toast.success("Wiki salva!");
      router.push(`/app/wiki/${wiki.id}`);
    } catch (e: any) {
      console.error("ERRO save wiki:", e);
      toast.error(e?.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!wiki) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Wiki não encontrada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>Essa wiki pode ter sido removida ou você não tem acesso.</div>
            <Button
              variant="secondary"
              className="w-full rounded-2xl"
              onClick={() => router.push("/app/wiki")}
            >
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Sem permissão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>Você só pode editar wikis criadas pela sua persona ativa.</div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() => router.push(`/app/wiki/${wiki.id}`)}
              >
                Voltar
              </Button>
              <Button
                className="rounded-2xl"
                onClick={() => router.push("/app/personas")}
              >
                Trocar persona
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Editar Wiki</h1>
        <Button
          variant="secondary"
          className="rounded-2xl"
          onClick={() => router.push(`/app/wiki/${wiki.id}`)}
        >
          Voltar
        </Button>
      </header>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">
            Editando como: {activePersona?.name ?? "—"}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
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
                Trocar capa
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
              placeholder="Título"
            />
          </div>

          {/* Pasta (categoria) */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Pasta</div>

            <select
              className="w-full rounded-2xl border bg-background px-3 py-2 text-sm"
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value || null)}
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
              onClick={() => router.push("/app/wiki")}
            >
              Ver pastas
            </Button>
          </div>

          {/* Conteúdo */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Conteúdo *</div>
            <RichTextEditor
              valueHtml={contentHtml}
              onChangeHtml={setContentHtml}
              placeholder="Edite sua wiki... (use tabelas para fichas)"
              folder="wikis"
              imageInsertMode="both"
              enableTables
            />
          </div>

          <Button
            className="w-full rounded-2xl"
            onClick={save}
            disabled={!canSave}
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
