"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FontSize } from "@/components/lms/fontSizeExtension";
import { apiUpload, ApiError } from "@/lib/auth";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

const FONT_SIZES = [
  { label: "10", value: "10px" },
  { label: "11", value: "11px" },
  { label: "12", value: "12px" },
  { label: "14", value: "14px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "20", value: "20px" },
  { label: "24", value: "24px" },
  { label: "28", value: "28px" },
  { label: "32", value: "32px" },
  { label: "36", value: "36px" },
] as const;

const TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "Black", value: "#111827" },
  { label: "Gray", value: "#5f6b7a" },
  { label: "Red", value: "#c42032" },
  { label: "Blue", value: "#1d4ed8" },
] as const;

const HIGHLIGHT_COLORS = [
  { label: "None", value: "" },
  { label: "Yellow", value: "#fef08a" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Pink", value: "#fbcfe8" },
  { label: "Orange", value: "#fed7aa" },
] as const;

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TextStyle,
      FontSize,
      Color,
      Underline,
      Subscript,
      Superscript,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-caisbe-green underline",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-md",
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || "Start writing…",
      }),
    ],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "rich-text-editor min-h-[160px] px-4 py-3 text-[15px] leading-relaxed text-caisbe-text outline-none",
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if ((value || "") !== current && value !== undefined) {
      editor.commands.setContent(value || "", false);
    }
  }, [editor, value]);

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous || "https://");
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  }

  async function onImageSelected(file: File | undefined) {
    if (!file || !editor) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await apiUpload("/admin/uploads", file);
      editor.chain().focus().setImage({ src: uploaded.url, alt: file.name }).run();
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.detail : "Unable to upload image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (!editor) {
    return (
      <div className="h-[220px] rounded-md border border-ifma-border bg-white px-4 py-3 text-sm text-caisbe-muted">
        Loading editor…
      </div>
    );
  }

  const currentSize = (editor.getAttributes("textStyle").fontSize as string | undefined) || "";
  const currentColor = (editor.getAttributes("textStyle").color as string | undefined) || "";
  const currentHighlight = (editor.getAttributes("highlight").color as string | undefined) || "";

  return (
    <div className="overflow-hidden rounded-md border border-ifma-border bg-white shadow-sm focus-within:border-caisbe-green">
      <div className="border-b border-ifma-border bg-[#f3f3f3]">
        <div className="flex flex-wrap items-stretch gap-0 px-1 py-1">
          <ToolbarGroup label="Clipboard">
            <IconButton
              title="Undo"
              disabled={!editor.can().chain().focus().undo().run()}
              onClick={() => editor.chain().focus().undo().run()}
            >
              <IconUndo />
            </IconButton>
            <IconButton
              title="Redo"
              disabled={!editor.can().chain().focus().redo().run()}
              onClick={() => editor.chain().focus().redo().run()}
            >
              <IconRedo />
            </IconButton>
          </ToolbarGroup>

          <ToolbarDivider />

          <ToolbarGroup label="Styles">
            <select
              aria-label="Paragraph style"
              className="h-8 min-w-[7.5rem] rounded border border-[#c8c8c8] bg-white px-2 text-xs text-caisbe-text outline-none focus:border-caisbe-green"
              value={getBlockStyle(editor)}
              onChange={(e) => applyBlockStyle(editor, e.target.value)}
            >
              <option value="paragraph">Normal</option>
              <option value="heading-1">Heading 1</option>
              <option value="heading-2">Heading 2</option>
              <option value="heading-3">Heading 3</option>
            </select>
            <select
              aria-label="Font size"
              className="h-8 w-[4.25rem] rounded border border-[#c8c8c8] bg-white px-1 text-xs text-caisbe-text outline-none focus:border-caisbe-green"
              value={currentSize}
              onChange={(e) => {
                const next = e.target.value;
                if (!next) {
                  editor.chain().focus().unsetFontSize().run();
                } else {
                  editor.chain().focus().setFontSize(next).run();
                }
              }}
            >
              <option value="">Size</option>
              {FONT_SIZES.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
          </ToolbarGroup>

          <ToolbarDivider />

          <ToolbarGroup label="Font">
            <IconButton
              title="Bold"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <span className="font-bold">B</span>
            </IconButton>
            <IconButton
              title="Italic"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <span className="italic">I</span>
            </IconButton>
            <IconButton
              title="Underline"
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <span className="underline">U</span>
            </IconButton>
            <IconButton
              title="Strikethrough"
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <span className="line-through">S</span>
            </IconButton>
            <IconButton
              title="Subscript"
              active={editor.isActive("subscript")}
              onClick={() => editor.chain().focus().toggleSubscript().run()}
            >
              <span className="text-[11px]">
                X<sub className="text-[9px]">2</sub>
              </span>
            </IconButton>
            <IconButton
              title="Superscript"
              active={editor.isActive("superscript")}
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
            >
              <span className="text-[11px]">
                X<sup className="text-[9px]">2</sup>
              </span>
            </IconButton>
            <label className="relative inline-flex h-8 w-8 items-center justify-center rounded border border-transparent hover:border-[#c8c8c8] hover:bg-white" title="Font color">
              <span className="text-xs font-semibold text-caisbe-text">A</span>
              <span
                className="absolute bottom-1 left-1.5 right-1.5 h-1 rounded-sm"
                style={{ backgroundColor: currentColor || "#111827" }}
              />
              <select
                aria-label="Font color"
                className="absolute inset-0 cursor-pointer opacity-0"
                value={currentColor}
                onChange={(e) => {
                  const next = e.target.value;
                  if (!next) editor.chain().focus().unsetColor().run();
                  else editor.chain().focus().setColor(next).run();
                }}
              >
                {TEXT_COLORS.map((color) => (
                  <option key={color.label} value={color.value}>
                    {color.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="relative inline-flex h-8 w-8 items-center justify-center rounded border border-transparent hover:border-[#c8c8c8] hover:bg-white" title="Highlight">
              <IconHighlight />
              <span
                className="absolute bottom-1 left-1.5 right-1.5 h-1 rounded-sm"
                style={{ backgroundColor: currentHighlight || "#fef08a" }}
              />
              <select
                aria-label="Highlight color"
                className="absolute inset-0 cursor-pointer opacity-0"
                value={currentHighlight}
                onChange={(e) => {
                  const next = e.target.value;
                  if (!next) editor.chain().focus().unsetHighlight().run();
                  else editor.chain().focus().toggleHighlight({ color: next }).run();
                }}
              >
                {HIGHLIGHT_COLORS.map((color) => (
                  <option key={color.label} value={color.value}>
                    {color.label}
                  </option>
                ))}
              </select>
            </label>
            <IconButton
              title="Clear formatting"
              onClick={() =>
                editor.chain().focus().unsetAllMarks().clearNodes().setParagraph().run()
              }
            >
              <IconClearFormat />
            </IconButton>
          </ToolbarGroup>

          <ToolbarDivider />

          <ToolbarGroup label="Paragraph">
            <IconButton
              title="Bullets"
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <IconBulletList />
            </IconButton>
            <IconButton
              title="Numbering"
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <IconOrderedList />
            </IconButton>
            <IconButton
              title="Decrease indent"
              disabled={!editor.can().chain().focus().liftListItem("listItem").run()}
              onClick={() => editor.chain().focus().liftListItem("listItem").run()}
            >
              <IconOutdent />
            </IconButton>
            <IconButton
              title="Increase indent"
              disabled={!editor.can().chain().focus().sinkListItem("listItem").run()}
              onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
            >
              <IconIndent />
            </IconButton>
            <IconButton
              title="Align left"
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            >
              <IconAlignLeft />
            </IconButton>
            <IconButton
              title="Align center"
              active={editor.isActive({ textAlign: "center" })}
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
            >
              <IconAlignCenter />
            </IconButton>
            <IconButton
              title="Align right"
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            >
              <IconAlignRight />
            </IconButton>
            <IconButton
              title="Justify"
              active={editor.isActive({ textAlign: "justify" })}
              onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            >
              <IconAlignJustify />
            </IconButton>
            <IconButton
              title="Block quote"
              active={editor.isActive("blockquote")}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <IconQuote />
            </IconButton>
            <IconButton
              title="Horizontal line"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
              <IconHr />
            </IconButton>
          </ToolbarGroup>

          <ToolbarDivider />

          <ToolbarGroup label="Insert">
            <IconButton title="Insert link" active={editor.isActive("link")} onClick={setLink}>
              <IconLink />
            </IconButton>
            <IconButton
              title="Insert image"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <IconImage />
            </IconButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onImageSelected(e.target.files?.[0])}
            />
          </ToolbarGroup>
        </div>
      </div>

      <div className="h-[220px] overflow-y-auto overscroll-contain md:h-[260px]">
        <EditorContent editor={editor} />
      </div>
      {uploadError ? <p className="border-t border-ifma-border-light px-3 py-1.5 text-xs text-caisbe-red">{uploadError}</p> : null}
      {uploading ? <p className="border-t border-ifma-border-light px-3 py-1.5 text-xs text-caisbe-muted">Uploading image…</p> : null}
    </div>
  );
}

function getBlockStyle(editor: Editor): string {
  if (editor.isActive("heading", { level: 1 })) return "heading-1";
  if (editor.isActive("heading", { level: 2 })) return "heading-2";
  if (editor.isActive("heading", { level: 3 })) return "heading-3";
  return "paragraph";
}

function applyBlockStyle(editor: Editor, style: string) {
  const chain = editor.chain().focus();
  if (style === "heading-1") chain.setHeading({ level: 1 }).run();
  else if (style === "heading-2") chain.setHeading({ level: 2 }).run();
  else if (style === "heading-3") chain.setHeading({ level: 3 }).run();
  else chain.setParagraph().run();
}

function ToolbarGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1.5 py-0.5">
      <div className="flex flex-wrap items-center gap-0.5">{children}</div>
      <span className="text-[10px] leading-none text-[#6b7280]">{label}</span>
    </div>
  );
}

function ToolbarDivider() {
  return <div className="my-1 w-px self-stretch bg-[#d4d4d4]" aria-hidden />;
}

function IconButton({
  title,
  onClick,
  children,
  active,
  disabled,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded border text-sm disabled:opacity-40 ${
        active
          ? "border-[#c8c8c8] bg-[#e5e5e5] text-caisbe-text"
          : "border-transparent text-caisbe-text hover:border-[#c8c8c8] hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

function IconUndo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
    </svg>
  );
}

function IconRedo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 15-6.7L21 13" />
    </svg>
  );
}

