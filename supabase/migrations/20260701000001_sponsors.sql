-- Sponsors / advertising system
-- Tracks ad placements, click/impression counts, and billing info.

CREATE TABLE sponsors (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name        text        NOT NULL,
  logo_url          text,
  link_url          text        NOT NULL,
  tagline           text,
  placement         text        NOT NULL CHECK (placement IN (
    'shop_banner', 'home_banner', 'shop_sidebar',
    'product_detail', 'footer_strip', 'between_products'
  )),
  ad_format         text        NOT NULL DEFAULT 'banner' CHECK (ad_format IN (
    'banner', 'logo_strip', 'inline_card'
  )),
  start_date        date,
  end_date          date,
  is_active         boolean     NOT NULL DEFAULT false,
  rate_cents        integer,
  rate_type         text        CHECK (rate_type IN ('flat_monthly', 'flat_weekly', 'cpm', 'cpc')),
  notes             text,
  contact_name      text,
  contact_email     text,
  click_count       integer     NOT NULL DEFAULT 0,
  impression_count  integer     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on sponsors"
ON sponsors FOR ALL
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Public can read active sponsors"
ON sponsors FOR SELECT
USING (
  is_active = true
  AND (start_date IS NULL OR start_date <= CURRENT_DATE)
  AND (end_date IS NULL OR end_date >= CURRENT_DATE)
);

-- Click + impression tracking RPCs (SECURITY DEFINER to bypass RLS on update)
CREATE OR REPLACE FUNCTION increment_sponsor_click(sponsor_id uuid)
RETURNS void AS $$
  UPDATE sponsors SET click_count = click_count + 1 WHERE id = sponsor_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_sponsor_impression(sponsor_id uuid)
RETURNS void AS $$
  UPDATE sponsors SET impression_count = impression_count + 1 WHERE id = sponsor_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Advertise page site_content seed
INSERT INTO site_content (page, section, key, label, value, value_type, sort_order, is_published)
VALUES
  ('advertise', 'hero',       'heading',       'Page Heading',          'ADVERTISE WITH US',                                                                                                                                                        'text', 1,  true),
  ('advertise', 'hero',       'subheading',    'Subheading',            'Put your brand in front of the people who pour the drinks.',                                                                                                               'text', 2,  true),
  ('advertise', 'audience',   'heading',       'Audience Section Heading', 'WHO''S WATCHING',                                                                                                                                                       'text', 3,  true),
  ('advertise', 'audience',   'body',          'Audience Description',  'POURnogravy reaches bartenders, servers, barbacks, and hospitality workers — the people who recommend what their customers drink every single night. This is a direct line to the industry, not a general audience.', 'text', 4, true),
  ('advertise', 'audience',   'stat_1_number', 'Stat 1 Number',         '—',                 'text', 5,  true),
  ('advertise', 'audience',   'stat_1_label',  'Stat 1 Label',          'Monthly Visitors',  'text', 6,  true),
  ('advertise', 'audience',   'stat_2_number', 'Stat 2 Number',         '—',                 'text', 7,  true),
  ('advertise', 'audience',   'stat_2_label',  'Stat 2 Label',          'Email Subscribers', 'text', 8,  true),
  ('advertise', 'audience',   'stat_3_number', 'Stat 3 Number',         '—',                 'text', 9,  true),
  ('advertise', 'audience',   'stat_3_label',  'Stat 3 Label',          'Orders Fulfilled',  'text', 10, true),
  ('advertise', 'placements', 'heading',       'Placements Heading',    'PLACEMENT OPTIONS',                                                                                                                                                         'text', 11, true),
  ('advertise', 'placements', 'body',          'Placements Description', 'Banner ads, logo strips, inline cards, and sponsored sections. All placements are brand-approved — no auto-served garbage.',                                              'text', 12, true),
  ('advertise', 'contact',    'heading',       'Contact Heading',       'LET''S TALK',                                                                                                                                                              'text', 13, true),
  ('advertise', 'contact',    'body',          'Contact Body',          'Reach out with your brand, budget, and what you''re trying to accomplish. We''ll let you know if it''s a fit.',                                                            'text', 14, true),
  ('advertise', 'contact',    'button_text',   'Contact Button Text',   'GET IN TOUCH',                                                                                                                                                             'text', 15, true),
  ('advertise', 'contact',    'email',         'Contact Email',         'ads@pournogravy.com',                                                                                                                                                      'text', 16, true)
ON CONFLICT (page, section, key) DO NOTHING;
