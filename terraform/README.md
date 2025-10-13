# Terraform Infrastructure for Acadion

This directory contains Terraform configurations for deploying the Acadion AI-powered student management platform to AWS with complete CI/CD pipeline integration.

## 🏗️ Architecture Overview

The infrastructure is designed following AWS Well-Architected Framework principles:

- **Multi-environment support**: Separate workspaces for dev, staging, and production
- **Microservice architecture**: ECS services for backend, frontend, and face recognition
- **Parameter Store integration**: Centralized configuration management
- **Auto-scaling**: Dynamic scaling based on demand
- **Security**: IAM roles, security groups, and encryption
- **Monitoring**: CloudWatch integration for metrics and logging

## 📁 Directory Structure

```
terraform/
├── modules/                    # Reusable Terraform modules
│   ├── networking/            # VPC, subnets, security groups
│   ├── ecs/                   # ECS cluster and services
│   ├── ecr/                   # Container registries
│   ├── storage/               # S3, EFS, ElastiCache
│   ├── parameter-store/       # AWS Systems Manager Parameter Store
│   └── face-recognition/      # GPU-enabled face recognition service
├── environments/              # Environment-specific configurations
│   ├── dev/                   # Development environment
│   │   ├── main.tf           # Dev-specific Terraform config
│   │   ├── variables.tf      # Dev variables
│   │   └── outputs.tf        # Dev outputs
│   ├── staging/              # Staging environment
│   │   ├── main.tf           # Staging-specific Terraform config
│   │   ├── variables.tf      # Staging variables
│   │   └── outputs.tf        # Staging outputs
│   ├── prod/                 # Production environment
│   │   ├── main.tf           # Prod-specific Terraform config
│   │   ├── variables.tf      # Prod variables
│   │   └── outputs.tf        # Prod outputs
│   ├── dev.tfvars            # Development environment (legacy)
│   ├── staging.tfvars        # Staging environment (legacy)
│   ├── prod.tfvars           # Production environment (legacy)
│   └── README.md             # Environment configuration guide
├── scripts/                   # Deployment and management scripts
│   ├── workspace-manager.ps1 # PowerShell workspace management
│   ├── workspace-manager.sh  # Bash workspace management
│   └── deploy.ps1            # PowerShell deployment script
├── main.tf                   # Main Terraform configuration
├── variables.tf              # Variable definitions
├── outputs.tf               # Output definitions
├── DEPLOYMENT_GUIDE.md       # Comprehensive deployment guide
├── TAGGING_STRATEGY.md       # Resource tagging strategy
└── README.md                # This file
```

## 🚀 Quick Start

### Prerequisites

1. **Terraform** (>= 1.0)
   ```bash
   # Install via package manager or download from terraform.io
   terraform version
   ```

2. **AWS CLI** (recommended)
   ```bash
   aws configure
   aws sts get-caller-identity
   ```

3. **Required AWS Permissions**
   - EC2, ECS, ECR, VPC management
   - Systems Manager Parameter Store
   - IAM role and policy management
   - S3, ElastiCache, EFS access

### Initial Setup

1. **Clone and navigate to terraform directory**
   ```bash
   cd terraform
   ```

2. **Choose deployment method**
   
   **Option A: Environment-Specific Directories (Recommended)**
   ```bash
   # Navigate to environment directory
   cd environments/dev
   
   # Initialize Terraform
   terraform init
   ```
   
   **Option B: Legacy Workspace Method**
   ```bash
   # Initialize in root terraform directory
   terraform init
   
   # Create environment workspace
   terraform workspace new dev
   ```

3. **Configure environment variables**
   ```bash
   # Set required environment variables (see DEPLOYMENT_GUIDE.md)
   export TF_VAR_jwt_secret_key="your-secret-key"
   export TF_VAR_supabase_url="https://your-project.supabase.co"
   # ... other required variables
   ```

4. **Review configuration** (see environments/README.md for details)

### Deployment

#### Using Workspace Manager Scripts (Recommended)

**PowerShell (Windows):**
```powershell
# Plan deployment
.\scripts\workspace-manager.ps1 -Environment dev -Action plan

# Apply changes
.\scripts\workspace-manager.ps1 -Environment dev -Action apply

# Show outputs
.\scripts\workspace-manager.ps1 -Environment dev -Action output

# Destroy (careful!)
.\scripts\workspace-manager.ps1 -Environment dev -Action destroy
```

**Bash (Linux/Mac):**
```bash
# Plan deployment
./scripts/workspace-manager.sh dev plan

# Apply changes
./scripts/workspace-manager.sh dev apply

# Show outputs
./scripts/workspace-manager.sh dev output

# Destroy (careful!)
./scripts/workspace-manager.sh dev destroy
```

#### Manual Deployment

**Environment-Specific Directories (Recommended):**
```bash
# Navigate to environment directory
cd environments/dev

# Plan
terraform plan

# Apply
terraform apply
```

**Legacy Workspace Method:**
```bash
# Select workspace
terraform workspace select dev

# Plan
terraform plan -var-file="environments/dev.tfvars"

# Apply
terraform apply -var-file="environments/dev.tfvars"
```

## ⚙️ Configuration

### Environment Variables

Each environment requires a `.tfvars` file with the following structure:

