-- Seed vendor_welcome email template.
-- Sent when a new fulfillment vendor is added via add-fulfillment-vendor edge function.
-- Variables: contact_name

INSERT INTO public.email_templates (key, name, subject, body_html, body_text, description, variables)
VALUES (
  'vendor_welcome',
  'Vendor welcome',
  'Welcome to the POURnogravy Vendor Network',
  '<div style="font-family:''Courier New'',Courier,monospace;max-width:480px;margin:0 auto;background:#faf8f0;border:1px solid #d4c5a0;padding:24px;color:#1a0e04;"><div style="font-size:18px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:16px;">POURnogravy</div><p style="margin:0 0 12px;">Hey {{contact_name}},</p><p style="margin:0 0 12px;">You have been added as a fulfillment partner for POURnogravy. We will be in touch with orders as they come in.</p><p style="margin:0 0 12px;">Do not do anything until you hear from us. We will send you print files and order details via email.</p><p style="margin:0;">— Kristin @ Aethyx (on behalf of Adam @ POURnogravy)</p></div>',
  E'Hey {{contact_name}},\n\nYou have been added as a fulfillment partner for POURnogravy. We will be in touch with orders as they come in.\n\nDo not do anything until you hear from us. We will send you print files and order details via email.\n\n— Kristin @ Aethyx (on behalf of Adam @ POURnogravy)',
  'Sent to a new fulfillment vendor when they are added to the system.',
  ARRAY['contact_name']
)
ON CONFLICT (key) DO UPDATE
  SET body_html   = EXCLUDED.body_html,
      body_text   = EXCLUDED.body_text,
      subject     = EXCLUDED.subject,
      name        = EXCLUDED.name,
      description = EXCLUDED.description,
      variables   = EXCLUDED.variables;
