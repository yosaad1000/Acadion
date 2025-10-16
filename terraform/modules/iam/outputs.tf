# Outputs for IAM module

# ECS Role ARNs
output "ecs_execution_role_arn" {
  description = "ARN of ECS execution role"
  value       = aws_iam_role.ecs_execution_role.arn
}

output "ecs_backend_task_role_arn" {
  description = "ARN of ECS backend task role"
  value       = aws_iam_role.ecs_backend_task_role.arn
}

output "ecs_frontend_task_role_arn" {
  description = "ARN of ECS frontend task role"
  value       = aws_iam_role.ecs_frontend_task_role.arn
}

output "ecs_face_recognition_task_role_arn" {
  description = "ARN of ECS face recognition task role"
  value       = aws_iam_role.ecs_face_recognition_task_role.arn
}

# CI/CD Role ARN
output "cicd_role_arn" {
  description = "ARN of CI/CD role for GitHub Actions"
  value       = aws_iam_role.cicd_role.arn
}

# Auto Scaling Role ARN
output "ecs_autoscaling_role_arn" {
  description = "ARN of ECS auto scaling role"
  value       = aws_iam_role.ecs_autoscaling_role.arn
}

# Events Role ARN
output "ecs_events_role_arn" {
  description = "ARN of ECS events role"
  value       = aws_iam_role.ecs_events_role.arn
}

# Admin Emergency Role ARN
output "admin_emergency_role_arn" {
  description = "ARN of admin emergency role"
  value       = aws_iam_role.admin_emergency_role.arn
}

# CloudTrail Role ARN
output "cloudtrail_role_arn" {
  description = "ARN of CloudTrail role"
  value       = aws_iam_role.cloudtrail_role.arn
}

# GitHub OIDC Provider ARN
output "github_oidc_provider_arn" {
  description = "ARN of GitHub OIDC provider"
  value       = var.create_github_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : null
}