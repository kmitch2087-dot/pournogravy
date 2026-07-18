-- Product page: Heading Note + Style Label
-- Adds two optional per-product text columns:
--   heading_note — HTML rich-text block rendered directly under the product title
--                  (opt-in via section_visibility.headingNote; default off).
--   style_label  — short label naming this product's button in the on-page style
--                  switcher (e.g. "Men's", "Women's", "V-Neck"). Falls back to a
--                  derived label when blank.
alter table public.products
  add column if not exists heading_note text,
  add column if not exists style_label  text;
