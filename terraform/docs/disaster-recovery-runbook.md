# Disaster Recovery Runbook

## Overview

This runbook provides step-by-step procedures for disaster recovery operations for the Acadion platform. It covers both automated and manual failover procedures, recovery testing, and rollback operations.

## RTO/RPO Targets

- **Recovery Time Objective (RTO)**: 15 minutes
- **Recovery Point Objective (RPO)**: 60 minutes

## Architecture Overview

### Primary Region: us-east-1
- Production ECS cluster
- Primary ElastiCache Redis cluster
- Primary EFS file system
- Primary S3 buckets

### DR Region: us-west-2
- Standby ECS cluster (scaled to 0)
- Standby ElastiCache Redis cluster
- Replicated S3 buckets
- Cross-region EFS backup

## Disaster Scenarios

### Scenario 1: Complete Primary Region Failure
**Triggers:**
- AWS region-wide outage
- Multiple AZ failures
- Network connectivity issues

**Detection:**
- Route 53 health checks fail
- CloudWatch alarms trigger
- Application becomes unreachable

### Scenario 2: Application-Level Failure
**Triggers:**
- ECS cluster failure
- Database connectivity issues
- Critical service failures

**Detection:**
- Service health checks fail
- High error rates
- Performance degradation

## Automated Failover Procedure

### Prerequisites
1. Ensure DR infrastructure is deployed and configured
2. Verify cross-region replication is working
3. Confirm DNS records are configured for failover

### Execution Steps

#### 1. Trigger Automated Failover
```bash
# Navigate to scripts directory
cd terraform/scripts/disaster-recovery

# Execute automated failover
python3 failover.py failover-config.json
```

#### 2. Monitor Failover Progress
The script will:
1. Verify primary region is down
2. Scale up DR services
3. Update DNS records
4. Verify DR service health
5. Send notifications

#### 3. Verify Failover Success
- Check application accessibility via DR endpoints
- Verify all services are running in DR region
- Confirm data consistency

## Manual Failover Procedure

### Step 1: Assess Primary Region Status
```bash
# Check ECS cluster status
aws ecs describe-clusters --clusters acadion-prod-cluster --region us-east-1

# Check service status
aws ecs list-services --cluster acadion-prod-cluster --region us-east-1
aws ecs describe-services --cluster acadion-prod-cluster --services <service-arns> --region us-east-1
```

### Step 2: Start DR Services
```bash
# Scale up backend service
aws ecs update-service \
  --cluster acadion-prod-dr-cluster \
  --service acadion-prod-dr-backend \
  --desired-count 2 \
  --region us-west-2

# Scale up frontend service
aws ecs update-service \
  --cluster acadion-prod-dr-cluster \
  --service acadion-prod-dr-frontend \
  --desired-count 2 \
  --region us-west-2

# Scale up face recognition service
aws ecs update-service \
  --cluster acadion-prod-dr-cluster \
  --service acadion-prod-dr-face-recognition \
  --desired-count 1 \
  --region us-west-2
```

### Step 3: Wait for Services to Stabilize
```bash
# Wait for services to reach desired state
aws ecs wait services-stable \
  --cluster acadion-prod-dr-cluster \
  --services acadion-prod-dr-backend acadion-prod-dr-frontend \
  --region us-west-2
```

### Step 4: Update DNS Records
```bash
# Update API endpoint
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Comment": "DR Failover",
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.acadion.com",
        "Type": "CNAME",
        "TTL": 60,
        "ResourceRecords": [{"Value": "acadion-prod-dr-alb-123456789.us-west-2.elb.amazonaws.com"}]
      }
    }]
  }'

# Update app endpoint
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Comment": "DR Failover",
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "app.acadion.com",
        "Type": "CNAME",
        "TTL": 60,
        "ResourceRecords": [{"Value": "acadion-prod-dr-alb-123456789.us-west-2.elb.amazonaws.com"}]
      }
    }]
  }'
```

