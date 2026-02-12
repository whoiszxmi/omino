"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type PresenceUser = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type PresenceStateEntry = {
  user_id?: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

type ParticipantRow = { user_id: string };

export function useChatPresence(chatId: string) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [presenceEnabled, setPresenceEnabled] = useState(false);

  useEffect(() => {
    if (!chatId) return;

    let active = true;

    async function loadFallbackCount() {
      const { data } = await supabase.from("chat_participants").select("user_id").eq("chat_id", chatId);
      if (!active) return;
      setParticipantsCount(((data ?? []) as ParticipantRow[]).length);
    }

    void loadFallbackCount();

    let channel = supabase.channel(`presence:chat:${chatId}`);

    async function setup() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) return;

      const profileRes = await supabase
        .from("profiles")
        .select("username,display_name,avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      const profile = profileRes.data as { username: string | null; display_name: string | null; avatar_url: string | null } | null;

      channel = supabase.channel(`presence:chat:${chatId}`, {
        config: { presence: { key: user.id } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const users: PresenceUser[] = [];

          Object.values(state).forEach((entriesUnknown) => {
            const entries = entriesUnknown as PresenceStateEntry[];
            entries.forEach((entry) => {
              if (!entry.user_id) return;
              if (users.some((item) => item.user_id === entry.user_id)) return;

              users.push({
                user_id: entry.user_id,
                username: entry.username ?? null,
                display_name: entry.display_name ?? null,
                avatar_url: entry.avatar_url ?? null,
              });
            });
          });

          if (!active) return;
          setOnlineUsers(users);
          setPresenceEnabled(true);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({
              user_id: user.id,
              username: profile?.username ?? null,
              display_name: profile?.display_name ?? null,
              avatar_url: profile?.avatar_url ?? null,
            });
          }
        });
    }

    void setup();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  const onlineCount = useMemo(
    () => (presenceEnabled ? onlineUsers.length : participantsCount),
    [onlineUsers.length, participantsCount, presenceEnabled],
  );

  return {
    onlineUsers,
    onlineCount,
    presenceEnabled,
    participantsCount,
  };
}
