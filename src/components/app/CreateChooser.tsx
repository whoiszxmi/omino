"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, BookOpen } from "lucide-react";

export function CreateChooser({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Criar</DialogTitle>
        </DialogHeader>

        <div className="grid gap-2">
          <Button
            className="rounded-2xl justify-start"
            onClick={() => (location.href = "/app/feed/new")}
          >
            <FileText className="mr-2 h-4 w-4" /> Post
          </Button>

          <Button
            className="rounded-2xl justify-start"
            variant="secondary"
            onClick={() => (location.href = "/app/wiki/new")}
          >
            <BookOpen className="mr-2 h-4 w-4" /> Wiki
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