### Step 5: Verify DR Operation
```bash
# Test application endpoints
curl -f https://api.acadion.com/api/health
curl -f https://app.acadion.com/

# Check service logs
aws logs tail /aws/ecs/acadion-prod-dr --follow --region us-west-2
```

## Recovery Testing Procedures

### Monthly DR Test
Execute automated DR testing:
```bash
cd terraform/scripts/disaster-recovery
python3 test-dr.py failover-config.json
```

### Quarterly Full Failover Test
1. Schedule maintenance window
2. Execute full failover to DR region
3. Verify all functionality
4. Execute rollback procedure
5. Document lessons learned

### Test Checklist
- [ ] DR infrastructure is ready
- [ ] Services can be scaled up successfully
- [ ] DNS failover works correctly
- [ ] Application is fully functional in DR region
- [ ] Data consistency is maintained
- [ ] Performance meets requirements
- [ ] Monitoring and alerting work in DR region
- [ ] Rollback procedure works correctly

## Rollback Procedures

### Automated Rollback
```bash
# Use rollback script (when primary region is restored)
python3 rollback.py failover-config.json
```

### Manual Rollback Steps

#### 1. Verify Primary Region is Restored
```bash
# Check primary region services
aws ecs describe-clusters --clusters acadion-prod-cluster --region us-east-1
```

#### 2. Scale Up Primary Services
```bash
# Restore primary services to full capacity
aws ecs update-service \
  --cluster acadion-prod-cluster \
  --service acadion-prod-backend \
  --desired-count 3 \
  --region us-east-1
```

#### 3. Update DNS Back to Primary
```bash
# Point DNS back to primary region
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Comment": "Rollback to Primary",
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.acadion.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "acadion-prod-alb-123456789.us-east-1.elb.amazonaws.com"}]
      }
    }]
  }'
```

#### 4. Scale Down DR Services
```bash
# Scale DR services back to 0
aws ecs update-service \
  --cluster acadion-prod-dr-cluster \
  --service acadion-prod-dr-backend \
  --desired-count 0 \
  --region us-west-2
```

## Monitoring and Alerting

### Key Metrics to Monitor
- Route 53 health check status
- ECS service health in both regions
- Application response times
- Error rates
- Data replication lag

### Alert Escalation
1. **Level 1**: Automated alerts to on-call engineer
2. **Level 2**: Escalation to senior engineers after 5 minutes
3. **Level 3**: Escalation to management after 15 minutes

## Communication Plan

### Internal Communication
1. Notify engineering team via Slack
2. Update status page
3. Inform customer success team
4. Brief executive team if extended outage

### External Communication
1. Update public status page
2. Send customer notifications if needed
3. Prepare press statement for major incidents

## Post-Incident Procedures

### Immediate Actions (Within 1 hour)
- [ ] Verify all systems are operational
- [ ] Document timeline of events
- [ ] Gather logs and metrics
- [ ] Brief stakeholders on status

### Follow-up Actions (Within 24 hours)
- [ ] Conduct post-mortem meeting
- [ ] Identify root cause
- [ ] Document lessons learned
- [ ] Create action items for improvements

### Long-term Actions (Within 1 week)
- [ ] Update runbooks based on lessons learned
- [ ] Implement process improvements
- [ ] Update monitoring and alerting
- [ ] Schedule additional training if needed

## Contact Information

### On-Call Rotation
- Primary: [On-call engineer contact]
- Secondary: [Backup engineer contact]
- Escalation: [Senior engineer contact]

### External Contacts
- AWS Support: [Support case process]
- DNS Provider: [Contact information]
- Monitoring Service: [Contact information]

## Appendix

### Configuration Files
- `failover-config.json`: Automated failover configuration
- `test-config.json`: DR testing configuration

### Scripts
- `failover.py`: Automated failover script
- `test-dr.py`: DR testing script
- `rollback.py`: Automated rollback script

### Terraform Modules
- `modules/disaster-recovery/`: DR infrastructure code
- `modules/monitoring/`: Monitoring and alerting configuration