"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

type WikiRow = {
  id: string;
  title: string;
  content_html: string;
  cover_url: string | null;
  category_id: string | null;
  created_by_persona_id: string;
};

export default function WikiEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const wikiId = params.id;
  const { activePersona } = useActivePersona();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wiki, setWiki] = useState<WikiRow | null>(null);
  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const initialDraft = useMemo(
    () => ({ title: wiki?.title ?? null, contentHtml: wiki?.content_html ?? "", coverUrl: wiki?.cover_url ?? null }),
    [wiki?.content_html, wiki?.cover_url, wiki?.title],
  );

  const drafts = useDraftAutosave({
    scope: "wiki",
    draftKey: `edit:${wikiId}`,
    personaId: activePersona?.id ?? null,
    initialValue: initialDraft,
    value: { title, contentHtml, coverUrl },
    enabled: !!wiki,
    onRestore: (draft) => {
      setTitle(draft.title ?? "");
      setContentHtml(draft.contentHtml);
      setCoverUrl(draft.coverUrl);
    },
  });

  const canEdit = useMemo(() => !!wiki && !!activePersona && wiki.created_by_persona_id === activePersona.id, [wiki, activePersona]);

  useEffect(() => {
    async function load() {
      const [wikiRes, categoriesRes] = await Promise.all([
        supabase
          .from("wiki_pages")
          .select("id,title,content_html,cover_url,category_id,created_by_persona_id")
          .eq("id", wikiId)
          .maybeSingle(),
        supabase.from("wiki_categories").select("id,name").order("name", { ascending: true }),
      ]);

      if (!wikiRes.error && wikiRes.data) {
        const row = wikiRes.data as WikiRow;
        setWiki(row);
        setTitle(row.title ?? "");
        setContentHtml(row.content_html ?? "");
        setCoverUrl(row.cover_url ?? null);
        setCategoryId(row.category_id ?? null);
      }

      setCategories((categoriesRes.data ?? []) as Array<{ id: string; name: string }>);
      setLoading(false);
    }

    void load();
  }, [wikiId]);

  async function uploadCover(file: File) {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) throw new Error("Não logado.");

    const ext = file.name.split(".").pop() || "png";
    const path = `wikis/${user.id}/covers/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  async function saveWiki() {
    if (!wiki || !canEdit) return toast.error("Sem permissão para editar.");

    const sanitized = contentHtml.trim().replace(/<p>\s*<\/p>/g, "").replace(/<p><br><\/p>/g, "").trim();
    if (!title.trim()) return toast.error("Título é obrigatório.");
    if (!sanitized) return toast.error("Conteúdo obrigatório.");

    setSaving(true);
    const { error } = await supabase
      .from("wiki_pages")
      .update({
        title: title.trim(),
        content_html: sanitized,
        cover_url: coverUrl,
        category_id: categoryId,
      })
      .eq("id", wiki.id);
    setSaving(false);

    if (error) return toast.error(error.message);

    await drafts.discard();
    toast.success("Wiki atualizada!");
    router.push(`/app/wiki/${wiki.id}`);
  }

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Carregando...</div>;
  if (!wiki) return <div className="p-4 text-sm text-muted-foreground">Wiki não encontrada.</div>;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Editar Wiki</h1>
        <Button variant="secondary" className="rounded-2xl" onClick={() => router.push(`/app/wiki/${wiki.id}`)}>Voltar</Button>
      </header>

      <DraftStatusBar status={drafts.status} dirty={drafts.dirty} onSaveNow={() => drafts.flush()} onDiscard={() => drafts.discard()} />

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Conteúdo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="h-40 overflow-hidden rounded-2xl border bg-muted">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="cover" className="h-full w-full object-cover" />
            ) : null}
          </div>

          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            void uploadCover(file)
              .then((url) => setCoverUrl(url))
              .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Falha no upload"));
          }} />

          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="rounded-2xl" onClick={() => coverInputRef.current?.click()}>Trocar capa</Button>
            {coverUrl ? <Button type="button" variant="ghost" className="rounded-2xl" onClick={() => setCoverUrl(null)}>Remover</Button> : null}
          </div>

          <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />

          <select className="w-full rounded-2xl border bg-background px-3 py-2 text-sm" value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value || null)}>
            <option value="">Sem categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>

          <RichTextEditor valueHtml={contentHtml} onChangeHtml={setContentHtml} placeholder="Edite o conteúdo..." folder="wikis" imageInsertMode="both" enableTables />

          <Button className="w-full rounded-2xl" onClick={() => void saveWiki()} disabled={saving || !canEdit}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </CardContent>
      </Card>

      <DraftRestoreDialog open={!!drafts.restoreCandidate} onRestore={drafts.restore} onDiscard={() => void drafts.discard()} />
    </div>
  );
}
