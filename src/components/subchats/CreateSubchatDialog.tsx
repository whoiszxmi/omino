"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import WallpaperPicker from "@/components/editor/WallpaperPicker";

type Props = {
  open: boolean;
  onClose: () => void;
  parentId: string;
  parentTitle: string | null;
  createdBy: string; // user_id do criador do pai
};

export default function CreateSubchatDialog({
  open,
  onClose,
  parentId,
  parentTitle,
  createdBy,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [wallpaperSlug, setWallpaperSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("Dê um nome à localização.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("chats")
      .insert({
        type: "public",
        title: title.trim(),
        is_public: true,
        parent_id: parentId,
        created_by: createdBy,
        wallpaper_slug: wallpaperSlug,
      })
      .select("id")
      .single();

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Localização criada!");
    onClose();
    setTitle("");
    setWallpaperSlug(null);
    router.push(`/app/chats/${data.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Nova localização</DialogTitle>
          {parentTitle && (
            <p className="text-sm text-muted-foreground">
              Em:{" "}
              <span className="font-medium text-foreground">{parentTitle}</span>
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Nome da localização
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Taverna do Lobo, Porto Velho..."
              className="rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Cenário / Wallpaper
            </label>
            <WallpaperPicker
              value={wallpaperSlug}
              onChange={setWallpaperSlug}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" className="rounded-xl" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="rounded-xl"
            onClick={() => void handleCreate()}
            disabled={saving || !title.trim()}
          >
            {saving ? "Criando..." : "Criar localização"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
