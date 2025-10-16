# Main Terraform outputs

# Networking outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = var.vpc_cidr
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.networking.private_subnet_ids
}

# Load Balancer outputs
output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.ecs.alb_dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = module.ecs.alb_zone_id
}

# ECS outputs
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = module.ecs.cluster_arn
}

# ECR outputs
output "backend_repository_url" {
  description = "URL of the backend ECR repository"
  value       = module.ecr.backend_repository_url
}

output "frontend_repository_url" {
  description = "URL of the frontend ECR repository"
  value       = module.ecr.frontend_repository_url
}

output "face_recognition_repository_url" {
  description = "URL of the face recognition ECR repository"
  value       = module.ecr.face_recognition_repository_url
}

# Storage outputs
output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = module.storage.redis_endpoint
}

output "static_assets_bucket_name" {
  description = "Name of the static assets S3 bucket"
  value       = module.storage.static_assets_bucket_name
}

output "deployment_artifacts_bucket_name" {
  description = "Name of the deployment artifacts S3 bucket"
  value       = module.storage.deployment_artifacts_bucket_name
}

output "app_data_bucket_name" {
  description = "Name of the application data S3 bucket"
  value       = module.storage.app_data_bucket_name
}

output "efs_file_system_id" {
  description = "ID of the EFS file system"
  value       = module.storage.efs_file_system_id
}

# IAM outputs
output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions IAM role"
  value       = module.storage.github_actions_role_arn
}

# Parameter Store outputs
output "parameter_store_prefix" {
  description = "Parameter Store prefix for this environment"
  value       = module.parameter_store.parameter_prefix
}

output "parameter_store_kms_key_id" {
  description = "KMS key ID used for parameter encryption"
  value       = module.parameter_store.kms_key_id
}

output "parameter_store_task_role_arn" {
  description = "ARN of the ECS task role for parameter access"
  value       = module.parameter_store.ecs_task_role_arn
}

output "parameter_paths" {
  description = "Parameter paths organized by category"
  value       = module.parameter_store.parameter_paths
  sensitive   = true
}

# Application URLs
output "application_url" {
  description = "URL to access the application"
  value       = "http://${module.ecs.alb_dns_name}"
}

output "api_url" {
  description = "URL to access the API"
  value       = "http://${module.ecs.alb_dns_name}:8000"
}# M
onitoring outputs
output "sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = module.monitoring.sns_topic_arn
}

output "cloudwatch_dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = module.monitoring.dashboard_url
}

output "log_group_names" {
  description = "Names of the CloudWatch log groups"
  value       = module.monitoring.log_group_names
}

output "alarm_names" {
  description = "Names of all CloudWatch alarms"
  value       = module.monitoring.alarm_names
}