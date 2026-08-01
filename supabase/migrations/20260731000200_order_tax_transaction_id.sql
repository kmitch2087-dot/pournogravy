-- Task 16: store the Stripe tax TRANSACTION id (distinct from the tax
-- CALCULATION id already on orders) so refunds can reverse the correct
-- transaction via stripe.tax.transactions.createReversal.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_tax_transaction_id text;
