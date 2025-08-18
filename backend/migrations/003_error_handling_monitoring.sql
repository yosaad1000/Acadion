-- Migration for error handling and monitoring tables
-- Adds tables for retry operations, local calendar events, and OAuth states

-- Table for storing retry operations
CREATE TABLE IF NOT EXISTS retry_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type VARCHAR(100) NOT NULL,
    operation_data JSONB NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_retry_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'expired')),
    last_error TEXT,
    config JSONB
);

-- Indexes for retry operations
CREATE INDEX IF NOT EXISTS idx_retry_operations_status ON retry_operations(status);
CREATE INDEX IF NOT EXISTS idx_retry_operations_next_retry ON retry_operations(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_retry_operations_user_id ON retry_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_retry_operations_created_at ON retry_operations(created_at);

-- Table for local calendar events (fallback storage)
CREATE TABLE IF NOT EXISTS local_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255),
    attendees JSONB DEFAULT '[]',
    google_event_id VARCHAR(255),
    is_synced BOOLEAN DEFAULT FALSE,
    created_locally BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for local calendar events
CREATE INDEX IF NOT EXISTS idx_local_events_user_id ON local_calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_local_events_start_datetime ON local_calendar_events(start_datetime);
CREATE INDEX IF NOT EXISTS idx_local_events_is_synced ON local_calendar_events(is_synced);
CREATE INDEX IF NOT EXISTS idx_local_events_google_id ON local_calendar_events(google_event_id);

-- Table for OAuth states (temporary storage for OAuth flow)
CREATE TABLE IF NOT EXISTS oauth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state VARCHAR(255) UNIQUE NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for OAuth states
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);

-- Table for system health metrics
CREATE TABLE IF NOT EXISTS system_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('available', 'degraded', 'unavailable')),
    response_time DECIMAL(10,3),
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    metadata JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for system health metrics
CREATE INDEX IF NOT EXISTS idx_health_metrics_service ON system_health_metrics(service_name);
CREATE INDEX IF NOT EXISTS idx_health_metrics_recorded_at ON system_health_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_health_metrics_status ON system_health_metrics(status);

-- Table for error logs with structured data
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_code VARCHAR(100) NOT NULL,
    error_category VARCHAR(50) NOT NULL,
    error_message TEXT NOT NULL,
    user_id INTEGER,
    operation_type VARCHAR(100),
    context_data JSONB,
    stack_trace TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for error logs
CREATE INDEX IF NOT EXISTS idx_error_logs_error_code ON error_logs(error_code);
CREATE INDEX IF NOT EXISTS idx_error_logs_category ON error_logs(error_category);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

-- Function to clean up expired OAuth states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM oauth_states 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old retry operations
CREATE OR REPLACE FUNCTION cleanup_old_retry_operations(retention_days INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM retry_operations 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days
    AND status IN ('success', 'failed', 'expired');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old health metrics
CREATE OR REPLACE FUNCTION cleanup_old_health_metrics(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM system_health_metrics 
    WHERE recorded_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old error logs
CREATE OR REPLACE FUNCTION cleanup_old_error_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM error_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days
    AND resolved = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_retry_operations_updated_at
    BEFORE UPDATE ON retry_operations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_local_calendar_events_updated_at
    BEFORE UPDATE ON local_calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies

-- Enable RLS on tables
ALTER TABLE retry_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Policies for retry_operations (users can only see their own operations)
CREATE POLICY retry_operations_user_policy ON retry_operations
    FOR ALL USING (user_id = auth.uid()::integer);

-- Policies for local_calendar_events (users can only see their own events)
CREATE POLICY local_calendar_events_user_policy ON local_calendar_events
    FOR ALL USING (user_id = auth.uid()::integer);

-- Policies for error_logs (users can only see their own errors)
CREATE POLICY error_logs_user_policy ON error_logs
    FOR ALL USING (user_id = auth.uid()::integer OR user_id IS NULL);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON retry_operations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON local_calendar_events TO authenticated;
GRANT SELECT, INSERT ON error_logs TO authenticated;
GRANT SELECT ON system_health_metrics TO authenticated;
GRANT SELECT, DELETE ON oauth_states TO authenticated;

-- Grant permissions for service role (for background tasks)
GRANT ALL ON retry_operations TO service_role;
GRANT ALL ON local_calendar_events TO service_role;
GRANT ALL ON error_logs TO service_role;
GRANT ALL ON system_health_metrics TO service_role;
GRANT ALL ON oauth_states TO service_role;

-- Create a view for retry operation statistics
CREATE OR REPLACE VIEW retry_operation_stats AS
SELECT 
    operation_type,
    status,
    COUNT(*) as count,
    AVG(attempt_count) as avg_attempts,
    MAX(created_at) as latest_operation,
    MIN(created_at) as earliest_operation
FROM retry_operations
GROUP BY operation_type, status;

-- Grant access to the view
GRANT SELECT ON retry_operation_stats TO authenticated, service_role;

-- Create a view for error statistics
CREATE OR REPLACE VIEW error_stats AS
SELECT 
    error_category,
    error_code,
    COUNT(*) as count,
    COUNT(CASE WHEN resolved THEN 1 END) as resolved_count,
    MAX(created_at) as latest_error,
    MIN(created_at) as earliest_error
FROM error_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY error_category, error_code;

-- Grant access to the view
GRANT SELECT ON error_stats TO authenticated, service_role;

-- Insert initial health metric for system startup
INSERT INTO system_health_metrics (service_name, status, metadata)
VALUES ('calendar_system', 'available', '{"migration": "003_error_handling_monitoring", "version": "1.0"}');

-- Comments for documentation
COMMENT ON TABLE retry_operations IS 'Stores operations that need to be retried due to failures';
COMMENT ON TABLE local_calendar_events IS 'Local storage for calendar events when Google Calendar is unavailable';
COMMENT ON TABLE oauth_states IS 'Temporary storage for OAuth authentication states';
COMMENT ON TABLE system_health_metrics IS 'Historical health metrics for system monitoring';
COMMENT ON TABLE error_logs IS 'Structured error logs for debugging and monitoring';

COMMENT ON COLUMN retry_operations.operation_data IS 'JSON data needed to retry the operation';
COMMENT ON COLUMN retry_operations.config IS 'JSON configuration for retry behavior';
COMMENT ON COLUMN local_calendar_events.attendees IS 'JSON array of attendee email addresses';
COMMENT ON COLUMN oauth_states.data IS 'JSON data for OAuth flow validation';
COMMENT ON COLUMN system_health_metrics.metadata IS 'Additional metadata about the health check';
COMMENT ON COLUMN error_logs.context_data IS 'JSON context data for debugging';