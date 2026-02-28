"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActivePersona } from "@/lib/persona/useActivePersona";
import { Button } from "@/components/ui/button";
import DOMPurify from "isomorphic-dompurify";
import RichTextEditor from "@/components/editor/RichTextEditor";

type CommentRow = {
  id: string;
  content_html: string;
  created_at: string;
  persona_id: string;
  personas: {
    name: string;
    avatar_url: string | null;
    user_id?: string | null;
  } | null;
};

type Comment = {
  id: string;
  content_html: string;
  created_at: string;
  persona: {
    id: string;
    name: string;
    avatar_url: string | null;
    username?: string | null;
  };
};

export default function PostComments({ postId }: { postId: string }) {
  const { activePersona } = useActivePersona();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [html, setHtml] = useState("");
  const [sending, setSending] = useState(false);

  // NOVOS ESTADOS
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingHtml, setEditingHtml] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
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
        username: (row.personas as any)?.profiles?.username ?? null,
      },
    };
  }

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("post_comments")
      .select(
        `
        id,
        content_html,
        created_at,
        persona_id,
        personas ( name, avatar_url )
      `,
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) console.error("ERRO load comments:", error);

    const mapped = (data ?? []).map((r: any) => mapRow(r as CommentRow));
    setComments(mapped);
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
        `
        id,
        content_html,
        created_at,
        persona_id,
        personas ( name, avatar_url )
      `,
      )
      .single();

    setSending(false);

    if (error) {
      console.error("ERRO comment:", error);
      setComments((prev) => prev.filter((c) => c.id !== optimisticId));
      setHtml(content);
      return;
    }

    const real = mapRow(data as any);
    setComments((prev) => prev.map((c) => (c.id === optimisticId ? real : c)));
  }

  // EDITAR
  function startEdit(comment: Comment) {
    setEditingId(comment.id);
    setEditingHtml(comment.content_html);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingHtml("");
  }

  async function saveEdit(id: string) {
    const content = editingHtml.trim();
    if (!content || content === "<p></p>" || savingEdit) return;

    setSavingEdit(true);

    // otimista
    const previous = comments;
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, content_html: content } : c)),
    );

    const { error } = await supabase
      .from("post_comments")
      .update({ content_html: content })
      .eq("id", id);

    setSavingEdit(false);

    if (error) {
      console.error("ERRO edit comment:", error);
      setComments(previous);
      return;
    }

    setEditingId(null);
    setEditingHtml("");
  }

  // DELETAR
  async function removeComment(id: string) {
    if (deletingId) return;
    if (!confirm("Tem certeza que deseja excluir este comentário?")) return;

    setDeletingId(id);

    const previous = comments;
    setComments((prev) => prev.filter((c) => c.id !== id));

    const { error } = await supabase
      .from("post_comments")
      .delete()
      .eq("id", id);

    setDeletingId(null);

    if (error) {
      console.error("ERRO delete comment:", error);
      setComments(previous);
    }
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
              const isOwner = activePersona?.id === c.persona.id;
              const isEditing = editingId === c.id;

              return (
                <div key={c.id} className="rounded-2xl border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-muted-foreground">
                      {c.persona.name} •{" "}
                      {new Date(c.created_at).toLocaleString("pt-BR")}
                    </div>

                    {isOwner && !isEditing && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(c)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500"
                          disabled={deletingId === c.id}
                          onClick={() => removeComment(c.id)}
                        >
                          {deletingId === c.id ? "Excluindo..." : "Excluir"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mt-2">
                      <RichTextEditor
                        valueHtml={editingHtml}
                        onChangeHtml={setEditingHtml}
                        placeholder="Editar comentário..."
                        folder="comments"
                        bucket="media"
                        compact
                      />

                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveEdit(c.id)}
                          disabled={
                            savingEdit ||
                            !editingHtml.trim() ||
                            editingHtml.trim() === "<p></p>"
                          }
                        >
                          {savingEdit ? "Salvando..." : "Salvar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={cancelEdit}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="prose prose-invert max-w-none text-sm overflow-x-auto break-words mt-2"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(c.content_html),
                      }}
                    />
                  )}
                </div>
              );
            })
          )}

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
