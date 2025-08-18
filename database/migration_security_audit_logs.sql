-- Security and audit logging tables migration
-- This migration adds tables for audit logging and security monitoring

-- Create audit_logs table for comprehensive audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    audit_type VARCHAR(50) NOT NULL, -- 'oauth', 'calendar_operation', 'schedule_operation', 'security_event'
    action VARCHAR(100) NOT NULL, -- Specific action performed
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resource_type VARCHAR(50), -- 'schedule', 'calendar_event', 'token', etc.
    resource_id VARCHAR(255), -- ID of the resource affected
    success BOOLEAN NOT NULL DEFAULT FALSE,
    client_ip INET,
    user_agent TEXT,
    details JSONB, -- Additional context and details
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_audit_type ON audit_logs(audit_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);

-- Create security_events table for security monitoring
CREATE TABLE IF NOT EXISTS security_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- 'rate_limit_exceeded', 'invalid_input', 'auth_failure', etc.
    severity VARCHAR(20) NOT NULL DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
    description TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    client_ip INET,
    user_agent TEXT,
    endpoint VARCHAR(255), -- API endpoint involved
    request_data JSONB, -- Sanitized request data
    response_status INTEGER, -- HTTP response status
    details JSONB, -- Additional security context
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for security events
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(resolved);

-- Create data_retention_log table to track cleanup operations
CREATE TABLE IF NOT EXISTS data_retention_log (
    id SERIAL PRIMARY KEY,
    policy_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    records_deleted INTEGER NOT NULL DEFAULT 0,
    cutoff_date TIMESTAMP WITH TIME ZONE,
    execution_time_ms INTEGER,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT,
    details JSONB,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for retention log
CREATE INDEX IF NOT EXISTS idx_data_retention_log_executed_at ON data_retention_log(executed_at);
CREATE INDEX IF NOT EXISTS idx_data_retention_log_policy_name ON data_retention_log(policy_name);

-- Add security-related columns to existing calendar_connections table
ALTER TABLE calendar_connections 
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failed_refresh_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS security_flags JSONB DEFAULT '{}';

-- Add security columns to class_schedules table
ALTER TABLE class_schedules 
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sync_error_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS security_metadata JSONB DEFAULT '{}';

-- Create function to automatically update last_used_at
CREATE OR REPLACE FUNCTION update_calendar_connection_last_used()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE calendar_connections 
    SET last_used_at = NOW() 
    WHERE user_id = NEW.user_id OR user_id = OLD.user_id;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_audit_type VARCHAR(50),
    p_action VARCHAR(100),
    p_user_id INTEGER,
    p_resource_type VARCHAR(50) DEFAULT NULL,
    p_resource_id VARCHAR(255) DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_client_ip INET DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
) RETURNS INTEGER AS $$
DECLARE
    audit_id INTEGER;
BEGIN
    INSERT INTO audit_logs (
        audit_type, action, user_id, resource_type, resource_id, 
        success, client_ip, details
    ) VALUES (
        p_audit_type, p_action, p_user_id, p_resource_type, p_resource_id,
        p_success, p_client_ip, p_details
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_event_type VARCHAR(50),
    p_severity VARCHAR(20),
    p_description TEXT,
    p_user_id INTEGER DEFAULT NULL,
    p_client_ip INET DEFAULT NULL,
    p_endpoint VARCHAR(255) DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
) RETURNS INTEGER AS $$
DECLARE
    event_id INTEGER;
BEGIN
    INSERT INTO security_events (
        event_type, severity, description, user_id, client_ip, endpoint, details
    ) VALUES (
        p_event_type, p_severity, p_description, p_user_id, p_client_ip, p_endpoint, p_details
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for security dashboard
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
    'audit_events' as metric_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE success = false) as failed_count,
    COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours') as last_24h_count,
    COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '1 hour') as last_1h_count
FROM audit_logs
UNION ALL
SELECT 
    'security_events' as metric_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE severity IN ('high', 'critical')) as failed_count,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as last_24h_count,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as last_1h_count
FROM security_events
UNION ALL
SELECT 
    'calendar_connections' as metric_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE token_expires_at < NOW()) as failed_count,
    COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '24 hours') as last_24h_count,
    COUNT(*) FILTER (WHERE last_used_at >= NOW() - INTERVAL '1 hour') as last_1h_count
FROM calendar_connections;

-- Grant necessary permissions
GRANT SELECT, INSERT ON audit_logs TO authenticated;
GRANT SELECT, INSERT ON security_events TO authenticated;
GRANT SELECT ON data_retention_log TO authenticated;
GRANT SELECT ON security_dashboard TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON SEQUENCE audit_logs_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE security_events_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE data_retention_log_id_seq TO authenticated;

-- Create RLS policies for audit logs (users can only see their own audit logs)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_user_policy ON audit_logs
    FOR SELECT
    USING (user_id = auth.uid()::integer OR auth.jwt() ->> 'user_type' = 'admin');

-- Create RLS policies for security events (only admins can see security events)
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY security_events_admin_policy ON security_events
    FOR SELECT
    USING (auth.jwt() ->> 'user_type' = 'admin');

-- Insert initial data retention log entry
INSERT INTO data_retention_log (
    policy_name, table_name, records_deleted, success, details, executed_at
) VALUES (
    'initial_setup', 'system', 0, true, 
    '{"message": "Security audit tables created successfully"}', NOW()
);

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all calendar and security operations';
COMMENT ON TABLE security_events IS 'Security events and incidents for monitoring and alerting';
COMMENT ON TABLE data_retention_log IS 'Log of data retention policy executions and cleanup operations';
COMMENT ON VIEW security_dashboard IS 'Security metrics dashboard view for monitoring';

-- Create notification function for critical security events
CREATE OR REPLACE FUNCTION notify_critical_security_event()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.severity = 'critical' THEN
        PERFORM pg_notify('critical_security_event', 
            json_build_object(
                'event_id', NEW.id,
                'event_type', NEW.event_type,
                'description', NEW.description,
                'user_id', NEW.user_id,
                'created_at', NEW.created_at
            )::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for critical security event notifications
CREATE TRIGGER trigger_critical_security_event
    AFTER INSERT ON security_events
    FOR EACH ROW
    EXECUTE FUNCTION notify_critical_security_event();

-- Migration completion log
INSERT INTO audit_logs (
    audit_type, action, success, details
) VALUES (
    'system', 'security_migration_completed', true,
    '{"migration": "security_audit_logs", "tables_created": ["audit_logs", "security_events", "data_retention_log"], "version": "1.0"}'
);