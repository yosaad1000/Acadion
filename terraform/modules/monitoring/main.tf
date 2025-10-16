# CloudWatch Monitoring Module
# This module creates CloudWatch dashboards, metrics, and alarms for the Acadion platform

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.environment}-acadion-alerts"

  tags = {
    Name        = "${var.environment}-acadion-alerts"
    Environment = var.environment
    Project     = "acadion"
  }
}

# SNS Topic Subscription for Email Alerts
resource "aws_sns_topic_subscription" "email_alerts" {
  count     = length(var.alert_email_addresses)
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email_addresses[count.index]
}

# SNS Topic Subscription for Slack (if webhook provided)
resource "aws_sns_topic_subscription" "slack_alerts" {
  count     = var.slack_webhook_url != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "https"
  endpoint  = var.slack_webhook_url
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.environment}-acadion-backend"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.environment}-acadion-backend-logs"
    Environment = var.environment
    Project     = "acadion"
  }
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${var.environment}-acadion-frontend"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.environment}-acadion-frontend-logs"
    Environment = var.environment
    Project     = "acadion"
  }
}

resource "aws_cloudwatch_log_group" "face_recognition" {
  name              = "/ecs/${var.environment}-acadion-face-recognition"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.environment}-acadion-face-recognition-logs"
    Environment = var.environment
    Project     = "acadion"
  }
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.environment}-acadion-dashboard"

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
            ["AWS/ECS", "CPUUtilization", "ServiceName", "${var.environment}-acadion-backend", "ClusterName", var.ecs_cluster_name],
            [".", "MemoryUtilization", ".", ".", ".", "."],
            [".", "CPUUtilization", "ServiceName", "${var.environment}-acadion-frontend", "ClusterName", var.ecs_cluster_name],
            [".", "MemoryUtilization", ".", ".", ".", "."],
            [".", "CPUUtilization", "ServiceName", "${var.environment}-acadion-face-recognition", "ClusterName", var.ecs_cluster_name],
            [".", "MemoryUtilization", ".", ".", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "ECS Service Resource Utilization"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix],
            [".", "TargetResponseTime", ".", "."],
            [".", "HTTPCode_Target_2XX_Count", ".", "."],
            [".", "HTTPCode_Target_4XX_Count", ".", "."],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Application Load Balancer Metrics"
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
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", var.elasticache_cluster_id],
            [".", "DatabaseMemoryUsagePercentage", ".", "."],
            [".", "NetworkBytesIn", ".", "."],
            [".", "NetworkBytesOut", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "ElastiCache Redis Metrics"
          period  = 300
        }
      },
      {
        type   = "log"
        x      = 12
        y      = 6
        width  = 12
        height = 6

        properties = {
          query   = "SOURCE '/ecs/${var.environment}-acadion-backend' | fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20"
          region  = var.aws_region
          title   = "Recent Backend Errors"
          view    = "table"
        }
      }
    ]
  })
}# CloudW
atch Alarms for Critical Metrics

# Backend Service CPU Alarm
resource "aws_cloudwatch_metric_alarm" "backend_cpu_high" {
  alarm_name          = "${var.environment}-acadion-backend-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors backend CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = "${var.environment}-acadion-backend"
    ClusterName = var.ecs_cluster_name
  }

  tags = {
    Name        = "${var.environment}-acadion-backend-cpu-alarm"
    Environment = var.environment
    Project     = "acadion"
  }
}

# Backend Service Memory Alarm
resource "aws_cloudwatch_metric_alarm" "backend_memory_high" {
  alarm_name          = "${var.environment}-acadion-backend-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors backend memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = "${var.environment}-acadion-backend"
    ClusterName = var.ecs_cluster_name
  }

  tags = {
    Name        = "${var.environment}-acadion-backend-memory-alarm"
    Environment = var.environment
    Project     = "acadion"
  }
}

# Face Recognition Service CPU Alarm (Higher threshold due to GPU workload)
resource "aws_cloudwatch_metric_alarm" "face_recognition_cpu_high" {
  alarm_name          = "${var.environment}-acadion-face-recognition-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "90"
  alarm_description   = "This metric monitors face recognition service CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = "${var.environment}-acadion-face-recognition"
    ClusterName = var.ecs_cluster_name
  }

  tags = {
    Name        = "${var.environment}-acadion-face-recognition-cpu-alarm"
    Environment = var.environment
    Project     = "acadion"
  }
}

