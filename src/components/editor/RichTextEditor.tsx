// components/editor/RichTextEditor.tsx
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  Link2,
  ImageIcon,
  Tag,
  Table2,
  Rows,
  Columns,
  Trash2,
  Heading1,
  Heading2,
  Heading3,
  ListOrdered,
  Minus,
  Quote,
} from "lucide-react";

type Props = {
  valueHtml: string;
  onChangeHtml: (html: string) => void;
  placeholder?: string;
  bucket?: string; // Mantido para compatibilidade, mas não usado
  folder?: string; // Mantido para compatibilidade, mas não usado
  compact?: boolean;
  imageInsertMode?: "inline" | "tag" | "both";
  enableTables?: boolean;
};

function getEditorCss() {
  return `
  .amino-editor {
    caret-color: hsl(var(--foreground));
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  .amino-editor p,
  .amino-editor li,
  .amino-editor blockquote,
  .amino-editor pre,
  .amino-editor code {
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .amino-editor img {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    display: block;
    margin: 8px 0;
  }
  .amino-editor a {
    color: hsl(var(--primary));
    text-decoration: underline;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .amino-editor h1 { font-size: 1.75rem; font-weight: 700; margin: 1rem 0 0.5rem; line-height: 1.2; }
  .amino-editor h2 { font-size: 1.35rem; font-weight: 700; margin: 0.875rem 0 0.4rem; line-height: 1.2; }
  .amino-editor h3 { font-size: 1.1rem; font-weight: 600; margin: 0.75rem 0 0.35rem; line-height: 1.2; }
  .amino-editor blockquote {
    border-left: 3px solid hsl(var(--primary)/0.5);
    padding-left: 1rem;
    color: hsl(var(--muted-foreground));
    font-style: italic;
    margin: 0.5rem 0;
  }
  .amino-editor hr { border: none; border-top: 1px solid hsl(var(--border)); margin: 1rem 0; }
  .amino-editor ul, .amino-editor ol { padding-left: 1.5rem; margin: 0.5rem 0; }
  .amino-editor li { margin: 0.2rem 0; }
  .amino-editor code {
    background: hsl(var(--muted));
    border-radius: 4px;
    padding: 0.1em 0.4em;
    font-size: 0.875em;
    font-family: monospace;
  }
  .amino-editor table {
    border-collapse: collapse;
    table-layout: fixed;
    width: 100%;
    margin: 1rem 0;
    overflow: hidden;
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
  }
  .amino-editor table td,
  .amino-editor table th {
    border: 1px solid hsl(var(--border));
    padding: 0.5rem 0.75rem;
    vertical-align: top;
    box-sizing: border-box;
    position: relative;
  }
  .amino-editor table th {
    font-weight: 600;
    background: hsl(var(--muted));
  }
  .amino-editor table tr:hover {
    background: hsl(var(--muted)/0.5);
  }
  .amino-editor table .selectedCell {
    background: hsl(var(--primary)/0.1);
  }
  .amino-editor table .column-resize-handle {
    position: absolute;
    right: -2px;
    top: 0;
    bottom: 0;
    width: 4px;
    background-color: hsl(var(--primary));
    pointer-events: none;
  }
  .amino-editor .ProseMirror-focused {
    outline: none;
  }
  .amino-editor .ProseMirror {
    min-height: 120px;
    padding: 0.75rem;
  }
  .amino-editor .is-editor-empty:before {
    color: hsl(var(--muted-foreground));
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }
`;
}

type ActiveState = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  link?: boolean;
  bullet?: boolean;
  ordered?: boolean;
  h1?: boolean;
  h2?: boolean;
  h3?: boolean;
  blockquote?: boolean;
  hr?: boolean;
  table?: boolean;
};

const EMPTY_ACTIVE: ActiveState = {};

