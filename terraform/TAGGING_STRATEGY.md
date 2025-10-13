# AWS Resource Tagging Strategy

This document defines the comprehensive tagging strategy for all AWS resources in the Acadion platform deployment. Consistent tagging enables cost management, security compliance, automation, and operational excellence.

## Core Tagging Principles

1. **Consistency**: All resources must have the core required tags
2. **Automation**: Tags are applied automatically via Terraform
3. **Governance**: Tags support cost allocation and compliance
4. **Lifecycle**: Tags reflect resource lifecycle and ownership

## Required Tags (Applied to All Resources)

These tags are automatically applied via the AWS provider default_tags configuration:

| Tag Key | Description | Example Values |
|---------|-------------|----------------|
| `Project` | Project name identifier | `acadion` |
| `Environment` | Environment designation | `dev`, `staging`, `prod` |
| `ManagedBy` | Infrastructure management tool | `Terraform` |
| `Workspace` | Terraform workspace/environment | `development`, `staging`, `production` |
| `CostCenter` | Cost allocation identifier | `development`, `staging`, `production` |
| `Owner` | Team or individual responsible | `devops-team`, `platform-team` |

## Environment-Specific Tags

### Development Environment
```hcl
common_tags = {
  Project      = "acadion"
  Environment  = "dev"
  ManagedBy    = "Terraform"
  Workspace    = "development"
  CostCenter   = "development"
  Owner        = "devops-team"
  AutoShutdown = "true"      # Enable cost-saving auto-shutdown
  Backup       = "false"     # Disable backups for cost savings
}
```

### Staging Environment
```hcl
common_tags = {
  Project      = "acadion"
  Environment  = "staging"
  ManagedBy    = "Terraform"
  Workspace    = "staging"
  CostCenter   = "staging"
  Owner        = "devops-team"
  AutoShutdown = "false"     # Keep running for testing
  Backup       = "true"      # Enable backups
  Monitoring   = "enhanced"  # Enhanced monitoring
}
```

### Production Environment
```hcl
common_tags = {
  Project      = "acadion"
  Environment  = "prod"
  ManagedBy    = "Terraform"
  Workspace    = "production"
  CostCenter   = "production"
  Owner        = "platform-team"
  AutoShutdown = "false"     # Never auto-shutdown production
  Backup       = "critical"  # Critical backup requirements
  Monitoring   = "full"      # Full monitoring and alerting
  Compliance   = "required"  # Compliance requirements
  DataClass    = "sensitive" # Data classification
}
```

## Service-Specific Tags

### Networking Resources
Additional tags for VPC, subnets, security groups:

| Tag Key | Description | Example Values |
|---------|-------------|----------------|
| `Component` | Infrastructure component | `networking`, `vpc`, `subnet` |
| `Tier` | Network tier | `public`, `private`, `database` |
| `AZ` | Availability zone | `us-east-1a`, `us-east-1b` |

Example:
```hcl
tags = merge(local.common_tags, {
  Component = "networking"
  Tier      = "private"
  AZ        = "us-east-1a"
})
```

### Compute Resources (ECS)
Additional tags for ECS clusters, services, tasks:

| Tag Key | Description | Example Values |
|---------|-------------|----------------|
| `Component` | Service component | `ecs`, `cluster`, `service` |
| `Service` | Application service | `backend`, `frontend`, `face-recognition` |
| `Scaling` | Auto-scaling configuration | `enabled`, `disabled` |

Example:
```hcl
tags = merge(local.common_tags, {
  Component = "ecs"
  Service   = "backend"
  Scaling   = "enabled"
})
```

### Storage Resources
Additional tags for S3, EFS, ElastiCache:

| Tag Key | Description | Example Values |
|---------|-------------|----------------|
| `Component` | Storage component | `s3`, `efs`, `cache` |
| `DataType` | Type of data stored | `static-assets`, `app-data`, `cache` |
| `Retention` | Data retention policy | `7days`, `30days`, `1year` |
| `Encryption` | Encryption status | `enabled`, `kms` |

Example:
```hcl
tags = merge(local.common_tags, {
  Component  = "s3"
  DataType   = "static-assets"
  Retention  = "1year"
  Encryption = "enabled"
})
```

### Security Resources
Additional tags for IAM, KMS, security groups:

| Tag Key | Description | Example Values |
|---------|-------------|----------------|
| `Component` | Security component | `iam`, `kms`, `security-group` |
| `Purpose` | Security purpose | `parameter-store`, `github-actions`, `service-access` |
| `AccessLevel` | Access level | `read-only`, `read-write`, `admin` |

Example:
```hcl
tags = merge(local.common_tags, {
  Component   = "iam"
  Purpose     = "github-actions"
  AccessLevel = "read-write"
})
```

## Cost Management Tags

### Cost Allocation Tags
These tags enable detailed cost tracking and allocation:

| Tag Key | Purpose | Usage |
|---------|---------|-------|
| `CostCenter` | Department/team billing | Cost allocation reports |
| `Project` | Project-level costs | Project budget tracking |
| `Environment` | Environment costs | Dev vs prod cost analysis |
| `Component` | Service-level costs | Microservice cost breakdown |

### Cost Optimization Tags
These tags support automated cost optimization:

