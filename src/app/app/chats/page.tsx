"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
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
  last_message_text: string | null;
  dm_user_a?: string | null;
  dm_user_b?: string | null;
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

type RpcListMyChatsRow = {
  // retornos esperados da RPC list_my_chats
  id: string;
  type: "group" | "dm";
  title: string | null;
  created_at: string;
  last_message_at: string | null;
  last_message_text: string | null;
  dm_user_a: string | null;
  dm_user_b: string | null;
  unread: boolean;

  other_user_id: string | null;
  other_username: string | null;
  other_display_name: string | null;
  other_avatar_url: string | null;
};

export default function ChatsPage() {
  const router = useRouter();
  const { activePersona } = useActivePersona();

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

    try {
      // ✅ LISTA VIA RPC (evita SELECT direto em chats/chat_participants)
      const { data, error } = await supabase.rpc("list_my_chats");

      if (error) throw error;

      const rows = (data ?? []) as RpcListMyChatsRow[];

      const nextItems: ChatListItem[] = rows.map((r) => {
        const chat: ChatRow = {
          id: r.id,
          type: r.type,
          title: r.title,
          created_at: r.created_at,
          last_message_at: r.last_message_at,
          last_message_text: r.last_message_text,
          dm_user_a: r.dm_user_a,
          dm_user_b: r.dm_user_b,
        };

        const otherProfile: ProfileRow | null = r.other_user_id
          ? {
              id: r.other_user_id,
              username: r.other_username,
              display_name: r.other_display_name,
              avatar_url: r.other_avatar_url,
            }
          : null;

        return {
          chat,
          unread: !!r.unread,
          otherProfile,
        };
      });

      setItems(nextItems);
    } catch (error: unknown) {
      const err = error as SupabaseErrorLike;
      console.error("ERRO loadChats (rpc):", {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        raw: err,
      });
      toast.error(err?.message ?? "Erro ao carregar chats.");
    } finally {
      setLoading(false);
    }
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
    if (!user) return toast.error("Você precisa estar logado.");

    const t = title.trim();
    if (!t) return toast.error("Dê um nome para o chat.");

    setCreating(true);
    try {
      // ✅ CRIA VIA RPC (não usa created_by, não bate em RLS do chats)
      const { data, error } = await supabase.rpc("create_group_chat", {
        p_title: t,
        p_default_persona_id: activePersona?.id ?? null,
      });

      if (error) throw error;

      // padrão: RPC retorna o chat_id (uuid) como string
      const chatId = data as any as string;
      if (!chatId) throw new Error("RPC não retornou chat_id.");

      toast.success("Grupo criado!");
      setOpen(false);
      setTitle("");
      await loadChats();
      router.push(`/app/chats/${chatId}`);
    } catch (error: unknown) {
      const err = error as SupabaseErrorLike;
      console.error("ERRO createGroup (rpc):", {
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
      // ✅ CRIA/ABRE VIA RPC (se já existe, retorna o existente)
      const { data, error } = await supabase.rpc("create_dm_chat", {
        p_other_user_id: selectedUserId,
        p_default_persona_id: activePersona?.id ?? null,
      });

      if (error) throw error;

      const chatId = data as any as string;
      if (!chatId) throw new Error("RPC não retornou chat_id.");

      toast.success("DM pronto!");
      setOpen(false);
      setSelectedUserId(null);
      setUserQuery("");
      setUsers([]);
      await loadChats();
      router.push(`/app/chats/${chatId}`);
    } catch (error: unknown) {
      const err = error as SupabaseErrorLike;
      console.error("ERRO createDm (rpc):", {
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
                  disabled={
                    creating ||
                    (createType === "group" ? !title.trim() : !selectedUserId)
                  }
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

            const subtitle = chat.last_message_text
              ? chat.last_message_text
              : chat.last_message_at
                ? `Última msg: ${new Date(chat.last_message_at).toLocaleString("pt-BR")}`
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
