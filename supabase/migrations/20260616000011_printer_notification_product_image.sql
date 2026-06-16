-- Fix: add product mockup image to printer_notification email template.
-- The prior migration (20260615000009) searched for {{print_files}} which
-- does not exist in the current template body — making it a silent no-op.
-- This migration does a targeted string-replace to insert the img tag
-- directly above {{order_items}} in a way that is idempotent.

UPDATE public.email_templates
SET body_html = replace(
  body_html,
  '<pre style="background:#f5f5f5;padding:12px;border:1px solid #ddd;white-space:pre-wrap">{{order_items}}</pre>',
  '<img src="{{mock_image_url}}" alt="Product mockup" style="max-width:200px;display:block;margin-bottom:8px;border:1px solid #ddd;" /><pre style="background:#f5f5f5;padding:12px;border:1px solid #ddd;white-space:pre-wrap">{{order_items}}</pre>'
)
WHERE key = 'printer_notification'
  AND body_html NOT LIKE '%mock_image_url%';
