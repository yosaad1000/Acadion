# Outputs for storage module

# ElastiCache outputs
output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_port" {
  description = "Redis cluster port"
  value       = aws_elasticache_replication_group.redis.port
}

output "redis_auth_token" {
  description = "Redis auth token"
  value       = aws_elasticache_replication_group.redis.auth_token
  sensitive   = true
}

# S3 bucket outputs
output "static_assets_bucket_name" {
  description = "Name of the static assets S3 bucket"
  value       = aws_s3_bucket.static_assets.bucket
}

output "static_assets_bucket_arn" {
  description = "ARN of the static assets S3 bucket"
  value       = aws_s3_bucket.static_assets.arn
}

output "deployment_artifacts_bucket_name" {
  description = "Name of the deployment artifacts S3 bucket"
  value       = aws_s3_bucket.deployment_artifacts.bucket
}

output "deployment_artifacts_bucket_arn" {
  description = "ARN of the deployment artifacts S3 bucket"
  value       = aws_s3_bucket.deployment_artifacts.arn
}

output "app_data_bucket_name" {
  description = "Name of the application data S3 bucket"
  value       = aws_s3_bucket.app_data.bucket
}

output "app_data_bucket_arn" {
  description = "ARN of the application data S3 bucket"
  value       = aws_s3_bucket.app_data.arn
}

# EFS outputs
output "efs_file_system_id" {
  description = "ID of the EFS file system"
  value       = aws_efs_file_system.main.id
}

output "efs_file_system_arn" {
  description = "ARN of the EFS file system"
  value       = aws_efs_file_system.main.arn
}

output "efs_dns_name" {
  description = "DNS name of the EFS file system"
  value       = aws_efs_file_system.main.dns_name
}

output "face_recognition_access_point_id" {
  description = "ID of the face recognition EFS access point"
  value       = aws_efs_access_point.face_recognition.id
}

output "app_storage_access_point_id" {
  description = "ID of the app storage EFS access point"
  value       = aws_efs_access_point.app_storage.id
}

# IAM outputs
output "s3_access_policy_arn" {
  description = "ARN of the S3 access policy"
  value       = aws_iam_policy.s3_access.arn
}

output "efs_access_policy_arn" {
  description = "ARN of the EFS access policy"
  value       = aws_iam_policy.efs_access.arn
}

output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions IAM role"
  value       = aws_iam_role.github_actions.arn
}

output "deployment_artifacts_policy_arn" {
  description = "ARN of the deployment artifacts access policy"
  value       = aws_iam_policy.deployment_artifacts_access.arn
}