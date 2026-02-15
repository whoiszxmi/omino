"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type PersonaRow = {
  id: string;
  user_id: string;
  name: string;
  bio: string | null;
};

export default function EditPersonaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const personaId = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [persona, setPersona] = useState<PersonaRow | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    async function loadPersona() {
      if (!personaId) return;
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Faça login novamente para editar persona.");
        router.push("/app/login");
        return;
      }

      const { data, error } = await supabase
        .from("personas")
        .select("id,user_id,name,bio")
        .eq("id", personaId)
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        toast.error("Persona não encontrada.");
        router.push("/app/personas");
        return;
      }

      setPersona(data as PersonaRow);
      setName(data.name);
      setBio(data.bio ?? "");
      setLoading(false);
    }

    void loadPersona();
  }, [personaId, router]);

  async function savePersona() {
    if (!persona || saving) return;
    if (!name.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("personas")
      .update({ name: name.trim(), bio: bio.trim() || null })
      .eq("id", persona.id)
      .eq("user_id", persona.user_id);

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Persona atualizada com sucesso.");
    router.push("/app/personas");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[800px] flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Editar persona</h1>
        <Button
          variant="secondary"
          className="w-full rounded-2xl sm:w-auto"
          onClick={() => router.push("/app/personas")}
        >
          Voltar
        </Button>
      </header>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Dados da persona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" />
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" />
              <Button className="w-full rounded-2xl" onClick={() => void savePersona()} disabled={saving}>
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
