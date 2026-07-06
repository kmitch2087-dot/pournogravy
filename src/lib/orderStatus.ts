export const ORDER_STATUSES = [
  "pending",
  "paid",
  "in_production",
  "shipped",
  "delivered",
  "fulfilled",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:       "Pending",
  paid:          "Paid",
  in_production: "In Production",
  shipped:       "Shipped",
  delivered:     "Delivered",
  fulfilled:     "Fulfilled",
  cancelled:     "Cancelled",
  refunded:      "Refunded",
};

// Legal forward transitions only — no backward or illegal jumps.
// pending stays pending until payment succeeds (Stripe handles that).
const ALLOWED_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  paid:          ["in_production", "cancelled"],
  in_production: ["shipped", "cancelled"],
  shipped:       ["delivered", "fulfilled"],
  delivered:     ["fulfilled"],
};

export function canAdvance(from: string, to: string): boolean {
  const allowed = ALLOWED_TRANSITIONS[from as OrderStatus];
  return allowed?.includes(to as OrderStatus) ?? false;
}
