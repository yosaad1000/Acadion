# Variables for cross-region monitoring module

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "primary_region" {
  description = "Primary AWS region"
  type        = string
}

variable "dr_region" {
  description = "Disaster recovery AWS region"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Domain Configuration
variable "primary_api_domain" {
  description = "Primary region API domain for health checks"
  type        = string
}

variable "primary_app_domain" {
  description = "Primary region app domain for health checks"
  type        = string
}

variable "dr_api_domain" {
  description = "DR region API domain for health checks"
  type        = string
}

# ECS Configuration
variable "primary_cluster_name" {
  description = "Primary region ECS cluster name"
  type        = string
}

variable "dr_cluster_name" {
  description = "DR region ECS cluster name"
  type        = string
}

variable "primary_backend_service_name" {
  description = "Primary region backend service name"
  type        = string
}

variable "dr_backend_service_name" {
  description = "DR region backend service name"
  type        = string
}

variable "minimum_running_tasks" {
  description = "Minimum number of running tasks to consider healthy"
  type        = number
  default     = 1
}

# SNS Configuration
variable "primary_sns_topic_arn" {
  description = "SNS topic ARN in primary region for alerts"
  type        = string
}

variable "dr_sns_topic_arn" {
  description = "SNS topic ARN in DR region for alerts"
  type        = string
}

variable "failover_sns_topic_arn" {
  description = "SNS topic ARN for failover notifications"
  type        = string
}

# Failover Configuration
variable "failover_config_s3_path" {
  description = "S3 path to failover configuration files"
  type        = string
}

variable "enable_automated_failover" {
  description = "Enable automated failover via Lambda"
  type        = bool
  default     = false
}