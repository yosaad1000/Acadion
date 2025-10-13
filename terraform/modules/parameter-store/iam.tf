# IAM policies for Parameter Store access

# Data source for current AWS account and region
data "aws_region" "current" {}

# IAM policy document for ECS tasks to read parameters
data "aws_iam_policy_document" "parameter_store_read_policy" {
  statement {
    sid    = "AllowParameterStoreRead"
    effect = "Allow"
    
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath"
    ]
    
    resources = [
      "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${var.environment}/${var.project_name}/*"
    ]
  }
  
  statement {
    sid    = "AllowKMSDecrypt"
    effect = "Allow"
    
    actions = [
      "kms:Decrypt",
      "kms:DescribeKey"
    ]
    
    resources = [
      var.create_kms_key ? aws_kms_key.parameter_store_key[0].arn : "arn:aws:kms:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:key/*"
    ]
    
    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${data.aws_region.current.name}.amazonaws.com"]
    }
  }
}

# IAM policy for parameter store read access
resource "aws_iam_policy" "parameter_store_read_policy" {
  name        = "${var.project_name}-${var.environment}-parameter-store-read"
  description = "Policy for reading Parameter Store parameters for ${var.project_name} ${var.environment}"
  policy      = data.aws_iam_policy_document.parameter_store_read_policy.json
  
  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-parameter-store-read-policy"
    Type = "IAM-Policy"
  })
}

# IAM policy document for administrative access (deployment/management)
data "aws_iam_policy_document" "parameter_store_admin_policy" {
  statement {
    sid    = "AllowParameterStoreAdmin"
    effect = "Allow"
    
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath",
      "ssm:PutParameter",
      "ssm:DeleteParameter",
      "ssm:AddTagsToResource",
      "ssm:RemoveTagsFromResource",
      "ssm:ListTagsForResource",
      "ssm:DescribeParameters"
    ]
    
    resources = [
      "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${var.environment}/${var.project_name}/*"
    ]
  }
  
  statement {
    sid    = "AllowKMSAdminAccess"
    effect = "Allow"
    
    actions = [
      "kms:Decrypt",
      "kms:Encrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:DescribeKey"
    ]
    
    resources = [
      var.create_kms_key ? aws_kms_key.parameter_store_key[0].arn : "arn:aws:kms:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:key/*"
    ]
    
    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${data.aws_region.current.name}.amazonaws.com"]
    }
  }
}

# IAM policy for parameter store administrative access
resource "aws_iam_policy" "parameter_store_admin_policy" {
  name        = "${var.project_name}-${var.environment}-parameter-store-admin"
  description = "Policy for administrative access to Parameter Store parameters for ${var.project_name} ${var.environment}"
  policy      = data.aws_iam_policy_document.parameter_store_admin_policy.json
  
  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-parameter-store-admin-policy"
    Type = "IAM-Policy"
  })
}

# IAM role for ECS tasks (backend service)
resource "aws_iam_role" "ecs_task_parameter_role" {
  name = "${var.project_name}-${var.environment}-ecs-parameter-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
  
  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-ecs-parameter-role"
    Type = "IAM-Role"
  })
}

# Attach parameter store read policy to ECS task role
resource "aws_iam_role_policy_attachment" "ecs_task_parameter_policy" {
  role       = aws_iam_role.ecs_task_parameter_role.name
  policy_arn = aws_iam_policy.parameter_store_read_policy.arn
}

# IAM role for GitHub Actions (CI/CD deployment)
resource "aws_iam_role" "github_actions_parameter_role" {
  count = var.create_github_actions_role ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-github-actions-parameter-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Federated = var.github_actions_role_arn
        }
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
  
  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-github-actions-parameter-role"
    Type = "IAM-Role"
  })
}

# Attach parameter store admin policy to GitHub Actions role
resource "aws_iam_role_policy_attachment" "github_actions_parameter_policy" {
  count = var.create_github_actions_role ? 1 : 0
  
  role       = aws_iam_role.github_actions_parameter_role[0].name
  policy_arn = aws_iam_policy.parameter_store_admin_policy.arn
}