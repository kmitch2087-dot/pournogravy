/**
 * Email Templates admin page.
 *
 * Features:
 *  - Template list sidebar (select, duplicate, delete)
 *  - Subject line editor
 *  - Rich visual editor (contenteditable + full toolbar)
 *  - Variable palette — click any chip to insert {{variable}} at cursor
 *  - HTML source view (synced with visual editor)
 *  - Live preview iframe (with mobile/desktop toggle)
 *  - Plain text editor (auto-generated or manual)
 *  - Send test email with variable substitution
 *  - New template modal
 *
 * No new npm packages — toolbar uses document.execCommand (still supported in all
 * major browsers; deprecated but not removed). For a future TipTap upgrade, the
 * component boundary is the <RichEditor> inner component.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
  Minus, Undo2, Redo2, Type, Braces, Code2, Eye, EyeOff,
  Send, Save, Plus, Copy, Trash2, Loader2, Monitor, Smartphone,
  ChevronDown, Palette,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmailTemplate {
  key:         string;
  name:        string;
  description: string | null;
  subject:     string;
  body_html:   string;
  body_text:   string;
  variables:   string[];
  created_at:  string;
  updated_at:  string | null;
}

type EditorTab = "visual" | "html" | "preview" | "text";

// ── Toolbar helpers ────────────────────────────────────────────────────────────

const exec = (cmd: string, value?: string) => {
  document.execCommand(cmd, false, value ?? undefined);
};

const HEADING_OPTIONS = [
  { label: "Paragraph", value: "p"  },
  { label: "Heading 1", value: "h1" },
  { label: "Heading 2", value: "h2" },
  { label: "Heading 3", value: "h3" },
];

const TEXT_COLORS = [
  "#ffffff","#f5f5f5","#a3a3a3","#525252","#0f0f0f",
  "#fde047","#f59e0b","#ef4444","#22c55e","#3b82f6",
  "#8b5cf6","#ec4899","#06b6d4","#f97316","#84cc16",
];

// ── Editor toolbar ─────────────────────────────────────────────────────────────

const ToolBtn = ({
  onClick, title, active, children,
}: {
  onClick: () => void; title: string; active?: boolean; children: React.ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        className={`h-7 w-7 flex items-center justify-center rounded text-xs transition-colors
          ${active
            ? "bg-[#fde047] text-black"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
      >
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="text-xs">{title}</TooltipContent>
  </Tooltip>
);

const ToolSep = () => <div className="w-px h-5 bg-border mx-0.5 shrink-0" />;

const EditorToolbar = ({
  onInsertVariable,
  variables,
}: {
  onInsertVariable: (v: string) => void;
  variables: string[];
}) => {
  const [showColorPicker, setShowColorPicker] = useState<"text" | "bg" | null>(null);
  const [linkUrl, setLinkUrl]                 = useState("");
  const [showLinkInput, setShowLinkInput]     = useState(false);
  const [showImgInput, setShowImgInput]       = useState(false);
  const [imgUrl, setImgUrl]                   = useState("");

  const insertLink = () => {
    if (!linkUrl.trim()) return;
    exec("createLink", linkUrl.trim());
    setShowLinkInput(false);
    setLinkUrl("");
  };

  const insertImage = () => {
    if (!imgUrl.trim()) return;
    exec("insertImage", imgUrl.trim());
    setShowImgInput(false);
    setImgUrl("");
  };

  return (
    <div className="border border-border rounded-t-sm bg-card">
      {/* Row 1 */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
        <ToolBtn title="Undo (⌘Z)"  onClick={() => exec("undo")} ><Undo2 className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn title="Redo (⌘⇧Z)" onClick={() => exec("redo")} ><Redo2 className="h-3.5 w-3.5" /></ToolBtn>
        <ToolSep />

        {/* Bold / Italic / Underline / Strike */}
        <ToolBtn title="Bold (⌘B)"        onClick={() => exec("bold")}          ><Bold        className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn title="Italic (⌘I)"      onClick={() => exec("italic")}        ><Italic      className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn title="Underline (⌘U)"   onClick={() => exec("underline")}     ><Underline   className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn title="Strikethrough"    onClick={() => exec("strikeThrough")} ><Strikethrough className="h-3.5 w-3.5" /></ToolBtn>
        <ToolSep />

        {/* Heading selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 h-7 px-2 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground rounded transition-colors"
            >
              <Type className="h-3.5 w-3.5" />
              <ChevronDown className="h-2.5 w-2.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[130px]">
            {HEADING_OPTIONS.map(({ label, value }) => (
              <DropdownMenuItem
                key={value}
                onSelect={() => exec("formatBlock", value)}
                className="text-xs"
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <ToolSep />

        {/* Text / Background color */}
        <div className="relative">
          <ToolBtn title="Text color" onClick={() => setShowColorPicker(p => p === "text" ? null : "text")}>
            <Palette className="h-3.5 w-3.5" />
          </ToolBtn>
          {showColorPicker === "text" && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded p-2 shadow-lg">
              <p className="text-[10px] text-muted-foreground mb-1.5 font-marker tracking-widest">TEXT COLOR</p>
              <div className="grid grid-cols-5 gap-1">
                {TEXT_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); exec("foreColor", c); setShowColorPicker(null); }}
                    className="h-5 w-5 rounded-sm border border-border/50 hover:scale-110 transition-transform"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 mb-1.5 font-marker tracking-widest">BG COLOR</p>
              <div className="grid grid-cols-5 gap-1">
                {TEXT_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); exec("hiliteColor", c); setShowColorPicker(null); }}
                    className="h-5 w-5 rounded-sm border border-border/50 hover:scale-110 transition-transform"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        <ToolSep />

        {/* Alignment */}
        <ToolBtn title="Align left"    onClick={() => exec("justifyLeft")}   ><AlignLeft    className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn title="Align center"  onClick={() => exec("justifyCenter")} ><AlignCenter  className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn title="Align right"   onClick={() => exec("justifyRight")}  ><AlignRight   className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn title="Justify"       onClick={() => exec("justifyFull")}   ><AlignJustify className="h-3.5 w-3.5" /></ToolBtn>
        <ToolSep />

        {/* Lists */}
        <ToolBtn title="Bullet list"   onClick={() => exec("insertUnorderedList")} ><List        className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn title="Numbered list" onClick={() => exec("insertOrderedList")}   ><ListOrdered className="h-3.5 w-3.5" /></ToolBtn>
        <ToolSep />

        {/* Link */}
        <div className="relative">
          <ToolBtn title="Insert link" onClick={() => setShowLinkInput(p => !p)}>
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolBtn>
          {showLinkInput && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded p-2 shadow-lg flex gap-1.5 w-64">
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="h-7 text-xs flex-1"
                onKeyDown={(e) => e.key === "Enter" && insertLink()}
                autoFocus
              />
              <Button size="sm" className="h-7 px-2 text-xs" onClick={insertLink}>Insert</Button>
            </div>
          )}
        </div>

        {/* Image */}
        <div className="relative">
          <ToolBtn title="Insert image" onClick={() => setShowImgInput(p => !p)}>
            <ImageIcon className="h-3.5 w-3.5" />
          </ToolBtn>
          {showImgInput && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded p-2 shadow-lg flex gap-1.5 w-72">
              <Input
                value={imgUrl}
                onChange={(e) => setImgUrl(e.target.value)}
                placeholder="Image URL or Supabase Storage URL"
                className="h-7 text-xs flex-1"
                onKeyDown={(e) => e.key === "Enter" && insertImage()}
                autoFocus
              />
              <Button size="sm" className="h-7 px-2 text-xs" onClick={insertImage}>Insert</Button>
            </div>
          )}
        </div>

        {/* Horizontal rule */}
        <ToolBtn title="Horizontal rule" onClick={() => exec("insertHorizontalRule")}>
          <Minus className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Remove formatting" onClick={() => exec("removeFormat")}>
          <Code2 className="h-3.5 w-3.5" />
        </ToolBtn>
      </div>

      {/* Variable palette row */}
      {variables.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 border-t border-border bg-muted/30">
          <span className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase shrink-0">
            <Braces className="h-3 w-3 inline mr-1" />Variables
          </span>
          {variables.map((v) => (
            <button
              key={v}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onInsertVariable(v); }}
              className="inline-flex items-center h-5 px-2 rounded text-[10px] font-mono border border-[#fde047]/40 text-[#fde047] bg-[#fde047]/5 hover:bg-[#fde047]/15 transition-colors"
              title={`Insert {{${v}}}`}
            >
              {`{{${v}}}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── HTML → plain text helper ───────────────────────────────────────────────────

const htmlToText = (html: string): string => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
};

// ── Variable placeholder display transform (display-only) ─────────────────────
// Converts {{variable_name}} → [Variable Name] for human-readable preview.
// The stored value in the DB always keeps {{variable}} syntax for sending.

const VARIABLE_LABELS: Record<string, string> = {
  customer_name:    "Customer Name",
  order_id:         "Order ID",
  order_number:     "Order Number",
  tracking_number:  "Tracking Number",
  tracking_carrier: "Tracking Carrier",
  tracking_url:     "Tracking URL",
  product_name:     "Product Name",
  magic_link:       "Tracking Submission Link",
  customer_email:   "Customer Email",
  customer_phone:   "Customer Phone",
  page_url:         "Page URL",
  content:          "Content",
  created_at:       "Created At",
  notes:            "Notes",
  garment:          "Garment",
  design_name:      "Design Name",
};

const toTitleCase = (key: string) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const renderVariablePlaceholders = (text: string): string =>
  text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const label = VARIABLE_LABELS[key] ?? toTitleCase(key);
    return `[${label}]`;
  });

// ── Preview wrapper — basic email shell ───────────────────────────────────────

const wrapForPreview = (html: string, vars: Record<string, string>) => {
  let rendered = html;
  Object.entries(vars).forEach(([k, v]) => {
    rendered = rendered.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v || `[${k}]`);
  });
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin: 0; padding: 16px; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
         font-size: 15px; line-height: 1.6; color: #1a1a1a; background: #f5f5f5; }
  .wrapper { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 4px;
             box-shadow: 0 1px 4px rgba(0,0,0,.08); overflow: hidden; }
  .body-content { padding: 24px 28px; }
  .footer { padding: 16px 28px; background: #0f0f0f; color: #888; font-size: 12px; text-align: center; }
  img { max-width: 100%; height: auto; }
  h1,h2,h3 { margin-top: 0; }
  a { color: #d97706; }
</style>
</head><body>
<div class="wrapper">
  <div class="body-content">${rendered}</div>
  <div class="footer">POURnogravy &mdash; <a href="https://pournogravy.com" style="color:#888">pournogravy.com</a></div>
</div>
</body></html>`;
};

// ── Main page ─────────────────────────────────────────────────────────────────

const EmailTemplates = () => {
  const qc = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["admin-email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as EmailTemplate[];
    },
  });

  const [selectedKey, setSelectedKey]       = useState<string | null>(null);
  const [activeTab, setActiveTab]           = useState<EditorTab>("visual");
  const [subject, setSubject]               = useState("");
  const [tplName, setTplName]               = useState("");
  const [htmlContent, setHtmlContent]       = useState("");
  const [plainText, setPlainText]           = useState("");
  const [autoPlainText, setAutoPlainText]   = useState(true);
  const [previewVars, setPreviewVars]       = useState<Record<string, string>>({});
  const [previewWidth, setPreviewWidth]     = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving]                 = useState(false);
  const [sendingTest, setSendingTest]       = useState(false);
  const [testEmail, setTestEmail]           = useState("");
  const [newTplOpen, setNewTplOpen]         = useState(false);
  const [newTplKey, setNewTplKey]           = useState("");
  const [newTplName, setNewTplName]         = useState("");
  const [creatingTpl, setCreatingTpl]       = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const selectedTpl = templates.find((t) => t.key === selectedKey) ?? null;

  // Populate form when template changes
  useEffect(() => {
    if (!selectedTpl) return;
    setSubject(selectedTpl.subject);
    setTplName(selectedTpl.name);
    setHtmlContent(selectedTpl.body_html);
    setPlainText(selectedTpl.body_text);
    setAutoPlainText(true);
    setActiveTab("visual");

    // Init preview vars
    const vars: Record<string, string> = {};
    (selectedTpl.variables ?? []).forEach((v) => { vars[v] = ""; });
    setPreviewVars(vars);

    // Set editor content
    if (editorRef.current) {
      editorRef.current.innerHTML = selectedTpl.body_html;
    }
  }, [selectedTpl?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select first template
  useEffect(() => {
    if (templates.length > 0 && !selectedKey) {
      setSelectedKey(templates[0].key);
    }
  }, [templates, selectedKey]);

  // Sync editor → htmlContent on tab switch away from visual
  const syncEditorToHtml = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setHtmlContent(html);
      if (autoPlainText) setPlainText(htmlToText(html));
    }
  }, [autoPlainText]);

  // Sync htmlContent → editor when switching back to visual
  const syncHtmlToEditor = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = htmlContent;
    }
  }, [htmlContent]);

  const handleTabChange = (tab: EditorTab) => {
    if (activeTab === "visual") syncEditorToHtml();
    if (tab === "visual")       syncHtmlToEditor();
    if (tab === "preview") {
      syncEditorToHtml();
      // Slight delay for state to settle before iframe update
      setTimeout(() => {
        if (iframeRef.current) {
          const doc = iframeRef.current.contentDocument;
          if (doc) {
            doc.open();
            doc.write(wrapForPreview(
              activeTab === "visual" && editorRef.current
                ? editorRef.current.innerHTML
                : htmlContent,
              previewVars,
            ));
            doc.close();
          }
        }
      }, 50);
    }
    setActiveTab(tab);
  };

  // Keep preview fresh when preview tab is active
  useEffect(() => {
    if (activeTab !== "preview") return;
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(wrapForPreview(htmlContent, previewVars));
    doc.close();
  }, [activeTab, htmlContent, previewVars]);

  const insertVariable = useCallback((v: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand("insertText", false, `{{${v}}}`);
    }
  }, []);

  const handleSave = async () => {
    if (!selectedTpl) return;
    syncEditorToHtml();
    setSaving(true);
    const currentHtml = editorRef.current?.innerHTML ?? htmlContent;
    const currentText = autoPlainText ? htmlToText(currentHtml) : plainText;
    const { error } = await supabase
      .from("email_templates")
      .update({
        name:      tplName.trim() || selectedTpl.name,
        subject:   subject.trim(),
        body_html: currentHtml,
        body_text: currentText,
        updated_at: new Date().toISOString(),
      })
      .eq("key", selectedTpl.key);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Template saved.");
      qc.invalidateQueries({ queryKey: ["admin-email-templates"] });
    }
  };

  const handleSendTest = async () => {
    if (!selectedTpl || !testEmail.trim()) return toast.error("Enter a recipient email");
    setSendingTest(true);
    syncEditorToHtml();
    const currentHtml = editorRef.current?.innerHTML ?? htmlContent;
    const currentText = autoPlainText ? htmlToText(currentHtml) : plainText;
    // Save first, then trigger
    await supabase.from("email_templates").update({
      body_html: currentHtml, body_text: currentText,
    }).eq("key", selectedTpl.key);
    try {
      const { error } = await supabase.functions.invoke("send-notification", {
        body: {
          templateKey: selectedTpl.key,
          recipient:   testEmail.trim(),
          variables:   previewVars,
        },
      });
      if (error) throw error;
      toast.success(`Test sent to ${testEmail.trim()}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSendingTest(false);
    }
  };

  const handleDuplicate = async (tpl: EmailTemplate) => {
    const newKey  = `${tpl.key}_copy_${Date.now()}`;
    const newName = `${tpl.name} (copy)`;
    const { error } = await supabase.from("email_templates").insert({
      key:       newKey,
      name:      newName,
      description: tpl.description,
      subject:   tpl.subject,
      body_html: tpl.body_html,
      body_text: tpl.body_text,
      variables: tpl.variables,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Template duplicated");
      qc.invalidateQueries({ queryKey: ["admin-email-templates"] });
      setSelectedKey(newKey);
    }
  };

  const handleDelete = async (tpl: EmailTemplate) => {
    if (!confirm(`Delete template "${tpl.name}"? This can't be undone.`)) return;
    const { error } = await supabase
      .from("email_templates")
      .delete()
      .eq("key", tpl.key);
    if (error) toast.error(error.message);
    else {
      toast.success("Template deleted");
      qc.invalidateQueries({ queryKey: ["admin-email-templates"] });
      if (selectedKey === tpl.key) setSelectedKey(null);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTplKey.trim() || !newTplName.trim()) return;
    setCreatingTpl(true);
    const { error } = await supabase.from("email_templates").insert({
      key:       newTplKey.trim().toLowerCase().replace(/\s+/g, "_"),
      name:      newTplName.trim(),
      subject:   `[${newTplName.trim()}]`,
      body_html: `<p>Hi {{customer_name}},</p><p>Your message here.</p>`,
      body_text: `Hi {{customer_name}},\n\nYour message here.`,
      variables: ["customer_name"],
    });
    setCreatingTpl(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Template created");
      qc.invalidateQueries({ queryKey: ["admin-email-templates"] });
      setSelectedKey(newTplKey.trim().toLowerCase().replace(/\s+/g, "_"));
      setNewTplOpen(false);
      setNewTplKey("");
      setNewTplName("");
    }
  };

  const TAB_CLASSES = (t: EditorTab) =>
    `px-3 py-1.5 text-xs font-display tracking-widest border-b-2 transition-colors ${
      activeTab === t
        ? "border-[#fde047] text-[#fde047]"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="flex h-full -m-4 md:-m-6 overflow-hidden">

      {/* ── Template list sidebar ──────────────────────────────────── */}
      <div className="w-56 lg:w-64 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="flex items-center justify-between px-3 py-3 border-b border-border">
          <span className="font-display tracking-widest text-xs">TEMPLATES</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setNewTplOpen(true)}
            title="New template"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 px-3">
              No templates yet. Hit + to create one.
            </p>
          ) : (
            templates.map((tpl) => (
              <div
                key={tpl.key}
                className={`group relative flex items-start gap-2 px-3 py-2.5 cursor-pointer border-l-2 transition-colors ${
                  selectedKey === tpl.key
                    ? "border-l-[#fde047] bg-[#fde047]/5 text-foreground"
                    : "border-l-transparent hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setSelectedKey(tpl.key)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{tpl.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                    {tpl.key}
                  </p>
                </div>
                {/* Hover actions */}
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                  <button
                    type="button"
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted/60"
                    title="Duplicate"
                    onClick={(e) => { e.stopPropagation(); handleDuplicate(tpl); }}
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive"
                    title="Delete"
                    onClick={(e) => { e.stopPropagation(); handleDelete(tpl); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Editor area ───────────────────────────────────────────── */}
      {selectedTpl ? (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Header row */}
          <div className="px-4 md:px-6 py-3 border-b border-border bg-card shrink-0 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <input
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                className="font-display tracking-widest text-base bg-transparent border-none outline-none w-full text-foreground placeholder:text-muted-foreground"
                placeholder="Template name"
              />
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{selectedTpl.key}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="h-8 bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest text-xs gap-1.5"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                SAVE
              </Button>
            </div>
          </div>

          {/* Subject line */}
          <div className="px-4 md:px-6 py-2.5 border-b border-border bg-card/50 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase shrink-0 w-14">
                SUBJECT
              </span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                placeholder="Email subject line…"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0 px-4 md:px-6 border-b border-border bg-card/50 shrink-0">
            <button className={TAB_CLASSES("visual")}  onClick={() => handleTabChange("visual")} >VISUAL</button>
            <button className={TAB_CLASSES("html")}    onClick={() => handleTabChange("html")}   >HTML</button>
            <button className={TAB_CLASSES("preview")} onClick={() => handleTabChange("preview")}>PREVIEW</button>
            <button className={TAB_CLASSES("text")}    onClick={() => handleTabChange("text")}   >PLAIN TEXT</button>
          </div>

          {/* Editor content area */}
          <div className="flex-1 overflow-hidden flex flex-col">

            {/* VISUAL TAB */}
            {activeTab === "visual" && (
              <div className="flex-1 flex flex-col p-4 md:p-6 overflow-auto gap-3">
                <EditorToolbar
                  onInsertVariable={insertVariable}
                  variables={selectedTpl.variables ?? []}
                />
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="flex-1 min-h-[320px] border border-border border-t-0 rounded-b-sm p-4 text-sm leading-relaxed outline-none focus:ring-0 bg-card overflow-auto"
                  style={{ caretColor: "#fde047" }}
                  onInput={() => {
                    if (autoPlainText && editorRef.current) {
                      setPlainText(htmlToText(editorRef.current.innerHTML));
                    }
                  }}
                />
              </div>
            )}

            {/* HTML TAB */}
            {activeTab === "html" && (
              <div className="flex-1 p-4 md:p-6 flex flex-col gap-3 overflow-auto">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Raw HTML — edits here sync to Visual editor. Use Supabase Storage URLs for images.
                  </p>
                </div>
                <Textarea
                  value={htmlContent}
                  onChange={(e) => {
                    setHtmlContent(e.target.value);
                    if (autoPlainText) setPlainText(htmlToText(e.target.value));
                  }}
                  className="flex-1 min-h-[420px] font-mono text-xs resize-none"
                  spellCheck={false}
                />
              </div>
            )}

            {/* PREVIEW TAB */}
            {activeTab === "preview" && (
              <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
                {/* Preview controls */}
                <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewWidth("desktop")}
                    className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors ${previewWidth === "desktop" ? "bg-[#fde047]/10 text-[#fde047]" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Monitor className="h-3.5 w-3.5" /> Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewWidth("mobile")}
                    className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors ${previewWidth === "mobile" ? "bg-[#fde047]/10 text-[#fde047]" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Smartphone className="h-3.5 w-3.5" /> Mobile
                  </button>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-[10px] font-marker tracking-widest text-muted-foreground">FILL VARS TO PREVIEW:</span>
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {(selectedTpl.variables ?? []).map((v) => (
                      <div key={v} className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-[#fde047]/70">{`{{${v}}}`}</span>
                        <Input
                          value={previewVars[v] ?? ""}
                          onChange={(e) => setPreviewVars((p) => ({ ...p, [v]: e.target.value }))}
                          placeholder={v}
                          className="h-6 text-[10px] w-24 px-1.5"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* iframe */}
                <div className="flex-1 overflow-auto py-4 flex justify-center bg-[#888]/10">
                  <iframe
                    ref={iframeRef}
                    title="Email preview"
                    sandbox="allow-same-origin"
                    className="border-0 bg-white shadow-lg transition-all duration-300"
                    style={{
                      width:  previewWidth === "mobile" ? "375px" : "100%",
                      maxWidth: "680px",
                      height: "100%",
                      minHeight: "500px",
                    }}
                  />
                </div>
              </div>
            )}

            {/* PLAIN TEXT TAB */}
            {activeTab === "text" && (
              <div className="flex-1 p-4 md:p-6 flex flex-col gap-3 overflow-auto">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Plain text fallback for email clients that don't render HTML.
                  </p>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoPlainText}
                      onChange={(e) => {
                        setAutoPlainText(e.target.checked);
                        if (e.target.checked) setPlainText(htmlToText(htmlContent));
                      }}
                      className="accent-[#fde047]"
                    />
                    Auto-generate from HTML
                  </label>
                </div>
                <Textarea
                  value={autoPlainText ? renderVariablePlaceholders(plainText) : plainText}
                  onChange={(e) => setPlainText(e.target.value)}
                  disabled={autoPlainText}
                  className="flex-1 min-h-[380px] font-mono text-xs resize-none disabled:opacity-60"
                  spellCheck={false}
                />
              </div>
            )}

          </div>

          {/* Footer: send test */}
          <div className="px-4 md:px-6 py-3 border-t border-border bg-card shrink-0 flex items-center gap-3">
            <span className="text-xs text-muted-foreground shrink-0">Send test to:</span>
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-8 text-xs max-w-xs"
              onKeyDown={(e) => e.key === "Enter" && handleSendTest()}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5 shrink-0"
              onClick={handleSendTest}
              disabled={sendingTest || !testEmail.trim()}
            >
              {sendingTest
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                : <><Send className="h-3.5 w-3.5" /> Send Test</>}
            </Button>
            <span className="text-[10px] text-muted-foreground ml-auto hidden lg:block">
              Variables from the Preview tab will be substituted in the test email.
            </span>
          </div>

        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-3">
          <Eye className="h-10 w-10 opacity-20" />
          <p className="text-sm">Select a template to edit</p>
          <Button size="sm" variant="outline" className="gap-1.5 mt-2" onClick={() => setNewTplOpen(true)}>
            <Plus className="h-4 w-4" /> New Template
          </Button>
        </div>
      )}

      {/* ── New template dialog ──────────────────────────────────── */}
      <Dialog open={newTplOpen} onOpenChange={setNewTplOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display tracking-widest">NEW TEMPLATE</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Template Name</Label>
              <Input
                value={newTplName}
                onChange={(e) => {
                  setNewTplName(e.target.value);
                  if (!newTplKey) {
                    setNewTplKey(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
                  }
                }}
                placeholder="e.g. Order Shipped"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Template Key <span className="text-muted-foreground">(used in code)</span></Label>
              <Input
                value={newTplKey}
                onChange={(e) => setNewTplKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="e.g. order_shipped"
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setNewTplOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest"
              disabled={!newTplKey.trim() || !newTplName.trim() || creatingTpl}
              onClick={handleCreateTemplate}
            >
              {creatingTpl ? <Loader2 className="h-4 w-4 animate-spin" /> : "CREATE"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default EmailTemplates;
