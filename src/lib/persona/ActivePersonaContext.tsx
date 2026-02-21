"use client";

/**
 * ActivePersonaContext
 *
 * ANTES: useActivePersona() em ~15 componentes → até 30 queries/load.
 * AGORA: 2 queries no Provider (uma vez), distribuídas via Context.
 *
 * MIGRAÇÃO:
 * 1. Adicione <ActivePersonaProvider> no layout raiz
 * 2. Substitua o conteúdo de src/lib/persona/useActivePersona.ts
 *    por: export { useActivePersona } from "./ActivePersonaContext";
 * 3. Nenhum outro arquivo precisa mudar.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase/client";

export type Persona = {
  id: string;
  user_id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  is_default: boolean;
  created_at: string;
};

type ActivePersonaState = {
  loading: boolean;
  personas: Persona[];
  activePersona: Persona | null;
  error: string | null;
  /** Recarrega do Supabase — chamar após criar/deletar persona */
  refresh: () => Promise<void>;
  /** Troca persona ativa e persiste no profiles.active_persona_id */
  setActivePersona: (personaId: string) => Promise<void>;
};

const ActivePersonaContext = createContext<ActivePersonaState | null>(null);

export function ActivePersonaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activePersona, setActivePersonaState] = useState<Persona | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      if (mountedRef.current) {
        setPersonas([]);
        setActivePersonaState(null);
        setLoading(false);
      }
      return;
    }

    // 2 queries em paralelo em vez de N calls espalhados
    const [profileRes, personasRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, active_persona_id")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("personas")
        .select("id, user_id, name, bio, avatar_url, is_default, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);

    if (!mountedRef.current) return;

    if (profileRes.error) {
      setError(profileRes.error.message);
      setLoading(false);
      return;
    }
    if (personasRes.error) {
      setError(personasRes.error.message);
      setLoading(false);
      return;
    }

    const list = (personasRes.data ?? []) as Persona[];
    const profile = profileRes.data as {
      id: string;
      active_persona_id: string | null;
    } | null;

    // Prioridade: active_persona_id → is_default → primeiro
    const active =
      (profile?.active_persona_id
        ? list.find((p) => p.id === profile.active_persona_id)
        : undefined) ??
      list.find((p) => p.is_default) ??
      list[0] ??
      null;

    // Persiste se ainda não havia active_persona_id
    if (profile && !profile.active_persona_id && active) {
      void supabase
        .from("profiles")
        .update({ active_persona_id: active.id })
        .eq("id", profile.id);
    }

    setPersonas(list);
    setActivePersonaState(active);
    setLoading(false);
  }, []);

  const setActivePersona = useCallback(
    async (personaId: string) => {
      const found = personas.find((p) => p.id === personaId);
      if (!found) return;

      // Atualiza local imediatamente (UI responsiva)
      setActivePersonaState(found);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;

      const { error: updErr } = await supabase
        .from("profiles")
        .update({ active_persona_id: personaId })
        .eq("id", user.id);

      if (updErr) setError(updErr.message);
    },
    [personas],
  );

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  return (
    <ActivePersonaContext.Provider
      value={{
        loading,
        personas,
        activePersona,
        error,
        refresh,
        setActivePersona,
      }}
    >
      {children}
    </ActivePersonaContext.Provider>
  );
}

/** Mesma API do hook original — lê do Context, zero queries extras. */
export function useActivePersona(): ActivePersonaState {
  const ctx = useContext(ActivePersonaContext);
  if (!ctx) {
    throw new Error(
      "[useActivePersona] Envolva o layout com <ActivePersonaProvider>.",
    );
  }
  return ctx;
}
