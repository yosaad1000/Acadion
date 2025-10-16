# Variables for SQS Module

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "backend_role_arn" {
  description = "ARN of the backend IAM role for SQS access"
  type        = string
  default     = ""
}

variable "lambda_role_arn" {
  description = "ARN of the Lambda IAM role for SQS access"
  type        = string
  default     = ""
}

variable "create_notification_queue" {
  description = "Whether to create a notification queue"
  type        = bool
  default     = false
}

variable "create_batch_queue" {
  description = "Whether to create a batch processing queue"
  type        = bool
  default     = false
}

variable "alarm_actions" {
  description = "List of ARNs for CloudWatch alarm actions"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}