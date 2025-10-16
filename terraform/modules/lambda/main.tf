# Lambda Module for AWS Free Tier Deployment
# Free tier: 1M requests/month + 400,000 GB-seconds compute

# Lambda function for face recognition
resource "aws_lambda_function" "face_recognition" {
  function_name = "${var.name_prefix}-face-recognition"
  role         = var.iam_role_arn
  
  # Use container image for better dependency management
  package_type = "Image"
  image_uri    = "${var.ecr_repository_url}:latest"
  
  # Optimize for face processing
  memory_size = var.memory_size
  timeout     = 30
  
  # Environment variables
  environment {
    variables = {
      ENVIRONMENT = "production"
      LOG_LEVEL   = "INFO"
    }
  }

  # VPC configuration (optional)
  dynamic "vpc_config" {
    for_each = var.vpc_config != null ? [var.vpc_config] : []
    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = vpc_config.value.security_group_ids
    }
  }

  # Dead letter queue configuration
  dead_letter_config {
    target_arn = var.dlq_arn
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-face-recognition"
    Type = "FaceRecognition"
  })

  depends_on = [
    aws_cloudwatch_log_group.lambda_logs,
  ]
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.name_prefix}-face-recognition"
  retention_in_days = 7  # Free tier: 5GB storage

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-lambda-logs"
  })
}

# Lambda function version
resource "aws_lambda_alias" "face_recognition_live" {
  name             = "live"
  description      = "Live version of face recognition function"
  function_name    = aws_lambda_function.face_recognition.function_name
  function_version = "$LATEST"

  lifecycle {
    ignore_changes = [function_version]
  }
}

# Lambda permission for SQS trigger
resource "aws_lambda_permission" "allow_sqs" {
  statement_id  = "AllowExecutionFromSQS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.face_recognition.function_name
  principal     = "sqs.amazonaws.com"
  source_arn    = var.sqs_queue_arn
}

# SQS Event Source Mapping
resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = var.sqs_queue_arn
  function_name    = aws_lambda_function.face_recognition.arn
  batch_size       = 1  # Process one message at a time for face recognition
  
  # Error handling
  maximum_batching_window_in_seconds = 5
  
  # Scaling configuration for free tier
  scaling_config {
    maximum_concurrency = 10  # Limit concurrent executions
  }
}

# Lambda function for health checks (lightweight)
resource "aws_lambda_function" "health_check" {
  function_name = "${var.name_prefix}-health-check"
  role         = var.iam_role_arn
  
  # Use ZIP package for simple function
  filename         = data.archive_file.health_check_zip.output_path
  source_code_hash = data.archive_file.health_check_zip.output_base64sha256
  
  runtime = "python3.9"
  handler = "lambda_function.lambda_handler"
  
  # Minimal resources for health check
  memory_size = 128
  timeout     = 10

  environment {
    variables = {
      ENVIRONMENT = "production"
    }
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-health-check"
    Type = "HealthCheck"
  })

  depends_on = [
    aws_cloudwatch_log_group.health_check_logs,
  ]
}

# CloudWatch Log Group for health check Lambda
resource "aws_cloudwatch_log_group" "health_check_logs" {
  name              = "/aws/lambda/${var.name_prefix}-health-check"
  retention_in_days = 3  # Minimal retention for health checks

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-health-check-logs"
  })
}

# Health check Lambda source code
data "archive_file" "health_check_zip" {
  type        = "zip"
  output_path = "/tmp/${var.name_prefix}-health-check.zip"
  
  source {
    content = templatefile("${path.module}/health_check.py", {
      name_prefix = var.name_prefix
    })
    filename = "lambda_function.py"
  }
}

# EventBridge rule for scheduled health checks
resource "aws_cloudwatch_event_rule" "health_check_schedule" {
  name                = "${var.name_prefix}-health-check-schedule"
  description         = "Trigger health check Lambda every 5 minutes"
  schedule_expression = "rate(5 minutes)"

  tags = var.tags
}

# EventBridge target for health check Lambda
resource "aws_cloudwatch_event_target" "health_check_target" {
  rule      = aws_cloudwatch_event_rule.health_check_schedule.name
  target_id = "HealthCheckLambdaTarget"
  arn       = aws_lambda_function.health_check.arn
}

# Lambda permission for EventBridge
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.health_check.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.health_check_schedule.arn
}

# Lambda Layer for common dependencies (optional)
resource "aws_lambda_layer_version" "common_dependencies" {
  count           = var.create_layer ? 1 : 0
  filename        = var.layer_zip_path
  layer_name      = "${var.name_prefix}-common-deps"
  description     = "Common dependencies for Acadion Lambda functions"
  
  compatible_runtimes = ["python3.9", "python3.10", "python3.11"]
  
  source_code_hash = filebase64sha256(var.layer_zip_path)

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-common-layer"
  })
}

# CloudWatch Alarms for Lambda monitoring
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.name_prefix}-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors lambda errors"
  alarm_actions       = var.alarm_actions

  dimensions = {
    FunctionName = aws_lambda_function.face_recognition.function_name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  alarm_name          = "${var.name_prefix}-lambda-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Average"
  threshold           = "25000"  # 25 seconds (close to 30s timeout)
  alarm_description   = "This metric monitors lambda duration"
  alarm_actions       = var.alarm_actions

  dimensions = {
    FunctionName = aws_lambda_function.face_recognition.function_name
  }

  tags = var.tags
}