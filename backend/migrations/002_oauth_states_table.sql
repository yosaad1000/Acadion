-- Migration: Add OAuth states table for temporary state storage during OAuth flow
-- This table stores temporary OAuth state data for callback validation

CREATE TABLE IF NOT EXISTS oauth_states (
    id SERIAL PRIMARY KEY,
    state VARCHAR(255) NOT NULL UNIQUE,
    data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient state lookup
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);

-- Index for cleanup of expired states
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);

-- Function to automatically clean up expired OAuth states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
    DELETE FROM oauth_states WHERE expires_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired states (if using pg_cron extension)
-- This is optional and depends on your database setup
-- SELECT cron.schedule('cleanup-oauth-states', '*/5 * * * *', 'SELECT cleanup_expired_oauth_states();');