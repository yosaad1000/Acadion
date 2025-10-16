# S3 Module for AWS Free Tier Deployment
# Free tier: 5GB storage + 20,000 GET + 2,000 PUT requests

# S3 Bucket for deployment artifacts
resource "aws_s3_bucket" "deployment" {
  bucket = "${var.name_prefix}-deployment-${random_id.bucket_suffix.hex}"

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-deployment"
    Type = "Deployment"
  })
}

# S3 Bucket for backups
resource "aws_s3_bucket" "backup" {
  bucket = "${var.name_prefix}-backup-${random_id.bucket_suffix.hex}"

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-backup"
    Type = "Backup"
  })
}

# S3 Bucket for face recognition cache (optional)
resource "aws_s3_bucket" "face_cache" {
  count  = var.create_face_cache_bucket ? 1 : 0
  bucket = "${var.name_prefix}-face-cache-${random_id.bucket_suffix.hex}"

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-face-cache"
    Type = "FaceCache"
  })
}

# Random ID for unique bucket names
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Bucket versioning for deployment bucket
resource "aws_s3_bucket_versioning" "deployment" {
  bucket = aws_s3_bucket.deployment.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Bucket versioning for backup bucket
resource "aws_s3_bucket_versioning" "backup" {
  bucket = aws_s3_bucket.backup.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption for deployment bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "deployment" {
  bucket = aws_s3_bucket.deployment.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Server-side encryption for backup bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Server-side encryption for face cache bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "face_cache" {
  count  = var.create_face_cache_bucket ? 1 : 0
  bucket = aws_s3_bucket.face_cache[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Block public access for deployment bucket
resource "aws_s3_bucket_public_access_block" "deployment" {
  bucket = aws_s3_bucket.deployment.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Block public access for backup bucket
resource "aws_s3_bucket_public_access_block" "backup" {
  bucket = aws_s3_bucket.backup.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Block public access for face cache bucket
resource "aws_s3_bucket_public_access_block" "face_cache" {
  count  = var.create_face_cache_bucket ? 1 : 0
  bucket = aws_s3_bucket.face_cache[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle configuration for deployment bucket (manage costs)
resource "aws_s3_bucket_lifecycle_configuration" "deployment" {
  bucket = aws_s3_bucket.deployment.id

  rule {
    id     = "deployment_lifecycle"
    status = "Enabled"

    # Delete old versions after 30 days
    noncurrent_version_expiration {
      noncurrent_days = 30
    }

    # Delete incomplete multipart uploads after 7 days
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    # Transition to IA after 30 days (if over free tier)
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
  }
}

# Lifecycle configuration for backup bucket
resource "aws_s3_bucket_lifecycle_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id

  rule {
    id     = "backup_lifecycle"
    status = "Enabled"

    # Delete old versions after 90 days
    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    # Delete incomplete multipart uploads after 7 days
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    # Transition to IA after 30 days, then Glacier after 90 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Delete objects after 1 year
    expiration {
      days = 365
    }
  }
}

# Lifecycle configuration for face cache bucket
resource "aws_s3_bucket_lifecycle_configuration" "face_cache" {
  count  = var.create_face_cache_bucket ? 1 : 0
  bucket = aws_s3_bucket.face_cache[0].id

  rule {
    id     = "face_cache_lifecycle"
    status = "Enabled"

    # Delete cache objects after 7 days
    expiration {
      days = 7
    }

    # Delete incomplete multipart uploads after 1 day
    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# Bucket policy for deployment bucket
resource "aws_s3_bucket_policy" "deployment" {
  bucket = aws_s3_bucket.deployment.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCodeDeployAccess"
        Effect = "Allow"
        Principal = {
          AWS = var.codedeploy_role_arn
        }
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.deployment.arn,
          "${aws_s3_bucket.deployment.arn}/*"
        ]
      },
      {
        Sid    = "AllowGitHubActionsAccess"
        Effect = "Allow"
        Principal = {
          AWS = var.github_actions_role_arn
        }
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.deployment.arn,
          "${aws_s3_bucket.deployment.arn}/*"
        ]
      }
    ]
  })
}

# Bucket policy for backup bucket
resource "aws_s3_bucket_policy" "backup" {
  bucket = aws_s3_bucket.backup.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEC2BackupAccess"
        Effect = "Allow"
        Principal = {
          AWS = var.ec2_role_arn
        }
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.backup.arn,
          "${aws_s3_bucket.backup.arn}/*"
        ]
      }
    ]
  })
}

# Bucket policy for face cache bucket
resource "aws_s3_bucket_policy" "face_cache" {
  count  = var.create_face_cache_bucket ? 1 : 0
  bucket = aws_s3_bucket.face_cache[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowLambdaCacheAccess"
        Effect = "Allow"
        Principal = {
          AWS = var.lambda_role_arn
        }
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.face_cache[0].arn,
          "${aws_s3_bucket.face_cache[0].arn}/*"
        ]
      }
    ]
  })
}

# CloudWatch metric filter for S3 access logs (if needed)
resource "aws_s3_bucket_notification" "deployment_notification" {
  bucket = aws_s3_bucket.deployment.id

  # Optional: SNS notification for deployment events
  dynamic "topic" {
    for_each = var.sns_topic_arn != "" ? [1] : []
    content {
      topic_arn = var.sns_topic_arn
      events    = ["s3:ObjectCreated:*"]
    }
  }
}

# S3 bucket for CloudTrail logs (if needed for auditing)
resource "aws_s3_bucket" "cloudtrail_logs" {
  count  = var.enable_cloudtrail ? 1 : 0
  bucket = "${var.name_prefix}-cloudtrail-logs-${random_id.bucket_suffix.hex}"

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-cloudtrail-logs"
    Type = "CloudTrailLogs"
  })
}

# CloudTrail logs bucket policy
resource "aws_s3_bucket_policy" "cloudtrail_logs" {
  count  = var.enable_cloudtrail ? 1 : 0
  bucket = aws_s3_bucket.cloudtrail_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail_logs[0].arn
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail_logs[0].arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}