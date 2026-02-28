"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Button } from "@/components/ui/button";
import DOMPurify from "isomorphic-dompurify";
import RichTextEditor from "@/components/editor/RichTextEditor";
import { Pencil, Trash2, X, Check } from "lucide-react";

type CommentRow = {
  id: string;
  content_html: string;
  created_at: string;
  persona_id: string;
  personas: { name: string; avatar_url: string | null } | null;
};

type Comment = {
  id: string;
  content_html: string;
  created_at: string;
  persona: { id: string; name: string; avatar_url: string | null };
};

export default function PostComments({ postId }: { postId: string }) {
  const { activePersona } = useActivePersona();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [html, setHtml] = useState("");
  const [sending, setSending] = useState(false);

  // Edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHtml, setEditHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function mapRow(row: CommentRow): Comment {
    return {
      id: row.id,
      content_html: row.content_html,
      created_at: row.created_at,
      persona: {
        id: row.persona_id,
        name: row.personas?.name ?? "Desconhecido",
        avatar_url: row.personas?.avatar_url ?? null,
      },
    };
  }

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("post_comments")
      .select(
        `id, content_html, created_at, persona_id, personas ( name, avatar_url )`,
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) console.error("ERRO load comments:", error);
    setComments((data ?? []).map((r: any) => mapRow(r as CommentRow)));
    setLoading(false);
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function send() {
    const content = html.trim();
    if (!content || content === "<p></p>") return;
    if (!activePersona || sending) return;

    setSending(true);

    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const optimistic: Comment = {
      id: optimisticId,
      content_html: content,
      created_at: new Date().toISOString(),
      persona: {
        id: activePersona.id,
        name: activePersona.name,
        avatar_url: (activePersona as any).avatar_url ?? null,
      },
    };

    setComments((prev) => [...prev, optimistic]);
    setHtml("");

    const { data, error } = await supabase
      .from("post_comments")
      .insert({
        post_id: postId,
        persona_id: activePersona.id,
        content_html: content,
      })
      .select(
        `id, content_html, created_at, persona_id, personas ( name, avatar_url )`,
      )
      .single();

    setSending(false);

    if (error) {
      console.error("ERRO comment:", error);
      setComments((prev) => prev.filter((c) => c.id !== optimisticId));
      setHtml(content);
      return;
    }

    setComments((prev) =>
      prev.map((c) => (c.id === optimisticId ? mapRow(data as any) : c)),
    );
  }

  function startEdit(c: Comment) {
    setEditingId(c.id);
    setEditHtml(c.content_html);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditHtml("");
  }

  async function saveEdit(commentId: string) {
    const content = editHtml.trim();
    if (!content || content === "<p></p>") return;

    setSaving(true);
    const { error } = await supabase
      .from("post_comments")
      .update({ content_html: content })
      .eq("id", commentId);
    setSaving(false);

    if (error) {
      console.error("ERRO edit comment:", error);
      return;
    }

    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, content_html: content } : c,
      ),
    );
    cancelEdit();
  }

  async function deleteComment(commentId: string) {
    setDeletingId(commentId);
    const { error } = await supabase
      .from("post_comments")
      .delete()
      .eq("id", commentId);
    setDeletingId(null);

    if (error) {
      console.error("ERRO delete comment:", error);
      return;
    }

    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  return (
    <div className="mt-3">
      <Button
        type="button"
        variant="secondary"
        className="rounded-2xl"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Fechar comentários" : `Comentários (${comments.length})`}
      </Button>

      {open && (
        <div className="mt-3 space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : comments.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Seja o primeiro a comentar.
            </div>
          ) : (
            comments.map((c) => {
              const isMine = activePersona?.id === c.persona.id;
              const isEditing = editingId === c.id;

              return (
                <div key={c.id} className="rounded-2xl border p-3 space-y-2">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-muted-foreground">
                      {c.persona.name} •{" "}
                      {new Date(c.created_at).toLocaleString("pt-BR")}
                    </div>

                    {isMine && !isEditing && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteComment(c.id)}
                          disabled={deletingId === c.id}
                          className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Conteúdo ou editor */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <RichTextEditor
                        valueHtml={editHtml}
                        onChangeHtml={setEditHtml}
                        placeholder="Editar comentário..."
                        compact
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="rounded-xl gap-1"
                          onClick={() => saveEdit(c.id)}
                          disabled={
                            saving ||
                            !editHtml.trim() ||
                            editHtml.trim() === "<p></p>"
                          }
                        >
                          <Check className="h-3.5 w-3.5" />
                          {saving ? "Salvando..." : "Salvar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="rounded-xl gap-1"
                          onClick={cancelEdit}
                          disabled={saving}
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="prose prose-invert max-w-none text-sm overflow-x-auto break-words"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(c.content_html),
                      }}
                    />
                  )}
                </div>
              );
            })
          )}

          {/* Novo comentário */}
          <div className="rounded-2xl border p-3">
            <div className="mb-2 text-xs text-muted-foreground">
              Comentando como: {activePersona?.name ?? "—"}
            </div>
            <RichTextEditor
              valueHtml={html}
              onChangeHtml={setHtml}
              placeholder="Escreva um comentário..."
              folder="comments"
              bucket="media"
              compact
            />
            <Button
              className="mt-3 w-full rounded-2xl"
              onClick={send}
              disabled={
                !activePersona ||
                sending ||
                !html.trim() ||
                html.trim() === "<p></p>"
              }
            >
              {sending ? "Enviando..." : "Enviar comentário"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
