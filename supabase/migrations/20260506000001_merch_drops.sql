-- ============================================================
-- Merch Drops — drop scheduling, advertisement, and email
-- ============================================================

CREATE TABLE merch_drops (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name                  text NOT NULL,
  description           text,
  teaser_blurb          text,
  scheduled_drop_at     timestamptz NOT NULL,
  ad_launch_at          timestamptz,
  status                text DEFAULT 'draft'
                        CHECK (status IN ('draft','scheduled','active','ended')),
  flyer_url             text,
  tag_type              text DEFAULT 'none'
                        CHECK (tag_type IN ('none','stamp','marker')),
  tag_text              text,
  show_hero_banner      boolean DEFAULT false,
  show_featured_section boolean DEFAULT false,
  show_shop_banner      boolean DEFAULT false,
  show_announcement_bar boolean DEFAULT false,
  email_sent            boolean DEFAULT false,
  email_subject         text,
  email_blurb           text,
  created_by            uuid REFERENCES auth.users(id),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE TABLE merch_drop_products (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  drop_id       uuid REFERENCES merch_drops(id) ON DELETE CASCADE NOT NULL,
  product_id    uuid REFERENCES products(id)    ON DELETE CASCADE NOT NULL,
  display_order integer DEFAULT 0,
  UNIQUE(drop_id, product_id)
);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE merch_drops         ENABLE ROW LEVEL SECURITY;
ALTER TABLE merch_drop_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on merch_drops"
  ON merch_drops FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Public can view live merch drops"
  ON merch_drops FOR SELECT TO anon, authenticated
  USING (status IN ('active','scheduled'));

CREATE POLICY "Admin full access on merch_drop_products"
  ON merch_drop_products FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Public can view live drop products"
  ON merch_drop_products FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM merch_drops d
      WHERE d.id = drop_id AND d.status IN ('active','scheduled')
    )
  );

-- ── updated_at trigger ──────────────────────────────────────
CREATE TRIGGER set_merch_drops_updated_at
  BEFORE UPDATE ON merch_drops
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Supabase Storage bucket for drop flyers ─────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('drops', 'drops', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access on drops bucket"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'drops');

CREATE POLICY "Admin upload to drops bucket"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'drops' AND public.is_admin(auth.uid()));

CREATE POLICY "Admin delete from drops bucket"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'drops' AND public.is_admin(auth.uid()));
