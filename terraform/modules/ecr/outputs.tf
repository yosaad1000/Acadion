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