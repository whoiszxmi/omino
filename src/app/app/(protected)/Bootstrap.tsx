"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function Bootstrap({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          if (!cancelled) setMsg(`Erro de sessão: ${error.message}`);
          return;
        }

        const user = session?.user;

        if (!user) {
          router.replace("/app/login");
          return;
        }

        const { data: existing, error: selErr } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (selErr) {
          if (!cancelled) setMsg(`Erro lendo profiles: ${selErr.message}`);
          return;
        }

        if (!existing) {
          const { error: insErr } = await supabase.from("profiles").insert({
            id: user.id,
            display_name: user.email?.split("@")[0] ?? "Novo usuário",
          });

          if (insErr && !cancelled) {
            setMsg(`Erro criando profile: ${insErr.message}`);
          }
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready)
    return <div className="p-4 text-sm text-muted-foreground">Carregando...</div>;
  if (msg) return <div className="p-4 text-sm text-red-400">{msg}</div>;

  return <>{children}</>;
}
