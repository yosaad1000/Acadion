# Outputs for Security Module

output "backend_sg_id" {
  description = "ID of the backend security group"
  value       = aws_security_group.backend.id
}

output "lambda_sg_id" {
  description = "ID of the Lambda security group"
  value       = aws_security_group.lambda.id
}

output "alb_sg_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "database_sg_id" {
  description = "ID of the database security group"
  value       = aws_security_group.database.id
}

output "codedeploy_sg_id" {
  description = "ID of the CodeDeploy security group"
  value       = aws_security_group.codedeploy.id
}

output "backend_sg_arn" {
  description = "ARN of the backend security group"
  value       = aws_security_group.backend.arn
}

output "lambda_sg_arn" {
  description = "ARN of the Lambda security group"
  value       = aws_security_group.lambda.arn
}