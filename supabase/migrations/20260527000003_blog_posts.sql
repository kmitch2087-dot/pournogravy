CREATE TABLE blog_posts (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title              text NOT NULL,
  slug               text UNIQUE NOT NULL,
  excerpt            text,
  content            text,
  featured_image_url text,
  tags               text[] DEFAULT '{}',
  published          boolean DEFAULT false,
  published_at       timestamptz,
  created_by         uuid REFERENCES auth.users(id),
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on blog_posts"
  ON blog_posts FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Public can read published posts"
  ON blog_posts FOR SELECT TO anon, authenticated
  USING (published = true);

CREATE TRIGGER set_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Storage bucket for blog featured images
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog', 'blog', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read on blog bucket"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'blog');

CREATE POLICY "Admin upload to blog bucket"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog' AND public.is_admin(auth.uid()));
