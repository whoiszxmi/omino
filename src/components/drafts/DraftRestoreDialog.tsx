"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onRestore: () => void;
  onDiscard: () => void;
};

export default function DraftRestoreDialog({ open, onRestore, onDiscard }: Props) {
  return (
    <Dialog open={open}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Encontramos um rascunho</DialogTitle>
          <DialogDescription>
            Deseja restaurar o conteúdo salvo automaticamente ou descartar este rascunho?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="ghost" className="rounded-xl" onClick={onDiscard}>
            Descartar
          </Button>
          <Button className="rounded-xl" onClick={onRestore}>
            Restaurar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
