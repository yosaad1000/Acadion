# Outputs for ECR module

output "backend_repository_url" {
  description = "URL of the backend ECR repository"
  value       = aws_ecr_repository.backend.repository_url
}

output "frontend_repository_url" {
  description = "URL of the frontend ECR repository"
  value       = aws_ecr_repository.frontend.repository_url
}

output "face_recognition_repository_url" {
  description = "URL of the face recognition ECR repository"
  value       = aws_ecr_repository.face_recognition.repository_url
}

output "backend_repository_arn" {
  description = "ARN of the backend ECR repository"
  value       = aws_ecr_repository.backend.arn
}

output "frontend_repository_arn" {
  description = "ARN of the frontend ECR repository"
  value       = aws_ecr_repository.frontend.arn
}

output "face_recognition_repository_arn" {
  description = "ARN of the face recognition ECR repository"
  value       = aws_ecr_repository.face_recognition.arn
}

output "registry_id" {
  description = "Registry ID where the repositories are created"
  value       = aws_ecr_repository.backend.registry_id
}

# Deployment Management outputs
output "deployment_metadata_bucket_name" {
  description = "Name of the deployment metadata S3 bucket"
  value       = aws_s3_bucket.deployment_metadata.bucket
}

output "deployment_metadata_bucket_arn" {
  description = "ARN of the deployment metadata S3 bucket"
  value       = aws_s3_bucket.deployment_metadata.arn
}

output "deployment_tracker_lambda_function_name" {
  description = "Name of the deployment tracker Lambda function"
  value       = aws_lambda_function.deployment_tracker.function_name
}

output "deployment_tracker_lambda_function_arn" {
  description = "ARN of the deployment tracker Lambda function"
  value       = aws_lambda_function.deployment_tracker.arn
}

output "deployment_rollback_lambda_function_name" {
  description = "Name of the deployment rollback Lambda function"
  value       = aws_lambda_function.deployment_rollback.function_name
}

output "deployment_rollback_lambda_function_arn" {
  description = "ARN of the deployment rollback Lambda function"
  value       = aws_lambda_function.deployment_rollback.arn
}