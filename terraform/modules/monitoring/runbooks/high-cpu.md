# High CPU Usage Runbook

## Alert Description
This alert triggers when ECS service CPU utilization exceeds 80% for 10 minutes.

**Severity**: High  
**Response Time**: 15 minutes

## Immediate Actions

### 1. Identify Affected Service (2 minutes)
```bash
# Check CPU utilization for all services
aws cloudwatch get-metric-statistics --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ClusterName,Value=acadion-cluster \
  --start-time $(date -d '30 minutes ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 --statistics Average,Maximum

# Get specific service metrics
aws cloudwatch get-metric-statistics --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=acadion-backend Name=ClusterName,Value=acadion-cluster \
  --start-time $(date -d '1 hour ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 --statistics Average,Maximum
```

### 2. Check Current Load (3 minutes)
```bash
# Check request volume
aws cloudwatch get-metric-statistics --namespace AWS/ApplicationELB \
  --metric-name RequestCount \
  --dimensions Name=LoadBalancer,Value=<alb-arn-suffix> \
  --start-time $(date -d '1 hour ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 --statistics Sum

# Check active connections
aws cloudwatch get-metric-statistics --namespace AWS/ApplicationELB \
  --metric-name ActiveConnectionCount \
  --dimensions Name=LoadBalancer,Value=<alb-arn-suffix> \
  --start-time $(date -d '30 minutes ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 --statistics Average
```

## Investigation Steps

### 1. Analyze CPU Usage Patterns

#### Check for Traffic Spikes
- Review request count metrics
- Look for unusual traffic patterns
- Check if load is distributed evenly across tasks

#### Identify Resource-Intensive Operations
```bash
# Check X-Ray traces for slow operations
aws xray get-trace-summaries --time-range-type TimeRangeByStartTime \
  --start-time $(date -d '30 minutes ago' +%s) \
  --end-time $(date +%s) \
  --filter-expression "duration > 5"

# Review application logs for long-running operations
aws logs filter-log-events --log-group-name /ecs/acadion/backend \
  --start-time $(date -d '30 minutes ago' +%s)000 \
  --filter-pattern "processing_time"
```

### 2. Common Causes and Solutions

#### High Traffic Load
**Symptoms**: Increased request count, high CPU across all tasks
```bash
# Check current task count
aws ecs describe-services --cluster acadion-cluster --services acadion-backend \
  | jq '.services[0].runningCount'

# Check auto-scaling activity
aws application-autoscaling describe-scaling-activities \
  --service-namespace ecs --resource-id service/acadion-cluster/acadion-backend
```

**Resolution**:
- Scale up the service immediately
- Verify auto-scaling policies are working
- Consider temporary manual scaling

#### Face Recognition Processing Load
**Symptoms**: High CPU on face recognition service, processing queue buildup
```bash
# Check face recognition metrics
aws cloudwatch get-metric-statistics --namespace Acadion/FaceRecognition \
  --metric-name QueueLength \
  --start-time $(date -d '1 hour ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 --statistics Average,Maximum
```

**Resolution**:
- Scale face recognition service
- Check for stuck processing jobs
- Verify GPU utilization if applicable

#### Memory Pressure Leading to CPU Spikes
**Symptoms**: High CPU with garbage collection activity
```bash
# Check memory utilization
aws cloudwatch get-metric-statistics --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions Name=ServiceName,Value=acadion-backend Name=ClusterName,Value=acadion-cluster \
  --start-time $(date -d '1 hour ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 --statistics Average,Maximum
```

**Resolution**:
- Check for memory leaks in application logs
- Consider increasing memory allocation
- Restart tasks if memory usage is excessive

### 3. Immediate Mitigation Actions

#### Scale Up Service
```bash
# Increase desired count
aws ecs update-service --cluster acadion-cluster \
  --service acadion-backend --desired-count 4

# Monitor scaling progress
watch -n 10 'aws ecs describe-services --cluster acadion-cluster --services acadion-backend | jq ".services[0] | {desired: .desiredCount, running: .runningCount, pending: .pendingCount}"'
```

#### Enable Auto-Scaling (if not already enabled)
```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/acadion-cluster/acadion-backend \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/acadion-cluster/acadion-backend \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling-policy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleOutCooldown": 300,
    "ScaleInCooldown": 300
  }'
```

## Monitoring During Recovery

### Key Metrics to Watch
1. **CPU Utilization**: Should decrease as scaling takes effect
2. **Task Count**: Should increase to handle load
3. **Response Time**: Should remain stable or improve
4. **Error Rate**: Should not increase during scaling

### Verification Commands
```bash
# Monitor CPU utilization
watch -n 30 'aws cloudwatch get-metric-statistics --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=acadion-backend Name=ClusterName,Value=acadion-cluster \
  --start-time $(date -d "10 minutes ago" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 --statistics Average | jq ".Datapoints[-1].Average"'

# Check service health
watch -n 10 'aws elbv2 describe-target-health --target-group-arn <target-group-arn> | jq ".TargetHealthDescriptions | map(select(.TargetHealth.State == \"healthy\")) | length"'
```

## Performance Optimization

### 1. Code-Level Optimizations
- Review recent deployments for performance regressions
- Identify CPU-intensive operations in application logs
- Optimize database queries and external API calls

### 2. Infrastructure Optimizations
- Consider upgrading to larger instance types
- Implement caching for frequently accessed data
- Optimize container resource allocation

### 3. Monitoring Improvements
- Add custom metrics for application-specific operations
- Set up proactive alerts for gradual CPU increases
- Implement distributed tracing for performance analysis

## Prevention Measures

1. **Proactive Monitoring**: Set alerts at 70% CPU to catch issues early
2. **Load Testing**: Regular load testing to identify performance bottlenecks
3. **Auto-Scaling**: Ensure auto-scaling policies are properly configured
4. **Code Reviews**: Focus on performance impact of new features
5. **Capacity Planning**: Regular review of resource requirements

## Escalation Criteria

Escalate to Level 3 if:
- CPU usage remains above 90% after scaling
- Scaling actions are not taking effect
- Application errors increase during high CPU periods
- Suspected performance regression from recent deployment

## Post-Incident Actions

1. **Performance Analysis**: Identify root cause of high CPU usage
2. **Capacity Review**: Assess if current resource allocation is adequate
3. **Auto-Scaling Tuning**: Adjust scaling policies if needed
4. **Code Optimization**: Plan performance improvements if code-related
5. **Monitoring Enhancement**: Add new metrics or alerts as needed