function IconHighlight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 11-6 6v3h3l6-6" />
      <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
    </svg>
  );
}

function IconClearFormat() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7V4h16v3" />
      <path d="M9 20h6" />
      <path d="M12 4v16" />
      <path d="m6 18 12-12" />
    </svg>
  );
}

function IconBulletList() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="4" cy="6" r="1.5" />
      <circle cx="4" cy="12" r="1.5" />
      <circle cx="4" cy="18" r="1.5" />
      <rect x="8" y="5" width="13" height="2" rx="1" />
      <rect x="8" y="11" width="13" height="2" rx="1" />
      <rect x="8" y="17" width="13" height="2" rx="1" />
    </svg>
  );
}

function IconOrderedList() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <text x="2" y="8" fontSize="7" fontFamily="sans-serif">
        1
      </text>
      <text x="2" y="14" fontSize="7" fontFamily="sans-serif">
        2
      </text>
      <text x="2" y="20" fontSize="7" fontFamily="sans-serif">
        3
      </text>
      <rect x="8" y="5" width="13" height="2" rx="1" />
      <rect x="8" y="11" width="13" height="2" rx="1" />
      <rect x="8" y="17" width="13" height="2" rx="1" />
    </svg>
  );
}

function IconIndent() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M3 12h9" />
      <path d="M3 18h18" />
      <path d="m15 9 3 3-3 3" />
    </svg>
  );
}

