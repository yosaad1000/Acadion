# Environment-Specific Terraform Configurations

This directory contains environment-specific Terraform configurations for the Acadion AWS deployment. Each environment is isolated with its own networking, security groups, and resource configurations.

## Directory Structure

```
environments/
├── dev/                    # Development environment
│   ├── main.tf            # Development-specific configuration
│   ├── variables.tf       # Development variables
│   └── outputs.tf         # Development outputs
├── staging/               # Staging environment
│   ├── main.tf            # Staging-specific configuration
│   ├── variables.tf       # Staging variables
│   └── outputs.tf         # Staging outputs
├── prod/                  # Production environment
│   ├── main.tf            # Production-specific configuration
│   ├── variables.tf       # Production variables
│   └── outputs.tf         # Production outputs
├── dev.tfvars            # Development variable values (legacy)
├── staging.tfvars        # Staging variable values (legacy)
├── prod.tfvars           # Production variable values (legacy)
└── README.md             # This file
```

## Environment Isolation

Each environment is completely isolated with:

### Network Isolation
- **Development**: VPC CIDR `10.0.0.0/16`
- **Staging**: VPC CIDR `10.1.0.0/16`
- **Production**: VPC CIDR `10.2.0.0/16`

### Resource Sizing

| Resource | Development | Staging | Production |
|----------|-------------|---------|------------|
| Backend CPU | 512 | 1024 | 2048 |
| Backend Memory | 1024 MB | 2048 MB | 4096 MB |
| Frontend CPU | 256 | 256 | 512 |
| Frontend Memory | 512 MB | 512 MB | 1024 MB |
| Face Recognition CPU | 1024 | 2048 | 4096 |
| Face Recognition Memory | 2048 MB | 4096 MB | 8192 MB |
| Redis Node Type | cache.t3.micro | cache.r6g.large | cache.r6g.xlarge |
| Redis Nodes | 1 | 2 | 3 |

### Security Configuration

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| Debug Mode | Enabled | Disabled | Disabled |
| Log Level | DEBUG | INFO | INFO |
| Auto Shutdown | Enabled | Disabled | Disabled |
| Backup | Disabled | Enabled | Critical |
| KMS Key Deletion | 7 days | 7 days | 30 days |
| Rate Limiting | 200 req/min | 100 req/min | 100 req/min |

## Usage

### Using Workspace Manager Scripts

The recommended way to manage environments is using the workspace manager scripts:

#### Linux/macOS
```bash
# Initialize development environment
./terraform/scripts/workspace-manager.sh dev init

# Plan staging changes
./terraform/scripts/workspace-manager.sh staging plan

# Apply production changes (with confirmation)
./terraform/scripts/workspace-manager.sh prod apply

# Show development outputs
./terraform/scripts/workspace-manager.sh dev output

# Destroy development environment
./terraform/scripts/workspace-manager.sh dev destroy
```

#### Windows PowerShell
```powershell
# Initialize development environment
.\terraform\scripts\workspace-manager.ps1 -Environment dev -Action init

# Plan staging changes
.\terraform\scripts\workspace-manager.ps1 -Environment staging -Action plan

# Apply production changes (auto-approve)
.\terraform\scripts\workspace-manager.ps1 -Environment prod -Action apply -AutoApprove

# Show development outputs
.\terraform\scripts\workspace-manager.ps1 -Environment dev -Action output

# Destroy development environment
.\terraform\scripts\workspace-manager.ps1 -Environment dev -Action destroy
```

### Manual Terraform Commands

If you prefer to use Terraform directly:

```bash
# Navigate to environment directory
cd terraform/environments/dev

# Initialize Terraform
terraform init

# Plan changes
terraform plan

# Apply changes
terraform apply

# Show outputs
terraform output

# Destroy resources
terraform destroy
```

## Environment Configuration

### Development Environment
- **Purpose**: Local development and testing
- **Cost Optimization**: Minimal resources, auto-shutdown enabled
- **Security**: Debug mode enabled, relaxed CORS
- **Backup**: Disabled
- **Monitoring**: Basic

### Staging Environment
- **Purpose**: Pre-production testing and validation
- **Resources**: Production-like sizing
- **Security**: Production security settings
- **Backup**: Enabled
- **Monitoring**: Enhanced
- **CI/CD**: Enabled

### Production Environment
- **Purpose**: Live production workloads
- **Resources**: Full production sizing
- **Security**: Strict security controls
- **Backup**: Critical level with long retention
- **Monitoring**: Full monitoring and alerting
- **Compliance**: Audit logging enabled

## Required Environment Variables

Each environment requires the following sensitive variables to be provided securely:

```bash
# JWT Configuration
export TF_VAR_jwt_secret_key="your-jwt-secret-key"
export TF_VAR_encryption_key="your-encryption-key"

# Supabase Configuration
export TF_VAR_supabase_url="https://your-project.supabase.co"
export TF_VAR_supabase_key="your-supabase-anon-key"
export TF_VAR_supabase_service_key="your-supabase-service-key"

# Pinecone Configuration
export TF_VAR_pinecone_api_key="your-pinecone-api-key"
export TF_VAR_pinecone_environment="us-east-1-aws"
export TF_VAR_pinecone_index_name="acadion-faces-{env}"

# GitHub Configuration
export TF_VAR_github_repository="your-org/acadion"
export TF_VAR_github_actions_role_arn="arn:aws:iam::account:oidc-provider/..."

# CloudFront Configuration (optional)
export TF_VAR_cloudfront_domain="your-domain.com"
```

## Remote State Configuration

For production use, configure remote state storage by uncommenting and configuring the backend block in each environment's `main.tf`:

```hcl
backend "s3" {
  bucket         = "acadion-terraform-state-{env}"
  key            = "{env}/terraform.tfstate"
  region         = "us-east-1"
  encrypt        = true
  dynamodb_table = "acadion-terraform-locks-{env}"
}
```

## Security Best Practices

1. **Never commit secrets**: Use environment variables or secure CI/CD variables
2. **Use separate AWS accounts**: Consider separate AWS accounts for each environment
3. **Enable CloudTrail**: Audit all API calls and administrative actions
4. **Regular backups**: Ensure critical data is backed up regularly
5. **Access control**: Use IAM roles with least privilege access
6. **Network security**: Keep resources in private subnets where possible
7. **Encryption**: Enable encryption at rest and in transit for all data

## Troubleshooting

### Common Issues

1. **AWS Credentials**: Ensure AWS CLI is configured with appropriate permissions
2. **Terraform Version**: Use Terraform >= 1.0 for compatibility
3. **Resource Limits**: Check AWS service limits for your account
4. **State Conflicts**: Use remote state locking to prevent concurrent modifications

### Getting Help

1. Check Terraform plan output for detailed error messages
2. Review AWS CloudFormation events for resource creation issues
3. Verify IAM permissions for the deployment user/role
4. Check AWS service health dashboard for regional issues

## Migration from Legacy Configuration

If migrating from the legacy `.tfvars` files:

1. Copy variable values from legacy files to environment variables
2. Test with `terraform plan` in each environment directory
3. Migrate state if using remote state storage
4. Update CI/CD pipelines to use new environment structure

## Contributing

When adding new resources or modifying configurations:

1. Update all three environments consistently
2. Test changes in development first
3. Document any new variables or outputs
4. Update this README with any new requirements or procedures