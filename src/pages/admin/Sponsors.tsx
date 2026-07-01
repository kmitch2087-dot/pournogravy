import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Megaphone, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Sponsor {
  id: string;
  brand_name: string;
  logo_url: string | null;
  link_url: string;
  tagline: string | null;
  placement: string;
  ad_format: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  rate_cents: number | null;
  rate_type: string | null;
  notes: string | null;
  contact_name: string | null;
  contact_email: string | null;
  click_count: number;
  impression_count: number;
  created_at: string;
}

const PLACEMENT_LABELS: Record<string, string> = {
  shop_banner:       "Shop Banner",
  home_banner:       "Home Banner",
  shop_sidebar:      "Logo Strip",
  product_detail:    "Product Detail",
  footer_strip:      "Footer Strip",
  between_products:  "Between Products",
};

const FORMAT_LABELS: Record<string, string> = {
  banner:      "Banner",
  logo_strip:  "Logo Strip",
  inline_card: "Inline Card",
};

const RATE_TYPE_LABELS: Record<string, string> = {
  flat_monthly: "Flat / Month",
  flat_weekly:  "Flat / Week",
  cpm:          "CPM",
  cpc:          "CPC",
};

const emptyForm = {
  brand_name:    "",
  logo_url:      "",
  link_url:      "",
  tagline:       "",
  placement:     "shop_banner",
  ad_format:     "banner",
  start_date:    "",
  end_date:      "",
  rate:          "",
  rate_type:     "flat_monthly",
  contact_name:  "",
  contact_email: "",
  notes:         "",
  is_active:     false,
};

type FormState = typeof emptyForm;

