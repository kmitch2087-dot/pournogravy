-- MOCK DATA for dashboard demo. DELETE before launch.
-- Inserts 15 orders spread over the last 90 days, 5 order_items, and 3 custom_requests.

DO $$
DECLARE
  o1  UUID := gen_random_uuid();
  o2  UUID := gen_random_uuid();
  o3  UUID := gen_random_uuid();
  o4  UUID := gen_random_uuid();
  o5  UUID := gen_random_uuid();
  o6  UUID := gen_random_uuid();
  o7  UUID := gen_random_uuid();
  o8  UUID := gen_random_uuid();
  o9  UUID := gen_random_uuid();
  o10 UUID := gen_random_uuid();
  o11 UUID := gen_random_uuid();
  o12 UUID := gen_random_uuid();
  o13 UUID := gen_random_uuid();
  o14 UUID := gen_random_uuid();
  o15 UUID := gen_random_uuid();
  p1  UUID;
BEGIN
  -- Grab any existing product ID for order_items (safe if none exist)
  SELECT id INTO p1 FROM public.products LIMIT 1;

  INSERT INTO public.orders
    (id, email, status, subtotal_cents, tax_cents, shipping_cents, total_cents, currency, created_at)
  VALUES
    (o1,  'barfly@example.com',       'paid',      2799, 231, 499,  3529,  'USD', NOW() - INTERVAL '2 days'),
    (o2,  'tipbig@example.com',       'paid',      5598, 462, 499,  6559,  'USD', NOW() - INTERVAL '5 days'),
    (o3,  'speakeasy@example.com',    'fulfilled', 2799, 231, 499,  3529,  'USD', NOW() - INTERVAL '10 days'),
    (o4,  'lastcall@example.com',     'shipped',   8397, 693, 699,  9789,  'USD', NOW() - INTERVAL '14 days'),
    (o5,  'bartender@example.com',    'delivered', 2799, 231, 499,  3529,  'USD', NOW() - INTERVAL '18 days'),
    (o6,  'drinkmore@example.com',    'paid',      5598, 462, 699,  6759,  'USD', NOW() - INTERVAL '21 days'),
    (o7,  'ontherocksxyz@example.com','shipped',   2799, 231, 499,  3529,  'USD', NOW() - INTERVAL '25 days'),
    (o8,  'staymoist@example.com',    'fulfilled', 11196,924, 699, 12819,  'USD', NOW() - INTERVAL '30 days'),
    (o9,  'bitchless@example.com',    'delivered', 2799, 231, 499,  3529,  'USD', NOW() - INTERVAL '35 days'),
    (o10, 'shaker@example.com',       'refunded',  2799, 231, 499,  3529,  'USD', NOW() - INTERVAL '40 days'),
    (o11, 'welldrinks@example.com',   'delivered', 5598, 462, 499,  6559,  'USD', NOW() - INTERVAL '48 days'),
    (o12, 'opentab@example.com',      'fulfilled', 2799, 231, 499,  3529,  'USD', NOW() - INTERVAL '55 days'),
    (o13, 'nightcap@example.com',     'shipped',   8397, 693, 699,  9789,  'USD', NOW() - INTERVAL '62 days'),
    (o14, 'closingtime@example.com',  'delivered', 2799, 231, 499,  3529,  'USD', NOW() - INTERVAL '75 days'),
    (o15, 'tipsplease@example.com',   'fulfilled', 5598, 462, 499,  6559,  'USD', NOW() - INTERVAL '88 days');

  -- Insert order_items only if a product exists
  IF p1 IS NOT NULL THEN
    INSERT INTO public.order_items
      (order_id, product_id, product_snapshot, quantity, unit_price_cents)
    VALUES
      (o1, p1, '{"name":"Pour Decision Tee","size":"M","color":"Black"}'::jsonb,  1, 2799),
      (o2, p1, '{"name":"Pour Decision Tee","size":"L","color":"White"}'::jsonb,  2, 2799),
      (o4, p1, '{"name":"Pour Decision Tee","size":"XL","color":"Black"}'::jsonb, 3, 2799),
      (o6, p1, '{"name":"Pour Decision Tee","size":"S","color":"Black"}'::jsonb,  2, 2799),
      (o8, p1, '{"name":"Pour Decision Tee","size":"XXL","color":"White"}'::jsonb,4, 2799);
  END IF;

END $$;

INSERT INTO public.custom_requests (name, email, garment, design_name, notes, status)
VALUES
  ('Jake Hammer',   'jake@example.com',   'Hoodie',     'Pour Decision',    'Can I get this on a zip-up hoodie in navy?',        'new'),
  ('Lana Rivers',   'lana@example.com',   'Tank Top',   'Stay Moist',       'Need a fitted tank, size small preferred.',         'new'),
  ('Mike Tapper',   'mike@example.com',   'Long Sleeve', 'Tip Big',         'Want the design on the back with blank front.',     'new');
