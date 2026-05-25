-- Fix home.hero.subheading value to match actual page copy (was generic placeholder)
UPDATE site_content
SET value        = 'Use your sleeve to give them a piece of your mind.',
    default_value = 'Use your sleeve to give them a piece of your mind.'
WHERE page = 'home' AND section = 'hero' AND key = 'subheading';

-- Fix home.featured.heading value to match actual page copy
UPDATE site_content
SET value        = 'FEATURED',
    default_value = 'FEATURED'
WHERE page = 'home' AND section = 'featured' AND key = 'heading';

-- ─── Home page — new rows ──────────────────────────────────────────────────────
INSERT INTO site_content (page, section, key, label, value, value_type, sort_order) VALUES
  -- hero subheading (already exists — only updated above, not re-inserted)
  -- superpowers section
  ('home','superpowers','label',   'Super Powers Label',  'Super Powers include:',                                                                                                                                                   'text', 10),
  ('home','superpowers','item_1',  'Super Power 1',       'Offend a Karen without having to open your mouth.',                                                                                                                       'text', 11),
  ('home','superpowers','item_2',  'Super Power 2',       'Go out and show fellow bartenders that you''re a bartender too without having to verbally announce it (You entitled freak!).',                                           'text', 12),
  ('home','superpowers','item_3',  'Super Power 3',       'Call out the general public on certain undesirable behaviors.',                                                                                                           'text', 13),
  -- extras (BUT WAIT, THERE'S MORE) section
  ('home','extras','heading',      'Extras Heading',      'BUT WAIT, THERE''S MORE:',                                                                                                                                               'text', 14),
  ('home','extras','label',        'Extras Label',        'Also included:',                                                                                                                                                         'text', 15),
  ('home','extras','item_1',       'Extra 1',             'Eye rolls.',                                                                                                                                                             'text', 16),
  ('home','extras','item_2',       'Extra 2',             'Your parents refusing to be seen out with you while you''re wearing that.',                                                                                              'text', 17),
  ('home','extras','item_3',       'Extra 3',             'Receive looks of disgust from pretentious bartenders who still thinks the customer is always right (THEY''RE NOT CUSTOMERS! THEY''RE GUESTS!...OH, SHUT UP!!!).',       'text', 18),
  -- manifesto closing line
  ('home','manifesto','text',      'Manifesto Text',      'Made by a dark humored, sarcastic bartender, for a dark humored, sarcastic bartender!',                                                                                  'text', 19),
  -- CTA buttons
  ('home','cta','primary_button',  'Primary CTA',         'ORDER A ROUND',                                                                                                                                                         'text', 20),
  ('home','cta','secondary_button','Secondary CTA',       'MY STORY',                                                                                                                                                              'text', 21),
  -- featured section (home.featured.visible and home.featured.heading already exist)
  ('home','featured','label',      'Featured Label',      'The lineup',                                                                                                                                                             'text', 22),
  ('home','featured','subheading', 'Featured Subheading', 'The shirts that start conversations. And bar fights.',                                                                                                                   'text', 23),
  ('home','featured','link_text',  'Featured Link Text',  'See the full menu',                                                                                                                                                      'text', 24),
  ('home','featured','button',     'Featured Button',     'THE FULL MENU',                                                                                                                                                          'text', 25),
  -- rotating quotes section
  ('home','quotes','label',        'Quotes Section Label','Bad Bartender Advice',                                                                                                                                                   'text', 26),
  ('home','quotes','attribution',  'Quotes Attribution',  '— Every Bartender Ever',                                                                                                                                                 'text', 27),
  ('home','quotes','q_1',          'Quote 1',             'Offend a Karen without having to open your mouth.',                                                                                                                       'text', 28),
  ('home','quotes','q_2',          'Quote 2',             'I''m not arguing. I''m explaining why I''m right and you''re ordering wrong.',                                                                                           'text', 29),
  ('home','quotes','q_3',          'Quote 3',             'Show fellow bartenders you''re one of them — no verbal announcement required.',                                                                                           'text', 30),
  ('home','quotes','q_4',          'Quote 4',             'Your cocktail takes 3 minutes. Your complaint takes my will to live.',                                                                                                    'text', 31),
  ('home','quotes','q_5',          'Quote 5',             'Call out the general public on certain undesirable behaviors.',                                                                                                           'text', 32),
  ('home','quotes','q_6',          'Quote 6',             'I''ve cut off better people than you.',                                                                                                                                  'text', 33),
  ('home','quotes','q_7',          'Quote 7',             'Receive looks of disgust from pretentious bartenders who still think the customer is always right. (They''re guests. GUESTS. Oh, shut up.)',                             'text', 34),
  ('home','quotes','q_8',          'Quote 8',             'I don''t have a drinking problem. I have a customer problem.',                                                                                                            'text', 35),
  ('home','quotes','q_9',          'Quote 9',             'Yes, the music is loud. That''s because I don''t want to hear you.',                                                                                                     'text', 36),
  ('home','quotes','q_10',         'Quote 10',            'My face says ''welcome.'' My eyes say ''don''t test me.''',                                                                                                              'text', 37),
  -- newsletter section
  ('home','newsletter','heading',   'Newsletter Heading',    'JOIN THE SHIFT',                                                                                                                                                       'text', 38),
  ('home','newsletter','subheading','Newsletter Subheading', 'Early drops, industry humor, and discounts that actually feel like ones.',                                                                                             'text', 39),
  ('home','newsletter','disclaimer','Newsletter Disclaimer', 'No spam. Just shift notes.',                                                                                                                                           'text', 40),
  ('home','newsletter','success',   'Newsletter Success Msg','You''re on the list. Don''t embarrass us.',                                                                                                                            'text', 41)
ON CONFLICT (page, section, key) DO NOTHING;

-- ─── About page — new rows ─────────────────────────────────────────────────────
INSERT INTO site_content (page, section, key, label, value, value_type, sort_order) VALUES
  ('about','hero',      'label',  'Hero Label',      'My Story',                                                                           'text', 4),
  ('about','pullquote', 'text',   'Pull Quote',      'If you''ve ever been stiffed on a $200 tab — these shirts are for you.',             'text', 5),
  ('about','manifesto', 'label',  'Manifesto Label', 'The manifesto',                                                                      'text', 6),
  ('about','manifesto', 'text',   'Manifesto Text',  '"WE DON''T JUST MAKE SHIRTS. WE MAKE UNIFORMS FOR THE UNDERAPPRECIATED."',           'text', 7),
  ('about','cta',       'button', 'CTA Button',      'READ THE MENU',                                                                      'text', 8)
ON CONFLICT (page, section, key) DO NOTHING;

-- ─── Contact page — new rows ──────────────────────────────────────────────────
INSERT INTO site_content (page, section, key, label, value, value_type, sort_order) VALUES
  ('contact','hero',    'label',         'Hero Label',      'We''re listening',                                           'text', 3),
  ('contact','hero',    'subheading',    'Hero Subheading', 'Got a question, complaint, or a good bartender horror story? Slide it over.', 'text', 4),
  ('contact','sidebar', 'email',         'Email Address',   'Opie@pournogravy.com',                                       'text', 5),
  ('contact','sidebar', 'response_time', 'Response Time',   '24–48 hrs on weekdays.',                                     'text', 6),
  ('contact','sidebar', 'response_note', 'Response Note',   'Weekends we''re usually working doubles.',                   'text', 7)
ON CONFLICT (page, section, key) DO NOTHING;

-- ─── Shop page — new rows ─────────────────────────────────────────────────────
INSERT INTO site_content (page, section, key, label, value, value_type, sort_order) VALUES
  ('shop','hero','label','Hero Label','The whole catalog','text', 4)
ON CONFLICT (page, section, key) DO NOTHING;

-- ─── FAQ page — new rows ──────────────────────────────────────────────────────
INSERT INTO site_content (page, section, key, label, value, value_type, sort_order) VALUES
  ('faq','hero', 'label',    'Hero Label',    'Asked more than "one more drink?"',                                    'text',  3),
  ('faq','hero', 'subheading','Hero Subheading','The stuff everyone wants to know. Answered with minimal sarcasm.',  'text',  4),
  ('faq','items','q1_q', 'FAQ 1 Question', 'How long does shipping take?',                                                                                                                                          'text', 10),
  ('faq','items','q1_a', 'FAQ 1 Answer',   '3–7 business days domestically. Faster than your manager responding to your schedule request, slower than a Karen finding something to complain about.',               'text', 11),
  ('faq','items','q2_q', 'FAQ 2 Question', 'What''s your return policy?',                                                                                                                                           'text', 20),
  ('faq','items','q2_a', 'FAQ 2 Answer',   '30 days, unworn, with tags. We''re more lenient than your bar manager but less lenient than your ex.',                                                                  'text', 21),
  ('faq','items','q3_q', 'FAQ 3 Question', 'Do you ship internationally?',                                                                                                                                          'text', 30),
  ('faq','items','q3_a', 'FAQ 3 Answer',   'Not yet. Turns out dealing with customs is like dealing with a bachelorette party — complicated and expensive.',                                                        'text', 31),
  ('faq','items','q4_q', 'FAQ 4 Question', 'What sizes do you carry?',                                                                                                                                              'text', 40),
  ('faq','items','q4_a', 'FAQ 4 Answer',   'S through 2XL. Unisex fit. Looks great on bartenders, servers, and anyone who''s ever fantasized about quitting mid-shift.',                                            'text', 41),
  ('faq','items','q5_q', 'FAQ 5 Question', 'Can I suggest a shirt design?',                                                                                                                                         'text', 50),
  ('faq','items','q5_a', 'FAQ 5 Answer',   'Absolutely. Hit us up on the Contact page. If your idea is funny enough, we might actually make it. If it''s terrible, we''ll roast you.',                             'text', 51),
  ('faq','items','q6_q', 'FAQ 6 Question', 'Do you offer bulk/wholesale pricing?',                                                                                                                                  'text', 60),
  ('faq','items','q6_a', 'FAQ 6 Answer',   'For bars, restaurants, and teams — yes. Contact us and we''ll work something out. Staff uniforms with attitude? We''re in.',                                            'text', 61),
  ('faq','items','q7_q', 'FAQ 7 Question', 'Are your shirts good quality?',                                                                                                                                         'text', 70),
  ('faq','items','q7_a', 'FAQ 7 Answer',   'Premium cotton, pre-shrunk, built to survive doubles, spills, and the occasional cry in the walk-in cooler.',                                                           'text', 71)
ON CONFLICT (page, section, key) DO NOTHING;
