-- Shipping zones: our prices charged to customers, editable by admin.
-- These are what Opie charges — not carrier rates. Carrier rates are in shipping_market_rates.

CREATE TABLE IF NOT EXISTS shipping_zones (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_name    text NOT NULL,
  description  text,
  price_cents  integer NOT NULL DEFAULT 799,
  states       text[],
  sort_order   integer DEFAULT 0,
  updated_at   timestamptz DEFAULT now()
);

-- Seed default zones (approximate geographic groupings, Opie edits prices as needed)
INSERT INTO shipping_zones (zone_name, description, price_cents, states, sort_order) VALUES
  ('Zone 1–2 (Local/West)',    '1–2 day transit · CA, NV, AZ, OR, WA, ID, UT, CO',       699,  ARRAY['CA','NV','AZ','OR','WA','ID','UT','CO'], 1),
  ('Zone 3–4 (Central)',       '2–3 day transit · TX, NM, WY, MT, ND, SD, NE, KS, OK, MN, IA, MO, WI, IL, MI, IN, OH, KY', 799, ARRAY['TX','NM','WY','MT','ND','SD','NE','KS','OK','MN','IA','MO','WI','IL','MI','IN','OH','KY'], 2),
  ('Zone 5–6 (East/South)',    '3–4 day transit · FL, GA, SC, NC, VA, WV, MD, DE, PA, NY, NJ, CT, RI, MA, VT, NH, ME, TN, AL, MS, AR, LA, DC', 999,  ARRAY['FL','GA','SC','NC','VA','WV','MD','DE','PA','NY','NJ','CT','RI','MA','VT','NH','ME','TN','AL','MS','AR','LA','DC'], 3),
  ('Zone 7–8 (Remote)',        '4–5 day transit · AK, HI, PR, GU, VI, international',    1499, ARRAY['AK','HI','PR','GU','VI'], 4)
ON CONFLICT DO NOTHING;

-- Market reference rates from major carriers (seed; Opie compares against our prices).
-- Updated manually or via a scheduled function. NOT what we charge — what carriers charge.
CREATE TABLE IF NOT EXISTS shipping_market_rates (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  carrier        text NOT NULL,
  service        text NOT NULL,
  zone_label     text NOT NULL,   -- matches zone_name labels above for easy comparison
  weight_label   text NOT NULL,   -- e.g. "1 lb", "2 lb"
  weight_oz      integer,         -- actual oz for sorting
  rate_cents     integer NOT NULL,
  effective_date date NOT NULL,
  source_note    text,
  last_updated   timestamptz DEFAULT now()
);

-- Seed USPS Priority Mail (2024 commercial base rates, ~1 lb parcel)
INSERT INTO shipping_market_rates (carrier, service, zone_label, weight_label, weight_oz, rate_cents, effective_date, source_note) VALUES
  ('USPS', 'Priority Mail', 'Zone 1–2 (Local/West)',  '1 lb', 16,  796, '2024-01-21', 'USPS Commercial Base 2024'),
  ('USPS', 'Priority Mail', 'Zone 3–4 (Central)',     '1 lb', 16,  861, '2024-01-21', 'USPS Commercial Base 2024'),
  ('USPS', 'Priority Mail', 'Zone 5–6 (East/South)',  '1 lb', 16,  955, '2024-01-21', 'USPS Commercial Base 2024'),
  ('USPS', 'Priority Mail', 'Zone 7–8 (Remote)',      '1 lb', 16, 1406, '2024-01-21', 'USPS Commercial Base 2024'),
-- UPS Ground (2024 daily rates, 1 lb)
  ('UPS',  'Ground',        'Zone 1–2 (Local/West)',  '1 lb', 16, 1014, '2024-01-01', 'UPS Retail 2024'),
  ('UPS',  'Ground',        'Zone 3–4 (Central)',     '1 lb', 16, 1082, '2024-01-01', 'UPS Retail 2024'),
  ('UPS',  'Ground',        'Zone 5–6 (East/South)',  '1 lb', 16, 1198, '2024-01-01', 'UPS Retail 2024'),
  ('UPS',  'Ground',        'Zone 7–8 (Remote)',      '1 lb', 16, 1589, '2024-01-01', 'UPS Retail 2024'),
-- FedEx Ground (2024 list rates, 1 lb)
  ('FedEx','Ground',        'Zone 1–2 (Local/West)',  '1 lb', 16, 1093, '2024-01-15', 'FedEx List Rate 2024'),
  ('FedEx','Ground',        'Zone 3–4 (Central)',     '1 lb', 16, 1158, '2024-01-15', 'FedEx List Rate 2024'),
  ('FedEx','Ground',        'Zone 5–6 (East/South)',  '1 lb', 16, 1312, '2024-01-15', 'FedEx List Rate 2024'),
  ('FedEx','Ground',        'Zone 7–8 (Remote)',      '1 lb', 16, 1671, '2024-01-15', 'FedEx List Rate 2024')
ON CONFLICT DO NOTHING;

-- RLS: admin read/write, public no access
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_market_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read shipping_zones" ON shipping_zones
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
CREATE POLICY "Admin write shipping_zones" ON shipping_zones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
CREATE POLICY "Admin read market_rates" ON shipping_market_rates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
CREATE POLICY "Admin write market_rates" ON shipping_market_rates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