# Application Load Balancer Response Time Alarm
resource "aws_cloudwatch_metric_alarm" "alb_response_time_high" {
  alarm_name          = "${var.environment}-acadion-alb-response-time-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "2"
  alarm_description   = "This metric monitors ALB response time"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = {
    Name        = "${var.environment}-acadion-alb-response-time-alarm"
    Environment = var.environment
    Project     = "acadion"
  }
}

# Application Load Balancer 5XX Error Rate Alarm
resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  alarm_name          = "${var.environment}-acadion-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors 5XX errors from ALB"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = {
    Name        = "${var.environment}-acadion-alb-5xx-alarm"
    Environment = var.environment
    Project     = "acadion"
  }
}

# ElastiCache CPU Utilization Alarm
resource "aws_cloudwatch_metric_alarm" "elasticache_cpu_high" {
  alarm_name          = "${var.environment}-acadion-elasticache-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "This metric monitors ElastiCache CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = var.elasticache_cluster_id
  }

  tags = {
    Name        = "${var.environment}-acadion-elasticache-cpu-alarm"
    Environment = var.environment
    Project     = "acadion"
  }
}

# ElastiCache Memory Usage Alarm
resource "aws_cloudwatch_metric_alarm" "elasticache_memory_high" {
  alarm_name          = "${var.environment}-acadion-elasticache-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ElastiCache memory usage"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = var.elasticache_cluster_id
  }

  tags = {
    Name        = "${var.environment}-acadion-elasticache-memory-alarm"
    Environment = var.environment
    Project     = "acadion"
  }
}

# Custom Application Metrics (using CloudWatch custom metrics)
resource "aws_cloudwatch_metric_alarm" "face_recognition_queue_length" {
  alarm_name          = "${var.environment}-acadion-face-recognition-queue-length"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "QueueLength"
  namespace           = "Acadion/FaceRecognition"
  period              = "300"
  statistic           = "Average"
  threshold           = "50"
  alarm_description   = "This metric monitors face recognition processing queue length"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    Environment = var.environment
    Service     = "face-recognition"
  }

  tags = {
    Name        = "${var.environment}-acadion-face-recognition-queue-alarm"
    Environment = var.environment
    Project     = "acadion"
  }
}

# Advanced CloudWatch Alarms with Escalation

# Composite Alarm for Service Health
resource "aws_cloudwatch_composite_alarm" "service_health" {
  alarm_name        = "${var.environment}-acadion-service-health"
  alarm_description = "Composite alarm monitoring overall service health"
  
  alarm_rule = join(" OR ", [
    "ALARM(${aws_cloudwatch_metric_alarm.backend_cpu_high.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.backend_memory_high.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.alb_5xx_errors.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.alb_response_time_high.alarm_name})"
  ])
  
  actions_enabled = true
  alarm_actions   = [aws_sns_topic.critical_alerts.arn]
  ok_actions      = [aws_sns_topic.alerts.arn]

  tags = {
    Name        = "${var.environment}-acadion-service-health-composite"
    Environment = var.environment
    Project     = "acadion"
    Severity    = "critical"
  }
}

# Critical Alerts SNS Topic (for escalation)
resource "aws_sns_topic" "critical_alerts" {
  name = "${var.environment}-acadion-critical-alerts"

  tags = {
    Name        = "${var.environment}-acadion-critical-alerts"
    Environment = var.environment
    Project     = "acadion"
    Severity    = "critical"
  }
}

# Critical Alert Subscriptions
resource "aws_sns_topic_subscription" "critical_email_alerts" {
  count     = length(var.critical_alert_email_addresses)
  topic_arn = aws_sns_topic.critical_alerts.arn
  protocol  = "email"
  endpoint  = var.critical_alert_email_addresses[count.index]
}

# Database Connection Alarm (Custom Metric)
resource "aws_cloudwatch_metric_alarm" "database_connection_failures" {
  alarm_name          = "${var.environment}-acadion-database-connection-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnectionFailures"
  namespace           = "Acadion/Application"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors database connection failures"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    Environment = var.environment
    Service     = "backend"
  }

  tags = {
    Name        = "${var.environment}-acadion-database-connection-alarm"
    Environment = var.environment
    Project     = "acadion"
    Severity    = "critical"
  }
}

