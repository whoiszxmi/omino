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

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Perfil do usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-2xl border bg-muted">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt="avatar" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">
                {user.display_name ?? user.username ?? "Usuário"}
              </p>
              <p className="truncate text-sm text-muted-foreground">@{user.username ?? "sem-username"}</p>
            </div>
          </div>
          {profileHref ? (
            <Button asChild className="w-full rounded-xl">
              <Link href={profileHref}>Ver perfil</Link>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Este usuário não possui username público.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
