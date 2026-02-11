"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextPath = useMemo(() => {
    const raw = sp.get("next");
    return raw && raw.startsWith("/app") ? raw : "/app/feed";
  }, [sp]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      // garante sessão
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Sessão não encontrada após login.");

      toast.success("Logado com sucesso!");
      router.replace(nextPath);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Falha no login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 p-6">
      <input
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-md border p-2"
        autoComplete="email"
      />
      <input
        placeholder="senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-md border p-2"
        type="password"
        autoComplete="current-password"
      />
      <button
        disabled={loading}
        type="submit"
        className="w-full rounded-md border p-2"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
