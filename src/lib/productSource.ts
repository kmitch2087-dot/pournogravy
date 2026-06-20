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
  long_description: string[] | null;
  fit_type: string;
  status: string;
  published: boolean;
  featured: boolean;
  drop_date: string | null;
  went_live_at: string | null;
  section_order: string[] | null;
  section_visibility: Record<string, boolean> | null;
  thumbnail_focal_x: number | null;
  thumbnail_focal_y: number | null;
}

const dbRowToProduct = (r: DbProductRow): Product => ({
  id: r.slug,
  name: r.name,
  price: r.price_cents / 100,
  description: r.description ?? "",
  longDescription: r.long_description?.length ? r.long_description : undefined,
  sizes: r.sizes ?? [],
  image: r.image_url ?? r.images?.[0],
  images: r.images ?? [],
  badge: r.badge ?? undefined,
  humor: r.humor ?? "",
  badAdvice: Array.isArray(r.bad_advice) && (r.bad_advice as unknown[]).length
    ? { title: "", paragraphs: r.bad_advice as string[] }
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
  sectionOrder: r.section_order ?? undefined,
  section_visibility: r.section_visibility ?? undefined,
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

      // Merge: DB takes precedence for scalar fields, but fall back to hardcoded
      // for rich fields (colors, variants, images, humor, badAdvice) that were
      // seeded empty and live in products.ts as the source of truth.
      const merged: Product[] = hardcodedProducts.map((p) => {
        const db = dbBySlug.get(p.id);
        if (!db) return p;
        return {
          ...db,
          colors: db.colors?.length ? db.colors : p.colors,
          variants: db.variants?.length ? db.variants : p.variants,
          images: db.images?.length ? db.images : p.images,
          image: db.image ?? p.image,
          humor: db.humor || p.humor,
          badAdvice: db.badAdvice ?? p.badAdvice,
          longDescription: db.longDescription?.length ? db.longDescription : p.longDescription,
          subheading: p.subheading,
          sectionOrder: db.sectionOrder ?? p.sectionOrder,
          section_visibility: db.section_visibility ?? p.section_visibility,
        };
      });
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
