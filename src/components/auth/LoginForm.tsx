"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      console.log("[login] signInWithPassword", {
        hasSession: !!data.session,
        userId: data.user?.id ?? data.session?.user?.id ?? null,
      });

      if (error) {
        const message =
          error.message.toLowerCase().includes("invalid") ||
          error.message.toLowerCase().includes("unauthorized")
            ? "E-mail ou senha inválidos, ou acesso não autorizado."
            : error.message;

        toast.error(message);
        return;
      }

      if (!data.session) {
        toast.error("Sessão não criada após login. Verifique confirmação de e-mail e configurações de Auth.");
        return;
      }

      const nextRoute = new URLSearchParams(window.location.search).get("next") ?? "/app/feed";
      toast.success("Login realizado com sucesso.");
      router.replace(nextRoute);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha inesperada no login.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("[login] onAuthStateChange", {
        event: _event,
        hasSession: !!session,
        userId: session?.user?.id ?? null,
      });

      if (session?.user) {
        const nextRoute = new URLSearchParams(window.location.search).get("next") ?? "/app/feed";
        router.replace(nextRoute);
        router.refresh();
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

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
            disabled={loading || !email || !password}
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
