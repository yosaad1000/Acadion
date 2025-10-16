# Outputs for CloudWatch Module

output "dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = "https://${data.aws_region.current.name}.console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.name}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for alarms"
  value       = var.create_sns_topic ? aws_sns_topic.alarms[0].arn : null
}

output "sns_topic_name" {
  description = "Name of the SNS topic for alarms"
  value       = var.create_sns_topic ? aws_sns_topic.alarms[0].name : null
}

output "ec2_cpu_alarm_name" {
  description = "Name of the EC2 CPU alarm"
  value       = aws_cloudwatch_metric_alarm.ec2_cpu_high.alarm_name
}

output "ec2_status_alarm_name" {
  description = "Name of the EC2 status check alarm"
  value       = aws_cloudwatch_metric_alarm.ec2_status_check.alarm_name
}

output "lambda_errors_alarm_name" {
  description = "Name of the Lambda errors alarm"
  value       = aws_cloudwatch_metric_alarm.lambda_errors.alarm_name
}

output "lambda_duration_alarm_name" {
  description = "Name of the Lambda duration alarm"
  value       = aws_cloudwatch_metric_alarm.lambda_duration.alarm_name
}

output "application_errors_alarm_name" {
  description = "Name of the application errors alarm"
  value       = aws_cloudwatch_metric_alarm.application_errors.alarm_name
}

output "api_response_time_alarm_name" {
  description = "Name of the API response time alarm"
  value       = aws_cloudwatch_metric_alarm.api_response_time.alarm_name
}

output "system_health_alarm_name" {
  description = "Name of the system health composite alarm"
  value       = aws_cloudwatch_composite_alarm.system_health.alarm_name
}

output "billing_alarm_name" {
  description = "Name of the billing alarm"
  value       = var.enable_billing_alerts ? aws_cloudwatch_metric_alarm.estimated_charges[0].alarm_name : null
}

output "error_analysis_query_name" {
  description = "Name of the error analysis CloudWatch Insights query"
  value       = aws_cloudwatch_query_definition.error_analysis.name
}

output "performance_analysis_query_name" {
  description = "Name of the performance analysis CloudWatch Insights query"
  value       = aws_cloudwatch_query_definition.performance_analysis.name
}