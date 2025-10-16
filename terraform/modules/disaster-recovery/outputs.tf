# Outputs for disaster recovery module

# VPC and Networking outputs
output "dr_vpc_id" {
  description = "ID of the DR VPC"
  value       = aws_vpc.dr_vpc.id
}

output "dr_public_subnet_ids" {
  description = "IDs of the DR public subnets"
  value       = aws_subnet.dr_public[*].id
}

output "dr_private_subnet_ids" {
  description = "IDs of the DR private subnets"
  value       = aws_subnet.dr_private[*].id
}

# Security Group outputs
output "dr_alb_security_group_id" {
  description = "ID of the DR ALB security group"
  value       = aws_security_group.dr_alb.id
}

output "dr_backend_security_group_id" {
  description = "ID of the DR backend security group"
  value       = aws_security_group.dr_backend.id
}

output "dr_frontend_security_group_id" {
  description = "ID of the DR frontend security group"
  value       = aws_security_group.dr_frontend.id
}

output "dr_elasticache_security_group_id" {
  description = "ID of the DR ElastiCache security group"
  value       = aws_security_group.dr_elasticache.id
}

output "dr_efs_security_group_id" {
  description = "ID of the DR EFS security group"
  value       = aws_security_group.dr_efs.id
}

# ECS outputs
output "dr_ecs_cluster_id" {
  description = "ID of the DR ECS cluster"
  value       = aws_ecs_cluster.dr_cluster.id
}

output "dr_ecs_cluster_name" {
  description = "Name of the DR ECS cluster"
  value       = aws_ecs_cluster.dr_cluster.name
}

# Load Balancer outputs
output "dr_alb_arn" {
  description = "ARN of the DR Application Load Balancer"
  value       = aws_lb.dr_alb.arn
}

output "dr_alb_dns_name" {
  description = "DNS name of the DR Application Load Balancer"
  value       = aws_lb.dr_alb.dns_name
}

output "dr_alb_zone_id" {
  description = "Zone ID of the DR Application Load Balancer"
  value       = aws_lb.dr_alb.zone_id
}

# Target Group outputs
output "dr_backend_target_group_arn" {
  description = "ARN of the DR backend target group"
  value       = aws_lb_target_group.dr_backend.arn
}

output "dr_frontend_target_group_arn" {
  description = "ARN of the DR frontend target group"
  value       = aws_lb_target_group.dr_frontend.arn
}

# Storage outputs
output "dr_elasticache_subnet_group_name" {
  description = "Name of the DR ElastiCache subnet group"
  value       = aws_elasticache_subnet_group.dr_cache.name
}

# Monitoring outputs
output "dr_cloudwatch_log_group_name" {
  description = "Name of the DR CloudWatch log group"
  value       = aws_cloudwatch_log_group.dr_logs.name
}

output "primary_health_check_id" {
  description = "ID of the primary region health check"
  value       = aws_route53_health_check.primary_region.id
}

output "primary_health_alarm_name" {
  description = "Name of the primary region health alarm"
  value       = aws_cloudwatch_metric_alarm.primary_region_health.alarm_name
}