"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";

import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/lib/supabase/client";

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
  Heading,
} from "lucide-react";

type Props = {
  valueHtml: string;
  onChangeHtml: (html: string) => void;
  placeholder?: string;
  bucket?: string;
  folder?: string;
  compact?: boolean;

  imageInsertMode?: "inline" | "tag" | "both";

  /** Amino-like toolbar fixa e editor confortável */
  aminoStyle?: boolean;

  /** Mostrar ferramentas de tabela (Wiki) */
  enableTables?: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getEditorCss() {
  return `
  /* editor root */
  .amino-editor {
    caret-color: hsl(var(--foreground));
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  /* texto e blocos */
  .amino-editor p,
  .amino-editor li,
  .amino-editor blockquote,
  .amino-editor pre,
  .amino-editor code {
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  /* imagens */
  .amino-editor img {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    display: block;
  }

  /* links longos */
  .amino-editor a {
    color: hsl(var(--primary));
    text-decoration: underline;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  /* ======= TABELAS ======= */
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

  /* em telas pequenas, a tabela pode ficar maior e rolar dentro do wrapper */
  .amino-editor .tableWrapper table {
    min-width: 520px;
  }

  .amino-editor th,
  .amino-editor td {
    border: 1px solid hsl(var(--border));
    padding: 8px 10px;
    vertical-align: top;
    font-size: 13px;
    overflow-wrap: anywhere;
    word-break: break-word;
    position: relative;
  }

  .amino-editor th {
    background: hsl(var(--muted));
    font-weight: 700;
  }

  /* seleção da célula */
  .amino-editor td.selectedCell::after,
  .amino-editor th.selectedCell::after {
    content: "";
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.08);
    pointer-events: none;
  }

  /* placeholder tiptap */
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
  bullet: boolean;
  link: boolean;

  inTable: boolean;

  canBold: boolean;
  canItalic: boolean;
  canUnderline: boolean;
  canBullet: boolean;

  canInsertTable: boolean;
  canAddRow: boolean;
  canAddCol: boolean;
  canToggleHeaderRow: boolean;
  canDeleteTable: boolean;
};

const EMPTY_ACTIVE: ActiveState = {
  bold: false,
  italic: false,
  underline: false,
  bullet: false,
  link: false,

  inTable: false,

  canBold: false,
  canItalic: false,
  canUnderline: false,
  canBullet: false,

  canInsertTable: false,
  canAddRow: false,
  canAddCol: false,
  canToggleHeaderRow: false,
  canDeleteTable: false,
};

export default function RichTextEditor({
  valueHtml,
  onChangeHtml,
  placeholder = "Escreva algo...",
  bucket = "media",
  folder = "posts",
  compact = false,
  imageInsertMode = "both",
  aminoStyle = true,
  enableTables = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageModeRef = useRef<"inline" | "tag">("inline");

  const editorCss = useMemo(() => getEditorCss(), []);

  // ===== helpers dependentes do editor (mas podem ser usados em eventos) =====
  function toggleLink(ed: any) {
    if (!ed) return;

    if (ed.isActive("link")) {
      ed.chain().focus().unsetLink().run();
      return;
    }

    const previousUrl = ed.getAttributes("link")?.href as string | undefined;
    const url = window.prompt("Cole o link:", previousUrl ?? "https://");
    if (!url) return;

    const clean = url.trim();
    if (!clean) return;

    ed.chain().focus().setLink({ href: clean }).run();
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
        class: cx(
          "amino-editor w-full px-3 py-2 focus:outline-none",
          "text-sm leading-relaxed",
          compact ? "min-h-[96px]" : "min-h-[160px]",
        ),
        "data-placeholder": placeholder,
      } as any,
      handleDOMEvents: {
        keydown: (_view, event) => {
          const e = event as KeyboardEvent;

          // Ctrl/Cmd + K (link)
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            toggleLink(editor);
            return true;
          }
          return false;
        },
      } as any,
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
        bullet: ed.isActive("bulletList"),
        link: ed.isActive("link"),

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
        canToggleHeaderRow:
          !!enableTables &&
          inTable &&
          ed.can().chain().focus().toggleHeaderRow().run(),
        canDeleteTable:
          !!enableTables &&
          inTable &&
          ed.can().chain().focus().deleteTable().run(),
      };
    },
  });

  // mantém o conteúdo em sync sem loop
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if ((valueHtml || "") !== current) {
      editor.commands.setContent(valueHtml || "", { emitUpdate: false });
    }
  }, [valueHtml, editor]);

  async function uploadImage(file: File) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) throw new Error("Não logado.");

    if (file.size > 2_500_000) {
      throw new Error("Imagem muito grande. Use até ~2.5MB.");
    }

    const ext = file.name.split(".").pop() || "png";
    const path = `${folder}/${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "image/*",
      });
    if (upErr) throw upErr;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;

    try {
      const url = await uploadImage(file);
      const mode = imageModeRef.current;

      if (mode === "tag") {
        editor.chain().focus().insertContent(`[img:${url}]`).run();
      } else {
        editor.chain().focus().setImage({ src: url, alt: "image" }).run();
      }
    } catch (err: any) {
      console.error("Upload falhou:", err?.message ?? err);
    }
  }

  // ===== Table actions =====
  function insertTable2x2() {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: 2, cols: 2, withHeaderRow: true })
      .run();
  }
  function addRowAfter() {
    if (!editor) return;
    editor.chain().focus().addRowAfter().run();
  }
  function addColAfter() {
    if (!editor) return;
    editor.chain().focus().addColumnAfter().run();
  }
  function toggleHeaderRow() {
    if (!editor) return;
    editor.chain().focus().toggleHeaderRow().run();
  }
  function deleteTable() {
    if (!editor) return;
    editor.chain().focus().deleteTable().run();
  }

  if (!editor) return null;

  // ✅ garante que nunca é null
  const a: ActiveState = active ?? EMPTY_ACTIVE;

  // ToggleGroup (somente as flags que existem)
  const value: string[] = [];
  if (a.bold) value.push("bold");
  if (a.italic) value.push("italic");
  if (a.underline) value.push("underline");
  if (a.bullet) value.push("bullet");
  if (a.link) value.push("link");

  function onToggle(next: string[]) {
    const prev = new Set(value);
    const now = new Set(next);

    const added = next.find((k) => !prev.has(k));
    const removed = value.find((k) => !now.has(k));
    const key = added ?? removed;
    if (!key) return;

    switch (key) {
      case "bold":
        editor.chain().focus().toggleBold().run();
        break;
      case "italic":
        editor.chain().focus().toggleItalic().run();
        break;
      case "underline":
        editor.chain().focus().toggleUnderline().run();
        break;
      case "bullet":
        editor.chain().focus().toggleBulletList().run();
        break;
      case "link":
        toggleLink(editor);
        break;
    }
  }

  return (
    <div className="space-y-2">
      <style jsx global>
        {editorCss}
      </style>

      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="multiple"
          value={value}
          onValueChange={onToggle}
          className="flex flex-wrap gap-2"
        >
          <ToggleGroupItem
            value="bold"
            title="Negrito"
            aria-label="Negrito"
            disabled={!a.canBold}
            className="rounded-full border px-3"
          >
            <Bold className="h-4 w-4" />
          </ToggleGroupItem>

          <ToggleGroupItem
            value="italic"
            title="Itálico"
            aria-label="Itálico"
            disabled={!a.canItalic}
            className="rounded-full border px-3"
          >
            <Italic className="h-4 w-4" />
          </ToggleGroupItem>

          <ToggleGroupItem
            value="underline"
            title="Sublinhar"
            aria-label="Sublinhar"
            disabled={!a.canUnderline}
            className="rounded-full border px-3"
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToggleGroupItem>

          <ToggleGroupItem
            value="bullet"
            title="Lista"
            aria-label="Lista"
            disabled={!a.canBullet}
            className="rounded-full border px-3"
          >
            <List className="h-4 w-4" />
          </ToggleGroupItem>

          <ToggleGroupItem
            value="link"
            title="Link (Ctrl+K)"
            aria-label={a.link ? "Remover link" : "Inserir link"}
            className="rounded-full border px-3"
          >
            <Link2 className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickImage}
        />

        {(imageInsertMode === "inline" || imageInsertMode === "both") && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={() => {
              imageModeRef.current = "inline";
              fileInputRef.current?.click();
            }}
            title="Inserir imagem inline"
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            Imagem
          </Button>
        )}

        {(imageInsertMode === "tag" || imageInsertMode === "both") && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={() => {
              imageModeRef.current = "tag";
              fileInputRef.current?.click();
            }}
            title="Inserir tag [img:URL] movível"
          >
            <Tag className="mr-2 h-4 w-4" />
            Tag img
          </Button>
        )}

        {enableTables && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="mx-1 h-6 w-px bg-border" />

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full"
              onClick={insertTable2x2}
              disabled={!a.canInsertTable}
              title="Inserir tabela 2x2"
            >
              <Table2 className="mr-2 h-4 w-4" />
              Tabela
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full"
              onClick={addRowAfter}
              disabled={!a.canAddRow}
              title="Adicionar linha"
            >
              <Rows className="mr-2 h-4 w-4" />
              Linha
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full"
              onClick={addColAfter}
              disabled={!a.canAddCol}
              title="Adicionar coluna"
            >
              <Columns className="mr-2 h-4 w-4" />
              Coluna
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full"
              onClick={toggleHeaderRow}
              disabled={!a.canToggleHeaderRow}
              title="Alternar cabeçalho"
            >
              <Heading className="mr-2 h-4 w-4" />
              Cabeçalho
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full"
              onClick={deleteTable}
              disabled={!a.canDeleteTable}
              title="Remover tabela"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remover
            </Button>
          </div>
        )}

        <div className="ml-auto hidden text-[11px] text-muted-foreground md:block">
          Ctrl+K link • imagens até 2.5MB
        </div>
      </div>

      <div
        className={cx(
          aminoStyle
            ? "rounded-2xl border bg-background overflow-hidden"
            : "overflow-hidden",
        )}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
