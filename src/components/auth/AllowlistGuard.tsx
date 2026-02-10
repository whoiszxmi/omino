"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const AUTH_COOKIE = "omino-auth";

export default function AllowlistGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
        window.location.replace("/login");
        return;
      }

      const { data: row, error } = await supabase
        .from("allowed_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !row) {
        await supabase.auth.signOut();
        document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
        if (mounted) setOk(false);
        return;
      }

      document.cookie = `${AUTH_COOKIE}=1; Path=/; Max-Age=2592000; SameSite=Lax; Secure`;

      if (mounted) setOk(true);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (ok === null)
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Verificando acesso…
      </div>
    );

  if (ok === false) {
    return (
      <div className="p-4">
        <div className="text-lg font-semibold">Acesso restrito</div>
        <div className="mt-2 text-sm text-muted-foreground">
          Este app é privado. Se você deveria ter acesso, fale com o
          administrador.
        </div>
        <a className="mt-4 inline-block underline" href="/app/login">
          Voltar para login
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
