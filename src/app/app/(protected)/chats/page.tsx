"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Button } from "@/components/ui/button";
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
import {
  Globe,
  MessageCircle,
  Plus,
  RefreshCw,
  Users,
  UsersRound,
} from "lucide-react";
import MyChatsList, { type MyChatItem } from "@/components/chats/MyChatsList";
import { cn } from "@/lib/utils";

// Schema real de `chats`:
// id, type (group|dm|public), title, dm_key, dm_user_a, dm_user_b,
// last_message_at, last_message_text, created_at, is_public, created_by,
// wallpaper_id (uuid FK), wallpaper_slug (text), wallpaper_mode, theme, text_contrast

// Schema real de `chat_participants`:
// chat_id, user_id, default_persona_id, role, joined_at, last_read_at
// last_read_at permite calcular mensagens não-lidas

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
  unread_count?: number;
  other_display_name?: string | null;
  other_username?: string | null;
};

type CreateType = "public" | "group" | "dm";
type Section = "public" | "group" | "dm";

function normalizeCreateType(v: string | null): CreateType | null {
  if (v === "public" || v === "group" || v === "dm") return v;
  return null;
}

function normalizeSection(v: string): Section {
  if (v === "public" || v === "group" || v === "dm") return v;
  return "public";
}

function CreateFromQuery({
  onOpen,
  onSetType,
}: {
  onOpen: () => void;
  onSetType: (t: CreateType) => void;
}) {
  const sp = useSearchParams();
  useEffect(() => {
    const create = normalizeCreateType(sp.get("create"));
    if (create) {
      onSetType(create);
      onOpen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);
  return null;
}

export default function ChatsPage() {
  const router = useRouter();
  const { activePersona } = useActivePersona();

  const [loading, setLoading] = useState(true);
  const [myChats, setMyChats] = useState<MyChatItem[]>([]);
  const [section, setSection] = useState<Section>("public");
  const [open, setOpen] = useState(false);
  const [createType, setCreateType] = useState<CreateType>("public");
  const [title, setTitle] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteResults, setInviteResults] = useState<ProfileRow[]>([]);
  const [selectedInviteIds, setSelectedInviteIds] = useState<Set<string>>(
    new Set(),
  );
  const [inviting, setInviting] = useState(false);
  const [creating, setCreating] = useState(false);

  async function loadChats() {
    setLoading(true);
    const myRes = await supabase.rpc("list_my_chats");
    if (myRes.error) {
      toast.error(myRes.error.message);
      setMyChats([]);
      setLoading(false);
      return;
    }

    const mineRows = (myRes.data ?? []) as RpcRow[];
    setMyChats(
      mineRows.map((row) => ({
        id: row.id,
        type: row.type,
        title:
          row.type === "dm"
            ? (row.other_display_name ?? row.other_username ?? "DM")
            : row.title,
        last_message_at: row.last_message_at,
        last_message_text: row.last_message_text,
        unread: row.unread,
        // unread_count: idealmente calculado pelo RPC usando last_read_at de chat_participants
        // Se o RPC já retornar unread_count, ótimo. Senão, fazemos fallback para 1.
        unread_count: row.unread_count ?? (row.unread ? 1 : 0),
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    void loadChats();
  }, []);

  function resetCreateForm(nextType?: CreateType) {
    setTitle("");
    setUserQuery("");
    setUsers([]);
    setSelectedUserId(null);
    setInviteQuery("");
    setInviteResults([]);
    setSelectedInviteIds(new Set());
    if (nextType) setCreateType(nextType);
  }

  async function searchProfiles(
    query: string,
    setter: (rows: ProfileRow[]) => void,
  ) {
    const { data: userData, error } = await supabase.auth.getUser();
    if (error) {
      toast.error(error.message);
      return;
    }
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
    try {
      const { data, error } = await supabase.rpc("create_group_chat", {
        p_title: t,
        p_default_persona_id: activePersona?.id ?? null,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      const chatId = data as string | null;
      if (!chatId) {
        toast.error("Não foi possível criar o grupo.");
        return;
      }
      if (selectedInviteIds.size > 0) {
        setInviting(true);
        const rows = Array.from(selectedInviteIds).map((uid) => ({
          chat_id: chatId,
          user_id: uid,
        }));
        const inv = await supabase
          .from("chat_participants")
          .upsert(rows, { onConflict: "chat_id,user_id" });
        if (inv.error) toast.error(`Falha ao convidar: ${inv.error.message}`);
        setInviting(false);
      }
      toast.success("Grupo criado.");
      setOpen(false);
      resetCreateForm("group");
      await loadChats();
      router.push(`/app/chats/${chatId}`);
    } finally {
      setCreating(false);
    }
  }

  async function createPublic() {
    const t = title.trim();
    if (!t) return toast.error("Dê um título para o chat público.");
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc("create_public_chat", {
        p_title: t,
        p_default_persona_id: activePersona?.id ?? null,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      const chatId = data as string | null;
      if (!chatId) {
        toast.error("Chat público não foi criado.");
        return;
      }
      toast.success("Chat público criado.");
      setOpen(false);
      resetCreateForm("public");
      await loadChats();
      router.push(`/app/chats/${chatId}`);
    } finally {
      setCreating(false);
    }
  }

  async function createDm() {
    if (!selectedUserId) return toast.error("Selecione um usuário.");
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc("create_dm_chat", {
        p_other_user_id: selectedUserId,
        p_default_persona_id: activePersona?.id ?? null,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      const chatId = data as string | null;
      if (!chatId) {
        toast.error("Não foi possível criar DM.");
        return;
      }
      toast.success("DM pronto.");
      setOpen(false);
      resetCreateForm("dm");
      await loadChats();
      router.push(`/app/chats/${chatId}`);
    } finally {
      setCreating(false);
    }
  }

  const canCreate = useMemo(() => {
    if (createType === "dm") return !!selectedUserId;
    return !!title.trim();
  }, [createType, selectedUserId, title]);

  const filteredChats = useMemo(() => {
    if (section === "dm") return myChats.filter((c) => c.type === "dm");
    if (section === "group") return myChats.filter((c) => c.type === "group");
    return myChats.filter((c) => c.type === "public");
  }, [myChats, section]);

  const unreadCounts = useMemo(() => {
    const count = (type: Section) =>
      myChats
        .filter((c) => c.type === type)
        .reduce((acc, c) => acc + (c.unread_count ?? 0), 0);
    return { public: count("public"), group: count("group"), dm: count("dm") };
  }, [myChats]);

  function handleCreateClick() {
    if (createType === "public") return void createPublic();
    if (createType === "group") return void createGroup();
    return void createDm();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4 md:px-6">
      <Suspense fallback={null}>
        <CreateFromQuery
          onOpen={() => setOpen(true)}
          onSetType={(t) => {
            resetCreateForm(t);
            setCreateType(t);
          }}
        />
      </Suspense>

      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10">
            <MessageCircle className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Chats</h1>
            <p className="text-xs text-muted-foreground">
              {myChats.length} chat{myChats.length !== 1 ? "s" : ""}
              {myChats.some((c) => c.unread) && (
                <span className="ml-1 font-semibold text-primary">
                  · {myChats.filter((c) => c.unread).length} com novidades
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-2xl"
            onClick={() => void loadChats()}
            disabled={loading}
            title="Atualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) resetCreateForm(createType);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-2xl">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Novo chat
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
                  onValueChange={(v) => {
                    const next = (v as CreateType) || "public";
                    resetCreateForm(next);
                    setCreateType(next);
                  }}
                >
                  <SegmentedItem value="public">
                    <span className="inline-flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" /> Público
                    </span>
                  </SegmentedItem>
                  <SegmentedItem value="group">
                    <span className="inline-flex items-center gap-1.5">
                      <UsersRound className="h-3.5 w-3.5" /> Grupo
                    </span>
                  </SegmentedItem>
                  <SegmentedItem value="dm">
                    <span className="inline-flex items-center gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5" /> DM
                    </span>
                  </SegmentedItem>
                </Segmented>

                {createType === "public" ? (
                  <Input
                    placeholder="Título do chat público"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="rounded-xl"
                  />
                ) : createType === "group" ? (
                  <>
                    <Input
                      placeholder="Nome do grupo"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="rounded-xl"
                    />
                    <Input
                      placeholder="Convidar por @username / nome"
                      value={inviteQuery}
                      onChange={(e) => {
                        const next = e.target.value;
                        setInviteQuery(next);
                        void searchProfiles(next, setInviteResults);
                      }}
                      className="rounded-xl"
                    />
                    {selectedInviteIds.size > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {selectedInviteIds.size} pessoa(s) selecionada(s)
                      </p>
                    )}
                    <div className="max-h-40 space-y-1.5 overflow-auto">
                      {inviteResults.map((u) => {
                        const isSelected = selectedInviteIds.has(u.id);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl border p-2 text-left text-sm transition",
                              isSelected
                                ? "border-primary bg-primary/10"
                                : "hover:bg-muted/60",
                            )}
                            onClick={() =>
                              setSelectedInviteIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(u.id)) next.delete(u.id);
                                else next.add(u.id);
                                return next;
                              })
                            }
                          >
                            <span>
                              {u.display_name ?? u.username ?? "Usuário"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {isSelected ? "✓" : "+"}
                            </span>
                          </button>
                        );
                      })}
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
                      className="rounded-xl"
                    />
                    {searchingUsers && (
                      <p className="text-xs text-muted-foreground">
                        Buscando...
                      </p>
                    )}
                    <div className="max-h-48 space-y-1.5 overflow-auto">
                      {users.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className={cn(
                            "w-full rounded-xl border p-3 text-left transition",
                            selectedUserId === u.id
                              ? "border-primary bg-primary/10"
                              : "hover:bg-muted/60",
                          )}
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
                  onClick={handleCreateClick}
                >
                  {creating ? "Criando..." : "Criar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Tabs com badges de não-lidas */}
      <div className="rounded-2xl border p-1">
        <div className="grid grid-cols-3 gap-1">
          {[
            { key: "public" as Section, label: "Públicos", icon: Globe },
            { key: "group" as Section, label: "Grupos", icon: Users },
            { key: "dm" as Section, label: "DMs", icon: MessageCircle },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm transition",
                section === key
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {unreadCounts[key] > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                    section === key
                      ? "bg-white/20"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {unreadCounts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Explorar públicos */}
      {section === "public" && (
        <Button
          className="w-full rounded-2xl"
          variant="secondary"
          onClick={() => router.push("/app/chats/public")}
        >
          <Globe className="mr-2 h-4 w-4" /> Explorar chats públicos
        </Button>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl border bg-muted/40"
            />
          ))}
        </div>
      ) : (
        <MyChatsList
          chats={filteredChats}
          onOpen={(chatId) => router.push(`/app/chats/${chatId}`)}
        />
      )}
    </div>
  );
}
