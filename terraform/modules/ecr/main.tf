# ECR Repositories for Container Images

# Backend ECR Repository
resource "aws_ecr_repository" "backend" {
  name                 = "${var.name_prefix}/backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = var.common_tags
}

# Frontend ECR Repository
resource "aws_ecr_repository" "frontend" {
  name                 = "${var.name_prefix}/frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = var.common_tags
}

# Face Recognition ECR Repository
resource "aws_ecr_repository" "face_recognition" {
  name                 = "${var.name_prefix}/face-recognition"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = var.common_tags
}

# ECR Lifecycle Policies
resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 production images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["prod"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last 5 staging images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["staging"]
          countType     = "imageCountMoreThan"
          countNumber   = 5
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 3
        description  = "Delete untagged images older than 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

resource "aws_ecr_lifecycle_policy" "frontend" {
  repository = aws_ecr_repository.frontend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 production images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["prod"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last 5 staging images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["staging"]
          countType     = "imageCountMoreThan"
          countNumber   = 5
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 3
        description  = "Delete untagged images older than 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

resource "aws_ecr_lifecycle_policy" "face_recognition" {
  repository = aws_ecr_repository.face_recognition.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 5 production images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["prod"]
          countType     = "imageCountMoreThan"
          countNumber   = 5
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last 3 staging images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["staging"]
          countType     = "imageCountMoreThan"
          countNumber   = 3
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 3
        description  = "Delete untagged images older than 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# =============================================================================
# ENHANCED ARTIFACT MANAGEMENT
# =============================================================================

# S3 Bucket for Deployment Metadata
resource "aws_s3_bucket" "deployment_metadata" {
  bucket = "${var.name_prefix}-deployment-metadata-${random_id.metadata_suffix.hex}"

  tags = merge(var.common_tags, {
    Purpose = "DeploymentMetadata"
  })
}

resource "aws_s3_bucket_versioning" "deployment_metadata" {
  bucket = aws_s3_bucket.deployment_metadata.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "deployment_metadata" {
  bucket = aws_s3_bucket.deployment_metadata.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "deployment_metadata" {
  bucket = aws_s3_bucket.deployment_metadata.id

  rule {
    id     = "deployment_metadata_lifecycle"
    status = "Enabled"

    expiration {
      days = 2555  # 7 years
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}

# Lambda function for deployment tracking
resource "aws_lambda_function" "deployment_tracker" {
  filename         = "deployment_tracker.zip"
  function_name    = "${var.name_prefix}-deployment-tracker"
  role            = aws_iam_role.deployment_tracker_lambda.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.deployment_tracker_lambda.output_base64sha256
  runtime         = "python3.9"
  timeout         = 300

  environment {
    variables = {
      METADATA_BUCKET = aws_s3_bucket.deployment_metadata.bucket
      SNS_TOPIC_ARN   = var.sns_topic_arn
    }
  }

  tags = var.common_tags
}

# Lambda deployment package for deployment tracker
data "archive_file" "deployment_tracker_lambda" {
  type        = "zip"
  output_path = "deployment_tracker.zip"
  source {
    content = templatefile("${path.module}/lambda/deployment_tracker.py", {
      metadata_bucket = aws_s3_bucket.deployment_metadata.bucket
    })
    filename = "index.py"
  }
}

# IAM Role for deployment tracker Lambda
resource "aws_iam_role" "deployment_tracker_lambda" {
  name = "${var.name_prefix}-deployment-tracker-lambda-role"

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

resource "aws_iam_role_policy" "deployment_tracker_lambda" {
  name = "${var.name_prefix}-deployment-tracker-lambda-policy"
  role = aws_iam_role.deployment_tracker_lambda.id

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
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.deployment_metadata.arn,
          "${aws_s3_bucket.deployment_metadata.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:DescribeImages",
          "ecr:ListImages",
          "ecr:GetRepositoryPolicy"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:ListTaskDefinitions"
        ]
        Resource = "*"
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

# EventBridge rule for ECR image pushes
resource "aws_cloudwatch_event_rule" "ecr_image_push" {
  name        = "${var.name_prefix}-ecr-image-push"
  description = "Capture ECR image push events"

  event_pattern = jsonencode({
    source      = ["aws.ecr"]
    detail-type = ["ECR Image Action"]
    detail = {
      action-type = ["PUSH"]
      repository-name = [
        aws_ecr_repository.backend.name,
        aws_ecr_repository.frontend.name,
        aws_ecr_repository.face_recognition.name
      ]
    }
  })

  tags = var.common_tags
}

resource "aws_cloudwatch_event_target" "deployment_tracker_lambda" {
  rule      = aws_cloudwatch_event_rule.ecr_image_push.name
  target_id = "DeploymentTrackerLambdaTarget"
  arn       = aws_lambda_function.deployment_tracker.arn
}

resource "aws_lambda_permission" "allow_eventbridge_deployment_tracker" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.deployment_tracker.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.ecr_image_push.arn
}

# Lambda function for deployment rollback
resource "aws_lambda_function" "deployment_rollback" {
  filename         = "deployment_rollback.zip"
  function_name    = "${var.name_prefix}-deployment-rollback"
  role            = aws_iam_role.deployment_rollback_lambda.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.deployment_rollback_lambda.output_base64sha256
  runtime         = "python3.9"
  timeout         = 600

  environment {
    variables = {
      METADATA_BUCKET = aws_s3_bucket.deployment_metadata.bucket
      SNS_TOPIC_ARN   = var.sns_topic_arn
    }
  }

  tags = var.common_tags
}

# Lambda deployment package for rollback
data "archive_file" "deployment_rollback_lambda" {
  type        = "zip"
  output_path = "deployment_rollback.zip"
  source {
    content = templatefile("${path.module}/lambda/deployment_rollback.py", {
      metadata_bucket = aws_s3_bucket.deployment_metadata.bucket
    })
    filename = "index.py"
  }
}

# IAM Role for rollback Lambda
resource "aws_iam_role" "deployment_rollback_lambda" {
  name = "${var.name_prefix}-deployment-rollback-lambda-role"

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

resource "aws_iam_role_policy" "deployment_rollback_lambda" {
  name = "${var.name_prefix}-deployment-rollback-lambda-policy"
  role = aws_iam_role.deployment_rollback_lambda.id

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
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.deployment_metadata.arn,
          "${aws_s3_bucket.deployment_metadata.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "iam:PassedToService" = "ecs-tasks.amazonaws.com"
          }
        }
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

# Random ID for unique bucket names
resource "random_id" "metadata_suffix" {
  byte_length = 4
}