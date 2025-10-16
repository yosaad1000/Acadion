# Outputs for CloudWatch Monitoring Module

output "sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "sns_topic_name" {
  description = "Name of the SNS topic for alerts"
  value       = aws_sns_topic.alerts.name
}

output "dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "log_group_names" {
  description = "Names of the CloudWatch log groups"
  value = {
    backend          = aws_cloudwatch_log_group.backend.name
    frontend         = aws_cloudwatch_log_group.frontend.name
    face_recognition = aws_cloudwatch_log_group.face_recognition.name
  }
}

output "alarm_names" {
  description = "Names of all CloudWatch alarms"
  value = [
    aws_cloudwatch_metric_alarm.backend_cpu_high.alarm_name,
    aws_cloudwatch_metric_alarm.backend_memory_high.alarm_name,
    aws_cloudwatch_metric_alarm.face_recognition_cpu_high.alarm_name,
    aws_cloudwatch_metric_alarm.alb_response_time_high.alarm_name,
    aws_cloudwatch_metric_alarm.alb_5xx_errors.alarm_name,
    aws_cloudwatch_metric_alarm.elasticache_cpu_high.alarm_name,
    aws_cloudwatch_metric_alarm.elasticache_memory_high.alarm_name,
    aws_cloudwatch_metric_alarm.face_recognition_queue_length.alarm_name
  ]
}