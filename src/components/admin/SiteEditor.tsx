import { useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Settings2, X, Eye, EyeOff, ChevronDown, ChevronRight, Save } from "lucide-react";
import { useSiteContent, SiteContentRow } from "@/context/SiteContentContext";
import { useAuth } from "@/context/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Curated Google Fonts on-brand for Pournogravy
const GOOGLE_FONTS = [
  "Oswald", "Bebas Neue", "Anton", "Rajdhani", "Barlow Condensed",
  "Black Han Sans", "Righteous", "Permanent Marker", "Rye", "Special Elite",
];

// Map URL path → page key stored in site_content
const PATH_TO_PAGE: Record<string, string> = {
  "/":        "home",
  "/shop":    "shop",
  "/about":   "about",
  "/contact": "contact",
  "/faq":     "faq",
};

// ─── Field inputs ─────────────────────────────────────────────────────────────

export function FieldInput({
  row,
  onChange,
}: {
  row: SiteContentRow;
  onChange: (value: string) => void;
}) {
  const current = row.value ?? row.default_value ?? "";

  if (row.value_type === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <Switch
          checked={current === "true"}
          onCheckedChange={(v) => onChange(String(v))}
          id={row.id}
        />
        <Label htmlFor={row.id} className="text-xs cursor-pointer">
          {current === "true" ? "Visible" : "Hidden"}
        </Label>
      </div>
    );
  }

  if (row.value_type === "color") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={current || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
        />
        <input
          type="text"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-xs bg-transparent border border-border px-2 py-1.5 focus:outline-none focus:border-[#fde047]"
          placeholder="#000000"
        />
      </div>
    );
  }

  if (row.value_type === "font") {
    return (
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs bg-card border border-border px-2 py-1.5 focus:outline-none focus:border-[#fde047] cursor-pointer"
      >
        <option value="">— default —</option>
        {GOOGLE_FONTS.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>
    );
  }

  if (row.value_type === "select" && row.options?.length) {
    return (
      <div className="flex gap-1 flex-wrap">
        {row.options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3 py-1 text-xs border transition-all ${
              current === opt
                ? "bg-[#fde047] text-black border-[#fde047]"
                : "border-border text-muted-foreground hover:border-foreground/40"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  // text / image / default
  const isLong = row.value_type === "text" && (current.length > 60);
  return isLong ? (
    <textarea
      value={current}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className="w-full text-xs bg-transparent border border-border px-2 py-1.5 focus:outline-none focus:border-[#fde047] resize-y"
    />
  ) : (
    <input
      type="text"
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-xs bg-transparent border border-border px-2 py-1.5 focus:outline-none focus:border-[#fde047]"
      placeholder={row.default_value ?? ""}
    />
  );
}

// ─── Section group ─────────────────────────────────────────────────────────────

export function SectionGroup({
  page,
  section,
  rows,
}: {
  page: string;
  section: string;
  rows: SiteContentRow[];
}) {
  const { setValue, setPublished } = useSiteContent();
  const [open, setOpen] = useState(true);
  const [dirty, setDirty] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const visibleRow = rows.find((r) => r.key === "visible");
  const isVisible  = (dirty["visible"] ?? visibleRow?.value ?? "true") === "true";
  const editableRows = rows.filter((r) => r.key !== "visible");

  const handleChange = (key: string, value: string) => {
    setDirty((d) => ({ ...d, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(dirty)) {
        if (key === "visible") {
          await setPublished(page, section, value === "true");
        } else {
          await setValue(page, section, key, value);
        }
      }
      setDirty({});
      toast.success("Saved — changes live immediately");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const hasDirty = Object.keys(dirty).length > 0;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-display tracking-widest uppercase text-foreground flex-1 text-left"
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {section}
        </button>
        {visibleRow && (
          <button
            onClick={() => handleChange("visible", isVisible ? "false" : "true")}
            className={`p-1 rounded transition-colors ${isVisible ? "text-green-400" : "text-muted-foreground"}`}
            title={isVisible ? "Section visible — click to hide" : "Section hidden — click to show"}
          >
            {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Fields */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-3">
              {editableRows.map((row) => {
                const currentVal = dirty[row.key] !== undefined ? dirty[row.key] : (row.value ?? row.default_value ?? "");
                return (
                  <div key={row.key}>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                      {row.label}
                    </Label>
                    <FieldInput
                      row={{ ...row, value: currentVal }}
                      onChange={(v) => handleChange(row.key, v)}
                    />
                  </div>
                );
              })}
              {hasDirty && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-display tracking-widest uppercase bg-[#fde047] text-black hover:bg-[#fbbf24] transition-colors disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main SiteEditor ──────────────────────────────────────────────────────────

export function SiteEditor() {
  const { isAdmin } = useAuth();
  const { rows }    = useSiteContent();
  const location    = useLocation();
  const [open, setOpen] = useState(false);

  if (!isAdmin) return null;

  const pageName = PATH_TO_PAGE[location.pathname];
  if (!pageName) return null; // not a CMS-managed page

  // Get all rows for this page, grouped by section
  const pageRows = rows.filter((r) => r.page === pageName);
  const sections = [...new Set(pageRows.map((r) => r.section))];

  if (sections.length === 0) return null;

  return (
    <>
      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-black/90 text-white border border-[#fde047]/40 hover:border-[#fde047] text-xs font-display tracking-widest uppercase shadow-lg backdrop-blur-sm transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        title="Edit page content"
      >
        <Settings2 className="h-3.5 w-3.5 text-[#fde047]" />
        Edit Page
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            {/* Drawer */}
            <motion.aside
              className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-background border-l border-border overflow-y-auto flex flex-col"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-border sticky top-0 bg-background z-10">
                <div>
                  <p className="font-display tracking-widest text-sm uppercase">Edit Page</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{pageName} · Changes go live instantly</p>
                </div>
                <button onClick={() => setOpen(false)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Sections */}
              <div className="p-4 space-y-3 flex-1">
                {sections.map((section) => (
                  <SectionGroup
                    key={section}
                    page={pageName}
                    section={section}
                    rows={pageRows.filter((r) => r.section === section)}
                  />
                ))}
              </div>

              <div className="px-4 pb-4 pt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground text-center">
                  Only visible to admins · Content writes directly to Supabase
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
