-- Chat image attachments (feat: permitir envio de imagens no chat).
-- Already applied by hand via the Supabase SQL Editor on the production
-- project. Kept here so a new environment (fresh Supabase project, CI
-- database, teammate's local instance) can reproduce the schema — this
-- repo has no migration tool wired up, so re-running these manually is
-- the current process.

ALTER TABLE messages
  ALTER COLUMN content DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS attachment_url text;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type = ANY (ARRAY['text'::text, 'system'::text, 'image'::text]));

-- Storage: a "chat-attachments" bucket must also exist, created via the
-- Supabase Storage API (not SQL) as: private, image/* only, 5MB limit.
-- See backend/app/services/message_service.py (ATTACHMENTS_BUCKET) for
-- the values used, and README.md for how to (re)create it.
