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
  targetType: HighlightTargetType;
  targetId: string;
  title?: string;
  coverUrl?: string | null;
  onToggle?: (
    scope: HighlightScope,
    highlighted: boolean,
    payload: {
      targetType: HighlightTargetType;
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

      const [profile, community] = await Promise.all([
        isHighlighted("profile", targetType, targetId),
        isHighlighted("community", targetType, targetId),
      ]);

      if (!active) return;
      setState({ profile, community });
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [targetId, targetType]);

  async function onToggle(scope: HighlightScope) {
    if (!canUse) {
      toast.error("Você precisa estar logado.");
      return;
    }

    const current = state[scope];
    setState((prev) => ({ ...prev, [scope]: !current }));
    setBusy((prev) => ({ ...prev, [scope]: true }));

    try {
      const result = await toggleHighlight(scope, {
        targetType,
        targetId,
        title,
        coverUrl,
      });
      setState((prev) => ({ ...prev, [scope]: result.highlighted }));
      onToggle?.(scope, result.highlighted, {
        targetType,
        targetId,
        title,
        coverUrl,
      });
    } catch (error: any) {
      console.error("Erro ao alternar highlight:", error);
      setState((prev) => ({ ...prev, [scope]: current }));
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
        variant="secondary"
        className="rounded-2xl"
        onClick={() => onToggle("profile")}
        disabled={!canUse || loading || busy.profile}
      >
        {state.profile ? "Remover destaque no perfil" : "⭐ Destacar no perfil"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="rounded-2xl"
        onClick={() => onToggle("community")}
        disabled={!canUse || loading || busy.community}
      >
        {state.community
          ? "Remover destaque na comunidade"
          : "📌 Destacar na comunidade"}
      </Button>
    </div>
  );
}
