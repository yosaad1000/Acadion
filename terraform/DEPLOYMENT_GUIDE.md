# Acadion AWS Deployment Guide

This guide provides step-by-step instructions for deploying the Acadion platform to AWS using the environment-specific Terraform configurations.

## Prerequisites

### Required Tools
- **Terraform** >= 1.0 ([Installation Guide](https://learn.hashicorp.com/tutorials/terraform/install-cli))
- **AWS CLI** >= 2.0 ([Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html))
- **Git** for version control

### AWS Account Setup
1. **AWS Account**: Active AWS account with appropriate permissions
2. **IAM User/Role**: IAM user or role with permissions to create:
   - VPC and networking resources
   - ECS clusters and services
   - ECR repositories
   - ElastiCache clusters
   - S3 buckets
   - EFS file systems
   - IAM roles and policies
   - Systems Manager parameters
   - CloudWatch resources

### Required Permissions Policy
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:*",
                "ecs:*",
                "ecr:*",
                "elasticache:*",
                "s3:*",
                "efs:*",
                "iam:*",
                "ssm:*",
                "kms:*",
                "logs:*",
                "cloudwatch:*",
                "application-autoscaling:*",
                "elasticloadbalancing:*"
            ],
            "Resource": "*"
        }
    ]
}
```

## Environment Setup

### 1. Configure AWS Credentials

Choose one of the following methods:

#### Option A: AWS CLI Configuration
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and default region
```

#### Option B: Environment Variables
```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

#### Option C: IAM Role (for EC2/ECS deployments)
Attach the required IAM role to your EC2 instance or ECS task.

### 2. Set Required Environment Variables

Create a secure way to provide the required secrets. **Never commit these to version control.**

#### Development Environment
```bash
# JWT Configuration
export TF_VAR_jwt_secret_key="dev-jwt-secret-key-32-chars-min"
export TF_VAR_encryption_key="dev-encryption-key-32-chars-min"

# Supabase Configuration (Development Project)
export TF_VAR_supabase_url="https://your-dev-project.supabase.co"
export TF_VAR_supabase_key="your-dev-supabase-anon-key"
export TF_VAR_supabase_service_key="your-dev-supabase-service-key"

# Pinecone Configuration
export TF_VAR_pinecone_api_key="your-pinecone-api-key"
export TF_VAR_pinecone_environment="us-east-1-aws"
export TF_VAR_pinecone_index_name="acadion-faces-dev"

# GitHub Configuration
export TF_VAR_github_repository="your-org/acadion"

# Optional: CloudFront Domain
export TF_VAR_cloudfront_domain=""
```

#### Staging Environment
```bash
# Use staging-specific values
export TF_VAR_supabase_url="https://your-staging-project.supabase.co"
export TF_VAR_pinecone_index_name="acadion-faces-staging"
export TF_VAR_cloudfront_domain="staging.acadion.com"
# ... other staging-specific values
```

#### Production Environment
```bash
# Use production values with strong secrets
export TF_VAR_jwt_secret_key="prod-jwt-secret-key-64-chars-recommended"
export TF_VAR_supabase_url="https://your-prod-project.supabase.co"
export TF_VAR_pinecone_index_name="acadion-faces-prod"
export TF_VAR_cloudfront_domain="acadion.com"
# ... other production values
```

## Deployment Process

### Method 1: Using Workspace Manager Scripts (Recommended)

#### Linux/macOS
```bash
# Clone the repository
git clone https://github.com/your-org/acadion.git
cd acadion

# Make script executable
chmod +x terraform/scripts/workspace-manager.sh

# Deploy development environment
./terraform/scripts/workspace-manager.sh dev init
./terraform/scripts/workspace-manager.sh dev plan
./terraform/scripts/workspace-manager.sh dev apply

# Deploy staging environment
./terraform/scripts/workspace-manager.sh staging init
./terraform/scripts/workspace-manager.sh staging plan
./terraform/scripts/workspace-manager.sh staging apply

# Deploy production environment (with extra confirmation)
./terraform/scripts/workspace-manager.sh prod init
./terraform/scripts/workspace-manager.sh prod plan
./terraform/scripts/workspace-manager.sh prod apply
```

#### Windows PowerShell
```powershell
# Clone the repository
git clone https://github.com/your-org/acadion.git
cd acadion

# Deploy development environment
.\terraform\scripts\workspace-manager.ps1 -Environment dev -Action init
.\terraform\scripts\workspace-manager.ps1 -Environment dev -Action plan
.\terraform\scripts\workspace-manager.ps1 -Environment dev -Action apply

# Deploy staging environment
.\terraform\scripts\workspace-manager.ps1 -Environment staging -Action init
.\terraform\scripts\workspace-manager.ps1 -Environment staging -Action plan
.\terraform\scripts\workspace-manager.ps1 -Environment staging -Action apply

# Deploy production environment
.\terraform\scripts\workspace-manager.ps1 -Environment prod -Action init
.\terraform\scripts\workspace-manager.ps1 -Environment prod -Action plan
.\terraform\scripts\workspace-manager.ps1 -Environment prod -Action apply
```

### Method 2: Manual Terraform Commands

```bash
# Navigate to environment directory
cd terraform/environments/dev

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply the configuration
terraform apply

