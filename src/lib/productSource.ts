// Re-export products from the data module so existing imports keep working,
// and expose a hook that merges DB-only products into the catalog.
//
// During Phase 1 we keep src/data/products.ts as the canonical source for
// the rich content (humor, badAdvice, multi-paragraph descriptions, complex
// variant/color image lookup). The admin can edit any product in the DB
// (it is seeded with all hardcoded products), and the public site reads
// from BOTH sources, deduping by slug. DB rows take precedence over hardcoded
// rows when the slugs match, so admin edits to existing products show up live.
//
// In Phase 2 we'll fully retire src/data/products.ts and read everything
// from the DB. This shim keeps the existing pages working without a rewrite.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { products as hardcodedProducts, type Product } from "@/data/products";

interface DbProductRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  inventory_count: number;
  is_active: boolean;
  category: string | null;
  sizes: string[];
  variants: unknown;
  colors: unknown;
  images: string[];
  badge: string | null;
  humor: string | null;
  bad_advice: unknown;
  description_long: unknown;
  fit_type: string;
  status: string;
  published: boolean;
  featured: boolean;
  drop_date: string | null;
  went_live_at: string | null;
  thumbnail_focal_x: number | null;
  thumbnail_focal_y: number | null;
}

const dbRowToProduct = (r: DbProductRow): Product => ({
  id: r.slug,
  name: r.name,
  price: r.price_cents / 100,
  description: r.description ?? "",
  longDescription: Array.isArray(r.description_long) ? (r.description_long as string[]) : undefined,
  sizes: r.sizes ?? [],
  image: r.image_url ?? r.images?.[0],
  images: r.images ?? [],
  badge: r.badge ?? undefined,
  humor: r.humor ?? "",
  badAdvice: r.bad_advice && typeof r.bad_advice === "object"
    ? (r.bad_advice as { title: string; paragraphs: string[] })
    : undefined,
  variants: Array.isArray(r.variants) && r.variants.length > 0
    ? (r.variants as Product["variants"])
    : undefined,
  colors: Array.isArray(r.colors) && r.colors.length > 0
    ? (r.colors as Product["colors"])
    : undefined,
  featured: r.featured,
  published: r.published && r.status === "published",
  wentLiveAt: r.went_live_at ?? undefined,
  thumbnailFocalX: r.thumbnail_focal_x ?? 40,
  thumbnailFocalY: r.thumbnail_focal_y ?? 40,
});

/**
 * Fetches DB products and merges them with hardcoded ones.
 * DB rows override hardcoded rows when slugs match.
 */
export const useMergedProducts = () => {
  return useQuery({
    queryKey: ["public-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;

      const dbBySlug = new Map<string, Product>();
      for (const r of (data ?? []) as DbProductRow[]) {
        dbBySlug.set(r.slug, dbRowToProduct(r));
      }

      // Merge: DB takes precedence; otherwise keep hardcoded
      const merged: Product[] = hardcodedProducts.map((p) => dbBySlug.get(p.id) ?? p);
      // Add any DB products that don't have a hardcoded equivalent
      const hardcodedIds = new Set(hardcodedProducts.map((p) => p.id));
      for (const [slug, p] of dbBySlug.entries()) {
        if (!hardcodedIds.has(slug)) merged.push(p);
      }
      return merged;
    },
    staleTime: 60_000,
  });
};

export type { Product };
