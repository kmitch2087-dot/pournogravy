-- Add mockup image to printer_notification template
update public.email_templates
set body_html = replace(
  body_html,
  '{{print_files}}',
  '<div style="margin:8px 0"><img src="{{mock_image_url}}" alt="Product mockup" style="max-width:200px;border-radius:4px;"/></div>{{print_files}}'
)
where key = 'printer_notification'
  and body_html not like '%mock_image_url%';

-- Add mockup image to order_confirmation template
update public.email_templates
set body_html = replace(
  body_html,
  '{{item_name}}',
  '<img src="{{mock_image_url}}" alt="{{item_name}}" style="max-width:80px;vertical-align:middle;border-radius:4px;margin-right:8px;"/>{{item_name}}'
)
where key = 'order_confirmation'
  and body_html not like '%mock_image_url%';
