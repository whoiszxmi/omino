"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Category = { id: string; name: string; created_at: string };

export default function WikiCategoriesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("wiki_categories")
      .select("id, name, created_at")
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      toast.error(error.message);
      return;
    }

    setCats((data ?? []) as any);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    const n = name.trim();
    if (!n) return;

    setSaving(true);
    const { error } = await supabase.from("wiki_categories").insert({ name: n });
    setSaving(false);

    if (error) {
      console.error(error);
      toast.error(error.message);
      return;
    }

    setName("");
    toast.success("Categoria criada!");
    load();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Categorias</h1>
        <Button variant="secondary" className="rounded-2xl" onClick={() => (location.href = "/app/wiki")}>
          Voltar
        </Button>
      </header>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Nova categoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Ex: Personagens, Itens, Regras..." value={name} onChange={(e) => setName(e.target.value)} />
          <Button className="w-full rounded-2xl" onClick={create} disabled={saving || !name.trim()}>
            {saving ? "Criando..." : "Criar"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Lista</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {cats.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma categoria ainda.</div>
          ) : (
            cats.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-2xl border px-3 py-2">
                <div className="text-sm">{c.name}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