| Tag Key | Purpose | Usage |
|---------|---------|-------|
| `AutoShutdown` | Auto-shutdown eligibility | Lambda functions for cost savings |
| `Backup` | Backup requirements | Backup automation and retention |
| `Monitoring` | Monitoring level | CloudWatch configuration |
| `Scaling` | Auto-scaling configuration | Performance optimization |

## Compliance and Governance Tags

### Data Classification
| Tag Key | Values | Purpose |
|---------|--------|---------|
| `DataClass` | `public`, `internal`, `confidential`, `sensitive` | Data handling requirements |
| `Compliance` | `required`, `optional`, `exempt` | Compliance applicability |
| `Retention` | `7days`, `30days`, `1year`, `7years` | Data retention policies |

### Operational Tags
| Tag Key | Values | Purpose |
|---------|--------|---------|
| `Backup` | `none`, `standard`, `critical` | Backup requirements |
| `Monitoring` | `basic`, `enhanced`, `full` | Monitoring configuration |
| `Patching` | `immediate`, `scheduled`, `manual` | Patch management |

## Automation and Lifecycle Tags

### Resource Lifecycle
| Tag Key | Values | Purpose |
|---------|--------|---------|
| `Lifecycle` | `permanent`, `temporary`, `experimental` | Resource lifecycle management |
| `CreatedBy` | `terraform`, `manual`, `auto-scaling` | Creation method tracking |
| `LastModified` | ISO 8601 timestamp | Change tracking |

### Automation Tags
| Tag Key | Values | Purpose |
|---------|--------|---------|
| `AutoShutdown` | `true`, `false` | Automated shutdown eligibility |
| `AutoStart` | `true`, `false` | Automated startup eligibility |
| `AutoScale` | `enabled`, `disabled` | Auto-scaling configuration |
| `AutoBackup` | `enabled`, `disabled` | Automated backup configuration |

## Implementation in Terraform

### Provider-Level Default Tags
```hcl
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Workspace   = local.workspace_name
      CostCenter  = var.environment
      Owner       = local.team_name
    }
  }
}
```

### Resource-Specific Tags
```hcl
resource "aws_instance" "example" {
  # ... other configuration ...
  
  tags = merge(local.common_tags, {
    Name        = "${local.name_prefix}-example"
    Component   = "compute"
    Service     = "backend"
    Scaling     = "enabled"
    DataClass   = "internal"
    Backup      = "standard"
    Monitoring  = "enhanced"
  })
}
```

### Module-Level Tag Propagation
```hcl
module "networking" {
  source = "./modules/networking"
  
  # Pass common tags to module
  common_tags = local.common_tags
  
  # Module-specific tags
  component_tags = {
    Component = "networking"
    Tier      = "infrastructure"
  }
}
```

## Tag Validation and Governance

### Required Tag Validation
Use AWS Config rules or custom policies to enforce required tags:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "Null": {
          "aws:RequestedRegion": "false"
        },
        "ForAllValues:StringNotEquals": {
          "aws:TagKeys": [
            "Project",
            "Environment",
            "ManagedBy",
            "Owner"
          ]
        }
      }
    }
  ]
}
```

### Cost Allocation Tag Activation
Activate cost allocation tags in AWS Billing:
1. Go to AWS Billing Console
2. Navigate to Cost Allocation Tags
3. Activate tags: `Project`, `Environment`, `CostCenter`, `Component`

## Monitoring and Reporting

### Cost Reports by Tags
Create cost reports using tag dimensions:
- Monthly costs by Environment
- Service costs by Component
- Team costs by Owner
- Project costs by CostCenter

### Resource Inventory
Use AWS Resource Groups to create dynamic groups based on tags:
- All development resources: `Environment=dev`
- All backend services: `Component=ecs AND Service=backend`
- All critical resources: `Backup=critical`

### Compliance Reporting
Generate compliance reports using tags:
- Resources requiring backup: `Backup!=none`
- Sensitive data resources: `DataClass=sensitive`
- Resources requiring monitoring: `Monitoring!=basic`

## Best Practices

### Tag Naming Conventions
1. **PascalCase**: Use PascalCase for tag keys (`CostCenter`, not `cost_center`)
2. **Descriptive**: Use clear, descriptive names
3. **Consistent**: Maintain consistency across all resources
4. **Hierarchical**: Use hierarchical values where appropriate

### Tag Value Standards
1. **Lowercase**: Use lowercase for tag values (`dev`, not `Dev`)
2. **Hyphenated**: Use hyphens for multi-word values (`static-assets`)
3. **Standardized**: Use standardized values from approved lists
4. **No Spaces**: Avoid spaces in tag values

### Maintenance
1. **Regular Audits**: Audit tags monthly for compliance
2. **Cleanup**: Remove unused or obsolete tags
3. **Documentation**: Keep tag documentation updated
4. **Training**: Train team members on tagging standards

## Tag Limits and Considerations

### AWS Tag Limits
- Maximum 50 tags per resource
- Tag key length: 1-128 characters
- Tag value length: 0-256 characters
- Case sensitive keys and values

### Performance Considerations
- Tags don't impact resource performance
- Large numbers of tags may slow console operations
- Use tag-based policies judiciously for performance

### Cost Considerations
- Tags themselves don't incur costs
- Cost allocation tags enable detailed billing
- Tag-based automation can reduce operational costs

This tagging strategy ensures consistent, automated, and governance-compliant resource management across all Acadion AWS deployments.