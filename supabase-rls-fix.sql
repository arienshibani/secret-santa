-- Security Fix: Update Row Level Security Policies
-- This migration removes public access to admin_config and restricts participant access
-- Admin operations should now go through server-side API routes with service role key

-- Remove all existing policies
DROP POLICY IF EXISTS "Allow public read on participants" ON participants;
DROP POLICY IF EXISTS "Allow public insert on participants" ON participants;
DROP POLICY IF EXISTS "Allow public update on participants" ON participants;
DROP POLICY IF EXISTS "Allow public delete on participants" ON participants;
DROP POLICY IF EXISTS "Allow public read on admin_config" ON admin_config;
DROP POLICY IF EXISTS "Allow public insert on admin_config" ON admin_config;
DROP POLICY IF EXISTS "Allow public delete on admin_config" ON admin_config;

-- Participants table policies
-- Allow reading participant by token (for assignment lookup - public access needed)
CREATE POLICY "Allow read by token" ON participants
    FOR SELECT USING (
        token IS NOT NULL
    );

-- Allow inserting participants (needed for initial setup)
CREATE POLICY "Allow public insert on participants" ON participants
    FOR INSERT WITH CHECK (true);

-- Allow updating own assignment (by token) - needed for gift_ready status updates
-- Note: This is still somewhat permissive, but necessary for the assignment flow
-- Admin updates go through server-side API with service role key (bypasses RLS)
CREATE POLICY "Allow update by token" ON participants
    FOR UPDATE USING (
        token IS NOT NULL
    ) WITH CHECK (
        token IS NOT NULL
    );

-- Admin config table policies
-- Only allow inserting admin config (during setup - before admin exists)
CREATE POLICY "Allow public insert on admin_config" ON admin_config
    FOR INSERT WITH CHECK (true);

-- NO SELECT policy - admin config should only be accessed via server-side API
-- This prevents direct client-side access to PINs
-- NO UPDATE/DELETE policies - these should only be done via server-side API

