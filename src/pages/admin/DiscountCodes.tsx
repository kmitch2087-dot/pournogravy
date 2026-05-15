import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Loader2, Tag, Plus, Copy, Trash2, ToggleLeft, ToggleRight, Check
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface DiscountCode {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  min_order_cents: number;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

const fmtValue = (type: string, value: number) =>
  type === "percentage" ? `${value}%` : `$${(value / 100).toFixed(2)}`;

const isExpired = (expires_at: string | null) =>
  expires_at ? new Date(expires_at) < new Date() : false;

const defaultForm = {
  code: "",
  type: "percentage" as "percentage" | "fixed",
  value: "",
  min_order_cents: "",
  max_uses: "",
  expires_at: "",
};

const DiscountCodes = () => {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: codes = [], isLoading } = useQuery<DiscountCode[]>({
    queryKey: ["discount-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const value = form.type === "percentage"
        ? parseFloat(form.value)
        : Math.round(parseFloat(form.value) * 100);

      if (isNaN(value) || value <= 0) throw new Error("Invalid value");
      if (!form.code.trim()) throw new Error("Code is required");

      const { error } = await supabase.from("discount_codes").insert({
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value,
        min_order_cents: form.min_order_cents ? Math.round(parseFloat(form.min_order_cents) * 100) : 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        expires_at: form.expires_at || null,
        use_count: 0,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discount-codes"] });
      setForm(defaultForm);
      setShowForm(false);
      toast.success("Discount code created");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create code"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("discount_codes").update({ is_active: !is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discount-codes"] }),
    onError: () => toast.error("Update failed"),
  });

  const deleteCode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("discount_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discount-codes"] });
      toast.success("Code deleted");
    },
    onError: () => toast.error("Delete failed"),
  });

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const generateCode = () => {
    const prefix = form.type === "percentage" ? "POUR" : "SAVE";
    setForm((f) => ({ ...f, code: `${prefix}${Math.random().toString(36).slice(2, 7).toUpperCase()}` }));
  };

  const activeCodes = codes.filter((c) => c.is_active && !isExpired(c.expires_at));
  const totalRedemptions = codes.reduce((s, c) => s + c.use_count, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-border bg-card p-5">
          <p className="text-xs font-marker tracking-widest text-muted-foreground uppercase mb-2">Total Codes</p>
          <p className="font-display text-3xl tracking-wider text-[#fde047]">{codes.length}</p>
        </div>
        <div className="border border-border bg-card p-5">
          <p className="text-xs font-marker tracking-widest text-muted-foreground uppercase mb-2">Active</p>
          <p className="font-display text-3xl tracking-wider text-green-400">{activeCodes.length}</p>
        </div>
        <div className="border border-border bg-card p-5">
          <p className="text-xs font-marker tracking-widest text-muted-foreground uppercase mb-2">Total Uses</p>
          <p className="font-display text-3xl tracking-wider">{totalRedemptions}</p>
        </div>
      </div>

      {/* Header + create button */}
      <div className="border border-border bg-card">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <Tag className="h-4 w-4 text-[#fde047]" />
          <h2 className="font-display tracking-widest text-sm flex-1">DISCOUNT CODES</h2>
          <Button
            size="sm"
            className="h-8 text-xs font-display tracking-widest gap-1.5 bg-[#fde047] text-black hover:bg-[#fde047]/90"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus className="h-3.5 w-3.5" />New Code
          </Button>
        </div>

        {/* Create form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-border"
            >
              <div className="px-5 py-5 space-y-4">
                <p className="text-xs font-marker tracking-widest text-muted-foreground uppercase">Create New Code</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Code */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-marker block mb-1">Code</label>
                    <div className="flex gap-2">
                      <input
                        value={form.code}
                        onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                        placeholder="POUR10OFF"
                        className="flex-1 px-3 py-2 text-sm bg-transparent border border-border focus:outline-none focus:border-[#fde047] font-mono transition-colors"
                      />
                      <Button variant="outline" size="sm" className="h-9 text-xs" onClick={generateCode}>
                        Random
                      </Button>
                    </div>
                  </div>
                  {/* Type */}
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-marker block mb-1">Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "percentage" | "fixed", value: "" }))}
                      className="w-full px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:border-[#fde047] transition-colors"
                    >
                      <option value="percentage">Percentage %</option>
                      <option value="fixed">Fixed $ off</option>
                    </select>
                  </div>
                  {/* Value */}
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-marker block mb-1">
                      {form.type === "percentage" ? "Percent off" : "Dollars off"}
                    </label>
                    <input
                      type="number"
                      value={form.value}
                      onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                      placeholder={form.type === "percentage" ? "10" : "5.00"}
                      min="0"
                      className="w-full px-3 py-2 text-sm bg-transparent border border-border focus:outline-none focus:border-[#fde047] transition-colors"
                    />
                  </div>
                  {/* Min order */}
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-marker block mb-1">Min order ($)</label>
                    <input
                      type="number"
                      value={form.min_order_cents}
                      onChange={(e) => setForm((f) => ({ ...f, min_order_cents: e.target.value }))}
                      placeholder="0"
                      min="0"
                      className="w-full px-3 py-2 text-sm bg-transparent border border-border focus:outline-none focus:border-[#fde047] transition-colors"
                    />
                  </div>
                  {/* Max uses */}
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-marker block mb-1">Max uses (blank = unlimited)</label>
                    <input
                      type="number"
                      value={form.max_uses}
                      onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
                      placeholder="∞"
                      min="1"
                      className="w-full px-3 py-2 text-sm bg-transparent border border-border focus:outline-none focus:border-[#fde047] transition-colors"
                    />
                  </div>
                  {/* Expires */}
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-marker block mb-1">Expires (optional)</label>
                    <input
                      type="date"
                      value={form.expires_at}
                      onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:border-[#fde047] transition-colors"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" className="font-display tracking-widest" onClick={() => { setShowForm(false); setForm(defaultForm); }}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="font-display tracking-widest bg-[#fde047] text-black hover:bg-[#fde047]/90"
                    onClick={() => create.mutate()}
                    disabled={create.isPending}
                  >
                    {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Code"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Code list */}
        {isLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : codes.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-marker text-muted-foreground italic">No discount codes yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Create one above to start running promos.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {codes.map((c) => {
              const expired = isExpired(c.expires_at);
              const usagePct = c.max_uses ? Math.min(100, (c.use_count / c.max_uses) * 100) : null;
              const exhausted = c.max_uses !== null && c.use_count >= c.max_uses;
              const statusBadge = expired ? "Expired" : exhausted ? "Exhausted" : c.is_active ? "Active" : "Inactive";
              const badgeColor = expired || exhausted ? "text-[#ff1744]" : c.is_active ? "text-green-400" : "text-muted-foreground";

              return (
                <div key={c.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Code */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <code className="font-mono text-sm text-[#fde047] tracking-wider">{c.code}</code>
                      <button
                        onClick={() => copyCode(c.code, c.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copiedId === c.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    {/* Value */}
                    <span className="font-display text-lg tracking-wider">{fmtValue(c.type, c.value)}</span>

                    {/* Status badge */}
                    <span className={`text-[10px] font-marker tracking-widest uppercase ${badgeColor}`}>
                      {statusBadge}
                    </span>

                    {/* Toggle */}
                    <button
                      onClick={() => toggleActive.mutate({ id: c.id, is_active: c.is_active })}
                      disabled={expired || exhausted}
                      className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                    >
                      {c.is_active ? <ToggleRight className="h-5 w-5 text-green-400" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => { if (confirm(`Delete code ${c.code}?`)) deleteCode.mutate(c.id); }}
                      className="text-muted-foreground hover:text-[#ff1744] transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Details row */}
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                    {c.min_order_cents > 0 && <span>Min order: ${(c.min_order_cents / 100).toFixed(0)}</span>}
                    <span>
                      Used: {c.use_count}{c.max_uses ? ` / ${c.max_uses}` : ""}
                    </span>
                    {c.expires_at && (
                      <span className={expired ? "text-[#ff1744]" : ""}>
                        Expires: {new Date(c.expires_at).toLocaleDateString()}
                      </span>
                    )}
                    <span className="text-muted-foreground/50">Created: {new Date(c.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Usage progress bar */}
                  {usagePct !== null && (
                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden max-w-xs">
                      <div
                        className={`h-full rounded-full transition-all ${usagePct >= 100 ? "bg-[#ff1744]" : "bg-[#fde047]"}`}
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscountCodes;
