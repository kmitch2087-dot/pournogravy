-- Add went_live_at: tracks when a product was first published.
-- Used to show a "NEW" badge on ProductCard for 14 days after going live.
-- Existing live products get NULL so no retroactive NEW badges appear.
--
-- Add print_file_url: URL to the high-res print-ready file for the fulfillment printer.
-- Recommended workflow: store files in a Google Drive shared folder, paste direct URLs here.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS went_live_at timestamptz,
  ADD COLUMN IF NOT EXISTS print_file_url text;
