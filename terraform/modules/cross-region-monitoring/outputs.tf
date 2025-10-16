# Outputs for cross-region monitoring module

# Health Check outputs
output "primary_api_health_check_id" {
  description = "ID of the primary API health check"
  value       = aws_route53_health_check.primary_api.id
}

output "primary_app_health_check_id" {
  description = "ID of the primary app health check"
  value       = aws_route53_health_check.primary_app.id
}

output "dr_api_health_check_id" {
  description = "ID of the DR API health check"
  value       = aws_route53_health_check.dr_api.id
}

# CloudWatch Alarm outputs
output "primary_api_health_alarm_name" {
  description = "Name of the primary API health alarm"
  value       = aws_cloudwatch_metric_alarm.primary_api_health.alarm_name
}

output "primary_app_health_alarm_name" {
  description = "Name of the primary app health alarm"
  value       = aws_cloudwatch_metric_alarm.primary_app_health.alarm_name
}

output "primary_ecs_services_alarm_name" {
  description = "Name of the primary ECS services alarm"
  value       = aws_cloudwatch_metric_alarm.primary_ecs_services.alarm_name
}

output "dr_api_health_alarm_name" {
  description = "Name of the DR API health alarm"
  value       = aws_cloudwatch_metric_alarm.dr_api_health.alarm_name
}

output "dr_readiness_alarm_name" {
  description = "Name of the DR readiness alarm"
  value       = aws_cloudwatch_metric_alarm.dr_readiness.alarm_name
}

# Composite Alarm outputs
output "primary_region_down_alarm_name" {
  description = "Name of the composite alarm for primary region down"
  value       = aws_cloudwatch_composite_alarm.primary_region_down.alarm_name
}

# Dashboard outputs
output "cross_region_dashboard_name" {
  description = "Name of the cross-region monitoring dashboard"
  value       = aws_cloudwatch_dashboard.cross_region_monitoring.dashboard_name
}

output "cross_region_dashboard_url" {
  description = "URL of the cross-region monitoring dashboard"
  value       = "https://${var.primary_region}.console.aws.amazon.com/cloudwatch/home?region=${var.primary_region}#dashboards:name=${aws_cloudwatch_dashboard.cross_region_monitoring.dashboard_name}"
}

# Lambda outputs
output "failover_trigger_lambda_function_name" {
  description = "Name of the failover trigger Lambda function"
  value       = aws_lambda_function.failover_trigger.function_name
}

output "failover_trigger_lambda_function_arn" {
  description = "ARN of the failover trigger Lambda function"
  value       = aws_lambda_function.failover_trigger.arn
}