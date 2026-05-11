-- Seed missing email template: client_edit_request
-- Called by EditBubble.tsx when Opie or Kristin submits a note/edit request.
-- The four original templates (order_confirmation, order_shipped,
-- custom_request_reply, printer_notification) are already seeded in
-- 20260426055540. This migration only adds what's missing.
-- Safe to re-run (ON CONFLICT DO NOTHING).

INSERT INTO public.email_templates (key, name, subject, body_html, body_text, description, variables)
VALUES
  (
    'client_edit_request',
    'Client edit request notification',
    'New edit request from {{author}}',
    '<h2>New edit request — Pournogravy</h2>
<p><strong>From:</strong> {{author}}</p>
<p><strong>Request:</strong></p>
<blockquote style="border-left:3px solid #f59e0b;padding-left:12px;color:#555;">{{content}}</blockquote>
<p style="color:#888;font-size:12px;">Submitted {{created_at}} — review in the admin dashboard at pournogravy.com/admin/edit-requests</p>',
    'New edit request from {{author}}: {{content}}. Review at pournogravy.com/admin/edit-requests',
    'Sent to admin when a client edit request is submitted via the feedback bubble.',
    ARRAY['author','content','created_at']
  )
ON CONFLICT (key) DO NOTHING;
