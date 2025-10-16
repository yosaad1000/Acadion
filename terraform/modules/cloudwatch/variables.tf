# Variables for CloudWatch Module

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "ec2_instance_id" {
  description = "ID of the EC2 instance to monitor"
  type        = string
}

variable "lambda_function_name" {
  description = "Name of the Lambda function to monitor"
  type        = string
}

variable "create_sns_topic" {
  description = "Whether to create SNS topic for alarm notifications"
  type        = bool
  default     = true
}

variable "alert_email" {
  description = "Email address for alarm notifications"
  type        = string
  default     = ""
}

variable "alarm_actions" {
  description = "List of ARNs for alarm actions"
  type        = list(string)
  default     = []
}

variable "enable_billing_alerts" {
  description = "Whether to enable billing alerts"
  type        = bool
  default     = true
}

variable "billing_alert_threshold" {
  description = "Threshold for billing alerts in USD"
  type        = number
  default     = 10
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}