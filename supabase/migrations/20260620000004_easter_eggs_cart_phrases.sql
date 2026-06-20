-- A4: Add-to-cart easter egg phrases
INSERT INTO product_easter_eggs (category, text, active) VALUES
  ('add_to_cart', 'Add to My Tab',              true),
  ('add_to_cart', 'Ring It Up',                 true),
  ('add_to_cart', 'One More Round',             true),
  ('add_to_cart', 'Close Me Out',               true),
  ('add_to_cart', 'Take It To-Go',              true),
  ('add_to_cart', 'Run It',                     true),
  ('add_to_cart', 'Hook It Up',                 true),
  ('add_to_cart', 'Last Call — I''ll Take It',  true),
  ('add_to_cart', 'Put It On His Card',         true),
  ('add_to_cart', 'She''s Buying',              true),
  ('add_to_cart', 'Charge It',                  true),
  ('add_to_cart', 'I''m Good For It',           true)
ON CONFLICT DO NOTHING;
