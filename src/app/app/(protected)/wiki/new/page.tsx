"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import RichTextEditor from "@/components/editor/RichTextEditor";
import DraftStatusBar from "@/components/drafts/DraftStatusBar";
import DraftRestoreDialog from "@/components/drafts/DraftRestoreDialog";
import { useDraftAutosave } from "@/lib/drafts/useDraftAutosave";
import { buildDocContent, DEFAULT_DOC_BACKGROUND } from "@/lib/content/docMeta";
import BackgroundPresetPicker from "@/components/editor/BackgroundPresetPicker";

type Category = { id: string; name: string; parent_id: string | null };

function indentLabel(name: string, depth: number) {
  if (depth <= 0) return name;
  return `${"— ".repeat(depth)}${name}`;
}

export default function NewWikiPage() {
  const router = useRouter();
  const { activePersona } = useActivePersona();
  const search = useSearchParams();

  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string>(
    DEFAULT_DOC_BACKGROUND,
  );
  const [saving, setSaving] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const initialDraft = useMemo(
    () => ({ title: null, contentHtml: "", coverUrl: null }),
    [],
  );

  const drafts = useDraftAutosave({
    scope: "wiki",
    draftKey: "new",
    personaId: activePersona?.id ?? null,
    initialValue: initialDraft,
    value: { title, contentHtml, coverUrl: backgroundColor },
    enabled: true,
    onRestore: (draft) => {
      setTitle(draft.title ?? "");
      setContentHtml(draft.contentHtml);
      setBackgroundColor(draft.coverUrl ?? DEFAULT_DOC_BACKGROUND);
    },
  });

  useEffect(() => {
    const c = search.get("category");
    if (c) setCategoryId(c);
  }, [search]);

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from("wiki_categories")
        .select("id,name,parent_id")
        .order("name", { ascending: true });
      setCategories((data ?? []) as Category[]);
    }
    void loadCategories();
  }, []);

  const categoryOptions = useMemo(() => {
    const byParent = new Map<string | null, Category[]>();
    for (const category of categories) {
      const key = category.parent_id ?? null;
      const list = byParent.get(key) ?? [];
      list.push(category);
      byParent.set(key, list);
    }
    const out: Array<{ id: string; label: string }> = [];
    function walk(parent: string | null, depth: number) {
      const children = (byParent.get(parent) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      for (const child of children) {
        out.push({ id: child.id, label: indentLabel(child.name, depth) });
        walk(child.id, depth + 1);
      }
    }
    walk(null, 0);
    return out;
  }, [categories]);

  async function uploadCover(file: File) {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) throw new Error("Não logado.");
    const ext = file.name.split(".").pop() || "png";
    const path = `wikis/${user.id}/covers/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/*",
    });
    if (error) throw error;
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  async function createWiki() {
    const sanitized = contentHtml
      .trim()
      .replace(/<p>\s*<\/p>/g, "")
      .replace(/<p><br><\/p>/g, "")
      .trim();
    const contentWithBg = buildDocContent({
      bodyHtml: sanitized,
      backgroundColor,
    });
    if (!activePersona) return toast.error("Selecione uma persona.");
    if (!title.trim()) return toast.error("Título é obrigatório.");
    if (!sanitized) return toast.error("Escreva o conteúdo da wiki.");

    setSaving(true);
    const { data, error } = await supabase
      .from("wiki_pages")
      .insert({
        created_by_persona_id: activePersona.id,
        category_id: categoryId,
        title: title.trim(),
        cover_url: coverUrl,
        content_html: contentWithBg,
      })
      .select("id")
      .single();

    setSaving(false);
    if (error) return toast.error(error.message);

    await drafts.discard();
    toast.success("Wiki criada!");
    router.push(data?.id ? `/app/wiki/${data.id}` : "/app/wiki");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Nova Wiki</h1>
        <Button
          variant="secondary"
          className="rounded-2xl"
          onClick={() => router.push("/app/wiki")}
        >
          Voltar
        </Button>
      </header>

      <DraftStatusBar
        status={drafts.status}
        dirty={drafts.dirty}
        onSaveNow={() => drafts.flush()}
        onDiscard={() => drafts.discard()}
      />

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">
            Criando como: {activePersona?.name ?? "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="h-40 overflow-hidden rounded-2xl border bg-muted">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt="cover"
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                void uploadCover(file)
                  .then((url) => {
                    setCoverUrl(url);
                    toast.success("Capa enviada!");
                  })
                  .catch((err: unknown) => {
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Falha ao enviar capa.",
                    );
                  });
              }}
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
              {coverUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-2xl"
                  onClick={() => setCoverUrl(null)}
                >
                  Remover
                </Button>
              ) : null}
            </div>
          </div>

          <Input
            placeholder="Título da wiki"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <select
            className="w-full rounded-2xl border bg-background px-3 py-2 text-sm"
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value || null)}
          >
            <option value="">Sem categoria</option>
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>

          <BackgroundPresetPicker
            value={backgroundColor}
            onChange={setBackgroundColor}
          />

          <div className="rounded-2xl p-2" style={{ backgroundColor }}>
            <RichTextEditor
              valueHtml={contentHtml}
              onChangeHtml={setContentHtml}
              placeholder="Escreva a wiki..."
              folder="wikis"
              imageInsertMode="both"
              enableTables
            />
          </div>

          <Button
            className="w-full rounded-2xl"
            onClick={() => void createWiki()}
            disabled={saving || !activePersona}
          >
            {saving ? "Publicando..." : "Publicar Wiki"}
          </Button>
        </CardContent>
      </Card>

      <DraftRestoreDialog
        open={!!drafts.restoreCandidate}
        onRestore={drafts.restore}
        onDiscard={() => void drafts.discard()}
      />
    </div>
  );
}
