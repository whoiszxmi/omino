"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function Bootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        location.href = "/login";
        return;
      }

      // garante profile SEM depender do /app/page.tsx
      const { data: existing, error: selErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (selErr) {
        setMsg(`Erro lendo profiles: ${selErr.message}`);
        setReady(true);
        return;
      }

      if (!existing) {
        const { error: insErr } = await supabase.from("profiles").insert({
          id: user.id,
          display_name: user.email?.split("@")[0] ?? "Novo usuário",
        });

        if (insErr) {
          setMsg(`Erro criando profile: ${insErr.message}`);
        }
      }

      setReady(true);
    };

    run();
  }, []);

  if (!ready)
    return (
      <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
    );
  if (msg) return <div className="p-4 text-sm text-red-400">{msg}</div>;

  return <>{children}</>;
}
