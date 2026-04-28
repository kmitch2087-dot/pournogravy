import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { fmtMoney, statusClass, ORDER_STATUSES } from "@/lib/admin";
import { toast } from "sonner";

const Orders = () => {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("id");
  const [savingStatus, setSavingStatus] = useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, email, status, total_cents, currency, created_at, tracking_number, tracking_carrier")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: detail } = useQuery({
    queryKey: ["admin-order", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const [{ data: order, error: oErr }, { data: items, error: iErr }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", selectedId).single(),
        supabase.from("order_items").select("*").eq("order_id", selectedId),
      ]);
      if (oErr) throw oErr;
      if (iErr) throw iErr;
      return { order, items: items ?? [] };
    },
    enabled: !!selectedId,
  });

  const updateOrder = async (patch: {
    status?: string;
    tracking_number?: string | null;
    tracking_carrier?: string | null;
  }) => {
    if (!selectedId) return;
    setSavingStatus(true);
    const { error } = await supabase.from("orders").update(patch).eq("id", selectedId);
    setSavingStatus(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Order updated");
    qc.invalidateQueries({ queryKey: ["admin-order", selectedId] });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const sendShippedNotification = async () => {
    if (!detail?.order) return;
    const { error } = await supabase.functions.invoke("send-notification", {
      body: {
        templateKey: "order_shipped",
        recipient: detail.order.email,
        relatedKind: "order",
        relatedId: detail.order.id,
        variables: {
          customer_name: detail.order.email.split("@")[0],
          order_number: detail.order.id.slice(0, 8),
          tracking_carrier: detail.order.tracking_carrier ?? "",
          tracking_number: detail.order.tracking_number ?? "",
        },
      },
    });
    if (error) toast.error(error.message);
    else toast.success("Notification queued");
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            No orders yet. Once Stripe is live and a payment lands, it'll show here.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer"
                  onClick={() => setParams({ id: o.id })}
                >
                  <TableCell>
                    <div className="font-medium">{o.email}</div>
                    <div className="text-xs text-muted-foreground">#{o.id.slice(0, 8)}</div>
                  </TableCell>
                  <TableCell><span className={statusClass(o.status)}>{o.status}</span></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(o.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right font-display tracking-wider">
                    {fmtMoney(o.total_cents, o.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Sheet open={!!selectedId} onOpenChange={(o) => !o && setParams({})}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display tracking-widest">
              ORDER #{selectedId?.slice(0, 8)}
            </SheetTitle>
          </SheetHeader>

          {!detail ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6 mt-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer</span>
                  <span>{detail.order.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{fmtMoney(detail.order.subtotal_cents, detail.order.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{fmtMoney(detail.order.shipping_cents, detail.order.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{fmtMoney(detail.order.tax_cents, detail.order.currency)}</span>
                </div>
                <div className="flex justify-between font-display tracking-wider text-base pt-2 border-t border-border">
                  <span>TOTAL</span>
                  <span>{fmtMoney(detail.order.total_cents, detail.order.currency)}</span>
                </div>
              </div>

              <div>
                <h4 className="font-marker text-[11px] tracking-[0.25em] uppercase text-muted-foreground mb-2">Items</h4>
                <div className="space-y-2">
                  {detail.items.map((it) => {
                    const snap = (it.product_snapshot ?? {}) as Record<string, unknown>;
                    return (
                      <div key={it.id} className="flex justify-between text-sm border border-border p-3 rounded-sm">
                        <div>
                          <div className="font-medium">{(snap.name as string) ?? "Item"}</div>
                          <div className="text-xs text-muted-foreground">
                            Qty {it.quantity}{snap.size ? ` · ${snap.size as string}` : ""}{snap.color ? ` · ${snap.color as string}` : ""}
                          </div>
                        </div>
                        <div className="font-display tracking-wider">
                          {fmtMoney(it.unit_price_cents * it.quantity, detail.order.currency)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {detail.order.shipping_address ? (
                <div>
                  <h4 className="font-marker text-[11px] tracking-[0.25em] uppercase text-muted-foreground mb-2">Ship to</h4>
                  <pre className="text-xs bg-muted/30 border border-border p-3 rounded-sm whitespace-pre-wrap font-mono">
                    {JSON.stringify(detail.order.shipping_address, null, 2)}
                  </pre>
                </div>
              ) : null}

              <div className="space-y-3 border-t border-border pt-4">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={detail.order.status}
                    onValueChange={(v) => updateOrder({ status: v })}
                    disabled={savingStatus}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label>Carrier</Label>
                    <Input
                      defaultValue={detail.order.tracking_carrier ?? ""}
                      onBlur={(e) =>
                        e.target.value !== (detail.order.tracking_carrier ?? "") &&
                        updateOrder({ tracking_carrier: e.target.value || null })
                      }
                      placeholder="USPS"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tracking #</Label>
                    <Input
                      defaultValue={detail.order.tracking_number ?? ""}
                      onBlur={(e) =>
                        e.target.value !== (detail.order.tracking_number ?? "") &&
                        updateOrder({ tracking_number: e.target.value || null })
                      }
                    />
                  </div>
                </div>

                <Button
                  onClick={sendShippedNotification}
                  variant="outline"
                  className="w-full"
                  disabled={!detail.order.tracking_number}
                >
                  Send "shipped" email
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Orders;