function IconOutdent() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M12 12h9" />
      <path d="M3 18h18" />
      <path d="m9 9-3 3 3 3" />
    </svg>
  );
}

function IconAlignLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="5" width="18" height="2" rx="1" />
      <rect x="3" y="11" width="12" height="2" rx="1" />
      <rect x="3" y="17" width="16" height="2" rx="1" />
    </svg>
  );
}

function IconAlignCenter() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="5" width="18" height="2" rx="1" />
      <rect x="6" y="11" width="12" height="2" rx="1" />
      <rect x="4" y="17" width="16" height="2" rx="1" />
    </svg>
  );
}

function IconAlignRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="5" width="18" height="2" rx="1" />
      <rect x="9" y="11" width="12" height="2" rx="1" />
      <rect x="5" y="17" width="16" height="2" rx="1" />
    </svg>
  );
}

function IconAlignJustify() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="5" width="18" height="2" rx="1" />
      <rect x="3" y="11" width="18" height="2" rx="1" />
      <rect x="3" y="17" width="18" height="2" rx="1" />
    </svg>
  );
}

function IconQuote() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 7h4v4H9.5A2.5 2.5 0 0 0 7 13.5V17H4v-3.5A5.5 5.5 0 0 1 9.5 8H11V7H7zm9 0h4v4h-1.5A2.5 2.5 0 0 0 16 13.5V17h-3v-3.5A5.5 5.5 0 0 1 18.5 8H20V7h-4z" />
    </svg>
  );
}

function IconHr() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="11" width="18" height="2" rx="1" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5L9 20" />
    </svg>
  );
}
