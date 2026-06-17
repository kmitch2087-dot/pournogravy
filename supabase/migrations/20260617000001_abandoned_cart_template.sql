-- Seed abandoned_cart email template.
-- Triggered by the abandoned-cart-reminder edge function for carts idle > 1 hour.
-- Variables: items (plain-text list), site_url

INSERT INTO public.email_templates (key, name, subject, body_html, body_text, description, variables)
VALUES (
  'abandoned_cart',
  'Abandoned cart reminder',
  'HEY. YOU LEFT YOUR TAB OPEN.',
  '<div style="font-family:''Courier New'',Courier,monospace;max-width:480px;margin:0 auto;background:#faf8f0;border:1px solid #d4c5a0;padding:0;color:#1a0e04;"><div style="text-align:center;padding:20px 24px 14px;border-bottom:2px dashed #a08040;"><div style="font-size:20px;font-weight:bold;letter-spacing:0.18em;text-transform:uppercase;">POURnogravy</div><div style="font-size:16px;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;margin-top:12px;">HEY.<br/>YOU LEFT YOUR TAB OPEN.</div></div><div style="padding:16px 24px;border-bottom:1px dashed #c0a060;"><pre style="font-family:''Courier New'',Courier,monospace;font-size:13px;white-space:pre-wrap;margin:0;color:#1a0e04;line-height:1.7;">{{items}}</pre></div><div style="text-align:center;padding:16px 24px 20px;"><a href="{{site_url}}/shop" style="display:inline-block;background:#fde047;color:#000;font-family:''Courier New'',Courier,monospace;font-weight:bold;font-size:14px;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;padding:12px 28px;border:2px solid #1a0e04;">CLOSE OUT YOUR TAB</a><div style="font-size:11px;color:#9a7050;margin-top:14px;">Your cart is waiting at pournogravy.com</div></div></div>',
  E'POURnogravy\n\nHEY. YOU LEFT YOUR TAB OPEN.\n\n{{items}}\n\nClose it out: {{site_url}}/shop\n\n-- POURnogravy',
  'Sent to users who have items in cart but have not checked out after 1 hour.',
  ARRAY['items','site_url']
)
ON CONFLICT (key) DO UPDATE
  SET body_html   = EXCLUDED.body_html,
      body_text   = EXCLUDED.body_text,
      subject     = EXCLUDED.subject,
      name        = EXCLUDED.name,
      description = EXCLUDED.description,
      variables   = EXCLUDED.variables;
