"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, Globe, Users } from "lucide-react";
import { toast } from "sonner";

type CreateChooserProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hasPersona?: boolean;
};

export function CreateChooser({
  open,
  onOpenChange,
  hasPersona = true,
}: CreateChooserProps) {
  const router = useRouter();

  function navigateWithPersona(href: string) {
    if (!hasPersona) {
      toast.error("Selecione uma persona");
      return;
    }

    onOpenChange(false);
    router.push(href);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Criar</DialogTitle>
        </DialogHeader>

        <div className="grid gap-2">
          <Button
            className="w-full justify-start rounded-2xl"
            onClick={() => navigateWithPersona("/app/feed/new")}
          >
            <FileText className="mr-2 h-4 w-4" /> Post
          </Button>

          <Button
            className="w-full justify-start rounded-2xl"
            variant="secondary"
            onClick={() => navigateWithPersona("/app/wiki/new")}
          >
            <BookOpen className="mr-2 h-4 w-4" /> Wiki
          </Button>

          <Button
            className="w-full justify-start rounded-2xl"
            variant="secondary"
            onClick={() => {
              onOpenChange(false);
              router.push("/app/chats?create=group");
            }}
          >
            <Users className="mr-2 h-4 w-4" /> Grupo
          </Button>

          <Button
            className="w-full justify-start rounded-2xl"
            variant="secondary"
            onClick={() => navigateWithPersona("/app/chats/public/new")}
          >
            <Globe className="mr-2 h-4 w-4" /> Chat público
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
