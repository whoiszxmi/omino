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
  bucket?: string;
  folder?: string;
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
  .amino-editor pre {
    background: hsl(var(--muted));
    border-radius: 8px;
    padding: 0.75rem 1rem;
    overflow-x: auto;
    margin: 0.5rem 0;
  }
  .amino-editor pre code { background: none; padding: 0; }
  .amino-editor .tableWrapper {
    overflow-x: auto;
    overflow-y: hidden;
    max-width: 100%;
    -webkit-overflow-scrolling: touch;
  }
  .amino-editor table {
    width: 100%;
    max-width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin: 10px 0;
    border: 1px solid hsl(var(--border));
    border-radius: 12px;
    overflow: hidden;
    background: hsl(var(--background));
  }
  .amino-editor .tableWrapper table { min-width: 520px; }
  .amino-editor th, .amino-editor td {
    border: 1px solid hsl(var(--border));
    padding: 8px 10px;
    vertical-align: top;
    font-size: 13px;
    overflow-wrap: anywhere;
    word-break: break-word;
    position: relative;
  }
  .amino-editor th { background: hsl(var(--muted)); font-weight: 700; }
  .amino-editor td.selectedCell::after,
  .amino-editor th.selectedCell::after {
    content: "";
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.08);
    pointer-events: none;
  }
  .amino-editor .is-empty::before {
    content: attr(data-placeholder);
    float: left;
    color: hsl(var(--muted-foreground));
    pointer-events: none;
    height: 0;
  }
  `;
}

type ActiveState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  bulletList: boolean;
  orderedList: boolean;
  link: boolean;
  h1: boolean;
  h2: boolean;
  h3: boolean;
  blockquote: boolean;
  inTable: boolean;
  canBold: boolean;
  canItalic: boolean;
  canUnderline: boolean;
  canBullet: boolean;
  canInsertTable: boolean;
  canAddRow: boolean;
  canAddCol: boolean;
  canDeleteTable: boolean;
};

const EMPTY_ACTIVE: ActiveState = {
  bold: false,
  italic: false,
  underline: false,
  bulletList: false,
  orderedList: false,
  link: false,
  h1: false,
  h2: false,
  h3: false,
  blockquote: false,
  inTable: false,
  canBold: false,
  canItalic: false,
  canUnderline: false,
  canBullet: false,
  canInsertTable: false,
  canAddRow: false,
  canAddCol: false,
  canDeleteTable: false,
};

function ToolbarBtn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg text-sm transition",
        "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-0.5 h-5 w-px bg-border" />;
}

export default function RichTextEditor({
  valueHtml,
  onChangeHtml,
  placeholder = "Escreva algo...",
  bucket = "media",
  folder = "posts",
  compact = false,
  imageInsertMode = "both",
  enableTables = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageModeRef = useRef<"inline" | "tag">("inline");
  const editorCss = useMemo(() => getEditorCss(), []);

  function toggleLink(ed: Editor | null) {
    if (!ed) return;
    if (ed.isActive("link")) {
      ed.chain().focus().unsetLink().run();
      return;
    }
    const prev = ed.getAttributes("link")?.href as string | undefined;
    const url = window.prompt("Cole o link:", prev ?? "https://");
    if (!url?.trim()) return;
    ed.chain().focus().setLink({ href: url.trim() }).run();
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: "max-w-full h-auto rounded-xl border" },
      }),
      ...(enableTables
        ? [
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
          ]
        : []),
      Placeholder.configure({ placeholder }),
    ],
    content: valueHtml || "",
    onUpdate: ({ editor }) => onChangeHtml(editor.getHTML()),
    editorProps: {
      attributes: {
        class: cn(
          "amino-editor w-full px-4 py-3 focus:outline-none",
          "text-sm leading-relaxed",
          compact ? "min-h-[96px]" : "min-h-[220px]",
        ),
      },
      handleDOMEvents: {
        keydown: (_view: unknown, event: Event) => {
          const e = event as KeyboardEvent;
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            toggleLink(editor);
            return true;
          }
          return false;
        },
      },
    },
  });

  const active = useEditorState<ActiveState>({
    editor,
    selector: (ctx) => {
      const ed = ctx?.editor;
      if (!ed) return EMPTY_ACTIVE;
      const inTable = ed.isActive("table");
      return {
        bold: ed.isActive("bold"),
        italic: ed.isActive("italic"),
        underline: ed.isActive("underline"),
        bulletList: ed.isActive("bulletList"),
        orderedList: ed.isActive("orderedList"),
        link: ed.isActive("link"),
        h1: ed.isActive("heading", { level: 1 }),
        h2: ed.isActive("heading", { level: 2 }),
        h3: ed.isActive("heading", { level: 3 }),
        blockquote: ed.isActive("blockquote"),
        inTable,
        canBold: ed.can().chain().focus().toggleBold().run(),
        canItalic: ed.can().chain().focus().toggleItalic().run(),
        canUnderline: ed.can().chain().focus().toggleUnderline().run(),
        canBullet: ed.can().chain().focus().toggleBulletList().run(),
        canInsertTable:
          !!enableTables &&
          ed
            .can()
            .chain()
            .focus()
            .insertTable({ rows: 2, cols: 2, withHeaderRow: true })
            .run(),
        canAddRow:
          !!enableTables &&
          inTable &&
          ed.can().chain().focus().addRowAfter().run(),
        canAddCol:
          !!enableTables &&
          inTable &&
          ed.can().chain().focus().addColumnAfter().run(),
        canDeleteTable:
          !!enableTables &&
          inTable &&
          ed.can().chain().focus().deleteTable().run(),
      };
    },
  });

  useEffect(() => {
    if (!editor) return;
    if ((valueHtml || "") !== editor.getHTML()) {
      editor.commands.setContent(valueHtml || "", { emitUpdate: false });
    }
  }, [valueHtml, editor]);

  async function uploadImage(file: File) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Não logado.");
    if (file.size > 2_500_000)
      throw new Error("Imagem muito grande. Use até ~2.5MB.");

    const ext = file.name.split(".").pop() || "png";
    const path = `${folder}/${userData.user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "image/*",
      });
    if (upErr) throw upErr;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;
    try {
      const url = await uploadImage(file);
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
    }
  }

  if (!editor) return null;
  const a: ActiveState = active ?? EMPTY_ACTIVE;

  return (
    <div className="overflow-hidden rounded-2xl border bg-background">
      <style jsx global>
        {editorCss}
      </style>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-2 py-1.5">
        {/* Formatação de texto */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={a.bold}
          disabled={!a.canBold}
          title="Negrito (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={a.italic}
          disabled={!a.canItalic}
          title="Itálico (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={a.underline}
          disabled={!a.canUnderline}
          title="Sublinhar (Ctrl+U)"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarBtn
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          active={a.h1}
          title="Título H1"
        >
          <Heading1 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={a.h2}
          title="Título H2"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={a.h3}
          title="Título H3"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <ToolbarDivider />

        {/* Listas e blocos */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={a.bulletList}
          disabled={!a.canBullet}
          title="Lista com marcadores"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={a.orderedList}
          title="Lista numerada"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={a.blockquote}
          title="Citação"
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Linha horizontal"
        >
          <Minus className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <ToolbarDivider />

        {/* Link */}
        <ToolbarBtn
          onClick={() => toggleLink(editor)}
          active={a.link}
          title="Link (Ctrl+K)"
        >
          <Link2 className="h-3.5 w-3.5" />
        </ToolbarBtn>

        {/* Imagens */}
        {(imageInsertMode === "inline" || imageInsertMode === "both") && (
          <ToolbarBtn
            onClick={() => {
              imageModeRef.current = "inline";
              fileInputRef.current?.click();
            }}
            title="Inserir imagem"
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </ToolbarBtn>
        )}
        {(imageInsertMode === "tag" || imageInsertMode === "both") && (
          <ToolbarBtn
            onClick={() => {
              imageModeRef.current = "tag";
              fileInputRef.current?.click();
            }}
            title="Inserir tag de imagem [img:URL]"
          >
            <Tag className="h-3.5 w-3.5" />
          </ToolbarBtn>
        )}

        {/* Tabela */}
        {enableTables && (
          <>
            <ToolbarDivider />
            <ToolbarBtn
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 2, cols: 2, withHeaderRow: true })
                  .run()
              }
              disabled={!a.canInsertTable}
              title="Inserir tabela"
            >
              <Table2 className="h-3.5 w-3.5" />
            </ToolbarBtn>
            {a.inTable && (
              <>
                <ToolbarBtn
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                  disabled={!a.canAddRow}
                  title="Adicionar linha"
                >
                  <Rows className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                  disabled={!a.canAddCol}
                  title="Adicionar coluna"
                >
                  <Columns className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  disabled={!a.canDeleteTable}
                  title="Remover tabela"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </ToolbarBtn>
              </>
            )}
          </>
        )}

        <div className="ml-auto hidden text-[10px] text-muted-foreground/60 md:block">
          Ctrl+K = link
        </div>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickImage}
      />
    </div>
  );
}
