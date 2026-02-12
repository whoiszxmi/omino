"use client";

import { type ComponentType, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpen,
  Globe,
  MessageCirclePlus,
  MessagesSquare,
  Plus,
  Send,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ActionItem = {
  title: string;
  subtitle: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  requiresPersona?: boolean;
};

const actions: ActionItem[] = [
  {
    title: "Novo Post",
    subtitle: "Compartilhe no feed",
    href: "/app/feed/new",
    icon: Send,
    requiresPersona: true,
  },
  {
    title: "Nova Wiki",
    subtitle: "Crie uma página",
    href: "/app/wiki/new",
    icon: BookOpen,
    requiresPersona: true,
  },
  {
    title: "Novo Grupo",
    subtitle: "Chat em grupo",
    href: "/app/chats?create=group",
    icon: Users,
  },
  {
    title: "Novo Chat Público",
    subtitle: "Aberto para todos",
    href: "/app/chats/public/new",
    icon: Globe,
    requiresPersona: true,
  },
  {
    title: "Nova DM",
    subtitle: "Conversa 1:1",
    href: "/app/chats?create=dm",
    icon: MessageCirclePlus,
  },
  {
    title: "Públicos",
    subtitle: "Explorar chats",
    href: "/app/chats/public",
    icon: MessagesSquare,
  },
];

export function ActionToolbar({ hasPersona }: { hasPersona: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function runAction(action: ActionItem) {
    if (action.requiresPersona && !hasPersona) {
      toast.error("Selecione uma persona");
      return;
    }

    setOpen(false);
    router.push(action.href);
  }

  return (
    <>
      <Button
        type="button"
        size="icon"
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full shadow-lg md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir ações de criação"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bottom-0 top-auto translate-y-0 rounded-t-3xl border-x-0 border-b-0 p-0 sm:max-w-lg md:hidden">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="text-left">Criar</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 p-4 pb-6">
            {actions.map((action) => {
              const Icon = action.icon;
              const disabled = action.requiresPersona && !hasPersona;

              return (
                <button
                  key={action.title}
                  type="button"
                  onClick={() => runAction(action)}
                  className={cn(
                    "rounded-2xl border bg-background p-3 text-left transition",
                    "flex min-h-24 flex-col gap-2",
                    disabled ? "opacity-60" : "hover:bg-muted/50",
                  )}
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <div className="text-sm font-semibold">{action.title}</div>
                  <div className="text-xs text-muted-foreground">{action.subtitle}</div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
