-- A5: Add wordmark URL column to settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS back_logo_wordmark_url TEXT;

-- Set the URL once the file is uploaded to storage
-- UPDATE settings SET back_logo_wordmark_url = 'https://emtjkawcmsfgjyimnncf.supabase.co/storage/v1/object/public/print-files/brand/back-logo-wordmark.png' WHERE id = 1;