```hcl
# Basic Configuration
environment    = "dev"
aws_region     = "us-east-1"
project_name   = "acadion"

# VPC Configuration
vpc_cidr           = "10.0.0.0/16"
enable_nat_gateway = true

# Resource Sizing
backend_cpu                = 512
backend_memory             = 1024
frontend_cpu               = 256
frontend_memory            = 512
face_recognition_cpu       = 1024
face_recognition_memory    = 2048

# ElastiCache Configuration
redis_node_type        = "cache.t3.micro"
redis_num_cache_nodes  = 1

# GitHub repository for CI/CD
github_repository = "your-org/acadion"
```

### Parameter Store Secrets

The following secrets must be configured in AWS Systems Manager Parameter Store:

#### Required Secrets
```bash
# JWT and encryption
/dev/acadion/secrets/jwt-secret-key
/dev/acadion/secrets/encryption-key

# Supabase configuration
/dev/acadion/secrets/supabase-url
/dev/acadion/secrets/supabase-key
/dev/acadion/secrets/supabase-service-key

# Pinecone configuration
/dev/acadion/secrets/pinecone-api-key
/dev/acadion/secrets/pinecone-environment
/dev/acadion/secrets/pinecone-index-name
```

#### Setting Parameters via AWS CLI
```bash
# Example: Set JWT secret
aws ssm put-parameter \
  --name "/dev/acadion/secrets/jwt-secret-key" \
  --value "your-secret-key-here" \
  --type "SecureString" \
  --description "JWT secret key for development"

# Example: Set Supabase URL
aws ssm put-parameter \
  --name "/dev/acadion/secrets/supabase-url" \
  --value "https://your-project.supabase.co" \
  --type "SecureString" \
  --description "Supabase project URL"
```

## 🏢 Environment Management

### Workspaces

This setup uses Terraform workspaces to manage multiple environments:

- **dev**: Development environment with minimal resources
- **staging**: Staging environment with production-like setup
- **prod**: Production environment with full resources

### Workspace Management

```bash
# List workspaces
./scripts/manage-workspaces.sh list

# Create new workspace
./scripts/manage-workspaces.sh create staging

# Switch workspace
./scripts/manage-workspaces.sh select prod

# Show current workspace
./scripts/manage-workspaces.sh show
```

### Environment Isolation

Each environment has:
- Separate VPC with isolated networking
- Independent Parameter Store hierarchy
- Dedicated ECS clusters and services
- Environment-specific resource sizing
- Isolated state files

## 🔧 Modules

### Networking Module
- Multi-AZ VPC with public and private subnets
- NAT gateways for private subnet internet access
- Security groups for each service tier
- Application Load Balancer for traffic distribution

### ECS Module
- Fargate cluster for serverless containers
- Auto-scaling policies based on CPU/memory
- Task definitions with Parameter Store integration
- Health checks and service discovery

### Parameter Store Module
- Hierarchical parameter organization
- KMS encryption for sensitive data
- IAM policies for secure access
- Configuration validation and refresh capabilities

### Storage Module
- ElastiCache Redis for caching
- S3 buckets for static assets and artifacts
- EFS for persistent storage
- Automated backups and lifecycle policies

### Face Recognition Module
- GPU-enabled EC2 instances (G4 family)
- Specialized task definitions for ML workloads
- Auto-scaling based on queue metrics
- Integration with Pinecone vector database

## 📊 Monitoring and Logging

### CloudWatch Integration
- Application and infrastructure metrics
- Custom dashboards for each environment
- Alerting rules for critical events
- Log aggregation from all services

### Health Checks
- ECS service health monitoring
- Load balancer target health
- Parameter Store connectivity
- External service availability

## 🔒 Security

### IAM Roles and Policies
- Least privilege access principles
- Service-specific roles for ECS tasks
- Parameter Store access controls
- GitHub Actions integration roles

### Network Security
- Private subnets for backend services
- Security groups with minimal required access
- VPC endpoints for AWS service access
- WAF integration for application protection

### Data Encryption
- Parameter Store SecureString encryption
- EFS encryption at rest and in transit
- ElastiCache encryption
- S3 bucket encryption

## 🚨 Troubleshooting

### Common Issues

1. **Parameter Store Access Denied**
   ```bash
   # Check IAM permissions
   aws sts get-caller-identity
   aws iam get-role --role-name acadion-dev-ecs-parameter-role
   ```

2. **Workspace State Issues**
   ```bash
   # Refresh state
   terraform refresh -var-file="environments/dev.tfvars"
   
   # Import existing resources if needed
   terraform import aws_instance.example i-1234567890abcdef0
   ```

3. **ECS Service Deployment Failures**
   ```bash
   # Check ECS service events
   aws ecs describe-services --cluster acadion-dev-cluster --services backend
   
   # Check CloudWatch logs
   aws logs describe-log-groups --log-group-name-prefix "/ecs/acadion-dev"
   ```

### Debugging Commands

```bash
# Show current configuration
terraform show

# Validate configuration
terraform validate

# Check plan with detailed output
terraform plan -var-file="environments/dev.tfvars" -detailed-exitcode

# Show outputs
terraform output

# Debug Parameter Store
aws ssm get-parameters-by-path --path "/dev/acadion" --recursive
```

## 📚 Additional Resources

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

## 🤝 Contributing

When making changes to the infrastructure:

1. Test in development environment first
2. Use proper workspace isolation
3. Document any new parameters or modules
4. Update this README with significant changes
5. Follow Terraform best practices for naming and organization

## 📄 License

This infrastructure code is part of the Acadion project. See the main project LICENSE file for details.