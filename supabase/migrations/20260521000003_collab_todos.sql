ALTER TABLE client_edit_requests
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'message',
  ADD COLUMN IF NOT EXISTS checked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_to text;
COMMENT ON COLUMN client_edit_requests.type IS '''message'' | ''todo''';
COMMENT ON COLUMN client_edit_requests.assigned_to IS '''opie'' | ''kristin'' | null = both';
