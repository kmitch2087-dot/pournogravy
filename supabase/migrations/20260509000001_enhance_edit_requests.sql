-- ============================================================
-- Enhance client_edit_requests: author, done, archived
-- + replies table
-- + seed Opie's May 7 notes
-- ============================================================

-- 1. Add columns (safe — idempotent)
ALTER TABLE client_edit_requests
  ADD COLUMN IF NOT EXISTS author    text        NOT NULL DEFAULT 'opie',
  ADD COLUMN IF NOT EXISTS done      boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived  boolean     NOT NULL DEFAULT false;

-- 2. Replies table
CREATE TABLE IF NOT EXISTS edit_request_replies (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid        NOT NULL REFERENCES client_edit_requests(id) ON DELETE CASCADE,
  author      text        NOT NULL DEFAULT 'kristin',
  content     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE edit_request_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access replies" ON edit_request_replies;
CREATE POLICY "Admin full access replies"
  ON edit_request_replies FOR ALL
  USING  (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 3. Seed Opie's 8 notes (May 7, 2026)
INSERT INTO client_edit_requests (content, page_url, author, done, archived, created_at) VALUES
  ('Mobile fix #1 — Carousel items: top headline is blurred underneath the top menu on mobile.',
   '/', 'opie', false, false, '2026-05-07 20:56:00+00'),

  ('Mobile fix #2 — Main hero photo is too large and doesn''t fit screen on mobile.',
   '/', 'opie', false, false, '2026-05-07 20:56:00+00'),

  ('Mobile fix #3 — The yellow scrolling banner is not visible when the site opens on mobile (you have to scroll to see it). Maybe this fixes itself when we shrink the main logo to fit the screen?',
   '/', 'opie', false, false, '2026-05-07 20:57:00+00'),

  ('Change main tagline badge from "Apparel for bartenders who have seen some shit" to "Mildly Offensive Bartender Apparel for the Mildly Offensive Bartender."',
   '/', 'opie', false, false, '2026-05-07 20:57:00+00'),

  ('Can we delay the badge that covers the logo? Maybe show the logo background first and then have the glass badge pop up on top?',
   '/', 'opie', false, false, '2026-05-07 20:57:00+00'),

  ('Change "Throw it back" button on the carousel shirts to "Hook it up. (Not so much ice.)" on 2 lines. "Throw it back" sounds like they want to return the item.',
   '/', 'opie', false, false, '2026-05-07 20:58:00+00'),

  ('Change "Pour me one" button to "Click here if you know the owner too! (shop here)". It might be too long. Let me know what you think. Not a fan of "Pour me one".',
   '/', 'opie', false, false, '2026-05-07 20:58:00+00'),

  ('Change yellow scrolling banner — I would like to incorporate the copy from the Shopify homepage. Maybe add it into the yellow banner and speed up the scroll? The copy: "Offend a Karen without having to open your mouth." / "Go out and show fellow bartenders that you''re a bartender too without having to verbally announce it (You entitled freak!)." / "Call out the general public on certain undesirable behaviors." / "Receive looks of disgust from pretentious bartenders who still think the customer is always right (THEY''RE NOT CUSTOMERS! THEY''RE GUESTS!...OH, SHUT UP!!!)." — or is all this too much for the banner? Let me know what you think.',
   '/', 'opie', false, false, '2026-05-07 21:13:00+00');

-- 4. Kristin's reply to #7 and #8 (needs discussion, seeded as Kristin responses)
-- (inserted after so we can reference the IDs via subquery)
INSERT INTO edit_request_replies (request_id, author, content, created_at)
SELECT id, 'kristin',
  '"Click here if you know the owner too!" is funny but yeah it''s too long for a button — browsers get weird past ~30 chars and it doesn''t track well on mobile. I went with "SHOP THE DROP" for now — short, sounds like a bartender saying it, and hits the action. But I can swap it to anything you want. "BUY THE DAMN THING" would also work if you want it more Opie-core. Let me know.',
  '2026-05-09 12:00:00+00'
FROM client_edit_requests
WHERE content ILIKE '%Pour me one%'
  AND author = 'opie'
LIMIT 1;

INSERT INTO edit_request_replies (request_id, author, content, created_at)
SELECT id, 'kristin',
  'Love the copy — it''s very on-brand. For the marquee I mixed your Shopify lines in with the existing quotes and sped up the scroll. The really long one ("THEY''RE NOT CUSTOMERS, THEY''RE GUESTS!") I kept but it''s truncated slightly so it doesn''t drag. If you want it word-for-word exact just say the word. The marquee now runs at roughly 2/3 of the original speed so it''s punchier.',
  '2026-05-09 12:00:00+00'
FROM client_edit_requests
WHERE content ILIKE '%yellow scrolling banner%'
  AND author = 'opie'
LIMIT 1;
