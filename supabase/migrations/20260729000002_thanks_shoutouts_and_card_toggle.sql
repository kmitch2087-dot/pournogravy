-- ─── Product-card mini-message toggle (default OFF) ───────────────────────────
INSERT INTO site_content (page, section, key, label, value, value_type, sort_order) VALUES
  ('shop','cards','footer_note_visible','Card Mini-Messages','false','boolean',1)
ON CONFLICT (page, section, key) DO NOTHING;

-- ─── Thank You shout-outs → structured JSON ───────────────────────────────────
-- Seeded from Opie's existing crew rich-text (his blurbs preserved verbatim).
-- The old crew.body row is intentionally kept as a fallback / backup — not deleted.
-- INSERT-only (ON CONFLICT DO NOTHING) so this never overwrites later edits.
INSERT INTO site_content (page, section, key, label, value, value_type, sort_order) VALUES
  ('thanks','crew','shoutouts','Shout-outs',
   $j$[
     {"name":"Kristin at Aethyx","blurb":"My web designer! She built this whole joint from scratch and put up with every one of my 2 a.m. ideas.\n\nPlease reach out to her for your site ideas and marketing needs:","website":"https://aethyx.space","instagram":"","facebook":"","email":""},
     {"name":"Ketut Adiwijaya K","blurb":"My graphic designer. I would draw up the ideas, and this was the only designer that understood the way my brain worked. We worked for years on 30 designs and my logo. And yes, even though we are in different parts of the world, communication was effortless. Always appreciative for the work and one of my favorite working relationships I've ever had.\n\nContact through email or Instagram.","website":"","instagram":"Art_design26","facebook":"","email":"Rastelrokok130@gmail.com"},
     {"name":"Heather Ullrich Fortes","blurb":"My printing vendor at Up2 Boutique. I could not of done this without her guidance and recommendations.\n\nI highly recommend reaching out to them for all your custom garment needs.","website":"http://www.Up2boutique.com","instagram":"Up2ournecksinfabric","facebook":"","email":""},
     {"name":"Dayna Mancini Simmons","blurb":"She helped create and build my short-lived Shopify page. She understood the format and direction I wanted and ran with it. I ended up not continuing with Shopify, but Dayna and her team at Ocean State Marketing knocked it out of the park, and I am grateful for seeing what could be on a different platform.","website":"http://www.Oceanstatenetworking.com","instagram":"","facebook":"","email":""},
     {"name":"Bar regulars","blurb":"You inspired all these designs. Don't be proud. That's not a good thing. However, thank you for being my guinea pigs with all the lines, and sarcasm I dished out to you.","website":"","instagram":"","facebook":"","email":""}
   ]$j$,
   'text', 7)
ON CONFLICT (page, section, key) DO NOTHING;
