"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RichTextEditor from "@/components/editor/RichTextEditor";
import CategorySelect from "@/components/wiki/CategorySelect";
import { toast } from "sonner";

export default function NewWikiPage() {
  const { activePersona } = useActivePersona();

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [html, setHtml] = useState("");
  const [saving, setSaving] = useState(false);

  async function create() {
    const t = title.trim();
    const c = html.trim();

    if (!t) return toast.error("Título é obrigatório.");
    if (!activePersona) return toast.error("Selecione uma persona.");
    if (!c || c === "<p></p>") return toast.error("Conteúdo vazio.");

    setSaving(true);

    const { data, error } = await supabase
      .from("wiki_pages")
      .insert({
        title: t,
        content_html: c,
        category_id: categoryId,
        created_by_persona_id: activePersona.id,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      console.error(error);
      toast.error(error.message);
      return;
    }

    toast.success("Página criada!");
    location.href = `/app/wiki/${data.id}`;
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Nova Wiki</h1>
        <Button variant="secondary" className="rounded-2xl" onClick={() => (location.href = "/app/wiki")}>
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
          <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />

          <CategorySelect value={categoryId} onChange={setCategoryId} />

          <RichTextEditor
            valueHtml={html}
            onChangeHtml={setHtml}
            placeholder="Escreva a página..."
            folder="wiki"
            bucket="media"
            imageInsertMode="both"
          />

          <Button
            className="w-full rounded-2xl"
            onClick={create}
            disabled={saving || !activePersona || !title.trim() || !html.trim() || html.trim() === "<p></p>"}
          >
            {saving ? "Salvando..." : "Publicar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
