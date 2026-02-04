"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/lib/supabase/client";

type Props = {
  valueHtml: string;
  onChangeHtml: (html: string) => void;
  placeholder?: string;
  bucket?: string;
  folder?: string;
  compact?: boolean;

  /**
   * inline: insere imagem real no editor (node Image)
   * tag: insere [img:URL] pra você mover no texto
   * both: mostra os dois botões
   */
  imageInsertMode?: "inline" | "tag" | "both";
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ActiveState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  bullet: boolean;
  link: boolean;
  canBold: boolean;
  canItalic: boolean;
  canUnderline: boolean;
  canBullet: boolean;
};

const EMPTY_ACTIVE: ActiveState = {
  bold: false,
  italic: false,
  underline: false,
  bullet: false,
  link: false,
  canBold: false,
  canItalic: false,
  canUnderline: false,
  canBullet: false,
};

function getEditorCss() {
  return `
    .ProseMirror {
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .ProseMirror p,
    .ProseMirror li,
    .ProseMirror a,
    .ProseMirror code,
    .ProseMirror pre {
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .ProseMirror img {
      max-width: 100%;
      display: block;
      border-radius: 0.75rem;
    }

    .ProseMirror .tableWrapper {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .ProseMirror table {
      border-collapse: collapse;
      table-layout: fixed;
      width: 100%;
      max-width: 100%;
      background: var(--card);
    }

    .ProseMirror .tableWrapper table {
      min-width: 520px;
    }

    .ProseMirror th,
    .ProseMirror td {
      border: 1px solid var(--border);
      padding: 0.5rem;
      vertical-align: top;
      overflow-wrap: anywhere;
      word-break: break-word;
      position: relative;
    }

    .ProseMirror th {
      background: var(--muted);
    }

    .ProseMirror .selectedCell:after {
      background: color-mix(in srgb, var(--primary) 30%, transparent);
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
  `;
}

export default function RichTextEditor({
  valueHtml,
  onChangeHtml,
  placeholder = "Escreva algo...",
  bucket = "media",
  folder = "posts",
  compact = false,
  imageInsertMode = "both",
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageModeRef = useRef<"inline" | "tag">("inline");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      // ✅ ESSENCIAL: sem isso, <img> é descartado pelo Tiptap
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-xl",
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: valueHtml || "",
    onUpdate: ({ editor }) => onChangeHtml(editor.getHTML()),
    editorProps: {
      attributes: {
        class: cx(
          "w-full px-3 py-2 focus:outline-none",
          "text-sm leading-relaxed",
          compact ? "min-h-[96px]" : "min-h-[160px]",
        ),
      },
    },
  });

  const active = useEditorState({
    editor,
    selector: (ctx) => {
      const ed = ctx?.editor;
      if (!ed) return EMPTY_ACTIVE;

      return {
        bold: ed.isActive("bold"),
        italic: ed.isActive("italic"),
        underline: ed.isActive("underline"),
        bullet: ed.isActive("bulletList"),
        link: ed.isActive("link"),
        canBold: ed.can().chain().focus().toggleBold().run(),
        canItalic: ed.can().chain().focus().toggleItalic().run(),
        canUnderline: ed.can().chain().focus().toggleUnderline().run(),
        canBullet: ed.can().chain().focus().toggleBulletList().run(),
      };
    },
  });

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
        // ✅ tag movível no texto (Amino-like)
        editor.chain().focus().insertContent(`[img:${url}]`).run();
      } else {
        // ✅ imagem real no editor (não é descartada)
        editor.chain().focus().setImage({ src: url, alt: "image" }).run();
      }
    } catch (err: any) {
      console.error("Upload falhou:", err?.message ?? err);
    }
  }

  function toggleLink() {
    if (!editor) return;

    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const previousUrl = editor.getAttributes("link")?.href as
      | string
      | undefined;
    const url = window.prompt("Cole o link:", previousUrl ?? "https://");
    if (!url) return;

    const clean = url.trim();
    if (!clean) return;

    editor.chain().focus().setLink({ href: clean }).run();
  }

  if (!editor) return null;

  const value: string[] = [];
  if (active.bold) value.push("bold");
  if (active.italic) value.push("italic");
  if (active.underline) value.push("underline");
  if (active.bullet) value.push("bullet");
  if (active.link) value.push("link");

  const editorCss = getEditorCss();

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
        toggleLink();
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
            aria-label="Negrito"
            disabled={!active.canBold}
            className="rounded-2xl border"
          >
            <span className="font-bold">B</span>
          </ToggleGroupItem>

          <ToggleGroupItem
            value="italic"
            aria-label="Itálico"
            disabled={!active.canItalic}
            className="rounded-2xl border"
          >
            <span className="italic">I</span>
          </ToggleGroupItem>

          <ToggleGroupItem
            value="underline"
            aria-label="Sublinhar"
            disabled={!active.canUnderline}
            className="rounded-2xl border"
          >
            <span className="underline">U</span>
          </ToggleGroupItem>

          <ToggleGroupItem
            value="bullet"
            aria-label="Lista"
            disabled={!active.canBullet}
            className="rounded-2xl border"
          >
            •
          </ToggleGroupItem>

          <ToggleGroupItem
            value="link"
            aria-label={active.link ? "Remover link" : "Inserir link"}
            className="rounded-2xl border"
          >
            🔗
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
            className="rounded-2xl"
            onClick={() => {
              imageModeRef.current = "inline";
              fileInputRef.current?.click();
            }}
          >
            Imagem
          </Button>
        )}

        {(imageInsertMode === "tag" || imageInsertMode === "both") && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-2xl"
            onClick={() => {
              imageModeRef.current = "tag";
              fileInputRef.current?.click();
            }}
          >
            Tag Img
          </Button>
        )}
      </div>

      <div className="rounded-2xl border bg-background overflow-hidden">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
