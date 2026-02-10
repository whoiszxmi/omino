"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

function safeNext(raw: string | null) {
  const decoded = raw ? decodeURIComponent(raw) : "/app/feed";
  if (!decoded.startsWith("/")) return "/app/feed";
  if (!decoded.startsWith("/app")) return "/app/feed";
  return decoded;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(
    () => safeNext(searchParams.get("next")),
    [searchParams],
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // ✅ Se já estiver logado, não mostra o form
  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;

      if (data.session) {
        router.replace(nextPath);
        router.refresh();
        return;
      }

      setCheckingSession(false);
    })();

    // ✅ Escuta mudanças de auth (robusto)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace(nextPath);
        router.refresh();
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [router, nextPath]);

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

      toast.success("Logado com sucesso!");

      // ✅ redirect manual (email/senha não redireciona sozinho)
      router.replace(nextPath);
      router.refresh();

      // Se ainda assim algum guard SSR não respeitar:
      // window.location.assign(nextPath);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Falha no login.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Verificando acesso...
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button disabled={loading} type="submit">
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
