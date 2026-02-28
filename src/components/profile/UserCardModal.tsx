"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, UserRound } from "lucide-react";

type Props = {
  children: React.ReactNode;
  user: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
};

export default function UserCardModal({ children, user }: Props) {
  const profileHref = user.username ? `/app/u/${user.username}` : null;

  // Se tem username, envolve o trigger em Link direto - sem abrir modal
  if (profileHref) {
    return (
      <Link href={profileHref} className="contents">
        {children}
      </Link>
    );
  }

  // Se não tem username, abre modal simples
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-xs rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">Perfil</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-2xl border bg-muted">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt="avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <UserRound className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {user.display_name ?? "Usuário"}
            </p>
            <p className="text-sm text-muted-foreground">
              Sem username público
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
