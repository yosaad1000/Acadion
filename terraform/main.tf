# Main Terraform configuration for Acadion AWS deployment
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "Acadion"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Provider for disaster recovery region
provider "aws" {
  alias  = "dr"
  region = var.disaster_recovery_region
  
  default_tags {
    tags = {
      Project     = "Acadion"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Purpose     = "DisasterRecovery"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

# Local values
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  azs         = slice(data.aws_availability_zones.available.names, 0, 3)
  
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Generate Redis auth token
resource "random_password" "redis_auth_token" {
  length  = 32
  special = true
}

# Networking Module
module "networking" {
  source = "./modules/networking"

  name_prefix        = local.name_prefix
  vpc_cidr          = var.vpc_cidr
  availability_zones = local.azs
  enable_nat_gateway = var.enable_nat_gateway
  aws_region        = var.aws_region
  common_tags       = local.common_tags
}

# ECR Module
module "ecr" {
  source = "./modules/ecr"

  name_prefix                = local.name_prefix
  sns_topic_arn             = aws_sns_topic.backup_notifications.arn
  enable_deployment_tracking = true
  retention_policy = {
    prod_images    = 10
    staging_images = 5
    untagged_days  = 1
  }
  common_tags = local.common_tags
}

# Storage Module
module "storage" {
  source = "./modules/storage"
  
  providers = {
    aws.replica = aws.dr
  }

  name_prefix                   = local.name_prefix
  private_subnet_ids           = module.networking.private_subnet_ids
  elasticache_security_group_id = module.networking.elasticache_security_group_id
  efs_security_group_id        = module.networking.efs_security_group_id
  ecs_task_role_arn            = module.parameter_store.ecs_task_role_arn
  ecs_execution_role_arn       = module.parameter_store.ecs_execution_role_arn
  aws_region                   = var.aws_region
  redis_node_type              = var.redis_node_type
  redis_num_cache_nodes        = var.redis_num_cache_nodes
  redis_auth_token             = random_password.redis_auth_token.result
  github_repository            = var.github_repository
  s3_bucket_name               = "${local.name_prefix}-static-assets"
  sns_topic_arn                = aws_sns_topic.backup_notifications.arn
  environment                  = var.environment
  enable_cross_region_replication = var.enable_cross_region_replication
  backup_retention_days        = var.backup_retention_days
  backup_cold_storage_days     = var.backup_cold_storage_days
  weekly_backup_retention_days = var.weekly_backup_retention_days
  common_tags                  = local.common_tags
}

# Parameter Store Module
module "parameter_store" {
  source = "./modules/parameter-store"

  environment   = var.environment
  project_name  = var.project_name
  common_tags   = local.common_tags
  
  # KMS Configuration
  create_kms_key      = var.create_parameter_store_kms_key
  kms_deletion_window = var.parameter_store_kms_deletion_window
  
  # Application Configuration
  log_level           = var.log_level
  debug_mode          = var.debug_mode
  cors_origins        = var.cors_origins
  max_upload_size     = var.max_upload_size
  
  # Database Configuration
  database_pool_size     = var.database_pool_size
  database_pool_timeout  = var.database_pool_timeout
  database_max_overflow  = var.database_max_overflow
  
  # Face Recognition Configuration
  face_threshold           = var.face_threshold
  max_faces_per_image     = var.max_faces_per_image
  face_processing_timeout = var.face_processing_timeout
  
  # Cache Configuration
  cache_ttl_default     = var.cache_ttl_default
  cache_ttl_sessions    = var.cache_ttl_sessions
  cache_max_connections = var.cache_max_connections
  
  # Security Configuration
  jwt_algorithm          = var.jwt_algorithm
  session_timeout        = var.session_timeout
  rate_limit_requests    = var.rate_limit_requests
  rate_limit_window      = var.rate_limit_window
  
  # Secure Parameters (Secrets)
  jwt_secret_key        = var.jwt_secret_key
  encryption_key        = var.encryption_key
  supabase_url          = var.supabase_url
  supabase_key          = var.supabase_key
  supabase_service_key  = var.supabase_service_key
  pinecone_api_key      = var.pinecone_api_key
  pinecone_environment  = var.pinecone_environment
  pinecone_index_name   = var.pinecone_index_name
  redis_auth_token      = random_password.redis_auth_token.result
  redis_endpoint        = module.storage.redis_endpoint
  s3_bucket_name        = module.storage.static_assets_bucket_name
  cloudfront_domain     = var.cloudfront_domain
  
  # IAM Configuration
  create_github_actions_role = var.create_github_actions_role
  github_actions_role_arn    = var.github_actions_role_arn
  github_repository          = var.github_repository
}

# ECS Module
module "ecs" {
  source = "./modules/ecs"

  name_prefix                        = local.name_prefix
  cluster_name                       = var.ecs_cluster_name
  vpc_id                            = module.networking.vpc_id
  public_subnet_ids                 = module.networking.public_subnet_ids
  private_subnet_ids                = module.networking.private_subnet_ids
  alb_security_group_id             = module.networking.alb_security_group_id
  frontend_security_group_id        = module.networking.frontend_security_group_id
  backend_security_group_id         = module.networking.backend_security_group_id
  face_recognition_security_group_id = module.networking.face_recognition_security_group_id
  aws_region                        = var.aws_region
  environment                       = var.environment
  ecr_repository_url                = split("/", module.ecr.backend_repository_url)[0]
  redis_endpoint                    = module.storage.redis_endpoint
  efs_file_system_id               = module.storage.efs_file_system_id
  backend_cpu                      = var.backend_cpu
  backend_memory                   = var.backend_memory
  frontend_cpu                     = var.frontend_cpu
  frontend_memory                  = var.frontend_memory
  face_recognition_cpu             = var.face_recognition_cpu
  face_recognition_memory          = var.face_recognition_memory
  common_tags                      = local.common_tags
  
  # Parameter Store Integration
  parameter_store_task_role_arn = module.parameter_store.ecs_task_role_arn
}

# Monitoring Module
module "monitoring" {
  source = "./modules/monitoring"

  environment            = var.environment
  aws_region            = var.aws_region
  ecs_cluster_name      = var.ecs_cluster_name
  alb_arn_suffix        = module.ecs.alb_arn_suffix
  elasticache_cluster_id = module.storage.redis_cluster_id
  alert_email_addresses = var.alert_email_addresses
  slack_webhook_url     = var.slack_webhook_url
  log_retention_days    = var.log_retention_days
  
  # Configurable thresholds
  cpu_threshold                      = var.cpu_threshold
  memory_threshold                   = var.memory_threshold
  response_time_threshold            = var.response_time_threshold
  error_rate_threshold               = var.error_rate_threshold
  face_recognition_queue_threshold   = var.face_recognition_queue_threshold
  
  # Additional monitoring configuration
  critical_alert_email_addresses    = var.critical_alert_email_addresses
  enable_lambda_alert_processor      = var.enable_lambda_alert_processor
  efs_file_system_id                = module.storage.efs_file_system_id
}

# =============================================================================
# BACKUP AND DISASTER RECOVERY CONFIGURATION
# =============================================================================

# SNS Topic for backup notifications
resource "aws_sns_topic" "backup_notifications" {
  name = "${local.name_prefix}-backup-notifications"

  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "backup_email" {
  count     = length(var.backup_notification_emails)
  topic_arn = aws_sns_topic.backup_notifications.arn
  protocol  = "email"
  endpoint  = var.backup_notification_emails[count.index]
}

# CloudWatch Dashboard for Backup Monitoring
resource "aws_cloudwatch_dashboard" "backup_monitoring" {
  dashboard_name = "${local.name_prefix}-backup-monitoring"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/Backup", "NumberOfBackupJobsCompleted", "BackupVaultName", module.storage.backup_vault_name],
            [".", "NumberOfBackupJobsFailed", ".", "."],
            ["AWS/ElastiCache", "BackupFailed", "ReplicationGroupId", module.storage.redis_cluster_id]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Backup Job Status"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/EFS", "StorageBytes", "FileSystemId", module.storage.efs_file_system_id, "StorageClass", "Total"],
            ["AWS/S3", "BucketSizeBytes", "BucketName", module.storage.app_data_bucket_name, "StorageType", "StandardStorage"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Storage Utilization"
          period  = 86400
        }
      }
    ]
  })

  tags = local.common_tags
}

# CloudWatch Alarms for Backup Monitoring
resource "aws_cloudwatch_metric_alarm" "backup_job_failed" {
  alarm_name          = "${local.name_prefix}-backup-job-failed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "NumberOfBackupJobsFailed"
  namespace           = "AWS/Backup"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "This metric monitors failed backup jobs"
  alarm_actions       = [aws_sns_topic.backup_notifications.arn]

  dimensions = {
    BackupVaultName = module.storage.backup_vault_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "efs_backup_failed" {
  alarm_name          = "${local.name_prefix}-efs-backup-failed"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "NumberOfBackupJobsCompleted"
  namespace           = "AWS/Backup"
  period              = "86400"  # 24 hours
  statistic           = "Sum"
  threshold           = "1"
  alarm_description   = "This metric monitors if EFS backup jobs are not completing daily"
  alarm_actions       = [aws_sns_topic.backup_notifications.arn]

  dimensions = {
    BackupVaultName = module.storage.backup_vault_name
  }

  tags = local.common_tags
}