# Outputs for Parameter Store module

output "parameter_prefix" {
  description = "The parameter prefix used for this environment"
  value       = local.parameter_prefix
}

output "kms_key_id" {
  description = "KMS key ID used for parameter encryption"
  value       = var.create_kms_key ? aws_kms_key.parameter_store_key[0].key_id : var.kms_key_id
}

output "kms_key_arn" {
  description = "KMS key ARN used for parameter encryption"
  value       = var.create_kms_key ? aws_kms_key.parameter_store_key[0].arn : null
}

output "parameter_names" {
  description = "List of all parameter names created"
  value = concat(
    [for k, v in aws_ssm_parameter.app_parameters : v.name],
    [for k, v in aws_ssm_parameter.secure_parameters : v.name]
  )
}

output "app_parameter_names" {
  description = "List of application parameter names"
  value = [for k, v in aws_ssm_parameter.app_parameters : v.name]
}

output "secure_parameter_names" {
  description = "List of secure parameter names"
  value = [for k, v in aws_ssm_parameter.secure_parameters : v.name]
}

# Output parameter ARNs for IAM policy creation
output "parameter_arns" {
  description = "ARNs of all parameters for IAM policy creation"
  value = concat(
    [for k, v in aws_ssm_parameter.app_parameters : v.arn],
    [for k, v in aws_ssm_parameter.secure_parameters : v.arn]
  )
}

# Specific parameter paths for application use
output "parameter_paths" {
  description = "Parameter paths organized by category"
  value = {
    app_config = {
      log_level        = "${local.parameter_prefix}/app/log-level"
      debug_mode       = "${local.parameter_prefix}/app/debug-mode"
      cors_origins     = "${local.parameter_prefix}/app/cors-origins"
      max_upload_size  = "${local.parameter_prefix}/app/max-upload-size"
    }
    
    database = {
      pool_size     = "${local.parameter_prefix}/database/pool-size"
      pool_timeout  = "${local.parameter_prefix}/database/pool-timeout"
      max_overflow  = "${local.parameter_prefix}/database/max-overflow"
    }
    
    face_recognition = {
      threshold = "${local.parameter_prefix}/face-recognition/threshold"
      max_faces = "${local.parameter_prefix}/face-recognition/max-faces"
      timeout   = "${local.parameter_prefix}/face-recognition/timeout"
    }
    
    cache = {
      ttl_default      = "${local.parameter_prefix}/cache/ttl-default"
      ttl_sessions     = "${local.parameter_prefix}/cache/ttl-sessions"
      max_connections  = "${local.parameter_prefix}/cache/max-connections"
    }
    
    security = {
      jwt_algorithm       = "${local.parameter_prefix}/security/jwt-algorithm"
      session_timeout     = "${local.parameter_prefix}/security/session-timeout"
      rate_limit_requests = "${local.parameter_prefix}/security/rate-limit-requests"
      rate_limit_window   = "${local.parameter_prefix}/security/rate-limit-window"
    }
    
    secrets = {
      jwt_secret_key        = "${local.parameter_prefix}/secrets/jwt-secret-key"
      encryption_key        = "${local.parameter_prefix}/secrets/encryption-key"
      supabase_url          = "${local.parameter_prefix}/secrets/supabase-url"
      supabase_key          = "${local.parameter_prefix}/secrets/supabase-key"
      supabase_service_key  = "${local.parameter_prefix}/secrets/supabase-service-key"
      pinecone_api_key      = "${local.parameter_prefix}/secrets/pinecone-api-key"
      pinecone_environment  = "${local.parameter_prefix}/secrets/pinecone-environment"
      pinecone_index_name   = "${local.parameter_prefix}/secrets/pinecone-index-name"
      redis_auth_token      = "${local.parameter_prefix}/secrets/redis-auth-token"
      redis_endpoint        = "${local.parameter_prefix}/secrets/redis-endpoint"
      s3_bucket_name        = "${local.parameter_prefix}/secrets/s3-bucket-name"
      cloudfront_domain     = "${local.parameter_prefix}/secrets/cloudfront-domain"
    }
  }
}

# IAM Outputs
output "ecs_task_role_arn" {
  description = "ARN of the ECS task role for parameter access"
  value       = aws_iam_role.ecs_task_parameter_role.arn
}

output "ecs_task_role_name" {
  description = "Name of the ECS task role for parameter access"
  value       = aws_iam_role.ecs_task_parameter_role.name
}

output "parameter_store_read_policy_arn" {
  description = "ARN of the parameter store read policy"
  value       = aws_iam_policy.parameter_store_read_policy.arn
}

output "parameter_store_admin_policy_arn" {
  description = "ARN of the parameter store admin policy"
  value       = aws_iam_policy.parameter_store_admin_policy.arn
}

output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions role for parameter access"
  value       = var.create_github_actions_role ? aws_iam_role.github_actions_parameter_role[0].arn : null
}