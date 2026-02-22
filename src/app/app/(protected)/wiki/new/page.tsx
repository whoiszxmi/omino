"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import RichTextEditor from "@/components/editor/RichTextEditor";
import DraftStatusBar from "@/components/drafts/DraftStatusBar";
import DraftRestoreDialog from "@/components/drafts/DraftRestoreDialog";
import { useDraftAutosave } from "@/lib/drafts/useDraftAutosave";
import { buildDocContent, DEFAULT_DOC_BACKGROUND } from "@/lib/content/docMeta";
import WallpaperPicker from "@/components/editor/WallpaperPicker";
import WallpaperBackground from "@/components/ui/WallpaperBackground";
import { renderRichHtml } from "@/lib/render/richText";
import { BookOpen, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── tipos ────────────────────────────────────────────────────────────────────

type Category = { id: string; name: string; parent_id: string | null };

function indentLabel(name: string, depth: number) {
  if (depth <= 0) return name;
  return `${"— ".repeat(depth)}${name}`;
}

// ─── Preview da wiki ──────────────────────────────────────────────────────────

function WikiPreview({
  wallpaperSlug,
  title,
  contentHtml,
  personaName,
  categoryName,
}: {
  wallpaperSlug: string | null;
  title: string;
  contentHtml: string;
  personaName: string;
  categoryName: string | null;
}) {
  const isEmpty = !contentHtml.trim() || contentHtml.trim() === "<p></p>";

  return (
    <div className="overflow-hidden rounded-2xl border shadow-sm">
      {/* Thumbnail de wallpaper */}
      {wallpaperSlug ? (
        <WallpaperBackground
          wallpaperSlug={wallpaperSlug}
          className="h-24 w-full"
        />
      ) : (
        <div className="flex h-24 w-full items-center justify-center bg-muted/30">
          <BookOpen className="h-6 w-6 text-muted-foreground/30" />
        </div>
      )}

      <div className="space-y-2 p-4">
        {/* Categoria */}
        {categoryName && (
          <span className="inline-block rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
            {categoryName}
          </span>
        )}

        {/* Título */}
        <p className="text-base font-bold leading-snug">
          {title.trim() || (
            <span className="italic text-muted-foreground">Título...</span>
          )}
        </p>

        <p className="text-xs text-muted-foreground">Por {personaName}</p>

        {/* Conteúdo */}
        {isEmpty ? (
          <p className="text-xs italic text-muted-foreground">
            O conteúdo aparecerá aqui...
          </p>
        ) : (
          <div
            className="prose prose-sm max-w-none break-words text-sm line-clamp-6"
            dangerouslySetInnerHTML={{ __html: renderRichHtml(contentHtml) }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Inner (usa useSearchParams dentro de Suspense) ───────────────────────────

function NewWikiInner() {
  const router = useRouter();
  const { activePersona } = useActivePersona();
  const search = useSearchParams();

  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [wallpaperSlug, setWallpaperSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const initialDraft = useMemo(
    () => ({ title: null, contentHtml: "", coverUrl: null }),
    [],
  );

  const drafts = useDraftAutosave({
    scope: "wiki",
    draftKey: "new",
    personaId: activePersona?.id ?? null,
    initialValue: initialDraft,
    value: { title, contentHtml, coverUrl: wallpaperSlug },
    enabled: true,
    onRestore: (draft) => {
      setTitle(draft.title ?? "");
      setContentHtml(draft.contentHtml);
      const saved = draft.coverUrl ?? null;
      if (saved && !saved.startsWith("#")) setWallpaperSlug(saved);
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
    for (const cat of categories) {
      const key = cat.parent_id ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(cat);
    }

    const result: Array<{ id: string; label: string }> = [];

    function walk(parentId: string | null, depth: number) {
      for (const cat of byParent.get(parentId) ?? []) {
        result.push({ id: cat.id, label: indentLabel(cat.name, depth) });
        walk(cat.id, depth + 1);
      }
    }

    walk(null, 0);
    return result;
  }, [categories]);

  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;
  const isEmpty = !contentHtml.trim() || contentHtml.trim() === "<p></p>";

  async function createWiki() {
    if (!title.trim()) {
      toast.error("Título é obrigatório.");
      return;
    }
    if (isEmpty) {
      toast.error("Escreva algo no conteúdo.");
      return;
    }
    if (!activePersona) {
      toast.error("Selecione uma persona antes de criar a wiki.");
      return;
    }

    setSaving(true);

    const payload = buildDocContent({
      title,
      bodyHtml: contentHtml,
      backgroundColor: DEFAULT_DOC_BACKGROUND,
    });

    const { error } = await supabase.from("wiki_pages").insert({
      title,
      content_html: payload,
      created_by_persona_id: activePersona.id,
      category_id: categoryId ?? null,
      wallpaper_slug: wallpaperSlug ?? null,
    });

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    await drafts.discard();
    toast.success("Wiki publicada!");
    router.push("/app/wiki");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Nova wiki</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-2xl"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? (
              <>
                <EyeOff className="h-4 w-4" /> Ocultar preview
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" /> Ver preview
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={() => router.push("/app/wiki")}
          >
            Voltar
          </Button>
        </div>
      </header>

      <DraftStatusBar
        status={drafts.status}
        dirty={drafts.dirty}
        onSaveNow={() => drafts.flush()}
        onDiscard={() => drafts.discard()}
      />

      <div
        className={cn(
          "gap-6",
          showPreview ? "grid grid-cols-1 md:grid-cols-2" : "flex flex-col",
        )}
      >
        {/* ── Editor ─────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Persona */}
          <div className="rounded-2xl border bg-muted/20 px-4 py-2.5 text-sm">
            Criando como:{" "}
            <span className="font-semibold">{activePersona?.name ?? "—"}</span>
          </div>

          {/* Título */}
          <Input
            placeholder="Título da wiki (obrigatório)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-2xl text-base"
          />

          {/* Categoria */}
          {categoryOptions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Pasta / Categoria</p>
              <select
                value={categoryId ?? ""}
                onChange={(e) => setCategoryId(e.target.value || null)}
                className="w-full rounded-2xl border bg-background px-3 py-2 text-sm"
              >
                <option value="">Sem categoria</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Wallpaper picker */}
          <WallpaperPicker
            value={wallpaperSlug}
            onChange={setWallpaperSlug}
            label="Wallpaper da wiki"
          />

          {/* Editor */}
          <div className="rounded-2xl border bg-card p-2">
            <RichTextEditor
              valueHtml={contentHtml}
              onChangeHtml={setContentHtml}
              placeholder="Escreva o conteúdo da wiki..."
              folder="wiki"
              imageInsertMode="both"
              enableTables
            />
          </div>

          {/* Publicar */}
          <Button
            className="w-full rounded-full"
            size="lg"
            onClick={() => void createWiki()}
            disabled={saving || !activePersona || !title.trim() || isEmpty}
          >
            {saving ? "Publicando..." : "Publicar wiki"}
          </Button>
        </div>

        {/* ── Preview ao vivo ─────────────────────────────────────────────── */}
        {showPreview && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Preview — como aparece na biblioteca
            </p>
            <WikiPreview
              wallpaperSlug={wallpaperSlug}
              title={title}
              contentHtml={contentHtml}
              personaName={activePersona?.name ?? "Persona"}
              categoryName={selectedCategory?.name ?? null}
            />
          </div>
        )}
      </div>

      <DraftRestoreDialog
        open={!!drafts.restoreCandidate}
        onRestore={drafts.restore}
        onDiscard={() => void drafts.discard()}
      />
    </div>
  );
}

// ─── Export com Suspense (useSearchParams exige) ──────────────────────────────
export default function NewWikiPage() {
  return (
    <Suspense>
      <NewWikiInner />
    </Suspense>
  );
}
