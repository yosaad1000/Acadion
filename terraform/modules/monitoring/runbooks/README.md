# Acadion Monitoring Runbooks

This directory contains runbooks for responding to common alerts and incidents in the Acadion platform.

## Quick Reference

| Alert Type | Severity | Response Time | Runbook |
|------------|----------|---------------|---------|
| Service Health Composite | Critical | 5 minutes | [Service Health](./service-health.md) |
| 5XX Errors | Critical | 5 minutes | [5XX Errors](./5xx-errors.md) |
| Database Connection Failures | Critical | 5 minutes | [Database Issues](./database-issues.md) |
| High CPU Usage | High | 15 minutes | [High CPU](./high-cpu.md) |
| High Memory Usage | High | 15 minutes | [High Memory](./high-memory.md) |
| High Response Time | High | 15 minutes | [Response Time](./response-time.md) |
| Face Recognition Failures | Medium | 30 minutes | [Face Recognition](./face-recognition.md) |
| Storage Issues | Medium | 30 minutes | [Storage Issues](./storage-issues.md) |

## Escalation Matrix

### Level 1 - Automated Response (0-5 minutes)
- Automated scaling triggers
- Circuit breaker activation
- Load balancer health checks

### Level 2 - On-Call Engineer (5-15 minutes)
- Initial investigation
- Basic troubleshooting
- Service restart if needed

### Level 3 - Senior Engineer (15-30 minutes)
- Deep investigation
- Code-level debugging
- Infrastructure changes

### Level 4 - Engineering Manager (30+ minutes)
- Incident commander role
- External communication
- Post-incident review planning

## Communication Channels

- **Slack**: `#acadion-alerts` (all alerts)
- **Slack**: `#acadion-incidents` (critical incidents)
- **Email**: `alerts@yourcompany.com`
- **PagerDuty**: Critical alerts only

## Monitoring Dashboard Links

- [Main Dashboard](https://console.aws.amazon.com/cloudwatch/home#dashboards:name=acadion-monitoring)
- [X-Ray Service Map](https://console.aws.amazon.com/xray/home#/service-map)
- [ECS Services](https://console.aws.amazon.com/ecs/home#/clusters)
- [Application Logs](https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups)

## General Troubleshooting Steps

1. **Check Service Status**
   ```bash
   # Check ECS service health
   aws ecs describe-services --cluster acadion-cluster --services acadion-backend
   
   # Check ALB target health
   aws elbv2 describe-target-health --target-group-arn <target-group-arn>
   ```

2. **Review Recent Logs**
   ```bash
   # Backend logs
   aws logs tail /ecs/acadion/backend --follow
   
   # Face recognition logs
   aws logs tail /ecs/acadion/face-recognition --follow
   ```

3. **Check Metrics**
   - CPU and memory utilization
   - Request count and error rates
   - Response times
   - Database connection pool status

4. **Verify External Dependencies**
   - Supabase status
   - Pinecone API status
   - Redis connectivity

## Contact Information

- **On-Call Engineer**: Use PagerDuty rotation
- **Engineering Manager**: [manager@yourcompany.com]
- **DevOps Team**: [devops@yourcompany.com]
- **Security Team**: [security@yourcompany.com] (for security incidents)

## Post-Incident Process

1. **Immediate Actions**
   - Resolve the incident
   - Update status page
   - Communicate resolution

2. **Follow-up Actions**
   - Create incident report
   - Schedule post-mortem meeting
   - Identify improvement actions
   - Update runbooks if needed