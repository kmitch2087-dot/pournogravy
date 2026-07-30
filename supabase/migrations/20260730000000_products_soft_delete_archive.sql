-- Soft-delete / 30-day archive for products (FK-safe: orders keep referencing the row).
ALTER TABLE products ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_products_archived_at
  ON products (archived_at) WHERE archived_at IS NOT NULL;

-- After 30 days, permanently remove archived products that no order references.
-- Products with order history can't be FK-deleted, so they stay archived (hidden);
-- the admin UI filters them out after 30 days so they read as gone.
CREATE OR REPLACE FUNCTION purge_archived_products()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  purged integer;
BEGIN
  WITH deleted AS (
    DELETE FROM products p
    WHERE p.archived_at IS NOT NULL
      AND p.archived_at < now() - interval '30 days'
      AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id)
    RETURNING 1
  )
  SELECT count(*) INTO purged FROM deleted;
  RETURN purged;
END;
$$;

REVOKE ALL ON FUNCTION purge_archived_products() FROM anon, authenticated;

-- Daily purge at 04:00 UTC (tolerated if pg_cron is unavailable).
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule('purge-archived-products', '0 4 * * *', 'SELECT purge_archived_products()');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END $$;
