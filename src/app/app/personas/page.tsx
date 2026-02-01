"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Persona = {
  id: string;
  user_id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  is_default: boolean;
  created_at: string;
};

export default function PersonasPage() {
  const [loading, setLoading] = useState(true);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  const defaultPersona = useMemo(
    () => personas.find((p) => p.is_default) ?? null,
    [personas],
  );

  async function loadPersonas() {
    setLoading(true);
    setErrorMsg(null);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setErrorMsg("Você não está logado. Vá para /login.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("personas")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) setErrorMsg(error.message);
    else setPersonas((data ?? []) as Persona[]);

    setLoading(false);
  }

  useEffect(() => {
    loadPersonas();
  }, []);

  async function createPersona() {
    setErrorMsg(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg("Nome da persona é obrigatório.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setErrorMsg("Sessão expirada. Vá para /login.");
      return;
    }

    const isFirst = personas.length === 0;

    const { error } = await supabase.from("personas").insert({
      user_id: userData.user.id,
      name: trimmed,
      bio: bio.trim() || null,
      is_default: isFirst,
    });

    if (error) {
      setErrorMsg(error.message);
      toast.error(error.message);
      return;
    }

    toast.success("Persona criada!");
    setName("");
    setBio("");
    await loadPersonas();
  }

  async function setDefault(personaId: string) {
    setErrorMsg(null);

    // Você já criou a função SQL set_default_persona (como combinamos)
    const { error } = await supabase.rpc("set_default_persona", {
      p_persona_id: personaId,
    });

    if (error) {
      setErrorMsg(error.message);
      toast.error(error.message);
      return;
    }

    toast.message("Persona definida como default.");
    await loadPersonas();
  }

  async function removePersona(personaId: string) {
    setErrorMsg(null);

    if (personas.length <= 1) {
      setErrorMsg("Você precisa ter pelo menos 1 persona.");
      return;
    }

    const { error } = await supabase
      .from("personas")
      .delete()
      .eq("id", personaId);

    if (error) {
      setErrorMsg(error.message);
      toast.error(error.message);
      return;
    }

    toast.success("Persona apagada.");
    await loadPersonas();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Persona default</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {defaultPersona ? (
            <>
              <div className="font-medium text-foreground">
                {defaultPersona.name}
              </div>
              {defaultPersona.bio && (
                <div className="mt-1">{defaultPersona.bio}</div>
              )}
            </>
          ) : (
            <div>Nenhuma persona definida.</div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Criar nova persona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Nome da persona"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Textarea
            placeholder="Bio (opcional)"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <Button className="w-full rounded-2xl" onClick={createPersona}>
            Criar
          </Button>
          {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Minhas personas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : personas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Você ainda não tem personas. Crie a primeira acima.
            </p>
          ) : (
            personas.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-2xl border p-3"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {p.name} {p.is_default ? "• (default)" : ""}
                  </div>
                  {p.bio && (
                    <div className="truncate text-sm text-muted-foreground">
                      {p.bio}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  {!p.is_default && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setDefault(p.id)}
                    >
                      Usar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removePersona(p.id)}
                  >
                    Apagar
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}
