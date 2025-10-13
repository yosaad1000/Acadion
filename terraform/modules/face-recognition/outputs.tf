# Face Recognition Microservice Outputs

output "ecr_repository_url" {
  description = "URL of the ECR repository for face recognition service"
  value       = aws_ecr_repository.face_recognition.repository_url
}

output "ecr_repository_arn" {
  description = "ARN of the ECR repository"
  value       = aws_ecr_repository.face_recognition.arn
}

output "ecs_cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.face_recognition.id
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.face_recognition.arn
}

output "ecs_service_id" {
  description = "ID of the ECS service"
  value       = aws_ecs_service.face_recognition.id
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.face_recognition.name
}

output "task_definition_arn" {
  description = "ARN of the ECS task definition"
  value       = aws_ecs_task_definition.face_recognition.arn
}

output "security_group_id" {
  description = "ID of the face recognition security group"
  value       = aws_security_group.face_recognition.id
}

output "target_group_arn" {
  description = "ARN of the ALB target group"
  value       = aws_lb_target_group.face_recognition.arn
}

output "internal_load_balancer_dns" {
  description = "DNS name of the internal load balancer"
  value       = aws_lb.face_recognition_internal.dns_name
}

output "internal_load_balancer_arn" {
  description = "ARN of the internal load balancer"
  value       = aws_lb.face_recognition_internal.arn
}

output "service_discovery_service_arn" {
  description = "ARN of the service discovery service"
  value       = aws_service_discovery_service.face_recognition.arn
}

output "service_discovery_namespace_id" {
  description = "ID of the service discovery namespace"
  value       = aws_service_discovery_private_dns_namespace.face_recognition.id
}

output "auto_scaling_group_arn" {
  description = "ARN of the Auto Scaling Group"
  value       = aws_autoscaling_group.face_recognition_gpu.arn
}

output "launch_template_id" {
  description = "ID of the launch template"
  value       = aws_launch_template.face_recognition_gpu.id
}

output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.face_recognition.name
}

output "cloudwatch_log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.face_recognition.arn
}

output "task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.face_recognition_task.arn
}

output "instance_role_arn" {
  description = "ARN of the EC2 instance role"
  value       = aws_iam_role.face_recognition_instance.arn
}

output "capacity_provider_name" {
  description = "Name of the ECS capacity provider"
  value       = aws_ecs_capacity_provider.face_recognition_gpu.name
}

# Service endpoints
output "service_url" {
  description = "Internal service URL for face recognition"
  value       = "http://${aws_lb.face_recognition_internal.dns_name}:8001"
}

output "service_discovery_url" {
  description = "Service discovery URL"
  value       = "http://face-recognition.${aws_service_discovery_private_dns_namespace.face_recognition.name}:8001"
}

# Monitoring outputs
output "cpu_alarm_arn" {
  description = "ARN of the CPU utilization alarm"
  value       = aws_cloudwatch_metric_alarm.face_recognition_cpu_high.arn
}

output "memory_alarm_arn" {
  description = "ARN of the memory utilization alarm"
  value       = aws_cloudwatch_metric_alarm.face_recognition_memory_high.arn
}

output "auto_scaling_target_resource_id" {
  description = "Resource ID of the auto scaling target"
  value       = aws_appautoscaling_target.face_recognition.resource_id
}