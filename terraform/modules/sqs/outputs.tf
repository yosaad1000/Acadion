# Outputs for SQS Module

output "queue_url" {
  description = "URL of the face processing SQS queue"
  value       = aws_sqs_queue.face_processing.url
}

output "queue_arn" {
  description = "ARN of the face processing SQS queue"
  value       = aws_sqs_queue.face_processing.arn
}

output "queue_name" {
  description = "Name of the face processing SQS queue"
  value       = aws_sqs_queue.face_processing.name
}

output "dlq_url" {
  description = "URL of the dead letter queue"
  value       = aws_sqs_queue.face_processing_dlq.url
}

output "dlq_arn" {
  description = "ARN of the dead letter queue"
  value       = aws_sqs_queue.face_processing_dlq.arn
}

output "dlq_name" {
  description = "Name of the dead letter queue"
  value       = aws_sqs_queue.face_processing_dlq.name
}

output "notification_queue_url" {
  description = "URL of the notification SQS queue"
  value       = var.create_notification_queue ? aws_sqs_queue.notifications[0].url : null
}

output "notification_queue_arn" {
  description = "ARN of the notification SQS queue"
  value       = var.create_notification_queue ? aws_sqs_queue.notifications[0].arn : null
}

output "notification_dlq_url" {
  description = "URL of the notification dead letter queue"
  value       = var.create_notification_queue ? aws_sqs_queue.notifications_dlq[0].url : null
}

output "notification_dlq_arn" {
  description = "ARN of the notification dead letter queue"
  value       = var.create_notification_queue ? aws_sqs_queue.notifications_dlq[0].arn : null
}

output "batch_queue_url" {
  description = "URL of the batch processing SQS queue"
  value       = var.create_batch_queue ? aws_sqs_queue.batch_processing[0].url : null
}

output "batch_queue_arn" {
  description = "ARN of the batch processing SQS queue"
  value       = var.create_batch_queue ? aws_sqs_queue.batch_processing[0].arn : null
}

output "batch_dlq_url" {
  description = "URL of the batch processing dead letter queue"
  value       = var.create_batch_queue ? aws_sqs_queue.batch_processing_dlq[0].url : null
}

output "batch_dlq_arn" {
  description = "ARN of the batch processing dead letter queue"
  value       = var.create_batch_queue ? aws_sqs_queue.batch_processing_dlq[0].arn : null
}