# Face Recognition Processing Failures
resource "aws_cloudwatch_metric_alarm" "face_recognition_failures" {
  alarm_name          = "${var.environment}-acadion-face-recognition-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "FaceProcessingFailures"
  namespace           = "Acadion/FaceRecognition"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors face recognition processing failures"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    Environment = var.environment
    Service     = "face-recognition"
  }

  tags = {
    Name        = "${var.environment}-acadion-face-recognition-failures-alarm"
    Environment = var.environment
    Project     = "acadion"
    Severity    = "high"
  }
}

# API Gateway Rate Limiting Alarm
resource "aws_cloudwatch_metric_alarm" "api_rate_limit_exceeded" {
  alarm_name          = "${var.environment}-acadion-api-rate-limit-exceeded"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "RateLimitExceeded"
  namespace           = "Acadion/Application"
  period              = "300"
  statistic           = "Sum"
  threshold           = "100"
  alarm_description   = "This metric monitors API rate limit violations"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    Environment = var.environment
    Service     = "backend"
  }

  tags = {
    Name        = "${var.environment}-acadion-rate-limit-alarm"
    Environment = var.environment
    Project     = "acadion"
    Severity    = "medium"
  }
}

# Disk Space Alarm for EFS
resource "aws_cloudwatch_metric_alarm" "efs_storage_utilization" {
  alarm_name          = "${var.environment}-acadion-efs-storage-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "StorageBytes"
  namespace           = "AWS/EFS"
  period              = "3600"
  statistic           = "Average"
  threshold           = "85899345920"  # 80GB in bytes
  alarm_description   = "This metric monitors EFS storage utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FileSystemId = var.efs_file_system_id
    StorageClass = "Standard"
  }

  tags = {
    Name        = "${var.environment}-acadion-efs-storage-alarm"
    Environment = var.environment
    Project     = "acadion"
    Severity    = "medium"
  }
}

# Lambda Function for Alert Processing (if using Lambda for notifications)
resource "aws_lambda_function" "alert_processor" {
  count = var.enable_lambda_alert_processor ? 1 : 0
  
  filename         = "alert_processor.zip"
  function_name    = "${var.environment}-acadion-alert-processor"
  role            = aws_iam_role.lambda_alert_processor[0].arn
  handler         = "index.handler"
  runtime         = "python3.9"
  timeout         = 30

  source_code_hash = data.archive_file.alert_processor_zip[0].output_base64sha256

  environment {
    variables = {
      ENVIRONMENT = var.environment
      SLACK_WEBHOOK_URL = var.slack_webhook_url
    }
  }

  tags = {
    Name        = "${var.environment}-acadion-alert-processor"
    Environment = var.environment
    Project     = "acadion"
  }
}

# Lambda IAM Role
resource "aws_iam_role" "lambda_alert_processor" {
  count = var.enable_lambda_alert_processor ? 1 : 0
  
  name = "${var.environment}-acadion-alert-processor-role"

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

  tags = {
    Name        = "${var.environment}-acadion-alert-processor-role"
    Environment = var.environment
    Project     = "acadion"
  }
}

# Lambda IAM Policy
resource "aws_iam_role_policy_attachment" "lambda_alert_processor_policy" {
  count = var.enable_lambda_alert_processor ? 1 : 0
  
  role       = aws_iam_role.lambda_alert_processor[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Archive file for Lambda function
data "archive_file" "alert_processor_zip" {
  count = var.enable_lambda_alert_processor ? 1 : 0
  
  type        = "zip"
  output_path = "alert_processor.zip"
  
  source {
    content = templatefile("${path.module}/lambda/alert_processor.py", {
      environment = var.environment
    })
    filename = "index.py"
  }
}

# SNS Topic Subscription for Lambda
resource "aws_sns_topic_subscription" "lambda_alert_processor" {
  count = var.enable_lambda_alert_processor ? 1 : 0
  
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.alert_processor[0].arn
}

# Lambda Permission for SNS
resource "aws_lambda_permission" "allow_sns" {
  count = var.enable_lambda_alert_processor ? 1 : 0
  
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.alert_processor[0].function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.alerts.arn
}