# Repeat for other environments
cd ../staging
terraform init && terraform plan && terraform apply

cd ../prod
terraform init && terraform plan && terraform apply
```

## Post-Deployment Configuration

### 1. Retrieve Deployment Information

```bash
# Get outputs for each environment
./terraform/scripts/workspace-manager.sh dev output
./terraform/scripts/workspace-manager.sh staging output
./terraform/scripts/workspace-manager.sh prod output
```

Key outputs include:
- **ALB DNS Name**: Load balancer endpoint
- **ECR Repository URLs**: For pushing Docker images
- **ECS Cluster Name**: For service deployments
- **Redis Endpoint**: For application configuration
- **S3 Bucket Names**: For static assets and deployments

### 2. Configure DNS (Optional)

If using custom domains:

1. Create Route 53 hosted zone (or use external DNS)
2. Create CNAME records pointing to ALB DNS names:
   - `staging.acadion.com` → `staging-alb-dns-name`
   - `acadion.com` → `prod-alb-dns-name`

### 3. SSL Certificates (Optional)

For HTTPS:

1. Request ACM certificates for your domains
2. Update ALB listeners to use HTTPS
3. Configure CloudFront with SSL certificates

### 4. Configure CI/CD Pipeline

Update your GitHub Actions or CI/CD pipeline with:
- ECR repository URLs
- ECS cluster names
- AWS region and account information

## Environment Management

### Viewing Resources

```bash
# List all resources in an environment
cd terraform/environments/dev
terraform state list

# Show specific resource details
terraform state show module.networking.aws_vpc.main
```

### Updating Environments

```bash
# Update development environment
./terraform/scripts/workspace-manager.sh dev plan
./terraform/scripts/workspace-manager.sh dev apply

# Update with auto-approval (use carefully)
./terraform/scripts/workspace-manager.sh staging apply --auto-approve
```

### Destroying Environments

```bash
# Destroy development environment (requires confirmation)
./terraform/scripts/workspace-manager.sh dev destroy

# The script will ask you to type 'destroy-dev' to confirm
```

## Monitoring and Maintenance

### CloudWatch Dashboards

After deployment, configure CloudWatch dashboards to monitor:
- ECS service health and performance
- ALB request metrics and error rates
- ElastiCache performance metrics
- Custom application metrics

### Cost Optimization

1. **Development Environment**: 
   - Enable auto-shutdown tags for cost savings
   - Use smaller instance types
   - Consider spot instances for non-critical workloads

2. **Production Environment**:
   - Monitor costs with AWS Cost Explorer
   - Set up billing alerts
   - Review resource utilization regularly

### Backup and Recovery

1. **EFS Backups**: Configured automatically for staging and production
2. **Parameter Store**: Backed up with KMS encryption
3. **Application Data**: Ensure Supabase backups are configured
4. **Infrastructure State**: Use remote state with versioning

## Troubleshooting

### Common Issues

#### 1. AWS Permissions
```bash
# Test AWS permissions
aws sts get-caller-identity
aws ec2 describe-regions
```

#### 2. Terraform State Issues
```bash
# Refresh state
terraform refresh

# Import existing resources if needed
terraform import aws_vpc.main vpc-12345678
```

#### 3. Resource Limits
- Check AWS service quotas in the AWS Console
- Request limit increases if needed
- Consider using different regions for additional capacity

#### 4. Network Connectivity
- Verify VPC and subnet configurations
- Check security group rules
- Ensure NAT gateway is properly configured

### Getting Help

1. **AWS Support**: Use AWS Support for account and service issues
2. **Terraform Documentation**: [terraform.io](https://terraform.io)
3. **AWS Documentation**: [docs.aws.amazon.com](https://docs.aws.amazon.com)
4. **Project Issues**: Create issues in the project repository

## Security Considerations

### Production Deployment Checklist

- [ ] Strong, unique secrets for all environments
- [ ] Separate AWS accounts for production
- [ ] MFA enabled for all administrative accounts
- [ ] CloudTrail logging enabled
- [ ] VPC Flow Logs enabled
- [ ] Security groups follow least privilege
- [ ] All data encrypted at rest and in transit
- [ ] Regular security audits scheduled
- [ ] Incident response plan documented
- [ ] Backup and recovery procedures tested

### Compliance Requirements

For educational institutions or enterprises:
- Review data residency requirements
- Ensure GDPR/FERPA compliance if applicable
- Configure audit logging for compliance
- Document data handling procedures
- Regular security assessments

## Next Steps

After successful deployment:

1. **Application Deployment**: Deploy your application containers to ECS
2. **Database Setup**: Configure Supabase database schema
3. **Monitoring Setup**: Configure application monitoring and alerting
4. **Performance Testing**: Load test your application
5. **Documentation**: Document operational procedures
6. **Training**: Train your team on the new infrastructure

## Support and Maintenance

### Regular Maintenance Tasks

- **Weekly**: Review CloudWatch metrics and logs
- **Monthly**: Update Terraform modules and providers
- **Quarterly**: Review and rotate secrets
- **Annually**: Conduct security audits and disaster recovery tests

### Scaling Considerations

As your application grows:
- Monitor ECS service auto-scaling
- Consider multi-region deployment
- Implement CDN for global performance
- Plan for database scaling (read replicas, sharding)
- Consider microservices architecture for large teams