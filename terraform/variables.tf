# Variables for Terraform configuration

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "acadion"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "enable_vpn_gateway" {
  description = "Enable VPN Gateway"
  type        = bool
  default     = false
}

# ECS Configuration
variable "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
  default     = "acadion-cluster"
}

# ElastiCache Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.r6g.large"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in the Redis cluster"
  type        = number
  default     = 3
}

# Application Configuration
variable "backend_cpu" {
  description = "CPU units for backend service"
  type        = number
  default     = 1024
}

variable "backend_memory" {
  description = "Memory for backend service"
  type        = number
  default     = 2048
}

variable "frontend_cpu" {
  description = "CPU units for frontend service"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Memory for frontend service"
  type        = number
  default     = 512
}

variable "face_recognition_cpu" {
  description = "CPU units for face recognition service"
  type        = number
  default     = 2048
}

variable "face_recognition_memory" {
  description = "Memory for face recognition service"
  type        = number
  default     = 4096
}

variable "github_repository" {
  description = "GitHub repository in format 'owner/repo'"
  type        = string
}

# Parameter Store Configuration
variable "create_parameter_store_kms_key" {
  description = "Whether to create a dedicated KMS key for parameter store encryption"
  type        = bool
  default     = true
}

variable "parameter_store_kms_deletion_window" {
  description = "KMS key deletion window in days for parameter store"
  type        = number
  default     = 7
}

# Application Configuration Parameters
variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "INFO"
}

variable "debug_mode" {
  description = "Enable debug mode"
  type        = string
  default     = "false"
}

variable "cors_origins" {
  description = "Allowed CORS origins (comma-separated)"
  type        = string
  default     = "*"
}

variable "max_upload_size" {
  description = "Maximum upload size in bytes"
  type        = string
  default     = "10485760"
}

# Database Configuration
variable "database_pool_size" {
  description = "Database connection pool size"
  type        = string
  default     = "20"
}

variable "database_pool_timeout" {
  description = "Database connection pool timeout in seconds"
  type        = string
  default     = "30"
}

variable "database_max_overflow" {
  description = "Database connection pool max overflow"
  type        = string
  default     = "30"
}

# Face Recognition Configuration
variable "face_threshold" {
  description = "Face recognition similarity threshold"
  type        = string
  default     = "0.6"
}

variable "max_faces_per_image" {
  description = "Maximum number of faces to process per image"
  type        = string
  default     = "50"
}

variable "face_processing_timeout" {
  description = "Face processing timeout in seconds"
  type        = string
  default     = "30"
}

# Cache Configuration
variable "cache_ttl_default" {
  description = "Default cache TTL in seconds"
  type        = string
  default     = "3600"
}

variable "cache_ttl_sessions" {
  description = "Session cache TTL in seconds"
  type        = string
  default     = "1800"
}

variable "cache_max_connections" {
  description = "Maximum Redis connections"
  type        = string
  default     = "100"
}

# Security Configuration
variable "jwt_algorithm" {
  description = "JWT signing algorithm"
  type        = string
  default     = "HS256"
}

variable "session_timeout" {
  description = "Session timeout in seconds"
  type        = string
  default     = "3600"
}

variable "rate_limit_requests" {
  description = "Rate limit requests per window"
  type        = string
  default     = "100"
}

variable "rate_limit_window" {
  description = "Rate limit window in seconds"
  type        = string
  default     = "60"
}

# Secure Parameters (Secrets)
variable "jwt_secret_key" {
  description = "JWT secret key for token signing"
  type        = string
  sensitive   = true
}

variable "encryption_key" {
  description = "Application encryption key"
  type        = string
  sensitive   = true
}

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
  sensitive   = true
}

variable "supabase_key" {
  description = "Supabase anon key"
  type        = string
  sensitive   = true
}

variable "supabase_service_key" {
  description = "Supabase service role key"
  type        = string
  sensitive   = true
}

variable "pinecone_api_key" {
  description = "Pinecone API key"
  type        = string
  sensitive   = true
}

variable "pinecone_environment" {
  description = "Pinecone environment"
  type        = string
  sensitive   = true
}

variable "pinecone_index_name" {
  description = "Pinecone index name"
  type        = string
  sensitive   = true
}

variable "cloudfront_domain" {
  description = "CloudFront distribution domain"
  type        = string
  default     = ""
}

# IAM Configuration
variable "create_github_actions_role" {
  description = "Whether to create IAM role for GitHub Actions"
  type        = bool
  default     = false
}

variable "github_actions_role_arn" {
  description = "ARN of the GitHub Actions OIDC provider"
  type        = string
  default     = ""
}# Mon
itoring Configuration
variable "alert_email_addresses" {
  description = "List of email addresses to receive CloudWatch alerts"
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

# Monitoring Thresholds
variable "cpu_threshold" {
  description = "CPU utilization threshold for alarms (%)"
  type        = number
  default     = 80
}

variable "memory_threshold" {
  description = "Memory utilization threshold for alarms (%)"
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
}vari
able "critical_alert_email_addresses" {
  description = "List of email addresses to receive critical alerts (escalation)"
  type        = list(string)
  default     = []
}

variable "enable_lambda_alert_processor" {
  description = "Enable Lambda function for advanced alert processing"
  type        = bool
  default     = false
}

# Backup and Disaster Recovery Configuration
variable "disaster_recovery_region" {
  description = "AWS region for disaster recovery"
  type        = string
  default     = "us-west-2"
}

variable "enable_cross_region_replication" {
  description = "Enable S3 cross-region replication for disaster recovery"
  type        = bool
  default     = false
}

variable "backup_notification_emails" {
  description = "List of email addresses to receive backup notifications"
  type        = list(string)
  default     = []
}

variable "terraform_state_bucket" {
  description = "S3 bucket name containing Terraform state files"
  type        = string
}

variable "enable_config_drift_detection" {
  description = "Enable AWS Config for configuration drift detection"
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