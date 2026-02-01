"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });

    setLoading(false);

    if (error) setMsg(error.message);
    else setMsg("Enviei um link de login no seu e-mail.");
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
          />
          <Button
            className="w-full rounded-2xl"
            onClick={handleLogin}
            disabled={loading || !email}
          >
            {loading ? "Enviando..." : "Enviar link"}
          </Button>

          {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
