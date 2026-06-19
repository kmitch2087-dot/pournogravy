import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  TextStyle, Color, FontFamily, FontSize, BackgroundColor,
} from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { useState, useRef, useEffect } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Highlighter, Type, Palette, List, ListOrdered, ChevronDown,
} from "lucide-react";

const FONTS = [
  { label: "Default", value: "" },
  { label: "Oswald", value: "Oswald, sans-serif" },
  { label: "Bebas Neue", value: "'Bebas Neue', sans-serif" },
  { label: "Anton", value: "Anton, sans-serif" },
  { label: "Permanent Marker", value: "'Permanent Marker', cursive" },
  { label: "Special Elite", value: "'Special Elite', cursive" },
  { label: "Rajdhani", value: "Rajdhani, sans-serif" },
  { label: "Barlow Condensed", value: "'Barlow Condensed', sans-serif" },
];

const SIZES = ["10px", "12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "40px", "48px"];

const COLORS = [
  "#ffffff", "#fde047", "#ff1744", "#000000",
  "#ef4444", "#f97316", "#22c55e", "#3b82f6",
  "#a855f7", "#ec4899", "#6b7280", "#d1d5db",
];

// ── Toolbar button ─────────────────────────────────────────────────────────────
const Btn = ({
  active, onClick, title, children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    title={title}
    className={`p-1.5 rounded transition-colors ${
      active
        ? "bg-[#fde047] text-black"
        : "text-white/70 hover:text-white hover:bg-white/10"
    }`}
  >
    {children}
  </button>
);

// ── Simple dropdown ────────────────────────────────────────────────────────────
function Dropdown({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className="flex items-center gap-0.5 px-1.5 py-1 text-white/70 hover:text-white hover:bg-white/10 rounded text-[10px] whitespace-nowrap"
      >
        {label}
        <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-0.5 z-50 bg-[#1a1a1a] border border-white/20 shadow-xl min-w-[130px] max-h-48 overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Color picker popover ───────────────────────────────────────────────────────
function ColorPicker({
  icon, title, onSelect, onCustom, onClear,
}: {
  icon: React.ReactNode;
  title: string;
  onSelect: (c: string) => void;
  onCustom: (c: string) => void;
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        title={title}
        className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded"
      >
        {icon}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-0.5 z-50 bg-[#1a1a1a] border border-white/20 shadow-xl p-2 space-y-1.5">
          {onClear && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onClear(); setOpen(false); }}
              className="block w-full text-left text-[10px] text-white/50 hover:text-white px-1 py-0.5"
            >
              Remove
            </button>
          )}
          <div className="grid grid-cols-6 gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(c);
                  setOpen(false);
                }}
                className="h-5 w-5 rounded-sm border border-white/20 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <input
            type="color"
            title="Custom color"
            className="w-full h-6 cursor-pointer bg-transparent border border-white/20 p-0"
            onChange={(e) => onCustom(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function RichTextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      BackgroundColor,
      FontFamily,
      FontSize,
      Underline,
      Highlight.configure({ multicolor: true }),
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "min-h-[60px] px-2 py-1.5 text-xs text-foreground focus:outline-none",
      },
    },
  });

  // Sync external value resets without clobbering cursor position
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      const { from, to } = editor.state.selection;
      editor.commands.setContent(value || "<p></p>", false);
      try { editor.commands.setTextSelection({ from, to }); } catch {}
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) return null;

  const showToolbar = focused;

  return (
    <div
      className={`border transition-colors relative ${showToolbar ? "border-[#fde047]" : "border-border"}`}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false);
      }}
    >
      {/* ── Toolbar ── */}
      {showToolbar && (
        <div className="bg-[#111] border-b border-white/10 px-1.5 py-1 flex flex-wrap items-center gap-0.5">

          {/* Font family */}
          <Dropdown label={<span className="flex items-center gap-1"><Type className="h-3 w-3" />Font</span>}>
            {FONTS.map((f) => (
              <button
                key={f.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  f.value
                    ? editor.chain().focus().setFontFamily(f.value).run()
                    : editor.chain().focus().unsetFontFamily().run();
                }}
                className="block w-full text-left px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white"
                style={f.value ? { fontFamily: f.value } : {}}
              >
                {f.label}
              </button>
            ))}
          </Dropdown>

          {/* Font size */}
          <Dropdown label={<span className="flex items-center gap-1"><span className="font-bold text-[10px]">Aa</span>Size</span>}>
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().setFontSize(s).run();
                }}
                className="block w-full text-left px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white"
              >
                {s}
              </button>
            ))}
          </Dropdown>

          <div className="w-px h-4 bg-white/15 mx-0.5" />

          {/* Bold / Italic / Underline / Strike */}
          <Btn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
            <Bold className="h-3 w-3" />
          </Btn>
          <Btn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
            <Italic className="h-3 w-3" />
          </Btn>
          <Btn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
            <UnderlineIcon className="h-3 w-3" />
          </Btn>
          <Btn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
            <Strikethrough className="h-3 w-3" />
          </Btn>

          <div className="w-px h-4 bg-white/15 mx-0.5" />

          {/* Text color */}
          <ColorPicker
            icon={<Palette className="h-3 w-3" />}
            title="Text color"
            onSelect={(c) => editor.chain().focus().setColor(c).run()}
            onCustom={(c) => editor.chain().focus().setColor(c).run()}
            onClear={() => editor.chain().focus().unsetColor().run()}
          />

          {/* Highlight / background color */}
          <ColorPicker
            icon={<Highlighter className="h-3 w-3" />}
            title="Highlight color"
            onSelect={(c) => editor.chain().focus().toggleHighlight({ color: c }).run()}
            onCustom={(c) => editor.chain().focus().toggleHighlight({ color: c }).run()}
            onClear={() => editor.chain().focus().unsetHighlight().run()}
          />

          <div className="w-px h-4 bg-white/15 mx-0.5" />

          {/* Lists */}
          <Btn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
            <List className="h-3 w-3" />
          </Btn>
          <Btn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
            <ListOrdered className="h-3 w-3" />
          </Btn>

          <div className="w-px h-4 bg-white/15 mx-0.5" />

          {/* Headings */}
          {([1, 2, 3] as const).map((level) => (
            <Btn
              key={level}
              active={editor.isActive("heading", { level })}
              onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
              title={`Heading ${level}`}
            >
              <span className="text-[10px] font-bold leading-none">H{level}</span>
            </Btn>
          ))}
        </div>
      )}

      {/* ── Editor area ── */}
      <EditorContent editor={editor} />

      {/* Placeholder */}
      {!editor.getText().trim() && placeholder && (
        <p className="absolute top-0 left-0 px-2 py-1.5 text-xs text-muted-foreground pointer-events-none select-none">
          {placeholder}
        </p>
      )}
    </div>
  );
}
