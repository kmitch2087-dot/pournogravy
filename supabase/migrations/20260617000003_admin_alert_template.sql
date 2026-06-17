-- Seed admin_alert email template.
-- Internal alert sent to Kristin when automated processes need attention.
-- Used by: refresh-market-rates edge function.
-- Variables: subject, message

INSERT INTO public.email_templates (key, name, subject, body_html, body_text, description, variables)
VALUES (
  'admin_alert',
  'Admin alert',
  '{{subject}}',
  '<div style="font-family:''Courier New'',Courier,monospace;max-width:540px;margin:0 auto;background:#faf8f0;border:1px solid #d4c5a0;padding:24px;color:#1a0e04;"><div style="font-size:16px;font-weight:bold;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:16px;border-bottom:2px dashed #a08040;padding-bottom:12px;">POURnogravy Admin Alert</div><pre style="font-family:''Courier New'',Courier,monospace;font-size:13px;white-space:pre-wrap;margin:0;line-height:1.7;color:#1a0e04;">{{message}}</pre></div>',
  E'POURnogravy Admin Alert\n\n{{message}}',
  'Internal alert email sent to admins when automated processes encounter issues.',
  ARRAY['subject','message']
)
ON CONFLICT (key) DO UPDATE
  SET body_html   = EXCLUDED.body_html,
      body_text   = EXCLUDED.body_text,
      subject     = EXCLUDED.subject,
      name        = EXCLUDED.name,
      description = EXCLUDED.description,
      variables   = EXCLUDED.variables;