const Sponsors = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Sponsor | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: sponsors = [], isLoading } = useQuery<Sponsor[]>({
    queryKey: ["sponsors"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sponsors")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (s: Sponsor) => {
    setEditing(s);
    setForm({
      brand_name:    s.brand_name,
      logo_url:      s.logo_url ?? "",
      link_url:      s.link_url,
      tagline:       s.tagline ?? "",
      placement:     s.placement,
      ad_format:     s.ad_format,
      start_date:    s.start_date ?? "",
      end_date:      s.end_date ?? "",
      rate:          s.rate_cents != null ? (s.rate_cents / 100).toFixed(2) : "",
      rate_type:     s.rate_type ?? "flat_monthly",
      contact_name:  s.contact_name ?? "",
      contact_email: s.contact_email ?? "",
      notes:         s.notes ?? "",
      is_active:     s.is_active,
    });
    setShowForm(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        brand_name:    form.brand_name.trim(),
        logo_url:      form.logo_url.trim() || null,
        link_url:      form.link_url.trim(),
        tagline:       form.tagline.trim() || null,
        placement:     form.placement,
        ad_format:     form.ad_format,
        start_date:    form.start_date || null,
        end_date:      form.end_date || null,
        rate_cents:    form.rate ? Math.round(parseFloat(form.rate) * 100) : null,
        rate_type:     form.rate_type || null,
        contact_name:  form.contact_name.trim() || null,
        contact_email: form.contact_email.trim() || null,
        notes:         form.notes.trim() || null,
        is_active:     form.is_active,
        updated_at:    new Date().toISOString(),
      };
      if (editing) {
        const { error } = await (supabase as any).from("sponsors").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("sponsors").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sponsors"] });
      toast.success(editing ? "Sponsor updated." : "Sponsor added.");
      setShowForm(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed."),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("sponsors")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sponsors"] }),
    onError: (e: any) => toast.error(e.message ?? "Update failed."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("sponsors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sponsors"] });
      toast.success("Sponsor deleted.");
      setDeleting(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Delete failed."),
  });

  const f = (k: keyof FormState, v: string | boolean) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-[#fde047]" />
          <h1 className="text-lg font-display tracking-wider">Sponsors</h1>
          <Badge variant="outline" className="text-xs">{sponsors.length}</Badge>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1.5 bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest text-xs">
          <Plus className="h-3.5 w-3.5" /> Add Sponsor
        </Button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border border-border bg-card rounded-lg p-5 space-y-4"
          >
            <h2 className="font-display tracking-wider text-sm">{editing ? "Edit Sponsor" : "Add Sponsor"}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Brand Name *</Label>
                <Input value={form.brand_name} onChange={(e) => f("brand_name", e.target.value)} placeholder="Tito's Handmade Vodka" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Link URL *</Label>
                <Input value={form.link_url} onChange={(e) => f("link_url", e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Logo URL</Label>
                <Input value={form.logo_url} onChange={(e) => f("logo_url", e.target.value)} placeholder="https://... (image URL)" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tagline</Label>
                <Input value={form.tagline} onChange={(e) => f("tagline", e.target.value)} placeholder="Short description shown on inline card" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Placement</Label>
                <Select value={form.placement} onValueChange={(v) => f("placement", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLACEMENT_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ad Format</Label>
                <Select value={form.ad_format} onValueChange={(v) => f("ad_format", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FORMAT_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Start Date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => f("start_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End Date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => f("end_date", e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Rate ($)</Label>
                <Input type="number" min="0" step="0.01" value={form.rate} onChange={(e) => f("rate", e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Rate Type</Label>
                <Select value={form.rate_type} onValueChange={(v) => f("rate_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RATE_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Contact Name</Label>
                <Input value={form.contact_name} onChange={(e) => f("contact_name", e.target.value)} placeholder="Jane Smith" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Contact Email</Label>
                <Input type="email" value={form.contact_email} onChange={(e) => f("contact_email", e.target.value)} placeholder="jane@brand.com" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => f("notes", e.target.value)} rows={3} placeholder="Internal notes…" />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is-active"
                checked={form.is_active}
                onCheckedChange={(v) => f("is_active", v)}
              />
              <Label htmlFor="is-active" className="text-xs cursor-pointer">Active (show on site)</Label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => save.mutate()}
                disabled={save.isPending || !form.brand_name.trim() || !form.link_url.trim()}
                className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest text-xs"
                size="sm"
              >
                {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? "Save Changes" : "Add Sponsor"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : sponsors.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          No sponsors yet. Add one to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase tracking-widest">
                <th className="pb-2 text-left font-normal">Brand</th>
                <th className="pb-2 text-left font-normal">Placement</th>
                <th className="pb-2 text-left font-normal">Format</th>
                <th className="pb-2 text-left font-normal">Dates</th>
                <th className="pb-2 text-left font-normal">Rate</th>
                <th className="pb-2 text-left font-normal">Active</th>
                <th className="pb-2 text-right font-normal">Impr.</th>
                <th className="pb-2 text-right font-normal">Clicks</th>
                <th className="pb-2 text-right font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sponsors.map((s) => (
                <tr key={s.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                  <td className="py-3 pr-3">
                    <div className="font-medium text-foreground">{s.brand_name}</div>
                    {s.contact_email && <div className="text-muted-foreground">{s.contact_email}</div>}
                  </td>
                  <td className="py-3 pr-3 text-muted-foreground">{PLACEMENT_LABELS[s.placement] ?? s.placement}</td>
                  <td className="py-3 pr-3 text-muted-foreground">{FORMAT_LABELS[s.ad_format] ?? s.ad_format}</td>
                  <td className="py-3 pr-3 text-muted-foreground">
                    {s.start_date && <div>{s.start_date}</div>}
                    {s.end_date && <div>→ {s.end_date}</div>}
                    {!s.start_date && !s.end_date && "—"}
                  </td>
                  <td className="py-3 pr-3 text-muted-foreground">
                    {s.rate_cents != null
                      ? `$${(s.rate_cents / 100).toFixed(0)} ${RATE_TYPE_LABELS[s.rate_type ?? ""] ?? ""}`
                      : "—"}
                  </td>
                  <td className="py-3 pr-3">
                    <Switch
                      checked={s.is_active}
                      onCheckedChange={(v) => toggleActive.mutate({ id: s.id, is_active: v })}
                      disabled={toggleActive.isPending}
                    />
                  </td>
                  <td className="py-3 pr-3 text-right text-muted-foreground">{s.impression_count.toLocaleString()}</td>
                  <td className="py-3 pr-3 text-right text-muted-foreground">{s.click_count.toLocaleString()}</td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={s.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Visit link"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => openEdit(s)}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {deleting === s.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => remove.mutate(s.id)}
                            disabled={remove.isPending}
                            className="text-red-400 text-[10px] px-1.5 py-0.5 rounded hover:bg-red-400/10 transition-colors"
                          >
                            {remove.isPending ? "…" : "Delete"}
                          </button>
                          <button onClick={() => setDeleting(null)} className="text-muted-foreground text-[10px] px-1.5 py-0.5">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleting(s.id)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Link to public page */}
      <div className="pt-2 border-t border-border/40">
        <a
          href="/advertise"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#fde047] transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          View public Advertise page
        </a>
      </div>
    </div>
  );
};

export default Sponsors;
