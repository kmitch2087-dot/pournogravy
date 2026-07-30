-- Admin-controlled home hero slideshow membership.
ALTER TABLE products ADD COLUMN IF NOT EXISTS hero_slideshow boolean NOT NULL DEFAULT false;

-- Seed from the previously-hardcoded HERO_PRODUCT_IDS so the slideshow keeps its
-- existing products until Opie changes them via the "Home slideshow" toggle.
UPDATE products SET hero_slideshow = true
WHERE slug IN (
  'well-it-ain-t-gonna-lick-itself-tee',
  'last-call-for-karen-tee',
  'the-finger-tee',
  'service-bartender-do-not-approach-tee'
);
