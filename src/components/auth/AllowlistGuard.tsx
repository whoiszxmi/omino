"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type GuardState =
  | { status: "checking" }
  | { status: "allowed" }
  | { status: "denied"; message: string }
  | { status: "error"; message: string };

export default function AllowlistGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<GuardState>({ status: "checking" });

  const verify = useCallback(async () => {
    let cancelled = false;

    try {
      setState({ status: "checking" });

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        if (!cancelled) {
          setState({ status: "error", message: sessionError.message });
        }
        return () => {
          cancelled = true;
        };
      }

      if (!session?.user) {
        if (pathname !== "/app/login") {
          router.replace("/app/login");
        }
        if (!cancelled) {
          setState({ status: "denied", message: "Sessão não encontrada." });
        }
        return () => {
          cancelled = true;
        };
      }

      const { data: row, error: allowlistError } = await supabase
        .from("allowed_users")
        .select("user_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (allowlistError) {
        if (!cancelled) {
          setState({ status: "error", message: allowlistError.message });
        }
        return () => {
          cancelled = true;
        };
      }

      if (!row) {
        if (!cancelled) {
          setState({
            status: "denied",
            message:
              "Seu usuário não está autorizado nesta allowlist. Peça liberação ao administrador.",
          });
        }
        return () => {
          cancelled = true;
        };
      }

      if (!cancelled) {
        setState({ status: "allowed" });
      }
    } catch (error) {
      if (!cancelled) {
        const message =
          error instanceof Error
            ? error.message
            : "Erro inesperado ao validar acesso.";
        setState({ status: "error", message });
      }
    }

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      cleanup = await verify();
    })();

    return () => {
      cleanup?.();
    };
  }, [verify]);

  if (state.status === "checking") {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Verificando acesso…
      </div>
    );
  }

  if (state.status === "allowed") {
    return <>{children}</>;
  }

  if (state.status === "error") {
    return (
      <div className="space-y-3 p-4">
        <p className="text-sm text-red-400">
          Falha ao verificar acesso: {state.message}
        </p>
        <Button onClick={() => void verify()} className="rounded-2xl">
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <div className="text-lg font-semibold">Acesso não autorizado</div>
      <div className="text-sm text-muted-foreground">{state.message}</div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="rounded-2xl"
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/app/login");
          }}
        >
          Sair
        </Button>
        <Button
          className="rounded-2xl"
          onClick={() => {
            router.replace("/app/login");
          }}
        >
          Voltar
        </Button>
      </div>
    </div>
  );
}
