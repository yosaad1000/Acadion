# ECR Security Configuration
# This file configures ECR image scanning policies and security settings

# Enable image scanning for all ECR repositories
resource "aws_ecr_repository" "backend" {
  name                 = var.backend_repository_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = var.tags
}

resource "aws_ecr_repository" "frontend" {
  name                 = var.frontend_repository_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = var.tags
}

resource "aws_ecr_repository" "face_recognition" {
  name                 = var.face_recognition_repository_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = var.tags
}

# ECR lifecycle policies to manage image retention and security
resource "aws_ecr_lifecycle_policy" "backend_policy" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 production images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "release"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last 5 development images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["dev", "develop"]
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

resource "aws_ecr_lifecycle_policy" "frontend_policy" {
  repository = aws_ecr_repository.frontend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 production images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "release"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last 5 development images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["dev", "develop"]
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

resource "aws_ecr_lifecycle_policy" "face_recognition_policy" {
  repository = aws_ecr_repository.face_recognition.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 production images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "release"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last 5 development images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["dev", "develop"]
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

# ECR repository policies for secure access
resource "aws_ecr_repository_policy" "backend_policy" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowECSTaskRole"
        Effect = "Allow"
        Principal = {
          AWS = [
            var.ecs_task_role_arn,
            var.ecs_execution_role_arn
          ]
        }
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
      },
      {
        Sid    = "AllowCICDRole"
        Effect = "Allow"
        Principal = {
          AWS = var.cicd_role_arn
        }
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
      }
    ]
  })
}

resource "aws_ecr_repository_policy" "frontend_policy" {
  repository = aws_ecr_repository.frontend.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowECSTaskRole"
        Effect = "Allow"
        Principal = {
          AWS = [
            var.ecs_task_role_arn,
            var.ecs_execution_role_arn
          ]
        }
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
      },
      {
        Sid    = "AllowCICDRole"
        Effect = "Allow"
        Principal = {
          AWS = var.cicd_role_arn
        }
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
      }
    ]
  })
}

resource "aws_ecr_repository_policy" "face_recognition_policy" {
  repository = aws_ecr_repository.face_recognition.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowECSTaskRole"
        Effect = "Allow"
        Principal = {
          AWS = [
            var.ecs_task_role_arn,
            var.ecs_execution_role_arn
          ]
        }
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
      },
      {
        Sid    = "AllowCICDRole"
        Effect = "Allow"
        Principal = {
          AWS = var.cicd_role_arn
        }
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
      }
    ]
  })
}

# CloudWatch log group for ECR scanning results
resource "aws_cloudwatch_log_group" "ecr_scan_results" {
  name              = "/aws/ecr/scan-results"
  retention_in_days = 30

  tags = var.tags
}

# EventBridge rule to capture ECR scan completion events
resource "aws_cloudwatch_event_rule" "ecr_scan_complete" {
  name        = "ecr-scan-complete"
  description = "Capture ECR image scan completion events"

  event_pattern = jsonencode({
    source      = ["aws.ecr"]
    detail-type = ["ECR Image Scan"]
    detail = {
      scan-status = ["COMPLETE"]
    }
  })

  tags = var.tags
}

# EventBridge target to send scan results to CloudWatch Logs
resource "aws_cloudwatch_event_target" "ecr_scan_logs" {
  rule      = aws_cloudwatch_event_rule.ecr_scan_complete.name
  target_id = "ECRScanLogsTarget"
  arn       = aws_cloudwatch_log_group.ecr_scan_results.arn
}

# SNS topic for security notifications
resource "aws_sns_topic" "security_alerts" {
  name = "acadion-security-alerts"

  tags = var.tags
}

# EventBridge target to send critical vulnerability alerts to SNS
resource "aws_cloudwatch_event_target" "security_alerts" {
  rule      = aws_cloudwatch_event_rule.ecr_scan_complete.name
  target_id = "SecurityAlertsTarget"
  arn       = aws_sns_topic.security_alerts.arn

  input_transformer {
    input_paths = {
      repository = "$.detail.repository-name"
      findings   = "$.detail.finding-counts"
    }
    input_template = jsonencode({
      message = "ECR Security Scan completed for repository: <repository>. Findings: <findings>"
    })
  }
}

# Lambda function for processing ECR scan results
resource "aws_lambda_function" "process_scan_results" {
  filename         = "process_scan_results.zip"
  function_name    = "acadion-process-ecr-scan-results"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "index.handler"
  runtime         = "python3.9"
  timeout         = 60

  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      SNS_TOPIC_ARN = aws_sns_topic.security_alerts.arn
      LOG_GROUP     = aws_cloudwatch_log_group.ecr_scan_results.name
    }
  }

  tags = var.tags
}

# Create Lambda deployment package
data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "process_scan_results.zip"
  source {
    content = <<EOF
import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

sns = boto3.client('sns')

def handler(event, context):
    """Process ECR scan results and send alerts for critical vulnerabilities"""
    
    try:
        detail = event['detail']
        repository_name = detail['repository-name']
        scan_status = detail['scan-status']
        
        if scan_status == 'COMPLETE':
            finding_counts = detail.get('finding-counts', {})
            
            # Check for critical vulnerabilities
            critical_count = finding_counts.get('CRITICAL', 0)
            high_count = finding_counts.get('HIGH', 0)
            
            if critical_count > 0 or high_count > 5:
                message = f"""
🚨 SECURITY ALERT: Critical vulnerabilities found in ECR repository

Repository: {repository_name}
Critical vulnerabilities: {critical_count}
High vulnerabilities: {high_count}

Please review and remediate immediately.
                """
                
                sns.publish(
                    TopicArn=os.environ['SNS_TOPIC_ARN'],
                    Subject=f'Security Alert: {repository_name}',
                    Message=message
                )
                
                logger.warning(f"Security alert sent for {repository_name}")
            else:
                logger.info(f"No critical security issues found in {repository_name}")
        
        return {
            'statusCode': 200,
            'body': json.dumps('Scan results processed successfully')
        }
        
    except Exception as e:
        logger.error(f"Error processing scan results: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }
EOF
    filename = "index.py"
  }
}

# IAM role for Lambda function
resource "aws_iam_role" "lambda_execution_role" {
  name = "acadion-ecr-scan-lambda-role"

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

  tags = var.tags
}

# IAM policy for Lambda function
resource "aws_iam_role_policy" "lambda_execution_policy" {
  name = "acadion-ecr-scan-lambda-policy"
  role = aws_iam_role.lambda_execution_role.id

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
          "sns:Publish"
        ]
        Resource = aws_sns_topic.security_alerts.arn
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:DescribeImageScanFindings",
          "ecr:GetRepositoryPolicy"
        ]
        Resource = "*"
      }
    ]
  })
}

# EventBridge target for Lambda function
resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.ecr_scan_complete.name
  target_id = "LambdaTarget"
  arn       = aws_lambda_function.process_scan_results.arn
}

# Lambda permission for EventBridge
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.process_scan_results.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.ecr_scan_complete.arn
}