"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { toast } from "sonner";
import { Globe, Plus, RefreshCw } from "lucide-react";
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
  const searchParams = useSearchParams();
  const { activePersona } = useActivePersona();

  const [loading, setLoading] = useState(true);
  const [myChats, setMyChats] = useState<MyChatItem[]>([]);
  const [section, setSection] = useState<"public" | "group" | "dm">("public");

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
    const myRes = await supabase.rpc("list_my_chats");

    if (myRes.error) toast.error(myRes.error.message);

    const mineRows = (myRes.data ?? []) as RpcRow[];

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

  useEffect(() => {
    const create = searchParams.get("create");
    if (create === "group" || create === "dm") {
      setCreateType(create);
      setOpen(true);
    }
  }, [searchParams]);

  async function searchProfiles(
    query: string,
    setter: (rows: ProfileRow[]) => void,
  ) {
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
      const inviteRes = await supabase
        .from("chat_participants")
        .upsert(rows, { onConflict: "chat_id,user_id" });
      if (inviteRes.error)
        toast.error(`Falha ao convidar: ${inviteRes.error.message}`);
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

  const filteredChats = useMemo(() => {
    if (section === "dm") {
      return myChats.filter((chat) => chat.type === "dm");
    }

    if (section === "group") {
      return myChats.filter((chat) => chat.type === "group");
    }

    return myChats.filter((chat) => chat.type === "public");
  }, [myChats, section]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Chats</h1>
          <p className="text-sm text-muted-foreground">
            Públicos, grupos por convite e DMs 1:1.
          </p>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant="secondary"
            className="w-full rounded-2xl sm:w-auto"
            onClick={() => void loadChats()}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full rounded-2xl sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Novo chat
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Criar chat</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Segmented
                  type="single"
                  value={createType}
                  onValueChange={(v) =>
                    setCreateType((v as "group" | "dm") || "group")
                  }
                >
                  <SegmentedItem value="group">Grupo</SegmentedItem>
                  <SegmentedItem value="dm">DM</SegmentedItem>
                </Segmented>

                {createType === "group" ? (
                  <>
                    <Input
                      placeholder="Nome do grupo"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
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
                          <CardContent className="p-2 text-sm">
                            {u.display_name ?? u.username ?? "Usuário"}
                          </CardContent>
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
                    {searchingUsers ? (
                      <p className="text-sm text-muted-foreground">Buscando...</p>
                    ) : null}
                    <div className="max-h-48 space-y-2 overflow-auto">
                      {users.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className={`w-full rounded-xl border p-3 text-left ${selectedUserId === u.id ? "bg-muted" : ""}`}
                          onClick={() => setSelectedUserId(u.id)}
                        >
                          <p className="text-sm font-medium">
                            {u.display_name ?? u.username ?? "Usuário"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{u.username ?? "sem-username"}
                          </p>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <Button
                  className="w-full rounded-2xl"
                  disabled={!canCreate || creating || inviting}
                  onClick={() =>
                    void (createType === "group" ? createGroup() : createDm())
                  }
                >
                  {creating ? "Criando..." : "Criar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="space-y-3 p-3">
          <Segmented
            type="single"
            value={section}
            onValueChange={(v) =>
              setSection((v as "public" | "group" | "dm") || "public")
            }
          >
            <SegmentedItem value="public">Públicos</SegmentedItem>
            <SegmentedItem value="group">Grupos</SegmentedItem>
            <SegmentedItem value="dm">DMs</SegmentedItem>
          </Segmented>

          {section === "public" ? (
            <Button
              className="w-full rounded-2xl"
              variant="secondary"
              onClick={() => router.push("/app/chats/public")}
            >
              <Globe className="mr-2 h-4 w-4" /> Explorar chats públicos
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <MyChatsList
          chats={filteredChats}
          onOpen={(chatId) => router.push(`/app/chats/${chatId}`)}
        />
      )}

      <p className="text-xs text-muted-foreground">
        Você já participa de {myChats.length} chats.
      </p>
    </div>
  );
}
