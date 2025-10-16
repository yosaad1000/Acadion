# Outputs for Lambda Module

output "function_name" {
  description = "Name of the face recognition Lambda function"
  value       = aws_lambda_function.face_recognition.function_name
}

output "function_arn" {
  description = "ARN of the face recognition Lambda function"
  value       = aws_lambda_function.face_recognition.arn
}

output "function_invoke_arn" {
  description = "Invoke ARN of the face recognition Lambda function"
  value       = aws_lambda_function.face_recognition.invoke_arn
}

output "function_version" {
  description = "Version of the face recognition Lambda function"
  value       = aws_lambda_function.face_recognition.version
}

output "function_qualified_arn" {
  description = "Qualified ARN of the face recognition Lambda function"
  value       = aws_lambda_function.face_recognition.qualified_arn
}

output "health_check_function_name" {
  description = "Name of the health check Lambda function"
  value       = aws_lambda_function.health_check.function_name
}

output "health_check_function_arn" {
  description = "ARN of the health check Lambda function"
  value       = aws_lambda_function.health_check.arn
}

output "alias_name" {
  description = "Name of the Lambda alias"
  value       = aws_lambda_alias.face_recognition_live.name
}

output "alias_arn" {
  description = "ARN of the Lambda alias"
  value       = aws_lambda_alias.face_recognition_live.arn
}

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda_logs.name
}

output "log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda_logs.arn
}

output "health_check_log_group_name" {
  description = "Name of the health check CloudWatch log group"
  value       = aws_cloudwatch_log_group.health_check_logs.name
}

output "layer_arn" {
  description = "ARN of the Lambda layer"
  value       = var.create_layer ? aws_lambda_layer_version.common_dependencies[0].arn : null
}

output "layer_version" {
  description = "Version of the Lambda layer"
  value       = var.create_layer ? aws_lambda_layer_version.common_dependencies[0].version : null
}

output "event_source_mapping_uuid" {
  description = "UUID of the SQS event source mapping"
  value       = aws_lambda_event_source_mapping.sqs_trigger.uuid
}

output "cloudwatch_event_rule_arn" {
  description = "ARN of the CloudWatch event rule for health checks"
  value       = aws_cloudwatch_event_rule.health_check_schedule.arn
}