"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  isHighlighted,
  toggleHighlight,
  type HighlightScope,
  type HighlightTargetType,
} from "@/lib/highlights/highlights";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

type Props = {
  targetType: "post" | "wiki";
  targetId: string;
  title: string;
  coverUrl?: string | null;

  // ✅ ADICIONE ISTO
  onToggle?: (
    scope: "profile" | "community",
    highlighted: boolean,
    payload: {
      targetType: "post" | "wiki";
      targetId: string;
      title?: string;
      coverUrl?: string | null;
    },
  ) => void;
};

type HighlightState = {
  profile: boolean;
  community: boolean;
};

const EMPTY_STATE: HighlightState = { profile: false, community: false };

export default function HighlightButtonGroup({
  targetType,
  targetId,
  title,
  coverUrl,
  onToggle,
}: Props) {
  const [state, setState] = useState<HighlightState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<{ profile: boolean; community: boolean }>({
    profile: false,
    community: false,
  });
  const [canUse, setCanUse] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!active) return;

      const user = userData.user;
      setCanUse(!!user);

      if (!user) {
        setState(EMPTY_STATE);
        setLoading(false);
        return;
      }

      const [profileId, communityId] = await Promise.all([
        isHighlighted("profile", targetType, targetId),
        isHighlighted("community", targetType, targetId),
      ]);

      if (!active) return;

      setState({
        profile: !!profileId,
        community: !!communityId,
      });

      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [targetId, targetType]);

  async function handleToggle(scope: HighlightScope) {
    if (!canUse) {
      toast.error("Você precisa estar logado.");
      return;
    }

    const previous = state[scope];

    // otimista
    setState((prev) => ({ ...prev, [scope]: !previous }));
    setBusy((prev) => ({ ...prev, [scope]: true }));

    try {
      const result = await toggleHighlight({
        scope,
        targetType,
        targetId,
        title,
        coverUrl,
      });

      setState((prev) => ({ ...prev, [scope]: result.highlighted }));

      onToggle?.("profile", result.highlighted, {
        targetType,
        targetId,
        title,
        coverUrl,
      });

      toast.success(
        result.highlighted
          ? "Adicionado aos destaques"
          : "Removido dos destaques",
      );
    } catch (error: any) {
      console.error("Erro ao alternar highlight:", error);

      // rollback
      setState((prev) => ({ ...prev, [scope]: previous }));

      toast.error(error?.message ?? "Não foi possível atualizar o destaque.");
    } finally {
      setBusy((prev) => ({ ...prev, [scope]: false }));
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant={state.profile ? "secondary" : "outline"}
        className="rounded-2xl"
        onClick={() => handleToggle("profile")}
        disabled={!canUse || loading || busy.profile}
      >
        {state.profile ? "★ Perfil" : "☆ Destacar no perfil"}
      </Button>

      <Button
        type="button"
        size="sm"
        variant={state.community ? "secondary" : "outline"}
        className="rounded-2xl"
        onClick={() => handleToggle("community")}
        disabled={!canUse || loading || busy.community}
      >
        {state.community ? "📌 Comunidade" : "📌 Destacar na comunidade"}
      </Button>
    </div>
  );
}
