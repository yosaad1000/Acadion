# Variables for CloudWatch Monitoring Module

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
}

variable "alb_arn_suffix" {
  description = "ARN suffix of the Application Load Balancer"
  type        = string
}

variable "elasticache_cluster_id" {
  description = "ElastiCache cluster ID"
  type        = string
}

variable "alert_email_addresses" {
  description = "List of email addresses to receive alerts"
  type        = list(string)
  default     = []
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 30
}

variable "dashboard_name" {
  description = "Name for the CloudWatch dashboard"
  type        = string
  default     = "acadion-monitoring"
}

# Alarm thresholds (configurable per environment)
variable "cpu_threshold" {
  description = "CPU utilization threshold for alarms"
  type        = number
  default     = 80
}

variable "memory_threshold" {
  description = "Memory utilization threshold for alarms"
  type        = number
  default     = 85
}

variable "response_time_threshold" {
  description = "Response time threshold in seconds"
  type        = number
  default     = 2
}

variable "error_rate_threshold" {
  description = "5XX error count threshold"
  type        = number
  default     = 10
}

variable "face_recognition_queue_threshold" {
  description = "Face recognition queue length threshold"
  type        = number
  default     = 50
}variable 
"critical_alert_email_addresses" {
  description = "List of email addresses to receive critical alerts (escalation)"
  type        = list(string)
  default     = []
}

variable "enable_lambda_alert_processor" {
  description = "Enable Lambda function for advanced alert processing"
  type        = bool
  default     = false
}

variable "efs_file_system_id" {
  description = "EFS file system ID for storage monitoring"
  type        = string
  default     = ""
}