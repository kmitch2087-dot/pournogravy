-- Dedicated ordering for the home hero slideshow (separate from shop_order).
ALTER TABLE products ADD COLUMN IF NOT EXISTS hero_order integer;

-- Seed order matching the previous hardcoded HERO_PRODUCT_IDS sequence.
UPDATE products SET hero_order = 10 WHERE slug = 'well-it-ain-t-gonna-lick-itself-tee';
UPDATE products SET hero_order = 20 WHERE slug = 'last-call-for-karen-tee';
UPDATE products SET hero_order = 30 WHERE slug = 'the-finger-tee';
UPDATE products SET hero_order = 40 WHERE slug = 'service-bartender-do-not-approach-tee';
