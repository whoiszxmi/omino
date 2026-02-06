"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type ChatRow = {
  id: string;
  type: "group" | "dm";
  title: string | null;
  created_at: string;
  last_message_at: string | null;
  dm_key?: string | null;
  dm_user_a?: string | null;
  dm_user_b?: string | null;
};

type ParticipantRow = {
  chat_id: string;
  last_read_at: string | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type ChatListItem = {
  chat: ChatRow;
  unread: boolean;
  otherProfile: ProfileRow | null; // só para DM
};

type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function dmKey(a: string, b: string) {
  const [x, y] = [a, b].sort();
  return `dm:${x}:${y}`;
}

export default function ChatsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ChatListItem[]>([]);

  // dialog criar
  const [open, setOpen] = useState(false);
  const [createType, setCreateType] = useState<"group" | "dm">("group");
  const [title, setTitle] = useState("");

  // DM search
  const [userQuery, setUserQuery] = useState("");
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);

  async function loadChats() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    const partsRes = await supabase
      .from("chat_participants")
      .select("chat_id,last_read_at")
      .eq("user_id", user.id);

    if (partsRes.error) {
      console.error("ERRO participants:", {
        message: partsRes.error.message,
        code: partsRes.error.code,
        details: partsRes.error.details,
        hint: partsRes.error.hint,
        raw: partsRes.error,
      });
      toast.error(partsRes.error.message);
      setLoading(false);
      return;
    }

    const participants = (partsRes.data ?? []) as ParticipantRow[];
    const ids = participants.map((r) => r.chat_id).filter(Boolean);

    if (ids.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const chatsRes = await supabase
      .from("chats")
      .select("id,type,title,created_at,last_message_at,dm_user_a,dm_user_b")
      .in("id", ids)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (chatsRes.error) {
      console.error("ERRO loadChats:", {
        message: chatsRes.error.message,
        code: chatsRes.error.code,
        details: chatsRes.error.details,
        hint: chatsRes.error.hint,
        raw: chatsRes.error,
      });
      toast.error(chatsRes.error.message);
      setLoading(false);
      return;
    }

    const loadedChats = (chatsRes.data ?? []) as ChatRow[];

    const participantMap = new Map(
      participants.map((p) => [p.chat_id, p.last_read_at]),
    );

    const dmUserIds = loadedChats
      .filter((chat) => chat.type === "dm")
      .map((chat) =>
        chat.dm_user_a === user.id ? chat.dm_user_b : chat.dm_user_a,
      )
      .filter((id): id is string => Boolean(id));

    let profileMap = new Map<string, ProfileRow>();
    if (dmUserIds.length > 0) {
      const profilesRes = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .in("id", dmUserIds);

      if (profilesRes.error) {
        console.error("ERRO loadChatProfiles:", {
          message: profilesRes.error.message,
          code: profilesRes.error.code,
          details: profilesRes.error.details,
          hint: profilesRes.error.hint,
          raw: profilesRes.error,
        });
        toast.error(profilesRes.error.message);
      } else {
        profileMap = new Map(
          (profilesRes.data ?? []).map((row) => [row.id, row as ProfileRow]),
        );
      }
    }

    const nextItems = loadedChats.map((chat) => {
      const lastRead = participantMap.get(chat.id);
      const unread =
        !!chat.last_message_at &&
        (!lastRead ||
          new Date(chat.last_message_at).getTime() >
            new Date(lastRead).getTime());

      const otherUserId =
        chat.type === "dm"
          ? chat.dm_user_a === user.id
            ? chat.dm_user_b
            : chat.dm_user_a
          : null;

      return {
        chat,
        unread,
        otherProfile: otherUserId ? profileMap.get(otherUserId) ?? null : null,
      };
    });

    setItems(nextItems);
    setLoading(false);
  }

  useEffect(() => {
    loadChats();
  }, []);

  // -------- DM USERS SEARCH ----------
  async function searchUsers(q: string) {
    const { data: userData } = await supabase.auth.getUser();
    const me = userData.user;
    if (!me) return;

    const query = q.trim();
    if (!query) {
      setUsers([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const res = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .neq("id", me.id)
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(20);

      if (res.error) throw res.error;
      setUsers((res.data ?? []) as ProfileRow[]);
    } catch (error: unknown) {
      const err = error as SupabaseErrorLike;
      console.error("ERRO searchUsers:", {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        raw: err,
      });
      toast.error(err?.message ?? "Erro ao buscar usuários.");
    } finally {
      setSearchingUsers(false);
    }
  }

  // -------- CREATE GROUP ----------
  async function createGroup() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    const { data: u } = await supabase.auth.getUser();
    console.log("auth user:", u.user?.id);

    if (!user) return toast.error("Você precisa estar logado.");
    if (!title.trim()) return toast.error("Dê um nome para o chat.");

    setCreating(true);
    try {
      const { data: chat, error: chatErr } = await supabase
        .from("chats")
        .insert({
          type: "group",
          title: title.trim(),
        })
        .select("id")
        .single();

      if (chatErr || !chat) throw chatErr;

      const { error: partErr } = await supabase
        .from("chat_participants")
        .insert({
          chat_id: chat.id,
          user_id: user.id,
          role: "owner",
        });

      if (partErr) throw partErr;

      toast.success("Grupo criado!");
      setOpen(false);
      setTitle("");
      await loadChats();
      router.push(`/app/chats/${chat.id}`);
    } catch (error: unknown) {
      const err = error as SupabaseErrorLike;
      console.error("ERRO createGroup:", {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        raw: err,
      });
      toast.error(err?.message ?? "Erro ao criar grupo");
    } finally {
      setCreating(false);
    }
  }

  // -------- CREATE DM ----------
  async function createDm() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) return toast.error("Você precisa estar logado.");
    if (!selectedUserId) return toast.error("Selecione um usuário.");

    setCreating(true);
    try {
      const key = dmKey(user.id, selectedUserId);
      const [a, b] = [user.id, selectedUserId].sort();

      // procura DM existente
      const { data: existing, error: exErr } = await supabase
        .from("chats")
        .select("id")
        .eq("type", "dm")
        .eq("dm_key", key)
        .maybeSingle();

      if (exErr) throw exErr;

      if (existing?.id) {
        toast.success("DM já existe — abrindo.");
        setOpen(false);
        await loadChats();
        router.push(`/app/chats/${existing.id}`);
        return;
      }

      // cria DM
      const { data: chat, error: chatErr } = await supabase
        .from("chats")
        .insert({
          type: "dm",
          title: null,
          dm_key: key,
          dm_user_a: a,
          dm_user_b: b,
        })
        .select("id")
        .single();

      if (chatErr || !chat) throw chatErr;

      // adiciona participants (pros dois)
      const { error: partErr } = await supabase
        .from("chat_participants")
        .insert([
          { chat_id: chat.id, user_id: user.id, role: "owner" },
          { chat_id: chat.id, user_id: selectedUserId, role: "member" },
        ]);

      if (partErr) throw partErr;

      toast.success("DM criado!");
      setOpen(false);
      setSelectedUserId(null);
      setUserQuery("");
      await loadChats();
      router.push(`/app/chats/${chat.id}`);
    } catch (error: unknown) {
      const err = error as SupabaseErrorLike;
      console.error("ERRO createDm:", {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        raw: err,
      });
      toast.error(err?.message ?? "Erro ao criar DM");
    } finally {
      setCreating(false);
    }
  }

  const empty = !loading && items.length === 0;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Chats</h1>
          <p className="truncate text-xs text-muted-foreground">
            Grupos e conversas privadas
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={loadChats}
          >
            Atualizar
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl">Novo</Button>
            </DialogTrigger>

            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Criar chat</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <ToggleGroup
                  type="single"
                  value={createType}
                  onValueChange={(v) => {
                    const next = (v as "group" | "dm") || "group";
                    setCreateType(next);
                    // reset ao trocar tipo
                    setTitle("");
                    setUserQuery("");
                    setUsers([]);
                    setSelectedUserId(null);
                  }}
                  className="flex gap-2"
                >
                  <ToggleGroupItem value="group" className="rounded-2xl border">
                    Grupo
                  </ToggleGroupItem>
                  <ToggleGroupItem value="dm" className="rounded-2xl border">
                    Privado (DM)
                  </ToggleGroupItem>
                </ToggleGroup>

                {createType === "group" ? (
                  <Input
                    placeholder="Nome do grupo"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Buscar usuário (username ou nome)"
                      value={userQuery}
                      onChange={(e) => {
                        const v = e.target.value;
                        setUserQuery(v);
                        setSelectedUserId(null);
                        // busca “ao digitar”
                        void searchUsers(v);
                      }}
                    />

                    {searchingUsers ? (
                      <div className="text-sm text-muted-foreground">
                        Buscando...
                      </div>
                    ) : users.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        Digite para buscar.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {users.map((u) => {
                          const label =
                            u.display_name ?? u.username ?? "Sem nome";
                          const selected = selectedUserId === u.id;

                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => setSelectedUserId(u.id)}
                              className={`w-full rounded-2xl border p-3 text-left transition ${
                                selected ? "bg-muted/50" : "hover:bg-muted/30"
                              }`}
                            >
                              <div className="text-sm font-medium truncate">
                                {label}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                @{u.username ?? "sem-username"}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <Button
                  className="w-full rounded-2xl"
                  onClick={createType === "group" ? createGroup : createDm}
                  disabled={creating}
                >
                  {creating ? "Criando..." : "Criar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : empty ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Nenhum chat ainda</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Crie um chat em <b>Novo</b>.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(({ chat, unread, otherProfile }) => {
            const dmLabel =
              otherProfile?.display_name ?? otherProfile?.username ?? "DM";

            const title =
              chat.type === "group" ? (chat.title ?? "Grupo") : dmLabel;

            const subtitle = chat.last_message_at
              ? `Última msg: ${new Date(chat.last_message_at).toLocaleString(
                  "pt-BR",
                )}`
              : `Criado em: ${new Date(chat.created_at).toLocaleString("pt-BR")}`;

            return (
              <button
                key={chat.id}
                type="button"
                className="w-full text-left"
                onClick={() => router.push(`/app/chats/${chat.id}`)}
              >
                <Card className="rounded-2xl transition hover:bg-muted/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm truncate flex-1">
                        {title}
                      </CardTitle>
                      {unread ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                      ) : null}
                    </div>

                    <div className="text-xs text-muted-foreground truncate">
                      {subtitle}
                    </div>
                  </CardHeader>

                  <CardContent className="text-xs text-muted-foreground">
                    Toque para abrir
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