export default function RichTextEditor({
  valueHtml,
  onChangeHtml,
  placeholder = "Escreva algo...",
  bucket = "media", // Não usado, mantido para compatibilidade
  folder = "images", // Não usado, mantido para compatibilidade
  compact = false,
  imageInsertMode = "inline",
  enableTables = false,
}: Props) {
  const pickImageRef = useRef<HTMLInputElement>(null);
  const imageModeRef = useRef<"inline" | "tag">("inline");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        horizontalRule: true,
        blockquote: true,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "amino-link" },
      }),
      Placeholder.configure({ placeholder }),
      Image.configure({
        inline: true,
        HTMLAttributes: { class: "amino-img" },
      }),
      ...(enableTables
        ? [
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
          ]
        : []),
    ],
    content: valueHtml,
    onUpdate: ({ editor }) => {
      onChangeHtml(editor.getHTML());
    },
    editorProps: {
      attributes: { class: "amino-editor focus:outline-none" },
    },
  });

  const { isActive } = useEditorState({
    editor,
    selector: (ctx) => {
      const e = ctx.editor;
      if (!e) return EMPTY_ACTIVE;
      return {
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        underline: e.isActive("underline"),
        link: e.isActive("link"),
        bullet: e.isActive("bulletList"),
        ordered: e.isActive("orderedList"),
        h1: e.isActive("heading", { level: 1 }),
        h2: e.isActive("heading", { level: 2 }),
        h3: e.isActive("heading", { level: 3 }),
        blockquote: e.isActive("blockquote"),
        hr: e.isActive("horizontalRule"),
        table: e.isActive("table"),
      };
    },
  });

  const active: ActiveState = useMemo(() => {
    if (!editor) return EMPTY_ACTIVE;
    return isActive ?? EMPTY_ACTIVE;
  }, [editor, isActive]);

  // Manter o editor sincronizado com valor externo
  useEffect(() => {
    if (!editor) return;
    if ((valueHtml || "") !== editor.getHTML()) {
      editor.commands.setContent(valueHtml || "", { emitUpdate: false });
    }
  }, [valueHtml, editor]);

  /**
   * ✅ NOVA FUNÇÃO - Upload usando R2 via API route
   */
  async function uploadImage(file: File): Promise<string> {
    // Validar autenticação
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Não logado.");

    // Validar tamanho (5MB para imagens inline)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Imagem muito grande. Máximo: 5MB");
    }

    // Preparar FormData
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "post"); // Tipo para imagens inline em posts/wikis

    // Upload via API route (usa R2)
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao fazer upload");
    }

    const data = await response.json();
    return data.url; // URL do R2
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;

    try {
      // Upload via R2
      const url = await uploadImage(file);

      // Inserir no editor
      if (imageModeRef.current === "tag") {
        editor.chain().focus().insertContent(`[img:${url}]`).run();
      } else {
        editor.chain().focus().setImage({ src: url, alt: "image" }).run();
      }
    } catch (err: unknown) {
      console.error(
        "Upload falhou:",
        err instanceof Error ? err.message : String(err),
      );
      // Você pode adicionar um toast aqui se quiser
      // toast.error(err instanceof Error ? err.message : "Erro ao fazer upload");
    }
  }

  if (!editor) return null;
  const a: ActiveState = active ?? EMPTY_ACTIVE;

  return (
    <div className="relative rounded-xl border bg-background">
      <style dangerouslySetInnerHTML={{ __html: getEditorCss() }} />

      {/* Toolbar */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-0.5 border-b p-2",
          compact && "gap-1 p-1.5",
        )}
      >
        {/* Text formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "rounded p-1.5 transition hover:bg-muted",
            a.bold && "bg-muted",
          )}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "rounded p-1.5 transition hover:bg-muted",
            a.italic && "bg-muted",
          )}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            "rounded p-1.5 transition hover:bg-muted",
            a.underline && "bg-muted",
          )}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Headings */}
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={cn(
            "rounded px-2 py-1.5 text-xs font-medium transition hover:bg-muted",
            a.h1 && "bg-muted",
          )}
          title="Heading 1"
        >
          H1
        </button>

        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={cn(
            "rounded px-2 py-1.5 text-xs font-medium transition hover:bg-muted",
            a.h2 && "bg-muted",
          )}
          title="Heading 2"
        >
          H2
        </button>

        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={cn(
            "rounded px-2 py-1.5 text-xs font-medium transition hover:bg-muted",
            a.h3 && "bg-muted",
          )}
          title="Heading 3"
        >
          H3
        </button>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "rounded p-1.5 transition hover:bg-muted",
            a.bullet && "bg-muted",
          )}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "rounded p-1.5 transition hover:bg-muted",
            a.ordered && "bg-muted",
          )}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Link */}
        <button
          type="button"
          onClick={() => {
            const url = prompt("URL:");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={cn(
            "rounded p-1.5 transition hover:bg-muted",
            a.link && "bg-muted",
          )}
          title="Add Link"
        >
          <Link2 className="h-4 w-4" />
        </button>

        {/* Image (inline) */}
        {imageInsertMode !== "tag" && (
          <button
            type="button"
            onClick={() => {
              imageModeRef.current = "inline";
              pickImageRef.current?.click();
            }}
            className="rounded p-1.5 transition hover:bg-muted"
            title="Insert Image"
          >
            <ImageIcon className="h-4 w-4" />
          </button>
        )}

        {/* Image (tag) */}
        {imageInsertMode !== "inline" && (
          <button
            type="button"
            onClick={() => {
              imageModeRef.current = "tag";
              pickImageRef.current?.click();
            }}
            className="rounded p-1.5 transition hover:bg-muted"
            title="Insert Image Tag [img:...]"
          >
            <Tag className="h-4 w-4" />
          </button>
        )}

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Blockquote */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn(
            "rounded p-1.5 transition hover:bg-muted",
            a.blockquote && "bg-muted",
          )}
          title="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </button>

        {/* Horizontal Rule */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="rounded p-1.5 transition hover:bg-muted"
          title="Horizontal Rule"
        >
          <Minus className="h-4 w-4" />
        </button>

        {/* Tables (if enabled) */}
        {enableTables && (
          <>
            <div className="mx-1 h-5 w-px bg-border" />

            <button
              type="button"
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
              }
              className={cn(
                "rounded p-1.5 transition hover:bg-muted",
                a.table && "bg-muted",
              )}
              title="Insert Table"
            >
              <Table2 className="h-4 w-4" />
            </button>

            {a.table && (
              <>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                  className="rounded p-1.5 transition hover:bg-muted"
                  title="Add Column"
                >
                  <Columns className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                  className="rounded p-1.5 transition hover:bg-muted"
                  title="Add Row"
                >
                  <Rows className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  className="rounded p-1.5 text-destructive transition hover:bg-destructive/10"
                  title="Delete Table"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Hidden file input */}
      <input
        ref={pickImageRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickImage}
      />
    </div>
  );
}
