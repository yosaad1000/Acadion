# Storage Resources - ElastiCache, S3, and EFS

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.name_prefix}-cache-subnet"
  subnet_ids = var.private_subnet_ids

  tags = var.common_tags
}

# ElastiCache Parameter Group
resource "aws_elasticache_parameter_group" "redis" {
  family = "redis7.x"
  name   = "${var.name_prefix}-redis-params"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  tags = var.common_tags
}

# ElastiCache Redis Cluster
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id         = "${var.name_prefix}-redis"
  description                  = "Redis cluster for Acadion application"
  
  node_type                    = var.redis_node_type
  port                         = 6379
  parameter_group_name         = aws_elasticache_parameter_group.redis.name
  
  num_cache_clusters           = var.redis_num_cache_nodes
  
  engine_version               = "7.0"
  subnet_group_name            = aws_elasticache_subnet_group.main.name
  security_group_ids           = [var.elasticache_security_group_id]
  
  at_rest_encryption_enabled   = true
  transit_encryption_enabled   = true
  auth_token                   = var.redis_auth_token
  
  automatic_failover_enabled   = true
  multi_az_enabled            = true
  
  # Backup configuration
  snapshot_retention_limit     = 7
  snapshot_window             = "03:00-05:00"
  maintenance_window          = "sun:05:00-sun:07:00"
  
  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow.name
    destination_type = "cloudwatch-logs"
    log_format      = "text"
    log_type        = "slow-log"
  }

  tags = var.common_tags
}

# CloudWatch Log Group for Redis
resource "aws_cloudwatch_log_group" "redis_slow" {
  name              = "/aws/elasticache/redis/${var.name_prefix}/slow-log"
  retention_in_days = 30

  tags = var.common_tags
}

# S3 Bucket for Static Assets
resource "aws_s3_bucket" "static_assets" {
  bucket = "${var.name_prefix}-static-assets-${random_id.bucket_suffix.hex}"

  tags = var.common_tags
}

resource "aws_s3_bucket_versioning" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_s3_bucket_public_access_block" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket for Deployment Artifacts
resource "aws_s3_bucket" "deployment_artifacts" {
  bucket = "${var.name_prefix}-deployment-artifacts-${random_id.bucket_suffix.hex}"

  tags = var.common_tags
}

