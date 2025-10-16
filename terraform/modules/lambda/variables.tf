# Variables for Lambda Module

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "iam_role_arn" {
  description = "ARN of the IAM role for Lambda execution"
  type        = string
}

variable "memory_size" {
  description = "Memory size for Lambda function in MB"
  type        = number
  default     = 1024
}

variable "ecr_repository_url" {
  description = "URL of the ECR repository for Lambda container image"
  type        = string
  default     = ""
}

variable "sqs_queue_arn" {
  description = "ARN of the SQS queue for Lambda trigger"
  type        = string
  default     = ""
}

variable "dlq_arn" {
  description = "ARN of the dead letter queue"
  type        = string
  default     = ""
}

variable "vpc_config" {
  description = "VPC configuration for Lambda function"
  type = object({
    subnet_ids         = list(string)
    security_group_ids = list(string)
  })
  default = null
}

variable "create_layer" {
  description = "Whether to create a Lambda layer for common dependencies"
  type        = bool
  default     = false
}

variable "layer_zip_path" {
  description = "Path to the Lambda layer ZIP file"
  type        = string
  default     = ""
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