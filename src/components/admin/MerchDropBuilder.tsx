import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Clock, Image, Tag, Megaphone, Mail, Package,
  Plus, X, Loader2, Upload, Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { QuickProductModal } from "./QuickProductModal";
import type { MerchDrop } from "@/hooks/useActiveDrops";

// ── section ids for sidebar nav ─────────────────────────────
const SECTIONS = [
  { id: "identity",  label: "Drop Identity",   icon: Package   },
  { id: "schedule",  label: "Schedule",        icon: Calendar  },
  { id: "products",  label: "Products",        icon: Package   },
  { id: "visual",    label: "Visual & Tag",    icon: Image     },
  { id: "ads",       label: "Advertisements",  icon: Megaphone },
  { id: "email",     label: "Marketing Email", icon: Mail      },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-zinc-700 text-zinc-200",
  scheduled: "bg-blue-900/60 text-blue-300",
  active:    "bg-green-900/60 text-green-300",
  ended:     "bg-zinc-700 text-zinc-400",
};

interface MerchDropBuilderProps {
  open: boolean;
  onClose: () => void;
  editingDrop?: MerchDrop | null;
}

interface FormState {
  name: string;
  description: string;
  teaser_blurb: string;
  scheduled_drop_at: string;
  scheduled_drop_time: string;
  ad_launch_at: string;
  ad_launch_time: string;
  status: string;
  flyer_url: string;
  tag_type: string;
  tag_text: string;
  show_hero_banner: boolean;
  show_featured_section: boolean;
  show_shop_banner: boolean;
  show_announcement_bar: boolean;
  email_subject: string;
  email_blurb: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  teaser_blurb: "",
  scheduled_drop_at: "",
  scheduled_drop_time: "12:00",
  ad_launch_at: "",
  ad_launch_time: "09:00",
  status: "draft",
  flyer_url: "",
  tag_type: "none",
  tag_text: "",
  show_hero_banner: false,
  show_featured_section: false,
  show_shop_banner: false,
  show_announcement_bar: false,
  email_subject: "",
  email_blurb: "",
};

const toLocalDateStr = (iso: string) => iso ? iso.substring(0, 10) : "";
const toLocalTimeStr = (iso: string) => iso ? iso.substring(11, 16) : "12:00";
const combineDateTime = (date: string, time: string) =>
  date ? new Date(`${date}T${time || "00:00"}:00`).toISOString() : "";

