import { useState, useEffect } from "react";
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function carrierUrl(carrier: string, tracking: string): string {
  const c = carrier.toLowerCase();
  if (c.includes("usps"))  return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tracking}`;
  if (c.includes("ups"))   return `https://www.ups.com/track?tracknum=${tracking}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?tracknumbers=${tracking}`;
  if (c.includes("dhl"))   return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${tracking}`;
  return `https://www.google.com/search?q=${encodeURIComponent(`${carrier} tracking ${tracking}`)}`;
}

function formatAddress(addr: unknown): string[] {
  if (!addr || typeof addr !== "object") return [];
  const a = addr as Record<string, unknown>;
  const name = typeof a.name === "string" ? a.name : "";
  const addressObj = a.address && typeof a.address === "object"
    ? (a.address as Record<string, unknown>)
    : {};
  const line1      = typeof addressObj.line1        === "string" ? addressObj.line1        : "";
  const line2      = typeof addressObj.line2        === "string" ? addressObj.line2        : "";
  const city       = typeof addressObj.city         === "string" ? addressObj.city         : "";
  const state      = typeof addressObj.state        === "string" ? addressObj.state        : "";
  const postalCode = typeof addressObj.postal_code  === "string" ? addressObj.postal_code  : "";
  const country    = typeof addressObj.country      === "string" ? addressObj.country      : "";

  const cityLine = [city, state].filter(Boolean).join(", ") + (postalCode ? ` ${postalCode}` : "");

  return [name, line1, line2, cityLine, country].filter(Boolean);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Orders = () => {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("id");

  // Ship form state
  const [carrier, setCarrier] = useState("USPS");
  const [trackingInput, setTrackingInput] = useState("");
  const [shipping, setShipping] = useState(false);

  // Resend printer state
  const [resendingPrinter, setResendingPrinter] = useState(false);
  const [resendResult, setResendResult] = useState("");

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

  // Seed local carrier/tracking from the order whenever detail loads
  useEffect(() => {
    if (detail?.order) {
      setCarrier(detail.order.tracking_carrier ?? "USPS");
      setTrackingInput(detail.order.tracking_number ?? "");
      setResendResult("");
    }
  }, [detail?.order?.id]);

  const updateOrder = async (patch: {
    status?: string;
    tracking_number?: string | null;
    tracking_carrier?: string | null;
  }) => {
    if (!selectedId) return;
    const { error } = await supabase.from("orders").update(patch).eq("id", selectedId);
    if (error) {
      toast.error(error.message);
      throw error;
    }
    qc.invalidateQueries({ queryKey: ["admin-order", selectedId] });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const handleMarkAsShipped = async () => {
    if (!detail?.order) return;
    if (!trackingInput.trim()) {
      toast.error("Enter a tracking number first");
      return;
    }
    setShipping(true);
    try {
      await updateOrder({
        status: "shipped",
        tracking_carrier: carrier,
        tracking_number: trackingInput.trim(),
      });

      const { error } = await supabase.functions.invoke("send-notification", {
        body: {
          templateKey: "order_shipped",
          recipient: detail.order.email,
          relatedKind: "order",
          relatedId: detail.order.id,
          variables: {
            customer_name: detail.order.email.split("@")[0],
            order_number: detail.order.id.slice(0, 8),
            tracking_carrier: carrier,
            tracking_number: trackingInput.trim(),
            tracking_url: carrierUrl(carrier, trackingInput.trim()),
          },
        },
      });

      if (error) {
        toast.error(`Order marked shipped but email failed: ${error.message}`);
      } else {
        toast.success("Marked as shipped — customer notified");
      }
    } catch {
      // updateOrder already toasted the error
    } finally {
      setShipping(false);
    }
  };

  const handleResendShippedNotification = async () => {
    if (!detail?.order) return;
    const tc = detail.order.tracking_carrier ?? "";
    const tn = detail.order.tracking_number ?? "";
    const { error } = await supabase.functions.invoke("send-notification", {
      body: {
        templateKey: "order_shipped",
        recipient: detail.order.email,
        relatedKind: "order",
        relatedId: detail.order.id,
        variables: {
          customer_name: detail.order.email.split("@")[0],
          order_number: detail.order.id.slice(0, 8),
          tracking_carrier: tc,
          tracking_number: tn,
          tracking_url: carrierUrl(tc, tn),
        },
      },
    });
    if (error) toast.error(error.message);
    else toast.success("Notification resent");
  };

  const handleResendPrinter = async () => {
    if (!selectedId) return;
    setResendingPrinter(true);
    setResendResult("");
    const { error } = await supabase.functions.invoke("resend-printer-notification", {
      body: { orderId: selectedId },
    });
    setResendingPrinter(false);
    if (error) {
      setResendResult(error.message);
    } else {
      setResendResult("Sent — new magic link generated");
    }
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

              {/* Order totals */}
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

              {/* Line items */}
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

              {/* Shipping address */}
              {detail.order.shipping_address ? (
                <div>
                  <h4 className="font-marker text-[11px] tracking-[0.25em] uppercase text-muted-foreground mb-2">Ship to</h4>
                  <div className="text-sm bg-muted/30 border border-border p-3 rounded-sm space-y-0.5">
                    {formatAddress(detail.order.shipping_address).map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Status + shipping section */}
              <div className="space-y-4 border-t border-border pt-4">
                {/* Status display */}
                <div className="flex items-center justify-between">
                  <p className="text-xs font-marker tracking-widest text-muted-foreground uppercase">Status</p>
                  <span className={statusClass(detail.order.status)}>{detail.order.status}</span>
                </div>

                {detail.order.status !== "shipped" ? (
                  /* Mark as shipped form */
                  <div className="space-y-3 bg-muted/20 border border-border rounded-sm p-4">
                    <p className="text-xs font-marker tracking-widest text-muted-foreground uppercase">Mark as Shipped</p>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Carrier</Label>
                        <Select value={carrier} onValueChange={setCarrier}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USPS">USPS</SelectItem>
                            <SelectItem value="UPS">UPS</SelectItem>
                            <SelectItem value="FedEx">FedEx</SelectItem>
                            <SelectItem value="DHL">DHL</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tracking #</Label>
                        <Input
                          value={trackingInput}
                          onChange={(e) => setTrackingInput(e.target.value)}
                          placeholder="1Z999AA10123456784"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleMarkAsShipped}
                      disabled={shipping || !trackingInput.trim()}
                      className="w-full bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest"
                    >
                      {shipping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Mark as Shipped &amp; Notify Customer
                    </Button>
                  </div>
                ) : (
                  /* Already shipped — display tracking info */
                  <div className="space-y-2">
                    <p className="text-xs font-marker tracking-widest text-muted-foreground uppercase">Tracking</p>
                    <div className="text-sm space-y-1">
                      {detail.order.tracking_carrier && (
                        <p className="text-muted-foreground">{detail.order.tracking_carrier}</p>
                      )}
                      {detail.order.tracking_number ? (
                        <a
                          href={carrierUrl(
                            detail.order.tracking_carrier ?? "",
                            detail.order.tracking_number
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[#fde047] underline underline-offset-2 hover:no-underline"
                        >
                          {detail.order.tracking_number}
                        </a>
                      ) : (
                        <p className="text-muted-foreground">No tracking number on file</p>
                      )}
                    </div>
                    <button
                      onClick={handleResendShippedNotification}
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground mt-1"
                    >
                      Resend notification
                    </button>
                  </div>
                )}
              </div>

              {/* Resend printer email */}
              <div className="border-t border-border pt-4">
                <p className="text-xs font-marker tracking-widest text-muted-foreground uppercase mb-2">Printer</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendPrinter}
                  disabled={resendingPrinter}
                >
                  {resendingPrinter ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Resend Printer Email
                </Button>
                {resendResult && (
                  <p className="text-xs text-muted-foreground mt-2">{resendResult}</p>
                )}
              </div>

            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Orders;
