# IAM Roles and Policies for Storage Access

# IAM Policy for S3 Access
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
          "s3:GetObjectVersion",
          "s3:PutObjectAcl",
          "s3:GetObjectAcl"
        ]
        Resource = [
          "${aws_s3_bucket.static_assets.arn}/*",
          "${aws_s3_bucket.app_data.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation",
          "s3:GetBucketVersioning"
        ]
        Resource = [
          aws_s3_bucket.static_assets.arn,
          aws_s3_bucket.app_data.arn
        ]
      }
    ]
  })

  tags = var.common_tags
}

# IAM Policy for Deployment Artifacts Access (CI/CD)
resource "aws_iam_policy" "deployment_artifacts_access" {
  name        = "${var.name_prefix}-deployment-artifacts-policy"
  description = "Policy for CI/CD to access deployment artifacts bucket"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObjectVersion",
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

# IAM Policy for EFS Access
resource "aws_iam_policy" "efs_access" {
  name        = "${var.name_prefix}-efs-access-policy"
  description = "Policy for ECS tasks to access EFS file system"

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
        Condition = {
          StringEquals = {
            "elasticfilesystem:AccessPointArn" = [
              aws_efs_access_point.face_recognition.arn,
              aws_efs_access_point.app_storage.arn
            ]
          }
        }
      }
    ]
  })

  tags = var.common_tags
}

# IAM Role for GitHub Actions (CI/CD)
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
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:*"
          }
        }
      }
    ]
  })

  tags = var.common_tags
}

# Attach policies to GitHub Actions role
resource "aws_iam_role_policy_attachment" "github_actions_deployment_artifacts" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.deployment_artifacts_access.arn
}

# ECR permissions for GitHub Actions
resource "aws_iam_role_policy" "github_actions_ecr" {
  name = "${var.name_prefix}-github-actions-ecr-policy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "*"
      }
    ]
  })
}

# ECS permissions for GitHub Actions
resource "aws_iam_role_policy" "github_actions_ecs" {
  name = "${var.name_prefix}-github-actions-ecs-policy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:ListTasks",
          "ecs:DescribeTasks"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = [
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.name_prefix}-ecs-*"
        ]
      }
    ]
  })
}

# CloudWatch Logs permissions for GitHub Actions
resource "aws_iam_role_policy" "github_actions_logs" {
  name = "${var.name_prefix}-github-actions-logs-policy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/github-actions/${var.name_prefix}/*"
      }
    ]
  })
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}