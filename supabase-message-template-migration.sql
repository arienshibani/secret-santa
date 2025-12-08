-- Migration: Add message template fields to admin_config
-- Adds message_template and email_subject columns for customizable messages

ALTER TABLE admin_config 
ADD COLUMN IF NOT EXISTS message_template TEXT,
ADD COLUMN IF NOT EXISTS email_subject TEXT;

-- Add comment for documentation
COMMENT ON COLUMN admin_config.message_template IS 'Customizable message template with placeholders: {{participantsName}}, {{url}}, {{eventName}}';
COMMENT ON COLUMN admin_config.email_subject IS 'Customizable email subject template with placeholders: {{eventName}}';

