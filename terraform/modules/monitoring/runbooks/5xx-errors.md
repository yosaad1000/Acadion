# 5XX Errors Runbook

## Alert Description
This alert triggers when the Application Load Balancer reports more than 10 5XX errors within a 5-minute period.

**Severity**: Critical  
**Response Time**: 5 minutes

## Immediate Actions

### 1. Check Service Health (2 minutes)
```bash
# Check ECS service status
aws ecs describe-services --cluster acadion-cluster --services acadion-backend acadion-frontend acadion-face-recognition

# Check target group health
aws elbv2 describe-target-health --target-group-arn <backend-target-group-arn>
aws elbv2 describe-target-health --target-group-arn <frontend-target-group-arn>
```

### 2. Review Recent Logs (3 minutes)
```bash
# Check backend error logs
aws logs filter-log-events --log-group-name /ecs/acadion/backend \
  --start-time $(date -d '10 minutes ago' +%s)000 \
  --filter-pattern "ERROR"

# Check application logs for specific errors
aws logs tail /ecs/acadion/backend --follow --filter-pattern "5XX"
```

## Investigation Steps

### 1. Identify Error Patterns
- Check CloudWatch metrics for error distribution
- Look for specific endpoints causing errors
- Identify if errors are consistent or sporadic

### 2. Common Causes and Solutions

#### Database Connection Issues
**Symptoms**: Connection timeout errors, pool exhaustion
```bash
# Check database connection metrics
aws cloudwatch get-metric-statistics --namespace Acadion/Application \
  --metric-name DatabaseConnectionFailures \
  --start-time $(date -d '1 hour ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 --statistics Sum
```

**Resolution**:
- Restart backend service if connection pool is exhausted
- Check Supabase status and connectivity
- Verify database credentials in Parameter Store

#### Memory/CPU Exhaustion
**Symptoms**: Out of memory errors, high CPU usage
```bash
# Check resource utilization
aws cloudwatch get-metric-statistics --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=acadion-backend Name=ClusterName,Value=acadion-cluster \
  --start-time $(date -d '1 hour ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 --statistics Average
```

**Resolution**:
- Scale up the service temporarily
- Check for memory leaks in application logs
- Restart affected tasks

#### External Service Failures
**Symptoms**: Timeout errors, API failures
```bash
# Check external service calls in X-Ray
aws xray get-service-graph --start-time $(date -d '30 minutes ago' +%s) \
  --end-time $(date +%s)
```

**Resolution**:
- Verify Pinecone API status
- Check Supabase service status
- Enable circuit breaker if not already active

### 3. Service Recovery Actions

#### Restart Backend Service
```bash
# Force new deployment to restart tasks
aws ecs update-service --cluster acadion-cluster \
  --service acadion-backend --force-new-deployment
```

#### Scale Up Service
```bash
# Temporarily increase desired count
aws ecs update-service --cluster acadion-cluster \
  --service acadion-backend --desired-count 4
```

#### Rollback Deployment (if recent deployment)
```bash
# Get previous task definition
aws ecs describe-services --cluster acadion-cluster --services acadion-backend

# Update to previous task definition
aws ecs update-service --cluster acadion-cluster \
  --service acadion-backend --task-definition <previous-task-def-arn>
```

## Monitoring During Recovery

### Key Metrics to Watch
1. **Error Rate**: Should decrease within 5 minutes
2. **Response Time**: Should return to normal levels
3. **CPU/Memory**: Should stabilize
4. **Target Health**: All targets should be healthy

### Verification Commands
```bash
# Monitor error rate
watch -n 30 'aws cloudwatch get-metric-statistics --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_Target_5XX_Count \
  --dimensions Name=LoadBalancer,Value=<alb-arn-suffix> \
  --start-time $(date -d "5 minutes ago" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 --statistics Sum'

# Check service stability
watch -n 10 'aws ecs describe-services --cluster acadion-cluster --services acadion-backend | jq ".services[0].runningCount"'
```

## Prevention Measures

1. **Implement Circuit Breakers**: Ensure circuit breakers are properly configured
2. **Add Retry Logic**: Implement exponential backoff for external API calls
3. **Resource Monitoring**: Set up proactive alerts for resource utilization
4. **Load Testing**: Regular load testing to identify bottlenecks
5. **Dependency Monitoring**: Monitor external service health

## Escalation Criteria

Escalate to Level 3 if:
- Errors persist after 15 minutes of troubleshooting
- Multiple services are affected
- Database connectivity issues cannot be resolved
- Suspected security incident

## Post-Incident Actions

1. **Document Timeline**: Record all actions taken and their results
2. **Root Cause Analysis**: Identify the underlying cause
3. **Update Monitoring**: Add new alerts if gaps are identified
4. **Code Review**: Review recent deployments for potential issues
5. **Update Runbook**: Add any new troubleshooting steps discovered