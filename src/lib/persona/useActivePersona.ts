"use client";

import { useEffect, useState } from "react";
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

type State = {
  loading: boolean;
  personas: Persona[];
  activePersona: Persona | null;
  error: string | null;
};

export function useActivePersona() {
  const [state, setState] = useState<State>({
    loading: true,
    personas: [],
    activePersona: null,
    error: null,
  });

  async function refresh() {
    setState((s) => ({ ...s, loading: true, error: null }));

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setState({
        loading: false,
        personas: [],
        activePersona: null,
        error: "Não logado.",
      });
      return;
    }

    // 1) pega profile (active_persona_id)
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("id, active_persona_id")
      .eq("id", user.id)
      .maybeSingle();

    if (pErr) {
      setState((s) => ({ ...s, loading: false, error: pErr.message }));
      return;
    }

    // 2) pega personas do usuário
    const { data: personas, error: perErr } = await supabase
      .from("personas")
      .select("*")
      .order("created_at", { ascending: true });

    if (perErr) {
      setState((s) => ({ ...s, loading: false, error: perErr.message }));
      return;
    }

    const list = (personas ?? []) as Persona[];

    // 3) decide persona ativa
    const active =
      (profile?.active_persona_id
        ? list.find((p) => p.id === profile.active_persona_id)
        : null) ??
      list.find((p) => p.is_default) ??
      list[0] ??
      null;

    // 4) se não tinha active_persona_id mas já existe uma ativa, salva
    if (profile && !profile.active_persona_id && active) {
      await supabase
        .from("profiles")
        .update({ active_persona_id: active.id })
        .eq("id", profile.id);
    }

    setState({
      loading: false,
      personas: list,
      activePersona: active,
      error: null,
    });
  }

  async function setActivePersona(personaId: string) {
    setState((s) => ({ ...s, error: null }));

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setState((s) => ({ ...s, error: "Não logado." }));
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ active_persona_id: personaId })
      .eq("id", user.id);

    if (error) {
      setState((s) => ({ ...s, error: error.message }));
      return;
    }

    await refresh();
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, refresh, setActivePersona };
}
