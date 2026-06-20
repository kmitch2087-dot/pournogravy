-- Add back_logo_full_url to settings and set back_print_file_url on all products
-- that have a two-sided print (all except the OG tee which has its own bespoke back)

ALTER TABLE settings ADD COLUMN IF NOT EXISTS back_logo_full_url TEXT;

UPDATE settings
SET back_logo_full_url = 'https://emtjkawcmsfgjyimnncf.supabase.co/storage/v1/object/public/print-files/brand/back-logo-full.png'
WHERE id = 1;

UPDATE products
SET back_print_file_url = 'https://emtjkawcmsfgjyimnncf.supabase.co/storage/v1/object/public/print-files/brand/back-logo-full.png'
WHERE slug != 'pournogravy-og-tee-the-official-uniform-for-bartender-legends'
  AND back_print_file_url IS NULL;
