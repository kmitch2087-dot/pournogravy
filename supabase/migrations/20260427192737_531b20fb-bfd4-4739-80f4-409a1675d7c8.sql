
INSERT INTO public.email_templates (key, name, description, subject, body_html, body_text, variables) VALUES
(
  'order_confirmation',
  'Order Confirmation',
  'Sent when a Stripe payment succeeds.',
  'Order {{order_number}} confirmed — thanks for the pour',
  '<div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0a0a0a;background:#ffffff"><h1 style="font-family:Georgia,serif;letter-spacing:0.1em;text-transform:uppercase;font-size:24px;margin:0 0 16px">POURnogravy</h1><p>Hey {{customer_name}},</p><p>Order <strong>{{order_number}}</strong> is in. We''re pulling it together. You''ll hear from us again the second it ships.</p><div style="border-top:1px solid #ddd;border-bottom:1px solid #ddd;padding:12px 0;margin:20px 0;white-space:pre-wrap;font-family:Menlo,monospace;font-size:13px">{{order_items}}</div><p><strong>Total:</strong> {{order_total}}</p><p style="color:#666;font-size:12px;margin-top:32px">Questions? Reply to this email.</p></div>',
  'Hey {{customer_name}},\n\nOrder {{order_number}} is in. We''re pulling it together. You''ll hear from us again the second it ships.\n\n{{order_items}}\n\nTotal: {{order_total}}\n\nQuestions? Just reply.\n\n— POURnogravy',
  ARRAY['customer_name','order_number','order_items','order_total']
),
(
  'order_shipped',
  'Order Shipped',
  'Sent when an admin marks an order as shipped.',
  'Order {{order_number}} is on the way',
  '<div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0a0a0a;background:#ffffff"><h1 style="font-family:Georgia,serif;letter-spacing:0.1em;text-transform:uppercase;font-size:24px;margin:0 0 16px">POURnogravy</h1><p>{{customer_name}},</p><p>Your order <strong>{{order_number}}</strong> just shipped via {{tracking_carrier}}.</p><p style="font-size:18px"><strong>Tracking:</strong> {{tracking_number}}</p><p style="color:#666;font-size:12px;margin-top:32px">Reply if anything looks off.</p></div>',
  '{{customer_name}},\n\nYour order {{order_number}} just shipped via {{tracking_carrier}}.\n\nTracking: {{tracking_number}}\n\n— POURnogravy',
  ARRAY['customer_name','order_number','tracking_carrier','tracking_number']
),
(
  'custom_request_reply',
  'Custom Request Reply',
  'Used when responding to a custom garment request.',
  'About your custom request for {{garment}}',
  '<div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0a0a0a;background:#ffffff"><h1 style="font-family:Georgia,serif;letter-spacing:0.1em;text-transform:uppercase;font-size:24px;margin:0 0 16px">POURnogravy</h1><p>Hey {{customer_name}},</p><p>{{message}}</p><p style="color:#666;font-size:12px;margin-top:32px">— Opie</p></div>',
  'Hey {{customer_name}},\n\n{{message}}\n\n— Opie',
  ARRAY['customer_name','garment','message']
),
(
  'printer_notification',
  'Printer Notification',
  'Sent to the local printer email when an order needs to be fulfilled.',
  'New order to print: {{order_number}}',
  '<div style="font-family:Menlo,monospace;max-width:600px;margin:0 auto;padding:24px;color:#0a0a0a;background:#ffffff"><h2 style="font-family:Georgia,serif;letter-spacing:0.1em;text-transform:uppercase">New Print Job</h2><p><strong>Order:</strong> {{order_number}}<br/><strong>Customer:</strong> {{customer_name}} &lt;{{customer_email}}&gt;</p><h3>Items</h3><pre style="background:#f5f5f5;padding:12px;border:1px solid #ddd;white-space:pre-wrap">{{order_items}}</pre><h3>Ship To</h3><pre style="background:#f5f5f5;padding:12px;border:1px solid #ddd;white-space:pre-wrap">{{shipping_address}}</pre></div>',
  'New Print Job\n\nOrder: {{order_number}}\nCustomer: {{customer_name}} <{{customer_email}}>\n\nItems:\n{{order_items}}\n\nShip To:\n{{shipping_address}}',
  ARRAY['order_number','customer_name','customer_email','order_items','shipping_address']
)
ON CONFLICT (key) DO NOTHING;

-- Ensure a settings row exists
INSERT INTO public.settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
