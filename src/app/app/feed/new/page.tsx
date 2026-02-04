"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import RichTextEditor from "@/components/editor/RichTextEditor";

export default function NewPostPage() {
  const { activePersona } = useActivePersona();

  const [contentHtml, setContentHtml] = useState("");
  const [saving, setSaving] = useState(false);

  async function createPost() {
    const html = contentHtml.trim();

    if (!html || html === "<p></p>") return;

    if (!activePersona) {
      toast.error("Selecione uma persona antes de postar.");
      return;
    }

    setSaving(true);

    // ✅ salvando HTML na coluna `content` (por enquanto)
    const { error } = await supabase.from("posts").insert({
      persona_id: activePersona.id,
      content: html,
    });

    setSaving(false);

    if (error) {
      console.error(error);
      toast.error(error.message);
      return;
    }

    toast.success("Post publicado!");
    location.href = "/app/feed";
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Novo post</h1>
        <Button
          variant="secondary"
          className="rounded-2xl"
          onClick={() => (location.href = "/app/feed")}
        >
          Voltar
        </Button>
      </header>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">
            Postando como: {activePersona?.name ?? "—"}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <RichTextEditor
            valueHtml={contentHtml}
            onChangeHtml={setContentHtml}
            placeholder="O que sua persona quer compartilhar?"
            folder="posts"
            imageInsertMode="both"
            enableTables={false}
          />

          <Button
            className="w-full rounded-2xl"
            onClick={createPost}
            disabled={
              saving ||
              !activePersona ||
              !contentHtml.trim() ||
              contentHtml.trim() === "<p></p>"
            }
          >
            {saving ? "Publicando..." : "Publicar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
