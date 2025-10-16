# SQS Module for Asynchronous Processing
# Creates SQS queues for face recognition job processing

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "acadion"
}

variable "visibility_timeout_seconds" {
  description = "SQS message visibility timeout in seconds"
  type        = number
  default     = 300
}

variable "message_retention_seconds" {
  description = "SQS message retention period in seconds"
  type        = number
  default     = 1209600  # 14 days
}

variable "max_receive_count" {
  description = "Maximum number of times a message can be received before moving to DLQ"
  type        = number
  default     = 3
}

variable "receive_wait_time_seconds" {
  description = "Long polling wait time in seconds"
  type        = number
  default     = 20
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Dead Letter Queue for Face Recognition
resource "aws_sqs_queue" "face_recognition_dlq" {
  name = "${var.project_name}-face-recognition-dlq-${var.environment}"

  visibility_timeout_seconds = var.visibility_timeout_seconds
  message_retention_seconds  = var.message_retention_seconds
  receive_wait_time_seconds  = 0  # No long polling for DLQ

  tags = merge(var.tags, {
    Name        = "${var.project_name}-face-recognition-dlq-${var.environment}"
    Environment = var.environment
    Service     = "face-recognition"
    Type        = "dead-letter-queue"
  })
}

# Main Face Recognition Queue
resource "aws_sqs_queue" "face_recognition_queue" {
  name = "${var.project_name}-face-recognition-${var.environment}"

  visibility_timeout_seconds = var.visibility_timeout_seconds
  message_retention_seconds  = var.message_retention_seconds
  receive_wait_time_seconds  = var.receive_wait_time_seconds

  # Dead letter queue configuration
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.face_recognition_dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  tags = merge(var.tags, {
    Name        = "${var.project_name}-face-recognition-${var.environment}"
    Environment = var.environment
    Service     = "face-recognition"
    Type        = "main-queue"
  })
}

# IAM Policy for SQS Access
resource "aws_iam_policy" "sqs_access_policy" {
  name        = "${var.project_name}-sqs-access-${var.environment}"
  description = "Policy for accessing SQS queues"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl",
          "sqs:ListQueues"
        ]
        Resource = [
          aws_sqs_queue.face_recognition_queue.arn,
          aws_sqs_queue.face_recognition_dlq.arn
        ]
      }
    ]
  })

  tags = merge(var.tags, {
    Name        = "${var.project_name}-sqs-access-${var.environment}"
    Environment = var.environment
    Service     = "sqs"
  })
}

# IAM Role for ECS Tasks
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-ecs-task-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name        = "${var.project_name}-ecs-task-role-${var.environment}"
    Environment = var.environment
    Service     = "ecs"
  })
}

# Attach SQS policy to ECS task role
resource "aws_iam_role_policy_attachment" "ecs_task_sqs_policy" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.sqs_access_policy.arn
}

# CloudWatch Log Group for SQS monitoring
resource "aws_cloudwatch_log_group" "sqs_logs" {
  name              = "/aws/sqs/${var.project_name}-${var.environment}"
  retention_in_days = 7

  tags = merge(var.tags, {
    Name        = "${var.project_name}-sqs-logs-${var.environment}"
    Environment = var.environment
    Service     = "sqs"
  })
}

# CloudWatch Alarms for Queue Monitoring
resource "aws_cloudwatch_metric_alarm" "queue_depth_alarm" {
  alarm_name          = "${var.project_name}-queue-depth-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ApproximateNumberOfVisibleMessages"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Average"
  threshold           = "100"
  alarm_description   = "This metric monitors SQS queue depth"
  alarm_actions       = []  # Add SNS topic ARN for notifications

  dimensions = {
    QueueName = aws_sqs_queue.face_recognition_queue.name
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-queue-depth-alarm-${var.environment}"
    Environment = var.environment
    Service     = "sqs"
  })
}

resource "aws_cloudwatch_metric_alarm" "dlq_messages_alarm" {
  alarm_name          = "${var.project_name}-dlq-messages-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ApproximateNumberOfVisibleMessages"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "This metric monitors messages in dead letter queue"
  alarm_actions       = []  # Add SNS topic ARN for notifications

  dimensions = {
    QueueName = aws_sqs_queue.face_recognition_dlq.name
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-dlq-messages-alarm-${var.environment}"
    Environment = var.environment
    Service     = "sqs"
  })
}

# Outputs
output "face_recognition_queue_url" {
  description = "URL of the face recognition queue"
  value       = aws_sqs_queue.face_recognition_queue.url
}

output "face_recognition_queue_arn" {
  description = "ARN of the face recognition queue"
  value       = aws_sqs_queue.face_recognition_queue.arn
}

output "face_recognition_dlq_url" {
  description = "URL of the face recognition dead letter queue"
  value       = aws_sqs_queue.face_recognition_dlq.url
}

output "face_recognition_dlq_arn" {
  description = "ARN of the face recognition dead letter queue"
  value       = aws_sqs_queue.face_recognition_dlq.arn
}

output "sqs_access_policy_arn" {
  description = "ARN of the SQS access policy"
  value       = aws_iam_policy.sqs_access_policy.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task_role.arn
}

output "queue_names" {
  description = "Names of created queues"
  value = {
    main_queue = aws_sqs_queue.face_recognition_queue.name
    dlq        = aws_sqs_queue.face_recognition_dlq.name
  }
}