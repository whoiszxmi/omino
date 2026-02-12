"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { buildDocContent, DEFAULT_DOC_BACKGROUND } from "@/lib/content/docMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import RichTextEditor from "@/components/editor/RichTextEditor";
import BackgroundPresetPicker from "@/components/editor/BackgroundPresetPicker";
import DraftStatusBar from "@/components/drafts/DraftStatusBar";
import DraftRestoreDialog from "@/components/drafts/DraftRestoreDialog";
import { useDraftAutosave } from "@/lib/drafts/useDraftAutosave";

export default function NewPostPage() {
  const { activePersona } = useActivePersona();

  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [backgroundColor, setBackgroundColor] = useState<string>(DEFAULT_DOC_BACKGROUND);
  const [saving, setSaving] = useState(false);

  const initialDraft = useMemo(
    () => ({ title: null, contentHtml: "", coverUrl: null }),
    [],
  );

  const drafts = useDraftAutosave({
    scope: "post",
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

  async function createPost() {
    const html = contentHtml.trim();

    if (!title.trim()) {
      toast.error("Título é obrigatório.");
      return;
    }

    if (!html || html === "<p></p>") return;

    if (!activePersona) {
      toast.error("Selecione uma persona antes de postar.");
      return;
    }

    setSaving(true);

    const payload = buildDocContent({
      title,
      bodyHtml: html,
      backgroundColor,
    });

    const { error } = await supabase.from("posts").insert({
      persona_id: activePersona.id,
      content: payload,
    });

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    await drafts.discard();
    toast.success("Post publicado!");
    location.href = "/app/feed";
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Novo post</h1>
        <Button variant="secondary" className="rounded-2xl" onClick={() => (location.href = "/app/feed")}>Voltar</Button>
      </header>

      <DraftStatusBar
        status={drafts.status}
        dirty={drafts.dirty}
        onSaveNow={() => drafts.flush()}
        onDiscard={() => drafts.discard()}
      />

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Postando como: {activePersona?.name ?? "—"}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <Input
            placeholder="Título do post"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />

          <BackgroundPresetPicker value={backgroundColor} onChange={setBackgroundColor} />

          <div className="rounded-2xl p-2" style={{ backgroundColor }}>
            <RichTextEditor
              valueHtml={contentHtml}
              onChangeHtml={setContentHtml}
              placeholder="O que sua persona quer compartilhar?"
              folder="posts"
              imageInsertMode="both"
              enableTables={false}
            />
          </div>

          <Button
            className="w-full rounded-2xl"
            onClick={() => void createPost()}
            disabled={saving || !activePersona || !title.trim() || !contentHtml.trim() || contentHtml.trim() === "<p></p>"}
          >
            {saving ? "Publicando..." : "Publicar"}
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
