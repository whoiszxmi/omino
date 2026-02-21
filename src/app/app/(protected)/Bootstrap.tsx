"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { AppPageSkeleton } from "@/components/app/AppPageSkeleton";

export default function Bootstrap({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        if (!cancelled) setMsg(`Erro de sessão: ${error.message}`);
        return; // não chama setReady
      }

      const user = session?.user;

      if (!user) {
        router.replace("/app/login");
        return; // não chama setReady
      }

      const { data: existing, error: selErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (selErr) {
        if (!cancelled) setMsg(`Erro lendo profiles: ${selErr.message}`);
        return; // não chama setReady
      }

      if (!existing) {
        const { error: insErr } = await supabase.from("profiles").insert({
          id: user.id,
          display_name: user.email?.split("@")[0] ?? "Novo usuário",
        });

        // BUGFIX: antes estava no finally — setReady era chamado mesmo com erro de insert,
        // renderizando os filhos junto com a mensagem de erro.
        // Agora: se insert falhar, mostra erro e PARA — sem renderizar filhos.
        if (insErr) {
          if (!cancelled) setMsg(`Erro criando profile: ${insErr.message}`);
          return;
        }
      }

      // Só chega aqui se tudo correu bem
      if (!cancelled) setReady(true);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) return <AppPageSkeleton compact />;
  if (msg) return <div className="p-4 text-sm text-red-400">{msg}</div>;

  return <>{children}</>;
}
