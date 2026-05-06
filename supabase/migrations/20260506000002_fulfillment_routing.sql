-- ============================================================
-- Fulfillment routing — per-product + printer spec requirements
-- ============================================================

-- ── Products: per-product fulfillment route ──────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS fulfillment_route text
    DEFAULT 'local_printer'
    CHECK (fulfillment_route IN ('local_printer','printful','printify','manual'));

-- ── Settings: printer spec requirements ─────────────────────
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS printer_name         text,
  ADD COLUMN IF NOT EXISTS printer_print_size   text,
  ADD COLUMN IF NOT EXISTS printer_dpi          text,
  ADD COLUMN IF NOT EXISTS printer_file_formats text[],
  ADD COLUMN IF NOT EXISTS printer_notes        text;