resource "aws_s3_bucket_versioning" "deployment_artifacts" {
  bucket = aws_s3_bucket.deployment_artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "deployment_artifacts" {
  bucket = aws_s3_bucket.deployment_artifacts.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "deployment_artifacts" {
  bucket = aws_s3_bucket.deployment_artifacts.id

  rule {
    id     = "cleanup_old_artifacts"
    status = "Enabled"

    expiration {
      days = 90
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_s3_bucket_public_access_block" "deployment_artifacts" {
  bucket = aws_s3_bucket.deployment_artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket for Application Data (Face Images, etc.)
resource "aws_s3_bucket" "app_data" {
  bucket = "${var.name_prefix}-app-data-${random_id.bucket_suffix.hex}"

  tags = var.common_tags
}

resource "aws_s3_bucket_versioning" "app_data" {
  bucket = aws_s3_bucket.app_data.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "app_data" {
  bucket = aws_s3_bucket.app_data.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "app_data" {
  bucket = aws_s3_bucket.app_data.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_public_access_block" "app_data" {
  bucket = aws_s3_bucket.app_data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# EFS File System
resource "aws_efs_file_system" "main" {
  creation_token   = "${var.name_prefix}-efs"
  performance_mode = "generalPurpose"
  throughput_mode  = "provisioned"
  provisioned_throughput_in_mibps = 100

  encrypted = true

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }

  lifecycle_policy {
    transition_to_primary_storage_class = "AFTER_1_ACCESS"
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-efs"
  })
}

# EFS Mount Targets
resource "aws_efs_mount_target" "main" {
  count = length(var.private_subnet_ids)

  file_system_id  = aws_efs_file_system.main.id
  subnet_id       = var.private_subnet_ids[count.index]
  security_groups = [var.efs_security_group_id]
}

# EFS Access Points
resource "aws_efs_access_point" "face_recognition" {
  file_system_id = aws_efs_file_system.main.id

  posix_user {
    gid = 1000
    uid = 1000
  }

  root_directory {
    path = "/face-recognition"
    creation_info {
      owner_gid   = 1000
      owner_uid   = 1000
      permissions = "755"
    }
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-face-recognition-access-point"
  })
}

resource "aws_efs_access_point" "app_storage" {
  file_system_id = aws_efs_file_system.main.id

  posix_user {
    gid = 1000
    uid = 1000
  }

  root_directory {
    path = "/app-storage"
    creation_info {
      owner_gid   = 1000
      owner_uid   = 1000
      permissions = "755"
    }
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-app-storage-access-point"
  })
}

# Random ID for unique bucket names
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# =============================================================================
# BACKUP AND DISASTER RECOVERY CONFIGURATION
# =============================================================================

# EFS Backup Vault
resource "aws_backup_vault" "main" {
  name        = "${var.name_prefix}-backup-vault"
  kms_key_arn = aws_kms_key.backup.arn

  tags = var.common_tags
}

# KMS Key for Backup Encryption
resource "aws_kms_key" "backup" {
  description             = "KMS key for backup encryption"
  deletion_window_in_days = 7

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-backup-key"
  })
}

resource "aws_kms_alias" "backup" {
  name          = "alias/${var.name_prefix}-backup"
  target_key_id = aws_kms_key.backup.key_id
}

# IAM Role for AWS Backup
resource "aws_iam_role" "backup" {
  name = "${var.name_prefix}-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "backup" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "backup_restore" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

# EFS Backup Plan
resource "aws_backup_plan" "efs" {
  name = "${var.name_prefix}-efs-backup-plan"

  rule {
    rule_name         = "daily_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 2 * * ? *)"  # Daily at 2 AM UTC

    lifecycle {
      cold_storage_after = 30
      delete_after       = 365
    }

    recovery_point_tags = merge(var.common_tags, {
      BackupType = "Daily"
    })
  }

  rule {
    rule_name         = "weekly_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 ? * SUN *)"  # Weekly on Sunday at 3 AM UTC

    lifecycle {
      cold_storage_after = 90
      delete_after       = 2555  # 7 years
    }

    recovery_point_tags = merge(var.common_tags, {
      BackupType = "Weekly"
    })
  }

  tags = var.common_tags
}

# Backup Selection for EFS
resource "aws_backup_selection" "efs" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "${var.name_prefix}-efs-backup-selection"
  plan_id      = aws_backup_plan.efs.id

  resources = [
    aws_efs_file_system.main.arn
  ]

  condition {
    string_equals {
      key   = "aws:ResourceTag/Environment"
      value = var.environment
    }
  }
}

# S3 Cross-Region Replication Configuration
# Destination bucket in different region for disaster recovery
resource "aws_s3_bucket" "app_data_replica" {
  count    = var.enable_cross_region_replication ? 1 : 0
  provider = aws.replica
  bucket   = "${var.name_prefix}-app-data-replica-${random_id.bucket_suffix.hex}"

  tags = merge(var.common_tags, {
    Purpose = "DisasterRecovery"
  })
}

resource "aws_s3_bucket_versioning" "app_data_replica" {
  count    = var.enable_cross_region_replication ? 1 : 0
  provider = aws.replica
  bucket   = aws_s3_bucket.app_data_replica[0].id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "app_data_replica" {
  count    = var.enable_cross_region_replication ? 1 : 0
  provider = aws.replica
  bucket   = aws_s3_bucket.app_data_replica[0].id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

# IAM Role for S3 Replication
resource "aws_iam_role" "s3_replication" {
  count = var.enable_cross_region_replication ? 1 : 0
  name  = "${var.name_prefix}-s3-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_policy" "s3_replication" {
  count = var.enable_cross_region_replication ? 1 : 0
  name  = "${var.name_prefix}-s3-replication-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = "${aws_s3_bucket.app_data.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.app_data.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = "${aws_s3_bucket.app_data_replica[0].arn}/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "s3_replication" {
  count      = var.enable_cross_region_replication ? 1 : 0
  role       = aws_iam_role.s3_replication[0].name
  policy_arn = aws_iam_policy.s3_replication[0].arn
}

# S3 Replication Configuration
resource "aws_s3_bucket_replication_configuration" "app_data" {
  count  = var.enable_cross_region_replication ? 1 : 0
  role   = aws_iam_role.s3_replication[0].arn
  bucket = aws_s3_bucket.app_data.id

  rule {
    id     = "replicate_critical_data"
    status = "Enabled"

    filter {
      prefix = "critical/"
    }

    destination {
      bucket        = aws_s3_bucket.app_data_replica[0].arn
      storage_class = "STANDARD_IA"

      encryption_configuration {
        replica_kms_key_id = aws_kms_key.backup.arn
      }
    }
  }

  depends_on = [aws_s3_bucket_versioning.app_data]
}

# ElastiCache Backup Configuration (Enhanced)
# Additional backup configuration for ElastiCache
resource "aws_cloudwatch_metric_alarm" "redis_backup_failure" {
  alarm_name          = "${var.name_prefix}-redis-backup-failure"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BackupFailed"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "This metric monitors Redis backup failures"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis.id
  }

  tags = var.common_tags
}

# S3 Bucket for ElastiCache Manual Backups
resource "aws_s3_bucket" "redis_backups" {
  bucket = "${var.name_prefix}-redis-backups-${random_id.bucket_suffix.hex}"

  tags = merge(var.common_tags, {
    Purpose = "RedisBackups"
  })
}

resource "aws_s3_bucket_versioning" "redis_backups" {
  bucket = aws_s3_bucket.redis_backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "redis_backups" {
  bucket = aws_s3_bucket.redis_backups.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "redis_backups" {
  bucket = aws_s3_bucket.redis_backups.id

  rule {
    id     = "redis_backup_lifecycle"
    status = "Enabled"

    expiration {
      days = 90
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 60
      storage_class = "GLACIER"
    }
  }
}

# Lambda function for automated Redis backup export
resource "aws_lambda_function" "redis_backup_export" {
  filename         = "redis_backup_export.zip"
  function_name    = "${var.name_prefix}-redis-backup-export"
  role            = aws_iam_role.lambda_backup.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.redis_backup_lambda.output_base64sha256
  runtime         = "python3.9"
  timeout         = 300

  environment {
    variables = {
      REPLICATION_GROUP_ID = aws_elasticache_replication_group.redis.id
      S3_BUCKET           = aws_s3_bucket.redis_backups.bucket
      SNS_TOPIC_ARN       = var.sns_topic_arn
    }
  }

  tags = var.common_tags
}

# Lambda deployment package
data "archive_file" "redis_backup_lambda" {
  type        = "zip"
  output_path = "redis_backup_export.zip"
  source {
    content = templatefile("${path.module}/lambda/redis_backup_export.py", {
      replication_group_id = aws_elasticache_replication_group.redis.id
      s3_bucket           = aws_s3_bucket.redis_backups.bucket
    })
    filename = "index.py"
  }
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_backup" {
  name = "${var.name_prefix}-lambda-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy" "lambda_backup" {
  name = "${var.name_prefix}-lambda-backup-policy"
  role = aws_iam_role.lambda_backup.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "elasticache:CreateSnapshot",
          "elasticache:DescribeSnapshots",
          "elasticache:ExportServerlessSnapshot"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.redis_backups.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = var.sns_topic_arn
      }
    ]
  })
}

# EventBridge rule for scheduled Redis backups
resource "aws_cloudwatch_event_rule" "redis_backup_schedule" {
  name                = "${var.name_prefix}-redis-backup-schedule"
  description         = "Trigger Redis backup export"
  schedule_expression = "cron(0 4 * * ? *)"  # Daily at 4 AM UTC

  tags = var.common_tags
}

resource "aws_cloudwatch_event_target" "redis_backup_lambda" {
  rule      = aws_cloudwatch_event_rule.redis_backup_schedule.name
  target_id = "RedisBackupLambdaTarget"
  arn       = aws_lambda_function.redis_backup_export.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.redis_backup_export.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.redis_backup_schedule.arn
}

# =============================================================================
# IAM POLICIES FOR APPLICATION ACCESS
# =============================================================================

# S3 Access Policy for ECS Tasks
resource "aws_iam_policy" "s3_access" {
  name        = "${var.name_prefix}-s3-access-policy"
  description = "Policy for ECS tasks to access S3 buckets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.static_assets.arn,
          "${aws_s3_bucket.static_assets.arn}/*",
          aws_s3_bucket.app_data.arn,
          "${aws_s3_bucket.app_data.arn}/*"
        ]
      }
    ]
  })

  tags = var.common_tags
}

# EFS Access Policy for ECS Tasks
resource "aws_iam_policy" "efs_access" {
  name        = "${var.name_prefix}-efs-access-policy"
  description = "Policy for ECS tasks to access EFS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite",
          "elasticfilesystem:ClientRootAccess"
        ]
        Resource = aws_efs_file_system.main.arn
      }
    ]
  })

  tags = var.common_tags
}

# GitHub Actions IAM Role for CI/CD
resource "aws_iam_role" "github_actions" {
  name = "${var.name_prefix}-github-actions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = var.common_tags
}

# Deployment Artifacts Access Policy
resource "aws_iam_policy" "deployment_artifacts_access" {
  name        = "${var.name_prefix}-deployment-artifacts-policy"
  description = "Policy for accessing deployment artifacts"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.deployment_artifacts.arn,
          "${aws_s3_bucket.deployment_artifacts.arn}/*"
        ]
      }
    ]
  })

  tags = var.common_tags
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}