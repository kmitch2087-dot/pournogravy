INSERT INTO email_templates (key, subject, body_html)
VALUES (
  'vendor_welcome',
  'Welcome to the POURnogravy Vendor Network',
  '<p>Hey {{contact_name}},</p><p>You have been added as a fulfillment partner for POURnogravy. We will be in touch with orders as they come in.</p><p>Do not do anything until you hear from us. We will send you print files and order details via email.</p><p>— Kristin @ Aethyx (on behalf of Adam @ POURnogravy)</p>'
)
ON CONFLICT (key) DO UPDATE
  SET body_html = EXCLUDED.body_html,
      subject   = EXCLUDED.subject;
