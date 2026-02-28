"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { buildDocContent, DEFAULT_DOC_BACKGROUND } from "@/lib/content/docMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import RichTextEditor from "@/components/editor/RichTextEditor";
import WallpaperPicker from "@/components/editor/WallpaperPicker";
import DraftStatusBar from "@/components/drafts/DraftStatusBar";
import DraftRestoreDialog from "@/components/drafts/DraftRestoreDialog";
import { useDraftAutosave } from "@/lib/drafts/useDraftAutosave";
import { renderRichHtml } from "@/lib/render/richText";
import WallpaperBackground from "@/components/ui/WallpaperBackground";
import { getWallpaperBySlug } from "@/lib/wallpapers/catalog";
import { Eye, EyeOff, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Preview do post ──────────────────────────────────────────────────────────
// Mostra como o post vai aparecer com o wallpaper selecionado
// antes de publicar. Fix #10.

function PostPreview({
  wallpaperSlug,
  backgroundColor,
  title,
  contentHtml,
  personaName,
}: {
  wallpaperSlug: string | null;
  backgroundColor: string;
  title: string;
  contentHtml: string;
  personaName: string;
}) {
  const wallpaper = getWallpaperBySlug(wallpaperSlug);
  const isDark = wallpaper?.isDark ?? true;

  return (
    <div className="overflow-hidden rounded-2xl border shadow-sm">
      {/* Faixa de wallpaper — idêntica ao PostCard do feed */}
      {wallpaperSlug ? (
        <WallpaperBackground
          wallpaperSlug={wallpaperSlug}
          className="h-24 w-full"
          mode="inline"
        />
      ) : (
        <div className="h-24 w-full" style={{ backgroundColor }} />
      )}

      <div className="space-y-2 p-4">
        {/* Meta */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border bg-muted">
            <span className="text-[10px] font-bold text-muted-foreground">
              {personaName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-xs font-medium">{personaName}</span>
          <span className="ml-auto text-[11px] text-muted-foreground">
            agora
          </span>
        </div>

        {/* Título */}
        {title.trim() && (
          <p className="text-sm font-semibold leading-snug">{title}</p>
        )}

        {/* Conteúdo */}
        {contentHtml && contentHtml !== "<p></p>" ? (
          <div
            className="prose prose-sm max-w-none break-words text-sm"
            dangerouslySetInnerHTML={{ __html: renderRichHtml(contentHtml) }}
          />
        ) : (
          <p className="text-xs italic text-muted-foreground">
            O conteúdo aparecerá aqui...
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function NewPostPage() {
  const router = useRouter();
  const { activePersona } = useActivePersona();

  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [wallpaperSlug, setWallpaperSlug] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string>(
    DEFAULT_DOC_BACKGROUND,
  );
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const initialDraft = useMemo(
    () => ({ title: null, contentHtml: "", coverUrl: null }),
    [],
  );

  const drafts = useDraftAutosave({
    scope: "post",
    draftKey: "new",
    personaId: activePersona?.id ?? null,
    initialValue: initialDraft,
    value: {
      title,
      contentHtml,
      // persiste o wallpaper slug no campo coverUrl do rascunho
      coverUrl: wallpaperSlug ?? backgroundColor,
    },
    enabled: true,
    onRestore: (draft) => {
      setTitle(draft.title ?? "");
      setContentHtml(draft.contentHtml);
      // detecta se o coverUrl salvo é um slug ou uma cor hex
      const saved = draft.coverUrl ?? null;
      if (saved && !saved.startsWith("#")) {
        setWallpaperSlug(saved);
      } else {
        setBackgroundColor(saved ?? DEFAULT_DOC_BACKGROUND);
      }
    },
  });

  const isEmpty = !contentHtml.trim() || contentHtml.trim() === "<p></p>";

  async function createPost() {
    if (!title.trim()) {
      toast.error("Título é obrigatório.");
      return;
    }
    if (isEmpty) {
      toast.error("Escreva algo no conteúdo.");
      return;
    }
    if (!activePersona) {
      toast.error("Selecione uma persona antes de postar.");
      return;
    }

    setSaving(true);

    // O campo content continua usando buildDocContent para compatibilidade
    // com parseDocContent no post/[id]/page.tsx
    const payload = buildDocContent({
      title,
      bodyHtml: contentHtml,
      backgroundColor,
    });

    // wallpaper_slug é salvo separadamente no campo posts.wallpaper_slug
    const { error } = await supabase.from("posts").insert({
      persona_id: activePersona.id,
      content: payload,
      wallpaper_slug: wallpaperSlug ?? null,
    });

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    await drafts.discard();
    toast.success("Post publicado!");
    router.push("/app/feed");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PenLine className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Novo post</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-2xl"
            onClick={() => setShowPreview((v) => !v)}
            title={showPreview ? "Ocultar preview" : "Mostrar preview"}
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
            onClick={() => router.push("/app/feed")}
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

      {/* Layout: editor à esquerda, preview à direita (desktop) */}
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
            Postando como:{" "}
            <span className="font-semibold">{activePersona?.name ?? "—"}</span>
          </div>

          {/* Título */}
          <Input
            placeholder="Título do post (obrigatório)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-2xl text-base"
          />

          {/* Wallpaper picker — seleciona wallpaper_slug */}
          <WallpaperPicker
            value={wallpaperSlug}
            onChange={(slug) => setWallpaperSlug(slug)}
            label="Wallpaper do post"
          />

          {/* Editor de conteúdo */}
          <div className="rounded-2xl border bg-card p-2">
            <RichTextEditor
              valueHtml={contentHtml}
              onChangeHtml={setContentHtml}
              placeholder="O que sua persona quer compartilhar?"
              folder="posts"
              imageInsertMode="both"
              enableTables={false}
              showWordCount
              warnOnLeave
            />
          </div>

          {/* Publicar */}
          <Button
            className="w-full rounded-full"
            size="lg"
            onClick={() => void createPost()}
            disabled={saving || !activePersona || !title.trim() || isEmpty}
          >
            {saving ? "Publicando..." : "Publicar post"}
          </Button>
        </div>

        {/* ── Preview ao vivo ─────────────────────────────────────────────── */}
        {showPreview && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Preview — como aparece no feed
            </p>
            <PostPreview
              wallpaperSlug={wallpaperSlug}
              backgroundColor={backgroundColor}
              title={title}
              contentHtml={contentHtml}
              personaName={activePersona?.name ?? "Persona"}
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
