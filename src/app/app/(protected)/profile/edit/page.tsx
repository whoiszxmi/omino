"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { uploadPublicImage } from "@/lib/storage/uploadPublicImage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
};

function slugifyUsername(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}

export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, bio, avatar_url, banner_url")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const p = data as Profile | null;
    setProfile(p);
    setUsername(p?.username ?? "");
    setDisplayName(p?.display_name ?? "");
    setBio(p?.bio ?? "");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!profile) return;
    const u = slugifyUsername(username);
    if (u && u.length < 3) {
      toast.error(
        "Username deve ter pelo menos 3 caracteres (ou deixe vazio).",
      );
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: u || null,
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      })
      .eq("id", profile.id);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Perfil atualizado!");
    router.push("/app/profile");
  }

  async function pickAvatar(file: File) {
    if (!profile) return;
    const url = await uploadPublicImage({ file, type: "avatar" });
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", profile.id);
    if (error) throw error;
    setProfile((p) => (p ? { ...p, avatar_url: url } : p));
  }

  async function pickBanner(file: File) {
    if (!profile) return;
    const url = await uploadPublicImage({ file, type: "banner" });
    const { error } = await supabase
      .from("profiles")
      .update({ banner_url: url })
      .eq("id", profile.id);
    if (error) throw error;
    setProfile((p) => (p ? { ...p, banner_url: url } : p));
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Editar perfil</h1>
        <Button
          variant="secondary"
          className="rounded-2xl"
          onClick={() => router.push("/app/profile")}
        >
          Voltar
        </Button>
      </header>

      {loading || !profile ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Imagens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-hidden rounded-2xl border">
                <div className="relative h-28 bg-muted">
                  {profile.banner_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.banner_url}
                      alt="banner"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex items-center gap-3 p-4">
                  <div className="-mt-10 h-16 w-16 overflow-hidden rounded-2xl border bg-background">
                    {profile.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatar_url}
                        alt="avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Avatar e capa são do usuário (conta).
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      try {
                        await pickAvatar(f);
                        toast.success("Avatar atualizado!");
                      } catch (err: unknown) {
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : "Falha no upload",
                        );
                      }
                    }}
                  />
                  <Button
                    type="button"
                    className="w-full rounded-2xl"
                    variant="secondary"
                  >
                    Trocar avatar
                  </Button>
                </label>
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      try {
                        await pickBanner(f);
                        toast.success("Capa atualizada!");
                      } catch (err: unknown) {
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : "Falha no upload",
                        );
                      }
                    }}
                  />
                  <Button
                    type="button"
                    className="w-full rounded-2xl"
                    variant="secondary"
                  >
                    Trocar capa
                  </Button>
                </label>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Username</div>
                <Input
                  placeholder="ex: diogo_alves"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <div className="text-[11px] text-muted-foreground">
                  Só letras/números/_ • até 24 chars • pode deixar vazio
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  Nome exibido
                </div>
                <Input
                  placeholder="Seu nome público"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Bio</div>
                <Textarea
                  placeholder="Uma descrição curta..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
              <Button
                className="w-full rounded-2xl"
                onClick={save}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
