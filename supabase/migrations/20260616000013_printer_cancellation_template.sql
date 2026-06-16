INSERT INTO email_templates (key, name, subject, body_html, body_text)
VALUES (
  'printer_cancellation',
  'Printer job cancellation',
  '⛔ CANCEL PRINT JOB — Order #{{order_id_short}}',
  '<div style="font-family:''Courier New'',Courier,monospace;max-width:520px;margin:0 auto;background:#fff8f8;border:2px solid #dc2626;padding:0;color:#1a0e04;">
  <div style="background:#dc2626;color:#fff;text-align:center;padding:16px 24px;">
    <div style="font-size:20px;font-weight:bold;letter-spacing:0.15em;">⛔ CANCEL THIS JOB</div>
    <div style="font-size:13px;margin-top:4px;opacity:0.9;">POURnogravy · Order refunded by customer</div>
  </div>
  <div style="padding:20px 24px;">
    <p style="margin:0 0 12px;font-size:14px;"><strong>Order ID:</strong> {{order_id_short}}</p>
    <p style="margin:0 0 12px;font-size:14px;"><strong>Customer:</strong> {{customer_email}}</p>
    <p style="margin:0 0 4px;font-size:13px;font-weight:bold;">Items to cancel:</p>
    <pre style="background:#fff0f0;border:1px solid #fca5a5;padding:12px;font-size:13px;white-space:pre-wrap;margin:0 0 16px;">{{order_items}}</pre>
    <p style="margin:0 0 12px;font-size:13px;color:#7f1d1d;"><strong>If printing has already started:</strong> Please contact us immediately at kmitch2087@gmail.com so we can coordinate.</p>
    <p style="margin:0;font-size:12px;color:#991b1b;">DO NOT ship this order. The customer has been refunded.</p>
  </div>
  <div style="border-top:1px dashed #fca5a5;padding:12px 24px;text-align:center;font-size:11px;color:#9a7050;">
    POURnogravy · Managed by Kristin @ Aethyx
  </div>
</div>',
  E'⛔ CANCEL PRINT JOB\nOrder #{{order_id_short}}\n\nCustomer: {{customer_email}}\n\nItems:\n{{order_items}}\n\nDO NOT ship this order. The customer has been refunded.\n\nIf printing has already started, contact kmitch2087@gmail.com immediately.\n\n-- POURnogravy'
)
ON CONFLICT (key) DO UPDATE
  SET body_html = EXCLUDED.body_html,
      body_text = EXCLUDED.body_text,
      subject   = EXCLUDED.subject;
