export interface ProductVariant {
  /** Stable id slug — used in URLs and cart key. "unisex" for all products. */
  id: string;
  /** Display label — "Unisex" */
  label: string;
  /** Variant-specific images (first one is the gallery default when this variant is selected) */
  images: string[];
}

export interface ProductColor {
  /** Stable id slug — used in cart key and storage. e.g. "black", "white" */
  id: string;
  /** Display label — "Black", "Cream" */
  label: string;
  /** CSS color used to render the swatch chip */
  hex: string;
  /**
   * Per-fit photo overrides for this color. Keys are variant ids.
   * If a fit isn't represented here we fall back to `images` below, then to
   * the variant's own images, then to the product's top-level images.
   */
  imagesByFit?: Record<string, string[]>;
  /** Color-only photo override shared by both fits. */
  images?: string[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  /** Long-form description split into paragraphs, rendered on the product page */
  longDescription?: string[];
  sizes: string[];
  image?: string;
  images: string[];
  badge?: string;
  /** Optional yellow italic subheading rendered below the product name on the detail page */
  subheading?: string;
  /** Optional rich-text (HTML) note rendered directly under the product title. Opt-in via section_visibility.headingNote. */
  headingNote?: string;
  /** Short label naming this product's button in the on-page style switcher (e.g. "Men's"). Falls back to a derived label when blank. */
  styleLabel?: string;
  /** Short, punchy zinger — shown in the "Bad Bartender Advice" callout */
  humor: string;
  /** Optional multi-paragraph "Bad Bartender Advice" story shown below the description */
  badAdvice?: {
    title: string;
    paragraphs: string[];
  };
  /**
   * Fit variants. All products use a single "unisex" variant.
   */
  variants?: ProductVariant[];
  /**
   * Color options. Today every product offers Black + Cream. Photo lookup falls
   * back gracefully — color.imagesByFit > color.images > variant.images > product.images.
   */
  colors?: ProductColor[];
  /** Admin-controlled order of copy sections on the product page */
  sectionOrder?: string[];
  /** @deprecated — use `variants` instead */
  featured?: boolean;
  /** When true, the product appears in the home hero slideshow (admin-controlled). */
  hero_slideshow?: boolean;
  /** Public visibility flag. Only products with `published: true` appear in shop/featured/search. */
  published?: boolean;
  /** ISO timestamp of when the product first went live — used for the 14-day NEW badge. */
  wentLiveAt?: string;
  /** Thumbnail zoom focal point X (0–100, default 40). */
  thumbnailFocalX?: number;
  /** Thumbnail zoom focal point Y (0–100, default 40). */
  thumbnailFocalY?: number;
  /** Admin-controlled per-section visibility. undefined = visible (truthy default). */
  section_visibility?: Record<string, boolean>;
  /** Custom share preview image URL (og:image). Falls back to images[0] then site default. */
  og_image?: string;
  /** Custom share preview title (og:title). Falls back to product name. */
  og_title?: string;
  /** Custom share preview description (og:description). Falls back to humor or description. */
  og_description?: string;
  /** Product group UUID — products in the same group show a style switcher on each other's pages */
  product_group_id?: string;
  /** Within-group variant order (0 = primary). NOT the shop position — see shop_order. */
  display_order?: number;
  /** Admin-controlled shop position — unique per row, lower = earlier. Sole driver of shop order (id is the tie-break). */
  shop_order?: number;
  /** Whether this product's card animates between main image and flip_image_url */
  flip_enabled?: boolean;
  /** The image URL shown on the card when the flip animation is in the "zoomed" state */
  flip_image_url?: string;
}

export const collections = [
  { id: "salty-bartender", name: "Salty Bartender", emoji: "\uD83D\uDD25", description: "The aggressive, blunt humor shirts. For bartenders who've stopped pretending to be nice." },
  { id: "industry-truths", name: "Industry Truths", emoji: "\uD83C\uDF78", description: "Relatable bartender sayings that hit different after a Friday close." },
  { id: "customer-horror", name: "Customer Horror Stories", emoji: "\u2620\uFE0F", description: "Focused on the chaos of dealing with guests. Especially the Karens." },
];

export const quotes = [
  "Offend a Karen without having to open your mouth.",
  "I'm not arguing. I'm explaining why I'm right and you're ordering wrong.",
  "Show fellow bartenders you're one of them — no verbal announcement required.",
  "Your cocktail takes 3 minutes. Your complaint takes my will to live.",
  "Call out the general public on certain undesirable behaviors.",
  "I've cut off better people than you.",
  "Receive looks of disgust from pretentious bartenders who still think the customer is always right. (They're guests. GUESTS. Oh, shut up.)",
  "I don't have a drinking problem. I have a customer problem.",
  "Yes, the music is loud. That's because I don't want to hear you.",
  "My face says 'welcome.' My eyes say 'don't test me.'",
];
