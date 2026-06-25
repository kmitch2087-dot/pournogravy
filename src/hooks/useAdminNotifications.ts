import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminNotificationCounts {
  orders: number;
  inbox: number;
  reviews: number;
  customRequests: number;
}

const STORAGE_KEYS = {
  orders:         "notif_orders_viewed",
  inbox:          "notif_inbox_viewed",
  reviews:        "notif_reviews_viewed",
  customRequests: "notif_custom_viewed",
} as const;

const getLastViewed = (key: keyof typeof STORAGE_KEYS): string | null => {
  try { return localStorage.getItem(STORAGE_KEYS[key]); } catch { return null; }
};

export const markSectionViewed = (key: keyof typeof STORAGE_KEYS) => {
  try { localStorage.setItem(STORAGE_KEYS[key], new Date().toISOString()); } catch { /* ignore */ }
};

const fetchCounts = async (): Promise<AdminNotificationCounts> => {
  const lastOrders   = getLastViewed("orders");
  const lastInbox    = getLastViewed("inbox");
  const lastReviews  = getLastViewed("reviews");
  const lastCustom   = getLastViewed("customRequests");

  const [ordersRes, inboxRes, reviewsRes, customRes] = await Promise.allSettled([
    // Orders: paid/pending that are newer than last viewed
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "paid"])
      .gte("created_at", lastOrders ?? "1970-01-01T00:00:00Z"),

    // Inbox: unread inbound messages newer than last viewed
    supabase
      .from("inbox_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "unread")
      .eq("kind", "inbound")
      .is("deleted_at", null)
      .gte("created_at", lastInbox ?? "1970-01-01T00:00:00Z"),

    // Reviews: unapproved reviews newer than last viewed
    supabase
      .from("product_reviews")
      .select("id", { count: "exact", head: true })
      .eq("is_approved", false)
      .gte("created_at", lastReviews ?? "1970-01-01T00:00:00Z"),

    // Custom requests: status = 'new' and not archived, newer than last viewed
    supabase
      .from("custom_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new")
      .is("archived_at", null)
      .gte("created_at", lastCustom ?? "1970-01-01T00:00:00Z"),
  ]);

  return {
    orders:         ordersRes.status === "fulfilled"       ? (ordersRes.value.count   ?? 0) : 0,
    inbox:          inboxRes.status === "fulfilled"        ? (inboxRes.value.count    ?? 0) : 0,
    reviews:        reviewsRes.status === "fulfilled"      ? (reviewsRes.value.count  ?? 0) : 0,
    customRequests: customRes.status === "fulfilled"       ? (customRes.value.count   ?? 0) : 0,
  };
};

export const useAdminNotifications = () => {
  const [counts, setCounts] = useState<AdminNotificationCounts>({
    orders: 0,
    inbox: 0,
    reviews: 0,
    customRequests: 0,
  });

  const refresh = async () => {
    const c = await fetchCounts();
    setCounts(c);
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { counts, refresh };
};
