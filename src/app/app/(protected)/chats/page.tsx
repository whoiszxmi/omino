"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import PublicChatsList, { type PublicChatItem } from "@/components/chats/PublicChatsList";
import MyChatsList, { type MyChatItem } from "@/components/chats/MyChatsList";

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type RpcRow = {
  id: string;
  type: "group" | "dm" | "public";
  title: string | null;
  last_message_at: string | null;
  last_message_text: string | null;
  unread?: boolean;
  other_display_name?: string | null;
  other_username?: string | null;
};

export default function ChatsPage() {
  const router = useRouter();
  const { activePersona } = useActivePersona();

  const [loading, setLoading] = useState(true);
  const [publicChats, setPublicChats] = useState<PublicChatItem[]>([]);
  const [myChats, setMyChats] = useState<MyChatItem[]>([]);
  const [myChatIds, setMyChatIds] = useState<string[]>([]);
  const [section, setSection] = useState<"public" | "mine">("public");

  const [open, setOpen] = useState(false);
  const [createType, setCreateType] = useState<"group" | "dm">("group");
  const [title, setTitle] = useState("");

  const [userQuery, setUserQuery] = useState("");
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteResults, setInviteResults] = useState<ProfileRow[]>([]);
  const [inviting, setInviting] = useState(false);

  const [creating, setCreating] = useState(false);

  async function loadChats() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setLoading(false);
      return;
    }

    const publicRes = await supabase
      .from("chats")
      .select("id,title,last_message_at,last_message_text")
      .eq("type", "public")
      .order("last_message_at", { ascending: false, nullsFirst: false });

    const myRes = await supabase.rpc("list_my_chats");

    if (publicRes.error) toast.error(publicRes.error.message);
    if (myRes.error) toast.error(myRes.error.message);

    const mineRows = (myRes.data ?? []) as RpcRow[];
    const myIds = mineRows.map((row) => row.id);

    setMyChatIds(myIds);
    setPublicChats(
      ((publicRes.data ?? []) as Omit<PublicChatItem, "participant">[]).map((chat) => ({
        ...chat,
        participant: myIds.includes(chat.id),
      })),
    );

    setMyChats(
      mineRows.map((row) => {
        const dmTitle = row.other_display_name ?? row.other_username ?? "DM";
        return {
          id: row.id,
          type: row.type,
          title: row.type === "dm" ? dmTitle : row.title,
          last_message_at: row.last_message_at,
          last_message_text: row.last_message_text,
          unread: row.unread,
        };
      }),
    );

    setLoading(false);
  }

  useEffect(() => {
    void loadChats();
  }, []);

  async function searchProfiles(query: string, setter: (rows: ProfileRow[]) => void) {
    const { data: userData } = await supabase.auth.getUser();
    const me = userData.user;
    if (!me) return;

    const q = query.trim();
    if (!q) {
      setter([]);
      return;
    }

    setSearchingUsers(true);
    const res = await supabase
      .from("profiles")
      .select("id,username,display_name,avatar_url")
      .neq("id", me.id)
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(20);

    if (res.error) toast.error(res.error.message);
    setter((res.data ?? []) as ProfileRow[]);
    setSearchingUsers(false);
  }

  async function createGroup() {
    const t = title.trim();
    if (!t) return toast.error("Dê um nome para o grupo.");

    setCreating(true);
    const { data, error } = await supabase.rpc("create_group_chat", {
      p_title: t,
      p_default_persona_id: activePersona?.id ?? null,
    });

    if (error) {
      toast.error(error.message);
      setCreating(false);
      return;
    }

    const chatId = data as string | null;
    if (!chatId) {
      toast.error("Não foi possível criar o grupo.");
      setCreating(false);
      return;
    }

    if (inviteResults.length > 0) {
      setInviting(true);
      const rows = inviteResults.map((p) => ({ chat_id: chatId, user_id: p.id }));
      const inviteRes = await supabase.from("chat_participants").upsert(rows, { onConflict: "chat_id,user_id" });
      if (inviteRes.error) toast.error(`Falha ao convidar: ${inviteRes.error.message}`);
      setInviting(false);
    }

    toast.success("Grupo criado.");
    setOpen(false);
    setInviteQuery("");
    setInviteResults([]);
    setTitle("");
    await loadChats();
    router.push(`/app/chats/${chatId}`);
    setCreating(false);
  }

  async function createDm() {
    if (!selectedUserId) return toast.error("Selecione um usuário.");

    setCreating(true);
    const { data, error } = await supabase.rpc("create_dm_chat", {
      p_other_user_id: selectedUserId,
      p_default_persona_id: activePersona?.id ?? null,
    });

    if (error) {
      toast.error(error.message);
      setCreating(false);
      return;
    }

    const chatId = data as string | null;
    if (!chatId) {
      toast.error("Não foi possível criar DM.");
      setCreating(false);
      return;
    }

    toast.success("DM pronto.");
    setOpen(false);
    setSelectedUserId(null);
    setUserQuery("");
    setUsers([]);
    await loadChats();
    router.push(`/app/chats/${chatId}`);
    setCreating(false);
  }

  const canCreate = useMemo(
    () => (createType === "group" ? !!title.trim() : !!selectedUserId),
    [createType, selectedUserId, title],
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-5 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Chats</h1>
          <p className="text-sm text-muted-foreground">Públicos, grupos por convite e DMs 1:1.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="rounded-2xl" onClick={() => void loadChats()}>
            Atualizar
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl">Novo chat</Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Criar chat</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <ToggleGroup type="single" value={createType} onValueChange={(v) => setCreateType((v as "group" | "dm") || "group")}>
                  <ToggleGroupItem value="group" className="rounded-xl border">Grupo</ToggleGroupItem>
                  <ToggleGroupItem value="dm" className="rounded-xl border">DM</ToggleGroupItem>
                </ToggleGroup>

                {createType === "group" ? (
                  <>
                    <Input placeholder="Nome do grupo" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <Input
                      placeholder="Convidar por e-mail ou @username"
                      value={inviteQuery}
                      onChange={(e) => {
                        const next = e.target.value;
                        setInviteQuery(next);
                        void searchProfiles(next, setInviteResults);
                      }}
                    />
                    <div className="max-h-40 space-y-2 overflow-auto">
                      {inviteResults.map((u) => (
                        <Card key={u.id} className="rounded-xl border">
                          <CardContent className="p-2 text-sm">{u.display_name ?? u.username ?? "Usuário"}</CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <Input
                      placeholder="Buscar usuário"
                      value={userQuery}
                      onChange={(e) => {
                        const next = e.target.value;
                        setUserQuery(next);
                        setSelectedUserId(null);
                        void searchProfiles(next, setUsers);
                      }}
                    />
                    {searchingUsers ? <p className="text-sm text-muted-foreground">Buscando...</p> : null}
                    <div className="max-h-48 space-y-2 overflow-auto">
                      {users.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className={`w-full rounded-xl border p-3 text-left ${selectedUserId === u.id ? "bg-muted" : ""}`}
                          onClick={() => setSelectedUserId(u.id)}
                        >
                          <p className="text-sm font-medium">{u.display_name ?? u.username ?? "Usuário"}</p>
                          <p className="text-xs text-muted-foreground">@{u.username ?? "sem-username"}</p>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <Button className="w-full rounded-2xl" disabled={!canCreate || creating || inviting} onClick={() => void (createType === "group" ? createGroup() : createDm())}>
                  {creating ? "Criando..." : "Criar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="p-3">
          <ToggleGroup type="single" value={section} onValueChange={(v) => setSection((v as "public" | "mine") || "public")}>
            <ToggleGroupItem value="public" className="rounded-xl border text-sm">Públicos</ToggleGroupItem>
            <ToggleGroupItem value="mine" className="rounded-xl border text-sm">Meus chats</ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : section === "public" ? (
        <PublicChatsList
          chats={publicChats}
          onOpen={(chatId) => router.push(`/app/chats/${chatId}`)}
          onJoined={async (chatId) => {
            await loadChats();
            router.push(`/app/chats/${chatId}`);
          }}
        />
      ) : (
        <MyChatsList chats={myChats} onOpen={(chatId) => router.push(`/app/chats/${chatId}`)} />
      )}

      <p className="text-xs text-muted-foreground">Você já participa de {myChatIds.length} chats.</p>
    </div>
  );
}
