"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  profile: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  onOpenProfile: (username: string) => void;
};

export default function FollowListItem({ profile, onOpenProfile }: Props) {
  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardContent className="flex items-center justify-between gap-3 p-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-2xl border bg-muted">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{profile.display_name ?? profile.username ?? "Sem nome"}</div>
            <div className="truncate text-xs text-muted-foreground">@{profile.username ?? "sem-username"}</div>
          </div>
        </div>
        {profile.username ? (
          <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => profile.username && onOpenProfile(profile.username)}>
            Ver perfil
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
