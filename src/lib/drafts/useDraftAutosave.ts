"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { DraftEditorState, DraftRow, DraftScope } from "@/lib/drafts/types";

type Params = {
  scope: DraftScope;
  draftKey: string;
  personaId?: string | null;
  initialValue: DraftEditorState;
  value: DraftEditorState;
  enabled?: boolean;
  debounceMs?: number;
  onRestore?: (draft: DraftEditorState) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

type SaveStatus = "idle" | "saving" | "saved" | "unsaved" | "error";

function normalize(state: DraftEditorState): DraftEditorState {
  return {
    title: state.title?.trim() || null,
    contentHtml: state.contentHtml || "",
    coverUrl: state.coverUrl || null,
  };
}

function sameState(a: DraftEditorState, b: DraftEditorState) {
  const na = normalize(a);
  const nb = normalize(b);
  return na.title === nb.title && na.contentHtml === nb.contentHtml && na.coverUrl === nb.coverUrl;
}

export function useDraftAutosave({
  scope,
  draftKey,
  personaId = null,
  initialValue,
  value,
  enabled = true,
  debounceMs = 1100,
  onRestore,
  onDirtyChange,
}: Params) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [restoreCandidate, setRestoreCandidate] = useState<DraftEditorState | null>(null);

  const userIdRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const loadedRef = useRef(false);

  const storageKey = useMemo(
    () => `draft:${scope}:${draftKey}:${userIdRef.current ?? "anon"}:${personaId ?? "none"}`,
    [scope, draftKey, personaId],
  );

  const upsertRemote = useCallback(
    async (state: DraftEditorState) => {
      const userId = userIdRef.current;
      if (!userId) return;

      const payload = {
        user_id: userId,
        persona_id: personaId,
        scope,
        draft_key: draftKey,
        title: state.title,
        content_html: state.contentHtml,
        cover_url: state.coverUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("drafts").upsert(payload, {
        onConflict: "user_id,scope,draft_key",
      });

      if (error) throw error;
    },
    [draftKey, personaId, scope],
  );

  const saveToLocal = useCallback(
    (state: DraftEditorState) => {
      if (typeof window === "undefined") return;
      localStorage.setItem(storageKey, JSON.stringify({ ...state, updated_at: new Date().toISOString() }));
    },
    [storageKey],
  );

  const removeLocal = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const flush = useCallback(async () => {
    if (!enabled || !loadedRef.current) return;

    const current = normalize(value);
    const isDirty = !sameState(current, initialValue);
    if (!isDirty) return;

    setStatus("saving");
    try {
      await upsertRemote(current);
      saveToLocal(current);
      setStatus("saved");
      setLastSavedAt(new Date().toISOString());
      setDirty(true);
      onDirtyChange?.(true);
    } catch {
      saveToLocal(current);
      setStatus("error");
    }
  }, [enabled, initialValue, onDirtyChange, saveToLocal, upsertRemote, value]);

  const discard = useCallback(async () => {
    const userId = userIdRef.current;
    removeLocal();
    setRestoreCandidate(null);

    if (!userId) return;

    await supabase
      .from("drafts")
      .delete()
      .eq("user_id", userId)
      .eq("scope", scope)
      .eq("draft_key", draftKey);

    setDirty(false);
    setStatus("idle");
    onDirtyChange?.(false);
  }, [draftKey, onDirtyChange, removeLocal, scope]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      userIdRef.current = user?.id ?? null;
      loadedRef.current = true;

      if (!enabled || !user) return;

      const { data, error } = await supabase
        .from("drafts")
        .select("id,user_id,persona_id,scope,draft_key,title,content_html,cover_url,updated_at,created_at")
        .eq("user_id", user.id)
        .eq("scope", scope)
        .eq("draft_key", draftKey)
        .maybeSingle();

      let candidate: DraftEditorState | null = null;

      if (!error && data) {
        const row = data as DraftRow;
        candidate = {
          title: row.title,
          contentHtml: row.content_html ?? "",
          coverUrl: row.cover_url,
        };
      }

      if (!candidate && typeof window !== "undefined") {
        const localRaw = localStorage.getItem(storageKey);
        if (localRaw) {
          try {
            const local = JSON.parse(localRaw) as DraftEditorState;
            candidate = {
              title: local.title ?? null,
              contentHtml: local.contentHtml ?? "",
              coverUrl: local.coverUrl ?? null,
            };
          } catch {
            // noop
          }
        }
      }

      if (!mounted || !candidate) return;

      if (!sameState(candidate, initialValue)) {
        setRestoreCandidate(candidate);
        setDirty(true);
        onDirtyChange?.(true);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [draftKey, enabled, initialValue, onDirtyChange, scope, storageKey]);

  useEffect(() => {
    if (!enabled || !loadedRef.current) return;

    const isDirty = !sameState(value, initialValue);
    setDirty(isDirty);
    setStatus(isDirty ? "unsaved" : "idle");
    onDirtyChange?.(isDirty);

    if (!isDirty) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void flush();
    }, debounceMs);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [debounceMs, enabled, flush, initialValue, onDirtyChange, value]);

  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      void flush();
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [enabled, flush]);

  const restore = useCallback(() => {
    if (!restoreCandidate) return;
    onRestore?.(restoreCandidate);
    setRestoreCandidate(null);
    setStatus("saved");
  }, [onRestore, restoreCandidate]);

  return {
    status,
    dirty,
    lastSavedAt,
    restoreCandidate,
    restore,
    discard,
    flush,
  };
}
