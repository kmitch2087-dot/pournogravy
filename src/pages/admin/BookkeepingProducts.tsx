import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Product {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  cost_cents: number;
  published: boolean;
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

function margin(price: number, cost: number) {
  if (price <= 0) return 0;
  return Math.round(((price - cost) / price) * 1000) / 10; // one decimal place
}

export default function BookkeepingProducts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Record<string, string>>({});

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["bk-products-cogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, price_cents, cost_cents, published")
        .order("name");
      if (error) throw error;
      // Sort by margin ascending (lowest margin = most attention needed)
      return ((data ?? []) as Product[]).sort(
        (a, b) => margin(a.price_cents, a.cost_cents) - margin(b.price_cents, b.cost_cents)
      );
    },
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: async ({ id, cost_cents }: { id: string; cost_cents: number }) => {
      const { error } = await supabase
        .from("products")
        .update({ cost_cents })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bk-products-cogs"] });
      toast.success("Cost updated");
    },
    onError: () => toast.error("Failed to save"),
  });

  function handleBlur(product: Product) {
    const raw = editing[product.id];
    if (raw === undefined) return;
    const dollars = parseFloat(raw);
    if (isNaN(dollars) || dollars < 0) {
      toast.error("Enter a valid cost (e.g. 12.00)");
      setEditing((e) => { const n = { ...e }; delete n[product.id]; return n; });
      return;
    }
    const cents = Math.round(dollars * 100);
    if (cents !== product.cost_cents) {
      save.mutate({ id: product.id, cost_cents: cents });
    }
    setEditing((e) => { const n = { ...e }; delete n[product.id]; return n; });
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Cost of Goods Sold</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Enter what it costs to produce each item — printing, materials, fulfillment.
        Your accountant uses this to calculate COGS on your tax return. Update whenever
        your printer changes their prices.
      </p>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Sale Price</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Cost to Produce</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Margin</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-12 ml-auto" /></td>
                  </tr>
                ))
              : products.map((p, i) => {
                  const m = margin(p.price_cents, p.cost_cents);
                  const editVal = editing[p.id];
                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border/50 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.slug}</div>
                      </td>
                      <td className="px-4 py-3 text-right">{fmt(p.price_cents)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end">
                          <Input
                            className="w-24 h-7 text-right text-sm"
                            value={editVal !== undefined ? editVal : (p.cost_cents / 100).toFixed(2)}
                            onChange={(e) =>
                              setEditing((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                            onBlur={() => handleBlur(p)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") {
                                setEditing((prev) => { const n = { ...prev }; delete n[p.id]; return n; });
                              }
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge
                          variant="outline"
                          className={
                            m >= 50
                              ? "text-green-400 border-green-400/40"
                              : m >= 30
                              ? "text-yellow-400 border-yellow-400/40"
                              : "text-red-400 border-red-400/40"
                          }
                        >
                          {m.toFixed(1)}%
                        </Badge>
                      </td>
                    </motion.tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
