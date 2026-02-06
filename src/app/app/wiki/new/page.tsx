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

type Category = { id: string; name: string; parent_id: string | null };

function indentLabel(name: string, depth: number) {
  if (depth <= 0) return name;
  return `${"— ".repeat(depth)}${name}`;
}

export default function NewWikiPage() {
  const { activePersona } = useActivePersona();
  const search = useSearchParams();

  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState<string>("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);

  // pega categoria da URL: /app/wiki/new?category=UUID
  useEffect(() => {
    const c = search.get("category");
    if (c) setCategoryId(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canPublish = useMemo(() => {
    const t = title.trim();
    const html = contentHtml.trim();

    const sanitized = html
      .replace(/<p>\s*<\/p>/g, "")
      .replace(/<p><br><\/p>/g, "")
      .trim();

    return !!t && !!sanitized && !!activePersona;
  }, [title, contentHtml, activePersona]);

  async function loadCategories() {
    const { data, error } = await supabase
      .from("wiki_categories")
      .select("id,name,parent_id")
      .order("name", { ascending: true });

    if (error) {
      console.error("ERRO loadCategories:", error);
      return;
    }

    setCategories((data ?? []) as any);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  // monta lista com indent (pai -> filhos)
  const categoryOptions = useMemo(() => {
    const byParent = new Map<string | null, Category[]>();
    for (const c of categories) {
      const key = c.parent_id ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(c);
    }

    // ordena dentro de cada grupo
    for (const [k, arr] of byParent.entries()) {
      byParent.set(
        k,
        arr.slice().sort((a, b) => a.name.localeCompare(b.name)),
      );
    }

    const out: Array<{ id: string; label: string }> = [];
    function walk(parent: string | null, depth: number) {
      const children = byParent.get(parent) ?? [];
      for (const child of children) {
        out.push({ id: child.id, label: indentLabel(child.name, depth) });
        walk(child.id, depth + 1);
      }
    }

    walk(null, 0);
    return out;
  }, [categories]);

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
    const html = contentHtml.trim();

    const sanitized = html
      .replace(/<p>\s*<\/p>/g, "")
      .replace(/<p><br><\/p>/g, "")
      .trim();

    if (!activePersona) return toast.error("Selecione uma persona.");
    if (!t) return toast.error("Título é obrigatório.");
    if (!sanitized) return toast.error("Escreva o conteúdo da wiki.");

    setSaving(true);

    const { data, error } = await supabase
      .from("wiki_pages")
      .insert({
        created_by_persona_id: activePersona.id,
        category_id: categoryId,
        title: t,
        cover_url: coverUrl,
        content_html: sanitized,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      console.error("ERRO createWiki:", error);
      toast.error(error.message);
      return;
    }

    toast.success("Wiki criada!");
    location.href = data?.id ? `/app/wiki/${data.id}` : "/app/wiki";
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

          {/* Categoria */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              Pasta (opcional)
            </div>

            <select
              className="w-full rounded-2xl border bg-background px-3 py-2 text-sm"
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value || null)}
            >
              <option value="">Sem pasta</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant="secondary"
              className="rounded-2xl"
              onClick={() => (location.href = "/app/wiki")}
              title="Crie/organize pastas na tela da Wiki"
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
