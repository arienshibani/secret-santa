-- Migration: Add event_date to admin_config and cleanup function
-- Adds event_date column for event scheduling and automatic cleanup

ALTER TABLE admin_config 
ADD COLUMN IF NOT EXISTS event_date TIMESTAMP WITH TIME ZONE;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_admin_config_event_date ON admin_config(event_date);

-- Function to cleanup old contact info (runs automatically or can be called manually)
CREATE OR REPLACE FUNCTION cleanup_old_contact_info()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete email and SMS for events that are 7+ days past their event_date
    UPDATE participants
    SET email = NULL,
        sms = NULL
    WHERE (email IS NOT NULL OR sms IS NOT NULL)
    AND event_name IN (
        SELECT event_name 
        FROM admin_config 
        WHERE event_date IS NOT NULL 
        AND event_date + INTERVAL '7 days' < NOW()
    );
END;
$$;

-- Add comment for documentation
COMMENT ON COLUMN admin_config.event_date IS 'Date and time when the Secret Santa event occurs. Contact info is automatically cleaned up 7 days after this date.';

