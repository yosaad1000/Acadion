# Variables for Parameter Store module

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# KMS Configuration
variable "create_kms_key" {
  description = "Whether to create a dedicated KMS key for parameter encryption"
  type        = bool
  default     = true
}

variable "kms_key_id" {
  description = "KMS key ID for parameter encryption (if not creating new key)"
  type        = string
  default     = null
}

variable "kms_deletion_window" {
  description = "KMS key deletion window in days"
  type        = number
  default     = 7
}

# Application Configuration Parameters
variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "INFO"
  validation {
    condition     = contains(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"], var.log_level)
    error_message = "Log level must be one of: DEBUG, INFO, WARNING, ERROR, CRITICAL."
  }
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
  default     = "10485760"  # 10MB
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
  default     = "3600"  # 1 hour
}

variable "cache_ttl_sessions" {
  description = "Session cache TTL in seconds"
  type        = string
  default     = "1800"  # 30 minutes
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
  default     = "3600"  # 1 hour
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

variable "redis_auth_token" {
  description = "Redis authentication token"
  type        = string
  sensitive   = true
}

variable "redis_endpoint" {
  description = "Redis endpoint URL"
  type        = string
  sensitive   = true
}

variable "s3_bucket_name" {
  description = "S3 bucket name for static assets"
  type        = string
  sensitive   = true
}

variable "cloudfront_domain" {
  description = "CloudFront distribution domain"
  type        = string
  sensitive   = true
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
}

variable "github_repository" {
  description = "GitHub repository in format 'owner/repo'"
  type        = string
  default     = ""
}