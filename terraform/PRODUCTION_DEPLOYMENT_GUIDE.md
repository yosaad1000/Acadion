# Production Deployment Guide

This guide walks through deploying the Acadion infrastructure to AWS production environment.

## Prerequisites

### 1. Install Required Tools

```powershell
# Install Terraform (Windows)
choco install terraform

# Or download from: https://www.terraform.io/downloads.html

# Install AWS CLI
choco install awscli

# Or download from: https://aws.amazon.com/cli/
```

### 2. Configure AWS Credentials

```powershell
# Configure AWS CLI with production credentials
aws configure

# Or use environment variables
$env:AWS_ACCESS_KEY_ID = "your-access-key"
$env:AWS_SECRET_ACCESS_KEY = "your-secret-key"
$env:AWS_DEFAULT_REGION = "us-east-1"
```

### 3. Set Environment Variables

Create a `.env` file in `terraform/environments/prod/` directory:

```bash
# Copy the example file
cp terraform/environments/prod/.env.example terraform/environments/prod/.env

# Edit the .env file with your production values
```

Required environment variables:
- `TF_VAR_jwt_secret_key` - JWT secret key (32+ characters)
- `TF_VAR_encryption_key` - Application encryption key (32+ characters)
- `TF_VAR_supabase_url` - Supabase project URL
- `TF_VAR_supabase_key` - Supabase anon key
- `TF_VAR_supabase_service_key` - Supabase service role key
- `TF_VAR_pinecone_api_key` - Pinecone API key
- `TF_VAR_pinecone_environment` - Pinecone environment (e.g., "us-east-1-aws")
- `TF_VAR_pinecone_index_name` - Pinecone index name (e.g., "acadion-faces-prod")
- `TF_VAR_github_repository` - GitHub repository (e.g., "your-org/acadion")

## Deployment Steps

### Step 1: Deploy Core Infrastructure

```powershell
# Navigate to production environment
cd terraform/environments/prod

# Source environment variables (if using .env file)
# For PowerShell, you'll need to set variables manually or use a script

# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Plan the deployment
terraform plan

# Apply the infrastructure (with confirmation)
terraform apply

# Or use the automated script
.\terraform\scripts\deploy-production.ps1 -Action apply
```

### Step 2: Configure Parameter Store

After infrastructure deployment, configure AWS Systems Manager Parameter Store with production secrets:

```powershell
# The infrastructure creates parameter placeholders
# You need to update them with actual production values

# Example using AWS CLI:
aws ssm put-parameter --name "/acadion/prod/jwt-secret-key" --value "your-actual-jwt-secret" --type "SecureString" --overwrite
aws ssm put-parameter --name "/acadion/prod/encryption-key" --value "your-actual-encryption-key" --type "SecureString" --overwrite
# ... continue for all parameters
```

### Step 3: Build and Push Container Images

```powershell
# Build and push all images to ECR
.\scripts\build-and-push-images.ps1 -Environment prod -ImageTag latest

# Or build individually:
# Backend
docker build -f Dockerfile.backend -t backend:latest .
docker tag backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/acadion-prod-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/acadion-prod-backend:latest

# Frontend  
docker build -f Dockerfile.frontend -t frontend:latest .
docker tag frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/acadion-prod-frontend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/acadion-prod-frontend:latest

# Face Recognition Service
docker build -f face-recognition-service/Dockerfile -t face-recognition:latest face-recognition-service/
docker tag face-recognition:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/acadion-prod-face-recognition:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/acadion-prod-face-recognition:latest
```

### Step 4: Deploy Services to ECS

The ECS services are created by Terraform but initially have no running tasks. After pushing images:

```powershell
# Update ECS services to use the new images
aws ecs update-service --cluster acadion-prod-cluster --service acadion-prod-backend --force-new-deployment
aws ecs update-service --cluster acadion-prod-cluster --service acadion-prod-frontend --force-new-deployment
aws ecs update-service --cluster acadion-prod-cluster --service acadion-prod-face-recognition --force-new-deployment
```

### Step 5: Configure DNS (Optional)

If using a custom domain:

```powershell
# Get the ALB DNS name
$albDnsName = terraform output alb_dns_name

# Create DNS records pointing to the ALB
# This depends on your DNS provider (Route 53, CloudFlare, etc.)
```

### Step 6: Validate Deployment

```powershell
# Check infrastructure outputs
terraform output

# Test application endpoints
$appUrl = terraform output application_url
$apiUrl = terraform output api_url

# Test health endpoints
curl "$apiUrl/api/health"
curl "$appUrl"

# Check ECS service status
aws ecs describe-services --cluster acadion-prod-cluster --services acadion-prod-backend acadion-prod-frontend acadion-prod-face-recognition
```

## Post-Deployment Configuration

### 1. Monitoring Setup

- Configure CloudWatch alarms
- Set up SNS notifications
- Verify log aggregation

### 2. Security Configuration

- Review security groups
- Verify IAM roles and policies
- Enable AWS Config (if desired)

### 3. Backup Verification

- Verify backup jobs are running
- Test restore procedures
- Configure backup notifications

## Troubleshooting

### Common Issues

1. **Terraform Init Fails**
   - Check AWS credentials
   - Verify region configuration
   - Ensure S3 backend bucket exists (if using remote state)

2. **Resource Creation Fails**
   - Check AWS service limits
   - Verify IAM permissions
   - Review CloudFormation events

3. **ECS Services Won't Start**
   - Check container images exist in ECR
   - Verify parameter store values
   - Review ECS task logs

4. **Application Not Accessible**
   - Check security group rules
   - Verify ALB target group health
   - Review application logs

### Getting Help

1. Check Terraform plan output for detailed error messages
2. Review AWS CloudFormation events for resource creation issues
3. Verify IAM permissions for the deployment user/role
4. Check AWS service health dashboard for regional issues

## Rollback Procedures

If deployment fails or issues are discovered:

```powershell
# Rollback to previous ECS task definition
aws ecs update-service --cluster acadion-prod-cluster --service acadion-prod-backend --task-definition acadion-prod-backend:PREVIOUS_REVISION

# Or destroy and redeploy infrastructure
terraform destroy
# Fix issues, then redeploy
terraform apply
```

## Security Considerations

1. **Never commit secrets to version control**
2. **Use IAM roles with least privilege**
3. **Enable encryption at rest and in transit**
4. **Regular security audits and updates**
5. **Monitor for unusual activity**
6. **Backup critical data regularly**

## Cost Optimization

1. **Monitor AWS costs regularly**
2. **Use appropriate instance sizes**
3. **Enable auto-scaling**
4. **Review and optimize unused resources**
5. **Consider Reserved Instances for predictable workloads**