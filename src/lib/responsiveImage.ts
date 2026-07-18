// Responsive-image helper.
//
// Product images live in /public/products/*.webp and are referenced either as
// relative (/products/x.webp) or absolute (https://pournogravy.com/products/x.webp)
// URLs. scripts/generate-responsive-images.mjs pre-generates 320/640/960px variants
// and records which exist in imageVariants.json. This helper turns a source URL into
// { srcSet, sizes } when variants exist, so the browser downloads a right-sized image
// on mobile instead of the full-resolution original.
//
// Any URL without generated variants (remote/DB uploads, non-webp) falls through to
// {} — the caller just uses the original `src` unchanged.

import variantsManifest from "@/data/imageVariants.json";

const manifest = variantsManifest as Record<string, number[]>;

/** Product grid / featured cards: 2-up on mobile, 3-up on desktop. */
export const PRODUCT_CARD_SIZES = "(min-width: 768px) 33vw, 50vw";
/** Hero carousel: near-full-width on mobile, ~440px polaroid on desktop. */
export const HERO_IMAGE_SIZES = "(min-width: 768px) 440px, 100vw";
/** Product detail hero image: full-width on mobile, ~half on large screens. */
export const PRODUCT_DETAIL_SIZES = "(min-width: 1024px) 600px, 100vw";

// Match the ".../products/<base>.webp" filename in relative OR absolute URLs.
const PRODUCT_WEBP = /\/products\/([^/?#]+)\.webp(?:[?#]|$)/;

export function responsiveImageProps(
  src: string | undefined,
  sizes: string = PRODUCT_CARD_SIZES,
): { srcSet?: string; sizes?: string } {
  if (!src) return {};
  const match = src.match(PRODUCT_WEBP);
  if (!match) return {};
  const base = match[1];
  const widths = manifest[base];
  if (!widths || widths.length === 0) return {};
  // Relative srcSet paths resolve against the current origin, so this works on
  // both production and the CF Pages preview domain.
  const srcSet = widths.map((w) => `/products/${base}-${w}w.webp ${w}w`).join(", ");
  return { srcSet, sizes };
}
