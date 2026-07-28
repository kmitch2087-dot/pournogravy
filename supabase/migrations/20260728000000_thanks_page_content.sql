-- ─── Thank-You / Credits page (/thank-you) — seed CMS content ──────────────────
-- Page key: 'thanks'. Editable via the floating "Edit Page" panel (SiteEditor).
-- Three sections (hero / intro / crew), each with a `visible` boolean toggle.
-- Rich-text (html) bodies are authored by Opie; links added via the editor.

INSERT INTO site_content (page, section, key, label, value, value_type, sort_order) VALUES
  -- Hero
  ('thanks','hero','eyebrow',  'Hero Eyebrow',  'A round on the house',                      'text',    1),
  ('thanks','hero','headline', 'Headline',      'The People Who Poured Into This',           'text',    2),
  ('thanks','hero','visible',  'visible',       'true',                                      'boolean', 3),

  -- Intro
  ('thanks','intro','body',    'Intro Copy',
   '<p>Here''s the thing nobody tells you when you start a brand out of spite and a spilled cosmo: you don''t do it alone. Not even close.</p><p>Every shirt, every bad piece of advice printed on cotton, every late-night "what if we made THIS one" — somebody had a hand in it. Friends who talked me off the ledge. Family who pretended to understand. Bartenders who bought the first batch before the ink was dry. This page is my bar tab, paid back in thank-yous.</p><p>So pull up a stool. This round''s on me.</p>',
   'html', 4),
  ('thanks','intro','visible', 'visible',       'true',                                      'boolean', 5),

  -- Crew (the shout-out list)
  ('thanks','crew','heading',  'Section Heading', 'The Crew Behind the Bar',                 'text',    6),
  ('thanks','crew','body',     'Shout-Outs',
   '<p><strong>Kristin at Aethyx</strong> — built this whole joint from scratch and put up with every one of my 2 a.m. ideas. <a target="_blank" rel="noopener noreferrer nofollow" href="https://aethyx.space">aethyx.space</a></p><p><strong>The regulars</strong> — you know who you are. You bought the first shirts, tagged us, and told your coworkers. Couldn''t have done it without you.</p><p><strong>My family</strong> — for nodding along every single time I said "no, THIS one''s really gonna work."</p><p><strong>Add your people here</strong> — click the pencil, type a name, highlight it, and hit the link button to point it wherever you want. That easy.</p>',
   'html', 7),
  ('thanks','crew','visible',  'visible',       'true',                                      'boolean', 8)
ON CONFLICT (page, section, key) DO NOTHING;
