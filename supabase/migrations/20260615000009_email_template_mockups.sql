-- Add mockup image to printer_notification template
update public.email_templates
set html_content = replace(
  html_content,
  '{{print_files}}',
  '<div style="margin:8px 0"><img src="{{mock_image_url}}" alt="Product mockup" style="max-width:200px;border-radius:4px;"/></div>{{print_files}}'
)
where template_key = 'printer_notification'
  and html_content not like '%mock_image_url%';

-- Add mockup image to order_confirmation template
update public.email_templates
set html_content = replace(
  html_content,
  '{{item_name}}',
  '<img src="{{mock_image_url}}" alt="{{item_name}}" style="max-width:80px;vertical-align:middle;border-radius:4px;margin-right:8px;"/>{{item_name}}'
)
where template_key = 'order_confirmation'
  and html_content not like '%mock_image_url%';
