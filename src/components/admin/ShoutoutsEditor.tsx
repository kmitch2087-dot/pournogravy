import { useState, useEffect } from "react";
import { useSiteContent } from "@/context/SiteContentContext";
import { parseShoutouts, Shoutout } from "@/lib/shoutouts";
import { Trash2, Plus, Save, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const BLANK: Shoutout = { name: "", blurb: "", website: "", instagram: "", facebook: "", email: "" };

const FIELDS: { key: keyof Shoutout; label: string; placeholder: string; textarea?: boolean }[] = [
  { key: "name",      label: "Name",      placeholder: "e.g. Kristin at Aethyx" },
  { key: "blurb",     label: "Blurb",     placeholder: "What they did / your thank-you…", textarea: true },
  { key: "website",   label: "Website",   placeholder: "aethyx.space" },
  { key: "instagram", label: "Instagram", placeholder: "handle (no @)" },
  { key: "facebook",  label: "Facebook",  placeholder: "handle or profile URL" },
  { key: "email",     label: "Email",     placeholder: "name@example.com" },
];

// Structured editor for the Thank You page shout-outs (page='thanks',
// section='crew', key='shoutouts' — a JSON array). Explicit Save so a stray
// keystroke never writes; the whole array persists at once.
export function ShoutoutsEditor() {
  const { getValue, setValue } = useSiteContent();
  const stored = getValue("thanks", "crew", "shoutouts", "");

  const [items, setItems] = useState<Shoutout[]>(() => parseShoutouts(stored));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Re-sync from the store on external changes, but never clobber unsaved edits.
  useEffect(() => {
    if (!dirty) setItems(parseShoutouts(stored));
  }, [stored, dirty]);

  const update = (i: number, field: keyof Shoutout, val: string) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: val } : it)));
    setDirty(true);
  };
  const add = () => { setItems((prev) => [...prev, { ...BLANK }]); setDirty(true); };
  const remove = (i: number) => { setItems((prev) => prev.filter((_, idx) => idx !== i)); setDirty(true); };
  const move = (i: number, dir: -1 | 1) => {
    setItems((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const clean = items
        .map((s) => ({
          name: s.name.trim(),
          blurb: s.blurb,
          website: (s.website ?? "").trim(),
          instagram: (s.instagram ?? "").trim(),
          facebook: (s.facebook ?? "").trim(),
          email: (s.email ?? "").trim(),
        }))
        .filter((s) => s.name || s.blurb);
      await setValue("thanks", "crew", "shoutouts", JSON.stringify(clean), "text");
      setDirty(false);
      toast.success("Shout-outs saved — live immediately");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase">
          Shout-outs
        </p>
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display tracking-widest uppercase bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </button>
        )}
      </div>

      {items.length === 0 && (
        <p className="text-xs text-muted-foreground/60 py-4 text-center border border-dashed border-border/40">
          No shout-outs yet. Add one below.
        </p>
      )}

      {items.map((s, i) => (
        <div key={i} className="border border-border rounded-md p-3 space-y-2.5 bg-muted/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-display tracking-widest text-muted-foreground">
              #{i + 1}{s.name ? ` · ${s.name}` : ""}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => move(i, -1)} disabled={i === 0}
                className="p-1 text-muted-foreground/50 hover:text-foreground disabled:opacity-30" title="Move up">
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => move(i, 1)} disabled={i === items.length - 1}
                className="p-1 text-muted-foreground/50 hover:text-foreground disabled:opacity-30" title="Move down">
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => remove(i)}
                className="p-1 text-muted-foreground/50 hover:text-destructive" title="Remove">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="text-[9px] text-muted-foreground uppercase tracking-wider block mb-1">
                {f.label}
              </label>
              {f.textarea ? (
                <textarea
                  value={s[f.key] ?? ""}
                  onChange={(e) => update(i, f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={4}
                  className="w-full bg-transparent border border-border px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-[#fde047] resize-y"
                />
              ) : (
                <input
                  type="text"
                  value={s[f.key] ?? ""}
                  onChange={(e) => update(i, f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full bg-transparent border border-border px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-[#fde047]"
                />
              )}
            </div>
          ))}
        </div>
      ))}

      <button
        onClick={add}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] text-muted-foreground/70 hover:text-[#fde047] hover:bg-muted/20 transition-colors border border-dashed border-border/40 hover:border-[#fde047]/40 uppercase tracking-widest font-display"
      >
        <Plus className="h-3 w-3" /> Add shout-out
      </button>

      {dirty && (
        <button
          onClick={save}
          disabled={saving}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-display tracking-widest uppercase bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {saving ? "Saving…" : "Save Shout-outs"}
        </button>
      )}
    </div>
  );
}
