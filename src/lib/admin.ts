// Tiny shared helpers for the admin pages.
export const fmtMoney = (cents: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    (cents ?? 0) / 100,
  );

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "in_production",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const REQUEST_STATUSES = [
  "new",
  "contacted",
  "quoted",
  "in_production",
  "completed",
  "declined",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const PRODUCT_STATUSES = ["draft", "scheduled", "published", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  in_production: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  shipped: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  delivered: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
  refunded: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  new: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  contacted: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  quoted: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  declined: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
  draft: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
  scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  published: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  archived: "bg-rose-500/10 text-rose-400 border-rose-500/30",
};

export const statusClass = (status: string) =>
  `inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider border rounded-sm ${
    STATUS_TONE[status] ?? "bg-muted text-muted-foreground border-border"
  }`;

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
