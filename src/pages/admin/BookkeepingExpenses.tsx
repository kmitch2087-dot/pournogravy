import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Lock, Trash2 } from "lucide-react";
import { format } from "date-fns";

const CATEGORIES = [
  "Cost of Goods Sold",
  "Merchant / Processing Fees",
  "Advertising & Marketing",
  "Shipping Paid",
  "Software & Subscriptions",
  "Supplies & Equipment",
  "Contract Labor",
  "Other Business Expense",
] as const;

type Category = (typeof CATEGORIES)[number];

interface Expense {
  id: string;
  date: string;
  amount_cents: number;
  category: string;
  description: string;
  source: "manual" | "stripe_auto";
  receipt_url: string | null;
  stripe_charge_id: string | null;
  month_snapshot_id: string | null;
  created_at: string;
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100
  );

const currentYear = new Date().getFullYear();

// Build list of months for the current year: "2026-01" … "2026-12"
const MONTHS: { label: string; value: string }[] = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(currentYear, i, 1);
  return {
    label: format(d, "MMMM yyyy"),
    value: format(d, "yyyy-MM"),
  };
});

const defaultForm = {
  date: format(new Date(), "yyyy-MM-dd"),
  amount: "",
  category: CATEGORIES[0] as string,
  description: "",
};

export default function BookkeepingExpenses() {
  const qc = useQueryClient();
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["bk-expenses", monthFilter, categoryFilter],
    queryFn: async () => {
      let q = supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (monthFilter !== "all") {
        // monthFilter is "yyyy-MM" — compute range
        const [y, m] = monthFilter.split("-").map(Number);
        const start = format(new Date(y, m - 1, 1), "yyyy-MM-dd");
        const lastDay = new Date(y, m, 0).getDate();
        const end = format(new Date(y, m - 1, lastDay), "yyyy-MM-dd");
        q = q.gte("date", start).lte("date", end);
      }

      if (categoryFilter !== "all") {
        q = q.eq("category", categoryFilter);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
    staleTime: 60_000,
  });

  const total = expenses.reduce((s, e) => s + e.amount_cents, 0);

  const addExpense = useMutation({
    mutationFn: async () => {
      const amount_cents = Math.round(parseFloat(form.amount) * 100);
      if (isNaN(amount_cents) || amount_cents <= 0) {
        throw new Error("Invalid amount — enter a positive number");
      }
      if (!form.description.trim()) {
        throw new Error("Description is required");
      }
      const { error } = await supabase.from("expenses").insert({
        date: form.date,
        amount_cents,
        category: form.category,
        description: form.description.trim(),
        source: "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bk-expenses"] });
      setForm(defaultForm);
      setOpen(false);
      toast.success("Expense added");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Failed to save expense"),
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id)
        .eq("source", "manual");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bk-expenses"] });
      toast.success("Expense deleted");
    },
    onError: () => toast.error("Failed to delete expense"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addExpense.mutate();
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Expenses</h1>
          <p className="text-muted-foreground text-sm">
            Manual entries + auto-synced Stripe fees.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm" className="gap-1">
          <Plus className="w-4 h-4" /> Add Expense
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="border border-border rounded-md px-3 py-1.5 text-sm bg-background text-foreground"
        >
          <option value="all">All Months</option>
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-border rounded-md px-3 py-1.5 text-sm bg-background text-foreground"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div className="ml-auto text-sm font-semibold text-foreground">
          Total: {fmt(total)}
        </div>
      </div>

      {/* Ledger table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Date
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Category
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Description
              </th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                Amount
              </th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                Source
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-48" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-12 mx-auto" />
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                ))
              : expenses.length === 0
              ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground text-sm"
                  >
                    No expenses found for the selected filters.
                  </td>
                </tr>
              )
              : expenses.map((exp, i) => (
                  <motion.tr
                    key={exp.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border/50 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {format(new Date(exp.date + "T00:00:00"), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {exp.category}
                    </td>
                    <td className="px-4 py-3 font-medium max-w-xs truncate">
                      {exp.description}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                      {fmt(exp.amount_cents)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {exp.source === "stripe_auto" ? (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Lock className="w-3 h-3" /> Stripe
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Manual</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {exp.source === "manual" && !exp.month_snapshot_id ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-muted-foreground hover:text-red-400"
                          onClick={() => deleteExpense.mutate(exp.id)}
                          disabled={deleteExpense.isPending}
                          title="Delete expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <div className="w-7 h-7 inline-flex items-center justify-center">
                          <Lock className="w-3.5 h-3.5 text-muted-foreground/30" />
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Running total below table */}
      {!isLoading && expenses.length > 0 && (
        <div className="mt-3 text-right text-sm text-muted-foreground">
          {expenses.length} expense{expenses.length !== 1 ? "s" : ""} ·{" "}
          <span className="font-semibold text-foreground">{fmt(total)}</span> total
        </div>
      )}

      {/* Add Expense Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="exp-date">Date</Label>
              <Input
                id="exp-date"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-amount">Amount ($)</Label>
              <Input
                id="exp-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-category">Category</Label>
              <select
                id="exp-category"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as Category }))
                }
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
                required
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-description">Description</Label>
              <Input
                id="exp-description"
                placeholder="e.g. Supabase Pro subscription"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                required
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={
                  addExpense.isPending ||
                  !form.amount ||
                  !form.description.trim()
                }
              >
                {addExpense.isPending ? "Saving…" : "Save Expense"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
