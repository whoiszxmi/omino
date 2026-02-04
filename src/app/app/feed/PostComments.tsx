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

    // otimista
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

    // substitui optimistic pelo real
    setComments((prev) => prev.map((c) => (c.id === optimisticId ? real : c)));
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
            comments.map((c) => (
              <div key={c.id} className="rounded-2xl border p-3">
                <div className="text-xs font-medium text-muted-foreground">
                  {c.persona.name} •{" "}
                  {new Date(c.created_at).toLocaleString("pt-BR")}
                </div>

                <div
                  className="prose prose-invert max-w-none text-sm overflow-x-auto break-words"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(c.content_html),
                  }}
                />
              </div>
            ))
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
