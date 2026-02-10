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

type IsEmailAllowedRpc = boolean | { is_email_allowed?: boolean } | null;

function parseIsAllowed(data: IsEmailAllowedRpc) {
  if (typeof data === "boolean") return data;
  if (data && typeof data === "object" && "is_email_allowed" in data) {
    return Boolean(data.is_email_allowed);
  }
  return false;
}

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
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        if (!cancelled) {
          setState({ status: "error", message: userError.message });
        }
        return () => {
          cancelled = true;
        };
      }

      if (!user || !user.email) {
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

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "is_email_allowed",
        { email: user.email },
      );

      if (rpcError) {
        console.warn("allowlist rpc error", {
          message: rpcError.message,
          code: rpcError.code,
          details: rpcError.details,
          hint: rpcError.hint,
        });

        if (!cancelled) {
          setState({ status: "error", message: "Falha ao validar allowlist." });
        }
        return () => {
          cancelled = true;
        };
      }

      const isAllowed = parseIsAllowed(rpcData as IsEmailAllowedRpc);

      if (!isAllowed) {
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
    return <div className="p-4 text-sm text-muted-foreground">Verificando acesso…</div>;
  }

  if (state.status === "allowed") {
    return <>{children}</>;
  }

  if (state.status === "error") {
    return (
      <div className="space-y-3 p-4">
        <p className="text-sm text-red-400">Falha ao verificar acesso: {state.message}</p>
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
