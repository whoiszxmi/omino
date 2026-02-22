import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type SubchatRow = {
  id: string;
  title: string | null;
  type: string;
  wallpaper_slug: string | null;
  parent_id: string | null;
  created_by: string | null;
  last_message_at: string | null;
  last_message_text: string | null;
  is_public: boolean;
};

/** Busca todos os subchats (filhos) de um chat pai. */
export function useSubchats(parentId: string | null) {
  const [subchats, setSubchats] = useState<SubchatRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!parentId) {
      setSubchats([]);
      return;
    }
    setLoading(true);
    supabase
      .from("chats")
      .select(
        "id,title,type,wallpaper_slug,parent_id,created_by,last_message_at,last_message_text,is_public",
      )
      .eq("parent_id", parentId)
      .order("title", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setSubchats(data as SubchatRow[]);
        setLoading(false);
      });
  }, [parentId]);

  return { subchats, loading };
}

/** Busca o chat pai de um subchat. */
export function useParentChat(parentId: string | null) {
  const [parent, setParent] = useState<SubchatRow | null>(null);

  useEffect(() => {
    if (!parentId) {
      setParent(null);
      return;
    }
    supabase
      .from("chats")
      .select(
        "id,title,type,wallpaper_slug,parent_id,created_by,last_message_at,last_message_text,is_public",
      )
      .eq("id", parentId)
      .maybeSingle()
      .then(({ data }) => setParent((data as SubchatRow) ?? null));
  }, [parentId]);

  return parent;
}
