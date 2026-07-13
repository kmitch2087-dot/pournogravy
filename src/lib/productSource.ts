import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type Product, type ProductColor } from "@/data/products";

// Normalize a raw DB color object into a well-formed ProductColor.
// Some products store colors as {id, label, hex}; others (older seed data)
// store them as {name, hex} with no id/label. The product page keys the
// swatch selector on `id` and shows `label`, so a missing id makes every
// swatch look identical ("Color: undefined") and un-selectable. Derive the
// id/label from whatever's present so the selector works either way.
const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const normalizeColors = (raw: unknown): ProductColor[] | undefined => {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const colors = raw
    .map((c) => {
      const o = (c ?? {}) as Record<string, unknown>;
      const label = (o.label ?? o.name ?? o.id) as string | undefined;
      const id = (o.id ?? (label ? slugify(label) : undefined)) as string | undefined;
      if (!id || !label || typeof o.hex !== "string") return null;
      return {
        id,
        label,
        hex: o.hex,
        ...(Array.isArray(o.images) ? { images: o.images as string[] } : {}),
        ...(o.imagesByFit && typeof o.imagesByFit === "object"
          ? { imagesByFit: o.imagesByFit as Record<string, string[]> }
          : {}),
      } as ProductColor;
    })
    .filter((c): c is ProductColor => c !== null);
  return colors.length > 0 ? colors : undefined;
};

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
  subheading: string | null;
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
  og_image: string | null;
  og_title: string | null;
  og_description: string | null;
  product_group_id: string | null;
  display_order: number | null;
  flip_enabled: boolean;
  flip_image_url: string | null;
}

const dbRowToProduct = (r: DbProductRow): Product => {
  const badAdvice = (() => {
    const ba = r.bad_advice;
    if (!ba || typeof ba !== "object") return undefined;
    if (Array.isArray(ba)) {
      return (ba as unknown[]).length ? { title: "", paragraphs: ba as string[] } : undefined;
    }
    const obj = ba as { title?: string; paragraphs?: string[] };
    return obj.paragraphs?.length
      ? { title: obj.title ?? "", paragraphs: obj.paragraphs }
      : undefined;
  })();

  return {
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
    subheading: r.subheading ?? undefined,
    badAdvice,
    variants:
      Array.isArray(r.variants) && r.variants.length > 0
        ? (r.variants as Product["variants"])
        : undefined,
    colors: normalizeColors(r.colors),
    featured: r.featured,
    published: r.published && r.status === "published",
    wentLiveAt: r.went_live_at ?? undefined,
    thumbnailFocalX: r.thumbnail_focal_x ?? 40,
    thumbnailFocalY: r.thumbnail_focal_y ?? 40,
    sectionOrder: r.section_order ?? undefined,
    section_visibility: r.section_visibility ?? undefined,
    og_image: r.og_image ?? undefined,
    og_title: r.og_title ?? undefined,
    og_description: r.og_description ?? undefined,
    product_group_id: r.product_group_id ?? undefined,
    display_order: r.display_order ?? undefined,
    flip_enabled: r.flip_enabled ?? false,
    flip_image_url: r.flip_image_url ?? undefined,
  };
};

export const useMergedProducts = () => {
  return useQuery({
    queryKey: ["public-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => dbRowToProduct(r as DbProductRow));
    },
    staleTime: 60_000,
  });
};

export type { Product };
