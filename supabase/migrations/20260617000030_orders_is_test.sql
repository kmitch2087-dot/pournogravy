-- Add is_test flag to orders so seed/test orders are excluded from all financial calculations.
-- All orders existing at the time this migration runs are marked as test orders.
-- New orders from Stripe webhook default to is_test = false.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

-- Mark every existing order as a test order.
UPDATE public.orders SET is_test = true;

COMMENT ON COLUMN public.orders.is_test IS
  'True for seed/test orders that should be excluded from financial reports. '
  'Set to false by the Stripe webhook for real customer orders.';
