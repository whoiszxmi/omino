"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const AUTH_COOKIE = "omino-auth";

export default function AppLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      const message =
        error.message.toLowerCase().includes("invalid") ||
        error.message.toLowerCase().includes("unauthorized")
          ? "E-mail ou senha inválidos, ou acesso não autorizado."
          : error.message;

      toast.error(message);
      return;
    }

    document.cookie = `${AUTH_COOKIE}=1; Path=/; Max-Age=2592000; SameSite=Lax; Secure`;
    toast.success("Login realizado com sucesso.");
    router.replace("/app/feed");
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
            disabled={loading || !email || !password}
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Acesso privado (invite-only). Se você não tem acesso, fale com o
            administrador.
          </p>

          <Link href="/" className="text-xs underline text-muted-foreground">
            Voltar para a página inicial
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
