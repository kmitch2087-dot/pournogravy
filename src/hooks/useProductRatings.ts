import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RatingSummary {
  avg: number;
  count: number;
}

const fetchRatings = async (): Promise<Map<string, RatingSummary>> => {
  const { data } = await supabase
    .from("product_reviews")
    .select("product_slug, rating")
    .eq("is_approved", true);

  const map = new Map<string, RatingSummary>();
  if (!data) return map;

  const grouped = new Map<string, number[]>();
  for (const row of data) {
    if (!grouped.has(row.product_slug)) grouped.set(row.product_slug, []);
    grouped.get(row.product_slug)!.push(row.rating);
  }
  for (const [slug, ratings] of grouped) {
    const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
    map.set(slug, { avg: Math.round(avg * 10) / 10, count: ratings.length });
  }
  return map;
};

export const useProductRatings = () => {
  const { data } = useQuery({
    queryKey: ["product-ratings"],
    queryFn: fetchRatings,
    staleTime: 5 * 60 * 1000,
  });
  return data ?? new Map<string, RatingSummary>();
};
