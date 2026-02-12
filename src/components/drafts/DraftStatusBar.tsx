"use client";

import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  status: "idle" | "saving" | "saved" | "unsaved" | "error";
  dirty: boolean;
  onSaveNow: () => Promise<void> | void;
  onDiscard: () => Promise<void> | void;
};

export default function DraftStatusBar({ status, dirty, onSaveNow, onDiscard }: Props) {
  const label =
    status === "saving"
      ? "Salvando..."
      : status === "saved"
        ? "Salvo"
        : status === "error"
          ? "Erro ao salvar"
          : dirty
            ? "Alterações não salvas"
            : "Sem alterações";

  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border bg-muted/30 px-3 py-2 text-xs">
      <div className="flex items-center gap-2 text-muted-foreground">
        {status === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" size="sm" className="h-8 rounded-xl" onClick={onSaveNow}>
          Salvar agora
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 rounded-xl" onClick={onDiscard}>
          Descartar
        </Button>
      </div>
    </div>
  );
}
