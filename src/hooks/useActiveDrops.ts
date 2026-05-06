import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MerchDrop {
  id: string;
  name: string;
  description: string | null;
  teaser_blurb: string | null;
  scheduled_drop_at: string;
  ad_launch_at: string | null;
  status: "draft" | "scheduled" | "active" | "ended";
  flyer_url: string | null;
  tag_type: "none" | "stamp" | "marker";
  tag_text: string | null;
  show_hero_banner: boolean;
  show_featured_section: boolean;
  show_shop_banner: boolean;
  show_announcement_bar: boolean;
  email_sent: boolean;
  email_subject: string | null;
  email_blurb: string | null;
  created_at: string;
  updated_at: string;
}

/** Hook for public-facing site components — only returns drops whose ads should be live */
export function useActiveDrops() {
  return useQuery<MerchDrop[]>({
    queryKey: ["active-merch-drops"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("merch_drops")
        .select("*")
        .in("status", ["active", "scheduled"])
        .lte("ad_launch_at", now)
        .order("scheduled_drop_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MerchDrop[];
    },
    staleTime: 1000 * 60 * 5, // 5-min cache — site components don't need live polling
  });
}

/** Admin hook — returns ALL drops regardless of status */
export function useAllDrops() {
  return useQuery<MerchDrop[]>({
    queryKey: ["all-merch-drops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merch_drops")
        .select("*")
        .order("scheduled_drop_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MerchDrop[];
    },
  });
}
