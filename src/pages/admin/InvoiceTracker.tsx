import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Check, DollarSign, Trash2, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface PrinterInvoice {
  id: string;
  invoice_number: string | null;
  amount_cents: number;
  period_start: string | null;
  period_end: string | null;
  order_count: number;
  notes: string | null;
  status: "pending" | "approved" | "paid";
  approved_at: string | null;
  paid_at: string | null;
  payment_method: string | null;
  payment_ref: string | null;
  created_at: string;
}

const fmt = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const STATUS_STYLES: Record<string, string> = {
  pending:  "text-yellow-400 border-yellow-400/30",
  approved: "text-blue-400 border-blue-400/30",
  paid:     "text-green-400 border-green-400/30",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "● PENDING",
  approved: "● APPROVED",
  paid: "● PAID",
};

// ─── Log Invoice Form ─────────────────────────────────────────────────────────

const LogForm = ({ onDone }: { onDone: () => void }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    invoice_number: "",
    amount: "",
    period_start: "",
    period_end: "",
    order_count: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const setF = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));

  const handleSave = async () => {
    const dollars = parseFloat(form.amount);
    if (!form.amount || isNaN(dollars) || dollars <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("printer_invoices").insert({
        invoice_number: form.invoice_number.trim() || null,
        amount_cents: Math.round(dollars * 100),
        period_start: form.period_start || null,
        period_end: form.period_end || null,
        order_count: parseInt(form.order_count) || 0,
        notes: form.notes.trim() || null,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Invoice logged");
      qc.invalidateQueries({ queryKey: ["printer-invoices"] });
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-[#fde047]/30 bg-card p-5 space-y-4 mb-6">
      <p className="font-display text-sm tracking-widest text-[#fde047]">LOG INVOICE</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">Amount *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input value={form.amount} onChange={(e) => setF({ amount: e.target.value })}
              placeholder="0.00" className="pl-7" type="number" step="0.01" min="0" />
          </div>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">Invoice #</Label>
          <Input value={form.invoice_number} onChange={(e) => setF({ invoice_number: e.target.value })}
            placeholder="INV-001 (optional)" />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">Period Start</Label>
          <Input type="date" value={form.period_start} onChange={(e) => setF({ period_start: e.target.value })} />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">Period End</Label>
          <Input type="date" value={form.period_end} onChange={(e) => setF({ period_end: e.target.value })} />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">Order Count</Label>
          <Input value={form.order_count} onChange={(e) => setF({ order_count: e.target.value })}
            placeholder="# of orders this week" type="number" min="0" />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">Notes</Label>
          <Input value={form.notes} onChange={(e) => setF({ notes: e.target.value })}
            placeholder="Any notes" />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button onClick={handleSave} disabled={saving}
          className="h-9 font-display text-xs tracking-widest bg-[#fde047] text-black hover:bg-[#fbbf24] disabled:opacity-50">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
          {saving ? "SAVING…" : "SAVE INVOICE"}
        </Button>
        <Button variant="outline" onClick={onDone} className="h-9 font-display text-xs tracking-widest">
          CANCEL
        </Button>
      </div>
    </div>
  );
};

// ─── Pay Modal ────────────────────────────────────────────────────────────────

const PayModal = ({ invoice, onDone }: { invoice: PrinterInvoice; onDone: () => void }) => {
  const qc = useQueryClient();
  const [method, setMethod] = useState("");
  const [ref, setRef] = useState("");
  const [saving, setSaving] = useState(false);

  const handlePay = async () => {
    if (!method.trim()) { toast.error("Enter payment method"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("printer_invoices").update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_method: method.trim(),
        payment_ref: ref.trim() || null,
      }).eq("id", invoice.id);
      if (error) throw error;

      // Send confirmation email to printer
      await supabase.functions.invoke("send-notification", {
        body: {
          templateKey: "printer_payment_confirmation",
          recipient: "up2ournecksinfrabric@gmail.com",
          subject: `Payment Sent — Pournogravy Invoice ${invoice.invoice_number ?? invoice.id.slice(0, 8).toUpperCase()}`,
          html: `<p>Hi,</p><p>Payment of <strong>${fmt(invoice.amount_cents)}</strong> has been sent for invoice ${invoice.invoice_number ?? "(no number)"} covering ${fmtDate(invoice.period_start)} – ${fmtDate(invoice.period_end)}.</p><p>Payment method: ${method}${ref ? ` — Ref: ${ref}` : ""}</p><p>Thanks,<br/>Pournogravy</p>`,
        },
      });

      toast.success("Marked as paid — confirmation sent to printer");
      qc.invalidateQueries({ queryKey: ["printer-invoices"] });
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background border border-border w-full max-w-sm p-6 space-y-4">
        <p className="font-display text-sm tracking-widest">MARK AS PAID</p>
        <p className="text-sm text-muted-foreground">
          {fmt(invoice.amount_cents)} — {invoice.invoice_number ?? "no invoice #"}
        </p>
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">Payment Method *</Label>
          <Input value={method} onChange={(e) => setMethod(e.target.value)}
            placeholder="Venmo, Zelle, ACH, Check…" autoFocus />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">Reference / Confirmation #</Label>
          <Input value={ref} onChange={(e) => setRef(e.target.value)}
            placeholder="Transaction ID, check #, etc." />
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePay} disabled={saving}
            className="flex-1 h-9 font-display text-xs tracking-widest bg-[#fde047] text-black hover:bg-[#fbbf24] disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
            {saving ? "SAVING…" : "CONFIRM PAYMENT"}
          </Button>
          <Button variant="outline" onClick={onDone} className="h-9 font-display text-xs tracking-widest">CANCEL</Button>
        </div>
      </div>
    </div>
  );
};

// ─── Invoice Row ──────────────────────────────────────────────────────────────

const InvoiceRow = ({ inv }: { inv: PrinterInvoice }) => {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [paying, setPaying] = useState(false);
  const [approving, setApproving] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    const { error } = await supabase.from("printer_invoices")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", inv.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Invoice approved");
      qc.invalidateQueries({ queryKey: ["printer-invoices"] });
    }
    setApproving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    const { error } = await supabase.from("printer_invoices").delete().eq("id", inv.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["printer-invoices"] });
    }
  };

  return (
    <>
      {paying && <PayModal invoice={inv} onDone={() => setPaying(false)} />}

      <div className="border-b border-border last:border-0">
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
          {/* Status */}
          <span className={`text-[10px] font-marker tracking-widest uppercase border px-2 py-0.5 shrink-0 ${STATUS_STYLES[inv.status]}`}>
            {STATUS_LABELS[inv.status]}
          </span>

          {/* Amount + period */}
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm tracking-wider">
              {fmt(inv.amount_cents)}
              {inv.invoice_number && <span className="text-muted-foreground text-xs ml-2">#{inv.invoice_number}</span>}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {inv.period_start && inv.period_end
                ? `${fmtDate(inv.period_start)} – ${fmtDate(inv.period_end)}`
                : fmtDate(inv.created_at)}
              {inv.order_count > 0 && ` · ${inv.order_count} order${inv.order_count !== 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {inv.status === "pending" && (
              <Button size="sm" variant="outline" onClick={handleApprove} disabled={approving}
                className="h-7 text-[10px] font-display tracking-widest px-2 border-blue-400/40 text-blue-400 hover:bg-blue-400/10">
                {approving ? <Loader2 className="h-3 w-3 animate-spin" /> : "APPROVE"}
              </Button>
            )}
            {inv.status === "approved" && (
              <Button size="sm" onClick={() => setPaying(true)}
                className="h-7 text-[10px] font-display tracking-widest px-2 bg-[#fde047] text-black hover:bg-[#fbbf24]">
                <DollarSign className="h-3 w-3 mr-0.5" /> PAY
              </Button>
            )}
            <button onClick={() => setExpanded((v) => !v)}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <button onClick={handleDelete}
              className="p-1.5 text-muted-foreground hover:text-[#ff1744] transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-1 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {[
                  ["Logged", fmtDate(inv.created_at)],
                  ["Approved", fmtDate(inv.approved_at)],
                  ["Paid", fmtDate(inv.paid_at)],
                  ["Payment Method", inv.payment_method ?? "—"],
                  ["Reference", inv.payment_ref ?? "—"],
                  ["Notes", inv.notes ?? "—"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="text-foreground/80">{val}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const InvoiceTracker = () => {
  const [showForm, setShowForm] = useState(false);

  const { data: invoices, isLoading } = useQuery<PrinterInvoice[]>({
    queryKey: ["printer-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("printer_invoices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PrinterInvoice[];
    },
  });

  const pending  = invoices?.filter((i) => i.status === "pending")  ?? [];
  const approved = invoices?.filter((i) => i.status === "approved") ?? [];
  const paid     = invoices?.filter((i) => i.status === "paid")     ?? [];

  const totalOwed = [...pending, ...approved].reduce((s, i) => s + i.amount_cents, 0);
  const totalPaidThisMonth = paid
    .filter((i) => i.paid_at && new Date(i.paid_at).getMonth() === new Date().getMonth())
    .reduce((s, i) => s + i.amount_cents, 0);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase">
            up2ournecksinfrabric
          </p>
          <h2 className="font-display text-2xl tracking-widest">INVOICE TRACKER</h2>
        </div>
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="h-9 font-display text-xs tracking-widest bg-[#fde047] text-black hover:bg-[#fbbf24]"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" /> LOG INVOICE
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Currently Owed", value: fmt(totalOwed), accent: totalOwed > 0 ? "text-yellow-400" : "text-muted-foreground" },
          { label: "Awaiting Approval", value: `${pending.length} invoice${pending.length !== 1 ? "s" : ""}`, accent: pending.length > 0 ? "text-blue-400" : "text-muted-foreground" },
          { label: "Paid This Month", value: fmt(totalPaidThisMonth), accent: "text-green-400" },
        ].map(({ label, value, accent }) => (
          <div key={label} className="border border-border bg-card p-4">
            <p className="text-[10px] font-marker tracking-wider text-muted-foreground uppercase mb-1">{label}</p>
            <p className={`font-display text-lg tracking-wider ${accent}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Log form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <LogForm onDone={() => setShowForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoice list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : !invoices?.length ? (
        <div className="border border-border bg-card p-12 text-center">
          <p className="font-marker text-sm text-muted-foreground italic">
            No invoices yet. Hit LOG INVOICE when the weekly bill comes in.
          </p>
        </div>
      ) : (
        <>
          {/* Group by status */}
          {[
            { label: "PENDING APPROVAL", items: pending },
            { label: "APPROVED — AWAITING PAYMENT", items: approved },
            { label: "PAID", items: paid },
          ]
            .filter(({ items }) => items.length > 0)
            .map(({ label, items }) => (
              <div key={label}>
                <p className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase mb-2">{label}</p>
                <div className="border border-border bg-card divide-y divide-border">
                  {items.map((inv) => <InvoiceRow key={inv.id} inv={inv} />)}
                </div>
              </div>
            ))}
        </>
      )}
    </div>
  );
};

export default InvoiceTracker;
