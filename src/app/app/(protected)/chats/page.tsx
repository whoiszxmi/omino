"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, MessageCircle, PlusCircle, Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

type PublicChatRow = {
  id: string;
  title: string | null;
  last_message_at: string | null;
  last_message_text: string | null;
};

type ChatParticipantRow = {
  chat_id: string;
};

function parseCreatorAllowlist(raw: string | undefined) {
  if (!raw) return [];
  return raw.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}

export default function ChatsPage() {
  const router = useRouter();
  const { activePersona } = useActivePersona();

  const [loading, setLoading] = useState(true);
  const [publicChats, setPublicChats] = useState<PublicChatItem[]>([]);
  const [myChats, setMyChats] = useState<MyChatItem[]>([]);
  const [section, setSection] = useState<"public" | "mine">("public");

  const [open, setOpen] = useState(false);
  const [createType, setCreateType] = useState<"group" | "dm" | "public">("group");
  const [title, setTitle] = useState("");
  const [canCreatePublicChats, setCanCreatePublicChats] = useState(false);

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

    const allowlist = parseCreatorAllowlist(process.env.NEXT_PUBLIC_PUBLIC_CHAT_CREATORS);
    setCanCreatePublicChats(allowlist.includes((user.email ?? "").toLowerCase()));

    const [publicRes, myRes] = await Promise.all([
      supabase
        .from("chats")
        .select("id,title,last_message_at,last_message_text")
        .eq("type", "public")
        .order("last_message_at", { ascending: false, nullsFirst: false }),
      supabase.rpc("list_my_chats"),
    ]);

    if (publicRes.error) toast.error(publicRes.error.message);
    if (myRes.error) toast.error(myRes.error.message);

    const mineRows = (myRes.data ?? []) as RpcRow[];
    const myIds = mineRows.map((row) => row.id);

    const publicRows = (publicRes.data ?? []) as PublicChatRow[];
    const publicIds = publicRows.map((row) => row.id);

    const membersMap = new Map<string, number>();
    if (publicIds.length > 0) {
      const membersRes = await supabase.from("chat_participants").select("chat_id").in("chat_id", publicIds);
      const memberRows = (membersRes.data ?? []) as ChatParticipantRow[];
      for (const row of memberRows) {
        membersMap.set(row.chat_id, (membersMap.get(row.chat_id) ?? 0) + 1);
      }
    }

    setPublicChats(
      publicRows.map((chat) => ({
        ...chat,
        participant: myIds.includes(chat.id),
        membersCount: membersMap.get(chat.id) ?? 0,
      })),
    );

    setMyChats(
      mineRows.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.type === "dm" ? row.other_display_name ?? row.other_username ?? "DM" : row.title,
        last_message_at: row.last_message_at,
        last_message_text: row.last_message_text,
        unread: row.unread,
      })),
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
    if (!title.trim()) return toast.error("Dê um nome para o grupo.");
    setCreating(true);

    const { data, error } = await supabase.rpc("create_group_chat", {
      p_title: title.trim(),
      p_default_persona_id: activePersona?.id ?? null,
    });

    if (error) {
      setCreating(false);
      return toast.error(error.message);
    }

    const chatId = data as string | null;
    if (!chatId) {
      setCreating(false);
      return toast.error("Não foi possível criar o grupo.");
    }

    if (inviteResults.length > 0) {
      setInviting(true);
      await supabase.from("chat_participants").upsert(
        inviteResults.map((item) => ({ chat_id: chatId, user_id: item.id })),
        { onConflict: "chat_id,user_id" },
      );
      setInviting(false);
    }

    toast.success("Grupo criado.");
    setCreating(false);
    setOpen(false);
    setTitle("");
    setInviteQuery("");
    setInviteResults([]);
    await loadChats();
    router.push(`/app/chats/${chatId}`);
  }

  async function createPublicChat() {
    if (!canCreatePublicChats) return toast.error("Você não tem permissão para criar chat público.");
    if (!title.trim()) return toast.error("Dê um nome para o chat público.");

    setCreating(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setCreating(false);
      return toast.error("Sessão expirada.");
    }

    const payload: Record<string, string> = {
      type: "public",
      title: title.trim(),
      created_by: user.id,
    };

    let insert = await supabase.from("chats").insert(payload).select("id").single();
    if (insert.error) {
      const fallbackPayload: Record<string, string> = {
        type: "public",
        title: title.trim(),
      };
      insert = await supabase.from("chats").insert(fallbackPayload).select("id").single();
    }

    if (insert.error || !insert.data) {
      setCreating(false);
      return toast.error(insert.error?.message ?? "Falha ao criar chat público.");
    }

    const chatId = (insert.data as { id: string }).id;
    await supabase.from("chat_participants").upsert(
      {
        chat_id: chatId,
        user_id: user.id,
        role: "owner",
      },
      { onConflict: "chat_id,user_id" },
    );

    setCreating(false);
    setOpen(false);
    setTitle("");
    toast.success("Chat público criado.");
    await loadChats();
    router.push(`/app/chats/${chatId}`);
  }

  async function createDm() {
    if (!selectedUserId) return toast.error("Selecione um usuário.");

    setCreating(true);
    const { data, error } = await supabase.rpc("create_dm_chat", {
      p_other_user_id: selectedUserId,
      p_default_persona_id: activePersona?.id ?? null,
    });

    if (error) {
      setCreating(false);
      return toast.error(error.message);
    }

    const chatId = data as string | null;
    if (!chatId) {
      setCreating(false);
      return toast.error("Não foi possível criar DM.");
    }

    setCreating(false);
    setOpen(false);
    setSelectedUserId(null);
    setUserQuery("");
    setUsers([]);
    toast.success("DM pronta.");
    await loadChats();
    router.push(`/app/chats/${chatId}`);
  }

  const canCreate = useMemo(() => {
    if (createType === "dm") return !!selectedUserId;
    return !!title.trim();
  }, [createType, selectedUserId, title]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-5 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Chats</h1>
          <p className="text-sm text-muted-foreground">Públicos, grupos por convite e DMs 1:1.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="rounded-2xl" onClick={() => void loadChats()}>Atualizar</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl"><PlusCircle className="mr-2 h-4 w-4" /> Novo chat</Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>Criar chat</DialogTitle></DialogHeader>

              <div className="space-y-3">
                <ToggleGroup type="single" value={createType} onValueChange={(v) => setCreateType((v as "group" | "dm" | "public") || "group")}>
                  {canCreatePublicChats ? <ToggleGroupItem value="public" className="rounded-xl border"><Globe className="mr-1 h-4 w-4" /> Público</ToggleGroupItem> : null}
                  <ToggleGroupItem value="group" className="rounded-xl border"><Users className="mr-1 h-4 w-4" /> Grupo</ToggleGroupItem>
                  <ToggleGroupItem value="dm" className="rounded-xl border"><MessageCircle className="mr-1 h-4 w-4" /> DM</ToggleGroupItem>
                </ToggleGroup>

                {createType === "dm" ? (
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
                      {users.map((user) => (
                        <button key={user.id} type="button" className={`w-full rounded-xl border p-3 text-left ${selectedUserId === user.id ? "bg-muted" : ""}`} onClick={() => setSelectedUserId(user.id)}>
                          <p className="text-sm font-medium">{user.display_name ?? user.username ?? "Usuário"}</p>
                          <p className="text-xs text-muted-foreground">@{user.username ?? "sem-username"}</p>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <Input placeholder={createType === "public" ? "Nome do chat público" : "Nome do grupo"} value={title} onChange={(e) => setTitle(e.target.value)} />
                    {createType === "group" ? (
                      <>
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
                          {inviteResults.map((user) => (
                            <Card key={user.id} className="rounded-xl border"><CardContent className="p-2 text-sm">{user.display_name ?? user.username ?? "Usuário"}</CardContent></Card>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </>
                )}

                <Button
                  className="w-full rounded-2xl"
                  disabled={!canCreate || creating || inviting}
                  onClick={() => {
                    if (createType === "dm") return void createDm();
                    if (createType === "public") return void createPublicChat();
                    return void createGroup();
                  }}
                >
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
            <ToggleGroupItem value="public" className="rounded-xl border text-sm"><Globe className="mr-1 h-4 w-4" /> Públicos</ToggleGroupItem>
            <ToggleGroupItem value="mine" className="rounded-xl border text-sm"><Users className="mr-1 h-4 w-4" /> Meus chats</ToggleGroupItem>
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
    </div>
  );
}
