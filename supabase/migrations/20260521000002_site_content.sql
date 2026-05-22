CREATE TABLE IF NOT EXISTS site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  section text NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  value text,
  value_type text NOT NULL DEFAULT 'text',
  options text[],
  default_value text,
  sort_order int DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(page, section, key)
);
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_content_public_read" ON site_content FOR SELECT USING (true);
CREATE POLICY "site_content_admin_all" ON site_content FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_allowlist WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_allowlist WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));
INSERT INTO site_content (page, section, key, label, value, value_type, sort_order) VALUES
  ('home','hero','visible','Hero Section Visible','true','boolean',1),
  ('home','hero','heading','Hero Heading','BUILT FOR THE ONES BEHIND THE BAR','text',2),
  ('home','hero','subheading','Hero Subheading','Apparel for bartenders who''ve heard it all, poured it all, and survived to tell the tale.','text',3),
  ('home','hero','cta_text','CTA Button Text','SHOP THE DROP','text',4),
  ('home','hero','bg_color','Background Color','#000000','color',5),
  ('home','hero','accent_color','Accent Color','#fde047','color',6),
  ('home','featured','visible','Featured Section Visible','true','boolean',7),
  ('home','featured','heading','Featured Section Heading','FEATURED POUR','text',8),
  ('about','hero','visible','Page Visible','true','boolean',1),
  ('about','hero','heading','Hero Quote','POURNOGRAVY WAS BORN SOMEWHERE BETWEEN A KAREN''S COMPLAINT AND A SPILLED COSMO.','text',2),
  ('about','mission','visible','Mission Section Visible','true','boolean',3),
  ('shop','header','visible','Shop Header Visible','true','boolean',1),
  ('shop','header','heading','Page Heading','THE MENU','text',2),
  ('shop','header','subheading','Page Subheading','Bartender-tested. Karen-proof.','text',3),
  ('contact','header','visible','Page Visible','true','boolean',1),
  ('contact','header','heading','Page Heading','HIT THE BAR','text',2),
  ('faq','header','visible','Page Visible','true','boolean',1),
  ('faq','header','heading','Page Heading','BAR TALK — FAQ','text',2)
ON CONFLICT (page, section, key) DO NOTHING;
