"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;

      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Sessão não encontrada após login.");

      toast.success("Bem-vindo de volta!");
      router.replace(nextPath);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Falha no login.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col justify-center px-4 py-6 sm:px-6 md:py-10">
      <div className="grid items-stretch gap-4 md:grid-cols-[1.2fr_1fr] md:gap-6">
        <Card className="order-2 rounded-3xl border shadow-sm md:order-1">
          <CardHeader className="space-y-3 pb-2">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Entrar no uzure
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Comunidade privada com personas, chats e conteúdo colaborativo.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={onSubmit} className="space-y-3">
              <label className="space-y-1.5 text-sm">
                <span className="text-muted-foreground">E-mail</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-2xl pl-10"
                    inputMode="email"
                    autoComplete="email"
                    required
                  />
                </div>
              </label>

              <label className="space-y-1.5 text-sm">
                <span className="text-muted-foreground">Senha</span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-2xl pl-10"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </label>

              <Button
                className="h-11 w-full rounded-2xl text-sm"
                type="submit"
                disabled={loading || !email.trim() || !password}
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Acesso privado (invite-only). Se você ainda não tem acesso, fale
              com o administrador da comunidade.
            </p>

            <Link
              href="/"
              className="inline-flex text-xs text-muted-foreground underline underline-offset-4"
            >
              Voltar para a página inicial
            </Link>
          </CardContent>
        </Card>

        <Card className="order-1 rounded-3xl border bg-muted/30 shadow-sm md:order-2">
          <CardContent className="flex h-full flex-col justify-between gap-5 p-5 sm:p-6">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Experiência Amino
              </p>
              <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
                Mobile-first, sem perder o conforto no desktop.
              </h1>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border bg-background p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">Comunidade privada</p>
                  <p className="text-xs text-muted-foreground">
                    Perfis e interações protegidos para usuários autenticados.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border bg-background p-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">Fluxo simples</p>
                  <p className="text-xs text-muted-foreground">
                    Entre e vá direto para o feed, chats ou perfis.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
