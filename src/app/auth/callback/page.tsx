"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallback() {
  const [msg, setMsg] = useState("Finalizando login...");

  useEffect(() => {
    const run = async () => {
      // Para links com ?code=... (PKCE)
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMsg("Erro ao concluir sessão: " + error.message);
          return;
        }
        window.location.href = "/app";
        return;
      }

      // Para links antigos com #access_token=...
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setMsg("Não consegui criar a sessão. Tente logar novamente.");
        return;
      }

      window.location.href = "/app";
    };

    run();
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md items-center justify-center p-4">
      <p className="text-sm text-muted-foreground">{msg}</p>
    </main>
  );
}
