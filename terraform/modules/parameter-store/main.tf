# AWS Systems Manager Parameter Store Configuration
# This module creates parameters for different environments with proper hierarchy

# Local values for parameter naming
locals {
  parameter_prefix = "/${var.environment}/${var.project_name}"
  
  # Common parameters for all environments
  common_parameters = {
    # Application configuration
    "app/log-level"           = var.log_level
    "app/debug-mode"          = var.debug_mode
    "app/cors-origins"        = var.cors_origins
    "app/max-upload-size"     = var.max_upload_size
    
    # Database configuration
    "database/pool-size"      = var.database_pool_size
    "database/pool-timeout"   = var.database_pool_timeout
    "database/max-overflow"   = var.database_max_overflow
    
    # Face recognition configuration
    "face-recognition/threshold"     = var.face_threshold
    "face-recognition/max-faces"     = var.max_faces_per_image
    "face-recognition/timeout"       = var.face_processing_timeout
    
    # Cache configuration
    "cache/ttl-default"       = var.cache_ttl_default
    "cache/ttl-sessions"      = var.cache_ttl_sessions
    "cache/max-connections"   = var.cache_max_connections
    
    # Security configuration
    "security/jwt-algorithm"  = var.jwt_algorithm
    "security/session-timeout" = var.session_timeout
    "security/rate-limit-requests" = var.rate_limit_requests
    "security/rate-limit-window" = var.rate_limit_window
  }
  
  # Secure parameters (encrypted)
  secure_parameters = {
    # JWT and encryption keys
    "secrets/jwt-secret-key"     = var.jwt_secret_key
    "secrets/encryption-key"     = var.encryption_key
    
    # External service credentials
    "secrets/supabase-url"       = var.supabase_url
    "secrets/supabase-key"       = var.supabase_key
    "secrets/supabase-service-key" = var.supabase_service_key
    "secrets/pinecone-api-key"   = var.pinecone_api_key
    "secrets/pinecone-environment" = var.pinecone_environment
    "secrets/pinecone-index-name" = var.pinecone_index_name
    
    # Redis configuration
    "secrets/redis-auth-token"   = var.redis_auth_token
    "secrets/redis-endpoint"     = var.redis_endpoint
    
    # AWS service credentials (if needed)
    "secrets/s3-bucket-name"     = var.s3_bucket_name
    "secrets/cloudfront-domain"  = var.cloudfront_domain
  }
}

# Create standard (non-encrypted) parameters
resource "aws_ssm_parameter" "app_parameters" {
  for_each = local.common_parameters
  
  name        = "${local.parameter_prefix}/${each.key}"
  description = "Application parameter for ${each.key}"
  type        = "String"
  value       = each.value
  
  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-${var.environment}-${replace(each.key, "/", "-")}"
    Type        = "Configuration"
    Sensitive   = "false"
  })
}

# Create secure (encrypted) parameters
resource "aws_ssm_parameter" "secure_parameters" {
  for_each = local.secure_parameters
  
  name        = "${local.parameter_prefix}/${each.key}"
  description = "Secure parameter for ${each.key}"
  type        = "SecureString"
  value       = each.value
  key_id      = var.kms_key_id != null ? var.kms_key_id : "alias/aws/ssm"
  
  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-${var.environment}-${replace(each.key, "/", "-")}"
    Type        = "Secret"
    Sensitive   = "true"
  })
}

# Create KMS key for parameter encryption (optional)
resource "aws_kms_key" "parameter_store_key" {
  count = var.create_kms_key ? 1 : 0
  
  description             = "KMS key for ${var.project_name} ${var.environment} Parameter Store encryption"
  deletion_window_in_days = var.kms_deletion_window
  enable_key_rotation     = true
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow Parameter Store access"
        Effect = "Allow"
        Principal = {
          Service = "ssm.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })
  
  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-parameter-store-key"
    Type = "KMS"
  })
}

# KMS key alias
resource "aws_kms_alias" "parameter_store_key_alias" {
  count = var.create_kms_key ? 1 : 0
  
  name          = "alias/${var.project_name}-${var.environment}-parameter-store"
  target_key_id = aws_kms_key.parameter_store_key[0].key_id
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}