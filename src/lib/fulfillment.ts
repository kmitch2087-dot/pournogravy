/**
 * Fulfillment routing module.
 *
 * Routes new orders based on the `fulfillment_provider` setting in the
 * `settings` table. Phase 1 implements `local_printer`. The `pod_provider`
 * branch is stubbed with a typed interface ready for a Phase 2 integration.
 *
 * This module is invoked by the `stripe-webhook` edge function after a
 * successful payment, but is also exported for direct use from the admin
 * "re-send to fulfillment" action.
 */

import { supabase } from "@/integrations/supabase/client";

export interface FulfillmentOrder {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string | null;
  shippingAddress: Record<string, unknown> | null;
  items: Array<{
    name: string;
    quantity: number;
    size?: string;
    variant?: string;
    color?: string;
    sku?: string;
  }>;
  totalCents: number;
  notes?: string;
}

interface FulfillmentResult {
  ok: boolean;
  provider: string;
  detail?: string;
  error?: string;
}

/**
 * Local printer: writes to printer_queue + queues a notification.
 * Used when `fulfillment_provider = 'local_printer'`.
 */
const routeToLocalPrinter = async (
  order: FulfillmentOrder,
  printerEmail: string | null,
): Promise<FulfillmentResult> => {
  // 1. Add to printer queue
  const { error: queueError } = await supabase.from("printer_queue").insert([{
    order_id: order.orderId,
    payload: JSON.parse(JSON.stringify(order)),
    status: "queued",
  }]);
  if (queueError) return { ok: false, provider: "local_printer", error: queueError.message };

  // 2. Queue a notification to the printer email if configured
  if (printerEmail) {
    const itemsList = order.items
      .map((i) => `• ${i.quantity}x ${i.name}${i.size ? ` [${i.size}]` : ""}${i.variant ? ` ${i.variant}` : ""}${i.color ? ` ${i.color}` : ""}`)
      .join("\n");
    const addr = order.shippingAddress
      ? JSON.stringify(order.shippingAddress, null, 2)
      : "(no address)";

    await supabase.functions.invoke("send-notification", {
      body: {
        templateKey: "printer_notification",
        recipient: printerEmail,
        relatedKind: "order",
        relatedId: order.orderId,
        variables: {
          order_number: order.orderNumber,
          customer_name: order.customerName ?? "",
          customer_email: order.customerEmail,
          order_items: itemsList,
          shipping_address: addr,
        },
      },
    });
  }

  return { ok: true, provider: "local_printer", detail: "Queued + notification sent" };
};

/**
 * TODO Phase 2: Integrate with a print-on-demand provider.
 *
 * The interface above (FulfillmentOrder) is shaped to be provider-agnostic.
 * When you pick a POD provider, implement this stub by calling that provider's
 * "create order" API with a mapping from FulfillmentOrder → their schema.
 *
 * Suggestions when the time comes (do NOT integrate now): Printful,
 * Printify, Gelato. All have free APIs with per-order pricing.
 */
const routeToPodProvider = async (
  _order: FulfillmentOrder,
): Promise<FulfillmentResult> => {
  console.warn("[fulfillment] pod_provider is not implemented in Phase 1");
  return {
    ok: false,
    provider: "pod_provider",
    error: "POD provider integration not implemented (Phase 2)",
  };
};

/**
 * Main entry point — pulls the active provider from settings and routes.
 */
export const routeOrder = async (order: FulfillmentOrder): Promise<FulfillmentResult> => {
  const { data: settings, error } = await supabase
    .from("settings")
    .select("fulfillment_provider, printer_email")
    .eq("id", 1)
    .maybeSingle();
  if (error || !settings) {
    return { ok: false, provider: "unknown", error: error?.message ?? "No settings row" };
  }
  if (settings.fulfillment_provider === "pod_provider") {
    return routeToPodProvider(order);
  }
  return routeToLocalPrinter(order, settings.printer_email);
};
