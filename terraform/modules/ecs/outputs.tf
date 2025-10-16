# Outputs for ECS module

output "cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

# Load Balancer outputs
output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

output "alb_arn_suffix" {
  description = "ARN suffix of the Application Load Balancer"
  value       = aws_lb.main.arn_suffix
}

output "face_recognition_nlb_dns_name" {
  description = "DNS name of the Face Recognition Network Load Balancer"
  value       = aws_lb.face_recognition.dns_name
}

# Target Group outputs
output "backend_target_group_arn" {
  description = "ARN of the backend target group"
  value       = aws_lb_target_group.backend.arn
}

output "frontend_target_group_arn" {
  description = "ARN of the frontend target group"
  value       = aws_lb_target_group.frontend.arn
}

output "face_recognition_target_group_arn" {
  description = "ARN of the face recognition target group"
  value       = aws_lb_target_group.face_recognition.arn
}

# Service outputs
output "backend_service_name" {
  description = "Name of the backend ECS service"
  value       = aws_ecs_service.backend.name
}

output "frontend_service_name" {
  description = "Name of the frontend ECS service"
  value       = aws_ecs_service.frontend.name
}

output "face_recognition_service_name" {
  description = "Name of the face recognition ECS service"
  value       = aws_ecs_service.face_recognition.name
}

# Task Definition outputs
output "backend_task_definition_arn" {
  description = "ARN of the backend task definition"
  value       = aws_ecs_task_definition.backend.arn
}

output "frontend_task_definition_arn" {
  description = "ARN of the frontend task definition"
  value       = aws_ecs_task_definition.frontend.arn
}

output "face_recognition_task_definition_arn" {
  description = "ARN of the face recognition task definition"
  value       = aws_ecs_task_definition.face_recognition.arn
}

# IAM Role outputs
output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task_role.arn
}

# Auto Scaling outputs
output "backend_autoscaling_target_resource_id" {
  description = "Resource ID of the backend auto scaling target"
  value       = aws_appautoscaling_target.backend_enhanced.resource_id
}

output "frontend_autoscaling_target_resource_id" {
  description = "Resource ID of the frontend auto scaling target"
  value       = aws_appautoscaling_target.frontend_enhanced.resource_id
}

output "face_recognition_autoscaling_target_resource_id" {
  description = "Resource ID of the face recognition auto scaling target"
  value       = aws_appautoscaling_target.face_recognition_enhanced.resource_id
}

output "autoscaling_dashboard_url" {
  description = "URL of the CloudWatch dashboard for auto scaling metrics"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.autoscaling.dashboard_name}"
}