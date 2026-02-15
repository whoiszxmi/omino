"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
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
  const router = useRouter();
  const { setActivePersona } = useActivePersona();
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
      setErrorMsg("Você não está logado. Vá para /app/login.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("personas")
      .select("*")
      .eq("user_id", userData.user.id)
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
      setErrorMsg("Sessão expirada. Vá para /app/login.");
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

    try {
      await setActivePersona(personaId);
      toast.success("Persona ativa atualizada.");
      await loadPersonas();
      router.refresh();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro ao trocar persona.";
      setErrorMsg(msg);
      toast.error(msg);
    }
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
    <main className="mx-auto flex min-h-dvh w-full max-w-[1200px] flex-col gap-4 p-4 md:p-6">
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

                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
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
                    variant="secondary"
                    onClick={() => router.push(`/app/personas/${p.id}/edit`)}
                  >
                    Editar
                  </Button>
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
