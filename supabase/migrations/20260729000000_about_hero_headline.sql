-- ─── About page — make the big hero headline editable ─────────────────────────
-- The "BORN BEHIND A BAR AT 2AM" h1 was hardcoded in About.tsx. Seed an editable
-- text row for it. The \n keeps the default two-line layout (whitespace-pre-line
-- in RichText renders author line breaks).

INSERT INTO site_content (page, section, key, label, value, value_type, sort_order) VALUES
  ('about','hero','headline','Hero Headline', E'BORN BEHIND\nA BAR AT 2AM', 'text', 3)
ON CONFLICT (page, section, key) DO NOTHING;
