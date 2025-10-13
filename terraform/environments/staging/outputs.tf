# Staging Environment Outputs
# This file defines outputs specific to the staging environment

output "environment" {
  description = "Environment name"
  value       = "staging"
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.acadion_infrastructure.vpc_id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = module.acadion_infrastructure.vpc_cidr
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.acadion_infrastructure.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.acadion_infrastructure.private_subnet_ids
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.acadion_infrastructure.alb_dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = module.acadion_infrastructure.alb_zone_id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.acadion_infrastructure.ecs_cluster_name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = module.acadion_infrastructure.ecs_cluster_arn
}

output "ecr_repositories" {
  description = "ECR repository URLs"
  value = {
    backend           = module.acadion_infrastructure.backend_repository_url
    frontend          = module.acadion_infrastructure.frontend_repository_url
    face_recognition  = module.acadion_infrastructure.face_recognition_repository_url
  }
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = module.acadion_infrastructure.redis_endpoint
  sensitive   = true
}

output "s3_buckets" {
  description = "S3 bucket names"
  value = {
    static_assets = module.acadion_infrastructure.static_assets_bucket_name
    deployments   = module.acadion_infrastructure.deployment_artifacts_bucket_name
  }
}

output "efs_file_system_id" {
  description = "EFS file system ID"
  value       = module.acadion_infrastructure.efs_file_system_id
}

output "parameter_store_kms_key_id" {
  description = "KMS key ID for parameter store encryption"
  value       = module.acadion_infrastructure.parameter_store_kms_key_id
}

output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions IAM role"
  value       = module.acadion_infrastructure.github_actions_role_arn
}

# Staging-specific outputs
output "staging_notes" {
  description = "Important notes for staging environment"
  value = {
    purpose             = "Production-like environment for testing and validation"
    backup_enabled      = "Backups enabled for data protection"
    monitoring          = "Enhanced monitoring enabled"
    ci_cd_enabled       = "GitHub Actions CI/CD integration enabled"
    resource_sizing     = "Medium resource sizing for realistic testing"
    network_isolation   = "Isolated network (10.1.0.0/16) from dev and prod"
  }
}

output "staging_endpoints" {
  description = "Staging environment endpoints"
  value = {
    load_balancer = module.acadion_infrastructure.alb_dns_name
    suggested_domain = "staging.acadion.com"
    api_endpoint = "https://staging-api.acadion.com"
  }
}