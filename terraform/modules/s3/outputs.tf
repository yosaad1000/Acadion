# Outputs for S3 Module

output "deployment_bucket_name" {
  description = "Name of the deployment S3 bucket"
  value       = aws_s3_bucket.deployment.bucket
}

output "deployment_bucket_arn" {
  description = "ARN of the deployment S3 bucket"
  value       = aws_s3_bucket.deployment.arn
}

output "deployment_bucket_domain_name" {
  description = "Domain name of the deployment S3 bucket"
  value       = aws_s3_bucket.deployment.bucket_domain_name
}

output "backup_bucket_name" {
  description = "Name of the backup S3 bucket"
  value       = aws_s3_bucket.backup.bucket
}

output "backup_bucket_arn" {
  description = "ARN of the backup S3 bucket"
  value       = aws_s3_bucket.backup.arn
}

output "backup_bucket_domain_name" {
  description = "Domain name of the backup S3 bucket"
  value       = aws_s3_bucket.backup.bucket_domain_name
}

output "face_cache_bucket_name" {
  description = "Name of the face cache S3 bucket"
  value       = var.create_face_cache_bucket ? aws_s3_bucket.face_cache[0].bucket : null
}

output "face_cache_bucket_arn" {
  description = "ARN of the face cache S3 bucket"
  value       = var.create_face_cache_bucket ? aws_s3_bucket.face_cache[0].arn : null
}

output "face_cache_bucket_domain_name" {
  description = "Domain name of the face cache S3 bucket"
  value       = var.create_face_cache_bucket ? aws_s3_bucket.face_cache[0].bucket_domain_name : null
}

output "cloudtrail_logs_bucket_name" {
  description = "Name of the CloudTrail logs S3 bucket"
  value       = var.enable_cloudtrail ? aws_s3_bucket.cloudtrail_logs[0].bucket : null
}

output "cloudtrail_logs_bucket_arn" {
  description = "ARN of the CloudTrail logs S3 bucket"
  value       = var.enable_cloudtrail ? aws_s3_bucket.cloudtrail_logs[0].arn : null
}

output "bucket_suffix" {
  description = "Random suffix used for bucket names"
  value       = random_id.bucket_suffix.hex
}