export const MerchDropBuilder = ({ open, onClose, editingDrop }: MerchDropBuilderProps) => {
  const qc = useQueryClient();
  const [section, setSection] = useState<SectionId>("identity");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showQuickProduct, setShowQuickProduct] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // ── Load editing drop into form ─────────────────────────
  useEffect(() => {
    if (!open) return;
    if (editingDrop) {
      setForm({
        name: editingDrop.name,
        description: editingDrop.description ?? "",
        teaser_blurb: editingDrop.teaser_blurb ?? "",
        scheduled_drop_at: toLocalDateStr(editingDrop.scheduled_drop_at),
        scheduled_drop_time: toLocalTimeStr(editingDrop.scheduled_drop_at),
        ad_launch_at: toLocalDateStr(editingDrop.ad_launch_at ?? ""),
        ad_launch_time: toLocalTimeStr(editingDrop.ad_launch_at ?? ""),
        status: editingDrop.status,
        flyer_url: editingDrop.flyer_url ?? "",
        tag_type: editingDrop.tag_type,
        tag_text: editingDrop.tag_text ?? "",
        show_hero_banner: editingDrop.show_hero_banner,
        show_featured_section: editingDrop.show_featured_section,
        show_shop_banner: editingDrop.show_shop_banner,
        show_announcement_bar: editingDrop.show_announcement_bar,
        email_subject: editingDrop.email_subject ?? "",
        email_blurb: editingDrop.email_blurb ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
      setSelectedProductIds([]);
    }
    setSection("identity");
  }, [open, editingDrop]);

  // ── Load existing products for this drop ────────────────
  useEffect(() => {
    if (!open || !editingDrop) return;
    supabase
      .from("merch_drop_products")
      .select("product_id")
      .eq("drop_id", editingDrop.id)
      .then(({ data }) => {
        setSelectedProductIds((data ?? []).map((r: { product_id: string }) => r.product_id));
      });
  }, [open, editingDrop]);

  // ── Products list for picker ────────────────────────────
  const { data: allProducts = [] } = useQuery({
    queryKey: ["admin-products-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, category, price_cents, image_url, status")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggle = (k: keyof FormState) => (val: boolean) =>
    setForm((f) => ({ ...f, [k]: val }));

  const toggleProduct = (id: string) =>
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // ── Flyer upload ────────────────────────────────────────
  const handleFlyerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("Flyer must be under 8MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `flyers/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("drops").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("drops").getPublicUrl(path);
      setForm((f) => ({ ...f, flyer_url: publicUrl }));
      toast.success("Flyer uploaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Save ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Drop needs a name"); setSection("identity"); return; }
    if (!form.scheduled_drop_at) { toast.error("Set a drop date"); setSection("schedule"); return; }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        teaser_blurb: form.teaser_blurb.trim() || null,
        scheduled_drop_at: combineDateTime(form.scheduled_drop_at, form.scheduled_drop_time),
        ad_launch_at: form.ad_launch_at ? combineDateTime(form.ad_launch_at, form.ad_launch_time) : null,
        status: form.status,
        flyer_url: form.flyer_url || null,
        tag_type: form.tag_type,
        tag_text: form.tag_text.trim() || null,
        show_hero_banner: form.show_hero_banner,
        show_featured_section: form.show_featured_section,
        show_shop_banner: form.show_shop_banner,
        show_announcement_bar: form.show_announcement_bar,
        email_subject: form.email_subject.trim() || null,
        email_blurb: form.email_blurb.trim() || null,
      };

      let dropId: string;
      if (editingDrop) {
        const { error } = await supabase.from("merch_drops").update(payload).eq("id", editingDrop.id);
        if (error) throw error;
        dropId = editingDrop.id;
      } else {
        const { data, error } = await supabase.from("merch_drops").insert(payload).select("id").single();
        if (error) throw error;
        dropId = data.id;
      }

      // Sync selected products: delete all, reinsert
      await supabase.from("merch_drop_products").delete().eq("drop_id", dropId);
      if (selectedProductIds.length > 0) {
        await supabase.from("merch_drop_products").insert(
          selectedProductIds.map((product_id, display_order) => ({ drop_id: dropId, product_id, display_order }))
        );
      }

      toast.success(editingDrop ? "Drop updated" : "Drop created and scheduled");
      qc.invalidateQueries({ queryKey: ["all-merch-drops"] });
      qc.invalidateQueries({ queryKey: ["active-merch-drops"] });
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ── Tag preview ─────────────────────────────────────────
  const TagPreview = () => {
    if (form.tag_type === "none") return <span className="text-xs text-muted-foreground italic">No tag selected</span>;
    if (form.tag_type === "stamp") return (
      <div className="inline-block bg-[#fde047] text-black px-3 py-1 text-sm font-marker tracking-wider stamp-rotate">
        {form.tag_text || "HOT DROP"}
      </div>
    );
    return (
      <span className="font-marker text-2xl tracking-wide text-[#ff1744] drop-shadow-[0_0_8px_rgba(255,23,68,0.7)]">
        {form.tag_text || "NEW DROP"}
      </span>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="font-display tracking-widest text-xl">
                  {editingDrop ? "EDIT MERCH DROP" : "BUILD A MERCH DROP"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editingDrop?.name ?? "New unreleased fire 🔥"}
                </p>
              </div>
              {editingDrop && (
                <span className={cn("text-xs px-2.5 py-1 rounded-full font-marker tracking-wider", STATUS_COLORS[editingDrop.status])}>
                  {editingDrop.status.toUpperCase()}
                </span>
              )}
            </div>
          </DialogHeader>

          <div className="flex flex-1 min-h-0">
            {/* Sidebar nav */}
            <nav className="w-44 shrink-0 border-r border-border p-3 space-y-0.5">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setSection(id)}
                  className={cn(
                    "w-full text-left flex items-center gap-2 px-3 py-2 rounded-sm text-xs transition",
                    section === id
                      ? "bg-[#fde047]/10 text-[#fde047] font-medium border-l-2 border-[#fde047]"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </button>
              ))}
            </nav>

            {/* Section content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* ── Identity ── */}
              {section === "identity" && (
                <div className="space-y-4">
                  <SectionHead title="Drop Identity" desc="Name this drop and write the copy that gets people hyped." />
                  <Field label="Drop Name *">
                    <Input placeholder="e.g. Grand Opening Cinco Drop" value={form.name} onChange={set("name")} />
                  </Field>
                  <Field label="Description" hint="Internal summary — not shown publicly.">
                    <Textarea rows={3} placeholder="What is this drop about?" value={form.description} onChange={set("description")} />
                  </Field>
                  <Field label="Teaser Blurb" hint="Shown in announcement bars and social previews. Keep it punchy.">
                    <Textarea rows={2} placeholder="Something's dropping and it's not your tips..." value={form.teaser_blurb} onChange={set("teaser_blurb")} />
                  </Field>
                  <Field label="Status">
                    <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft — hidden everywhere</SelectItem>
                        <SelectItem value="scheduled">Scheduled — auto-publishes on drop date</SelectItem>
                        <SelectItem value="active">Active — live now</SelectItem>
                        <SelectItem value="ended">Ended — archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              )}

              {/* ── Schedule ── */}
              {section === "schedule" && (
                <div className="space-y-4">
                  <SectionHead title="Schedule" desc="Set when products auto-publish and when the ad campaign launches." />
                  <div className="p-4 rounded-md bg-muted/30 border border-border space-y-4">
                    <p className="text-xs font-medium text-[#fde047] font-marker tracking-wider uppercase">🔥 Drop Date — Products Go Live</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Date *">
                        <Input type="date" value={form.scheduled_drop_at} onChange={set("scheduled_drop_at")} />
                      </Field>
                      <Field label="Time">
                        <Input type="time" value={form.scheduled_drop_time} onChange={set("scheduled_drop_time")} />
                      </Field>
                    </div>
                  </div>
                  <div className="p-4 rounded-md bg-muted/20 border border-border space-y-4">
                    <p className="text-xs font-medium text-muted-foreground font-marker tracking-wider uppercase">📣 Ad Launch Date — Advertisements Go Live</p>
                    <p className="text-xs text-muted-foreground">Set this earlier than the drop date to build hype. Leave blank to launch ads at the same time as the drop.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Date">
                        <Input type="date" value={form.ad_launch_at} onChange={set("ad_launch_at")} />
                      </Field>
                      <Field label="Time">
                        <Input type="time" value={form.ad_launch_time} onChange={set("ad_launch_time")} />
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Products ── */}
              {section === "products" && (
                <div className="space-y-4">
                  <SectionHead title="Products in This Drop" desc="Select which products are part of this drop. They'll auto-publish on the drop date." />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{selectedProductIds.length} selected</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1.5"
                      onClick={() => setShowQuickProduct(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create New Product
                    </Button>
                  </div>
                  <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                    {allProducts.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">No products in the database yet. Create one above.</p>
                    )}
                    {allProducts.map((p: { id: string; name: string; category: string; price_cents: number; image_url: string | null; status: string }) => {
                      const selected = selectedProductIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggleProduct(p.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-2.5 rounded-sm border text-left transition",
                            selected
                              ? "border-[#fde047]/40 bg-[#fde047]/5"
                              : "border-border bg-muted/20 hover:bg-muted/40"
                          )}
                        >
                          <div className={cn(
                            "h-4 w-4 rounded-sm border flex items-center justify-center shrink-0",
                            selected ? "bg-[#fde047] border-[#fde047]" : "border-border"
                          )}>
                            {selected && <Check className="h-3 w-3 text-black" />}
                          </div>
                          {p.image_url && (
                            <img src={p.image_url} alt={p.name} className="h-10 w-10 object-cover rounded-sm shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">${(p.price_cents / 100).toFixed(2)}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0">{p.status}</Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Visual & Tag ── */}
              {section === "visual" && (
                <div className="space-y-5">
                  <SectionHead title="Visual & Tag" desc="Upload a drop flyer and pick a tag style to slap on the products." />

                  {/* Flyer upload */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Drop Flyer / Graphic</Label>
                    {form.flyer_url ? (
                      <div className="relative inline-block">
                        <img src={form.flyer_url} alt="Flyer" className="h-48 w-auto rounded-md object-cover border border-border" />
                        <button
                          onClick={() => setForm(f => ({ ...f, flyer_url: "" }))}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:opacity-80"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-md p-8 text-center cursor-pointer hover:border-[#fde047]/40 transition"
                      >
                        {uploading ? (
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        ) : (
                          <>
                            <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">Click to upload flyer / graphic</p>
                            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP — max 8MB</p>
                          </>
                        )}
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFlyerUpload} />
                  </div>

                  {/* Tag picker */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Product Tag</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "none", label: "No Tag", preview: <span className="text-xs text-muted-foreground">—</span> },
                        { value: "stamp", label: "Stamp Badge", preview: <div className="bg-[#fde047] text-black px-2 py-0.5 text-[10px] font-marker tracking-wider stamp-rotate inline-block">HOT</div> },
                        { value: "marker", label: "Red Marker", preview: <span className="font-marker text-lg text-[#ff1744] drop-shadow-[0_0_6px_rgba(255,23,68,0.8)]">NEW</span> },
                      ].map(({ value, label, preview }) => (
                        <button
                          key={value}
                          onClick={() => setForm(f => ({ ...f, tag_type: value }))}
                          className={cn(
                            "border rounded-md p-3 flex flex-col items-center gap-2 transition",
                            form.tag_type === value
                              ? "border-[#fde047] bg-[#fde047]/5"
                              : "border-border hover:border-border/60"
                          )}
                        >
                          <div className="h-8 flex items-center justify-center">{preview}</div>
                          <span className="text-[10px] text-muted-foreground">{label}</span>
                        </button>
                      ))}
                    </div>

                    {form.tag_type !== "none" && (
                      <div className="space-y-2">
                        <Label className="text-xs">Tag Text</Label>
                        <Input
                          placeholder={form.tag_type === "stamp" ? "HOT DROP" : "NEW DROP"}
                          value={form.tag_text}
                          onChange={set("tag_text")}
                          maxLength={20}
                          className="max-w-xs"
                        />
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs text-muted-foreground">Preview:</span>
                          <TagPreview />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Advertisements ── */}
              {section === "ads" && (
                <div className="space-y-4">
                  <SectionHead title="Site Advertisements" desc="Choose where this drop gets advertised on the site. Ads go live on the Ad Launch Date." />
                  <div className="space-y-3">
                    {[
                      { key: "show_announcement_bar" as const,  label: "Announcement Bar", desc: "Thin persistent bar at the top of every page — highest visibility." },
                      { key: "show_hero_banner" as const,       label: "Homepage Hero Banner", desc: "Full-width announcement banner in the homepage hero area." },
                      { key: "show_featured_section" as const,  label: "Featured Products Section", desc: "Drop products populate the Featured row on the homepage." },
                      { key: "show_shop_banner" as const,       label: "Shop Page Banner", desc: "Announcement strip at the top of the /shop catalog page." },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-start gap-4 p-4 rounded-md border border-border bg-muted/20">
                        <Switch
                          checked={form[key] as boolean}
                          onCheckedChange={toggle(key)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!form.ad_launch_at && (
                    <p className="text-xs text-amber-400 bg-amber-900/20 border border-amber-900/40 rounded p-3">
                      ⚠️ No ad launch date set. Ads will go live when the drop itself publishes. Set an Ad Launch Date in the Schedule section to build pre-drop hype.
                    </p>
                  )}
                </div>
              )}

              {/* ── Email ── */}
              {section === "email" && (
                <div className="space-y-4">
                  <SectionHead title="Marketing Email" desc="A branded email blasts out to the entire subscriber list on the Ad Launch Date. Items in the drop won't be shown — just the vibe." />
                  <div className="p-3 rounded-md border border-[#ff1744]/30 bg-[#ff1744]/5 text-xs text-[#ff1744]/80">
                    <span className="font-marker tracking-wider">PRE-SHIFT MEETING</span> heads the email in red marker. The blurb below that should be funny, punchy, and tell them something's dropping without spoiling what. Limited supply language only — no POD talk.
                  </div>
                  <Field label="Email Subject Line">
                    <Input
                      placeholder="e.g. Your section just got a whole lot better."
                      value={form.email_subject}
                      onChange={set("email_subject")}
                    />
                  </Field>
                  <Field label="Intro Blurb" hint="Shown in the email body after the Pre-Shift Meeting header. Keep it in Opie's voice — crude, funny, bartender-brained.">
                    <Textarea
                      rows={5}
                      placeholder="Listen up, we didn't exactly plan this drop for the weak of liver. Limited run, first come first served. Your regulars will be jealous. Your coworkers won't understand. That's the point..."
                      value={form.email_blurb}
                      onChange={set("email_blurb")}
                    />
                  </Field>
                  <div className="text-xs text-muted-foreground space-y-1 pl-3 border-l-2 border-border">
                    <p>✅ Email sends automatically on the <strong>Ad Launch Date</strong>.</p>
                    <p>✅ Flyer graphic (if uploaded) becomes the hero image in the email.</p>
                    <p>✅ Auto-styled header with POURnogravy branding.</p>
                    <p>⚠️ Make sure the <code className="text-[10px] bg-muted px-1 py-0.5 rounded">RESEND_API_KEY</code> secret is set in Supabase Edge Functions.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between">
            <div className="flex gap-2">
              {SECTIONS.findIndex(s => s.id === section) > 0 && (
                <Button variant="ghost" size="sm" onClick={() => {
                  const idx = SECTIONS.findIndex(s => s.id === section);
                  setSection(SECTIONS[idx - 1].id);
                }}>← Back</Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
              {SECTIONS.findIndex(s => s.id === section) < SECTIONS.length - 1 ? (
                <Button onClick={() => {
                  const idx = SECTIONS.findIndex(s => s.id === section);
                  setSection(SECTIONS[idx + 1].id);
                }}>Next →</Button>
              ) : (
                <Button onClick={handleSave} disabled={saving} className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingDrop ? "SAVE CHANGES" : "SCHEDULE DROP"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <QuickProductModal
        open={showQuickProduct}
        onClose={() => setShowQuickProduct(false)}
        onCreated={(p) => {
          setSelectedProductIds((prev) => [...prev, p.id]);
          setShowQuickProduct(false);
          qc.invalidateQueries({ queryKey: ["admin-products-picker"] });
        }}
      />
    </>
  );
};

// ── Small helpers ──────────────────────────────────────────
const SectionHead = ({ title, desc }: { title: string; desc: string }) => (
  <div className="space-y-1 pb-2 border-b border-border">
    <h3 className="font-display tracking-widest text-base">{title.toUpperCase()}</h3>
    <p className="text-xs text-muted-foreground">{desc}</p>
  </div>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-sm">{label}</Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);
