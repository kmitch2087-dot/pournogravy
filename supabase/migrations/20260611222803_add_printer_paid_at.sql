-- Track when the printer has been paid for each order's print cost.
-- NULL = unpaid (we owe the printer $12/item for this order).
-- Set = timestamp when we marked this order's print cost as paid.
ALTER TABLE printer_queue
  ADD COLUMN IF NOT EXISTS printer_paid_at timestamptz;
