-- Add soft-delete support to inbox_messages (for Inbox/Trash tabs)
-- and to notifications (for Sent tab future soft-delete support).

ALTER TABLE public.inbox_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.notifications    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Allow queued_no_sender status (used by send-notification when RESEND_API_KEY is absent)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_status_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_status_check
  CHECK (status IN ('pending','sending','sent','failed','queued_no_sender'));

CREATE INDEX IF NOT EXISTS inbox_messages_deleted_at_idx ON public.inbox_messages(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_deleted_at_idx  ON public.notifications(deleted_at)    WHERE deleted_at IS NULL;
