# Variables for storage module with encryption

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# KMS Configuration
variable "kms_deletion_window" {
  description = "KMS key deletion window in days"
  type        = number
  default     = 7
}

# ECS Role ARNs for KMS access
variable "ecs_task_role_arn" {
  description = "ARN of ECS task role"
  type        = string
}

variable "ecs_execution_role_arn" {
  description = "ARN of ECS execution role"
  type        = string
}

# Network Configuration
variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "elasticache_security_group_id" {
  description = "Security group ID for ElastiCache"
  type        = string
}

variable "efs_security_group_id" {
  description = "Security group ID for EFS"
  type        = string
}

# ElastiCache Redis Configuration
variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "redis_node_type" {
  description = "Redis node type"
  type        = string
  default     = "cache.r6g.large"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in Redis cluster"
  type        = number
  default     = 2
}

variable "redis_auth_token" {
  description = "Auth token for Redis (must be 16-128 characters)"
  type        = string
  sensitive   = true
}

variable "redis_snapshot_retention_limit" {
  description = "Number of days to retain Redis snapshots"
  type        = number
  default     = 7
}

variable "redis_snapshot_window" {
  description = "Daily time range for Redis snapshots (UTC)"
  type        = string
  default     = "03:00-05:00"
}

variable "redis_maintenance_window" {
  description = "Weekly time range for Redis maintenance (UTC)"
  type        = string
  default     = "sun:05:00-sun:07:00"
}

# EFS Configuration
variable "efs_performance_mode" {
  description = "EFS performance mode"
  type        = string
  default     = "generalPurpose"
  validation {
    condition     = contains(["generalPurpose", "maxIO"], var.efs_performance_mode)
    error_message = "EFS performance mode must be either 'generalPurpose' or 'maxIO'."
  }
}

variable "efs_throughput_mode" {
  description = "EFS throughput mode"
  type        = string
  default     = "bursting"
  validation {
    condition     = contains(["bursting", "provisioned"], var.efs_throughput_mode)
    error_message = "EFS throughput mode must be either 'bursting' or 'provisioned'."
  }
}

variable "efs_provisioned_throughput" {
  description = "EFS provisioned throughput in MiB/s (only used when throughput_mode is provisioned)"
  type        = number
  default     = null
}

variable "efs_transition_to_ia" {
  description = "EFS lifecycle policy for transitioning to Infrequent Access"
  type        = string
  default     = "AFTER_30_DAYS"
  validation {
    condition = contains([
      "AFTER_7_DAYS", "AFTER_14_DAYS", "AFTER_30_DAYS", 
      "AFTER_60_DAYS", "AFTER_90_DAYS"
    ], var.efs_transition_to_ia)
    error_message = "Invalid EFS IA transition period."
  }
}

variable "efs_transition_to_primary" {
  description = "EFS lifecycle policy for transitioning back to primary storage"
  type        = string
  default     = "AFTER_1_ACCESS"
  validation {
    condition = contains([
      "AFTER_1_ACCESS"
    ], var.efs_transition_to_primary)
    error_message = "Invalid EFS primary transition policy."
  }
}

# S3 Configuration
variable "s3_bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
}

# SNS Topic for notifications
variable "sns_topic_arn" {
  description = "ARN of SNS topic for notifications"
  type        = string
}

# Backup and Disaster Recovery Configuration
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "enable_cross_region_replication" {
  description = "Enable S3 cross-region replication for disaster recovery"
  type        = bool
  default     = false
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 365
}

variable "backup_cold_storage_days" {
  description = "Number of days before moving backups to cold storage"
  type        = number
  default     = 30
}

variable "weekly_backup_retention_days" {
  description = "Number of days to retain weekly backups"
  type        = number
  default     = 2555  # 7 years
}