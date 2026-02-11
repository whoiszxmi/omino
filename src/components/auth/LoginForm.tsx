"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (loading) return;

    setLoading(true);
    try {
      const emailClean = email.trim().toLowerCase();

      // 1) allowlist
      const { data: allowed, error: allowErr } = await supabase.rpc(
        "is_email_allowed",
        { p_email: emailClean },
      );

      if (allowErr) {
        console.error("allowlist rpc error", allowErr);
        toast.error("Falha ao verificar acesso.");
        return;
      }

      if (!allowed) {
        toast.error("Acesso não autorizado.");
        return;
      }

      // 2) login
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: emailClean,
        password,
      });

      if (signInErr) {
        const msg = signInErr.message.toLowerCase();
        const friendly =
          msg.includes("invalid") || msg.includes("unauthorized")
            ? "E-mail ou senha inválidos."
            : signInErr.message;

        toast.error(friendly);
        return;
      }

      // 3) redirect
      const nextRoute =
        new URLSearchParams(window.location.search).get("next") ?? "/app/feed";

      toast.success("Login realizado com sucesso.");
      router.replace(nextRoute);
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Falha inesperada no login.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col p-4">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Entrar</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <Input
            placeholder="seuemail@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            autoComplete="email"
          />

          <Input
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
          />

          <Button
            className="w-full rounded-2xl"
            onClick={handleLogin}
            disabled={loading || !email.trim() || !password}
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Acesso privado (invite-only). Se você não tem acesso, fale com o
            administrador.
          </p>

          <Link href="/" className="text-xs text-muted-foreground underline">
            Voltar para a página inicial
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
