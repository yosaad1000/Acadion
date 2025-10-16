# Cross-Region Monitoring Module
# Monitors both primary and DR regions for failover decisions

# =============================================================================
# ROUTE 53 HEALTH CHECKS
# =============================================================================

# Health check for primary region API
resource "aws_route53_health_check" "primary_api" {
  fqdn                            = var.primary_api_domain
  port                            = 443
  type                            = "HTTPS"
  resource_path                   = "/api/health"
  failure_threshold               = "3"
  request_interval                = "30"
  cloudwatch_alarm_region         = var.primary_region
  cloudwatch_alarm_name           = "${var.name_prefix}-primary-api-health"
  insufficient_data_health_status = "Failure"

  tags = merge(var.common_tags, {
    Name    = "${var.name_prefix}-primary-api-health"
    Purpose = "CrossRegionMonitoring"
  })
}

# Health check for primary region app
resource "aws_route53_health_check" "primary_app" {
  fqdn                            = var.primary_app_domain
  port                            = 443
  type                            = "HTTPS"
  resource_path                   = "/"
  failure_threshold               = "3"
  request_interval                = "30"
  cloudwatch_alarm_region         = var.primary_region
  cloudwatch_alarm_name           = "${var.name_prefix}-primary-app-health"
  insufficient_data_health_status = "Failure"

  tags = merge(var.common_tags, {
    Name    = "${var.name_prefix}-primary-app-health"
    Purpose = "CrossRegionMonitoring"
  })
}

# Health check for DR region (when active)
resource "aws_route53_health_check" "dr_api" {
  fqdn                            = var.dr_api_domain
  port                            = 443
  type                            = "HTTPS"
  resource_path                   = "/api/health"
  failure_threshold               = "3"
  request_interval                = "30"
  cloudwatch_alarm_region         = var.dr_region
  cloudwatch_alarm_name           = "${var.name_prefix}-dr-api-health"
  insufficient_data_health_status = "Failure"

  tags = merge(var.common_tags, {
    Name    = "${var.name_prefix}-dr-api-health"
    Purpose = "CrossRegionMonitoring"
  })
}

# =============================================================================
# CLOUDWATCH ALARMS IN PRIMARY REGION
# =============================================================================

# Primary region API health alarm
resource "aws_cloudwatch_metric_alarm" "primary_api_health" {
  provider = aws.primary

  alarm_name          = "${var.name_prefix}-primary-api-health-alarm"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = "60"
  statistic           = "Minimum"
  threshold           = "1"
  alarm_description   = "Primary region API health check failure"
  alarm_actions       = [var.primary_sns_topic_arn]
  ok_actions          = [var.primary_sns_topic_arn]

  dimensions = {
    HealthCheckId = aws_route53_health_check.primary_api.id
  }

  tags = var.common_tags
}

# Primary region app health alarm
resource "aws_cloudwatch_metric_alarm" "primary_app_health" {
  provider = aws.primary

  alarm_name          = "${var.name_prefix}-primary-app-health-alarm"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = "60"
  statistic           = "Minimum"
  threshold           = "1"
  alarm_description   = "Primary region app health check failure"
  alarm_actions       = [var.primary_sns_topic_arn]
  ok_actions          = [var.primary_sns_topic_arn]

  dimensions = {
    HealthCheckId = aws_route53_health_check.primary_app.id
  }

  tags = var.common_tags
}

# Primary region ECS cluster alarm
resource "aws_cloudwatch_metric_alarm" "primary_ecs_services" {
  provider = aws.primary

  alarm_name          = "${var.name_prefix}-primary-ecs-services-alarm"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "RunningTaskCount"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.minimum_running_tasks
  alarm_description   = "Primary region ECS services running below threshold"
  alarm_actions       = [var.primary_sns_topic_arn]

  dimensions = {
    ServiceName = var.primary_backend_service_name
    ClusterName = var.primary_cluster_name
  }

  tags = var.common_tags
}

# =============================================================================
# CLOUDWATCH ALARMS IN DR REGION
# =============================================================================

# DR region API health alarm (monitors when DR is active)
resource "aws_cloudwatch_metric_alarm" "dr_api_health" {
  provider = aws.dr

  alarm_name          = "${var.name_prefix}-dr-api-health-alarm"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = "60"
  statistic           = "Minimum"
  threshold           = "1"
  alarm_description   = "DR region API health check failure"
  alarm_actions       = [var.dr_sns_topic_arn]
  ok_actions          = [var.dr_sns_topic_arn]

  dimensions = {
    HealthCheckId = aws_route53_health_check.dr_api.id
  }

  tags = var.common_tags
}

# DR region readiness alarm (monitors if DR can be activated)
resource "aws_cloudwatch_metric_alarm" "dr_readiness" {
  provider = aws.dr

  alarm_name          = "${var.name_prefix}-dr-readiness-alarm"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ActiveConnectionCount"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "DR region infrastructure readiness check"
  alarm_actions       = [var.dr_sns_topic_arn]

  dimensions = {
    ClusterName = var.dr_cluster_name
  }

  tags = var.common_tags
}

# =============================================================================
# COMPOSITE ALARMS FOR FAILOVER DECISION
# =============================================================================

# Composite alarm that triggers when primary region is completely down
resource "aws_cloudwatch_composite_alarm" "primary_region_down" {
  provider = aws.primary

  alarm_name        = "${var.name_prefix}-primary-region-down"
  alarm_description = "Primary region is completely down - trigger DR failover"

  alarm_rule = join(" AND ", [
    "ALARM(${aws_cloudwatch_metric_alarm.primary_api_health.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.primary_app_health.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.primary_ecs_services.alarm_name})"
  ])

  actions_enabled = true
  alarm_actions   = [var.failover_sns_topic_arn]

  tags = var.common_tags
}

# =============================================================================
# CROSS-REGION DASHBOARD
# =============================================================================

# CloudWatch Dashboard showing both regions
resource "aws_cloudwatch_dashboard" "cross_region_monitoring" {
  provider = aws.primary

  dashboard_name = "${var.name_prefix}-cross-region-monitoring"

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
            ["AWS/Route53", "HealthCheckStatus", "HealthCheckId", aws_route53_health_check.primary_api.id, { "region" = var.primary_region, "label" = "Primary API" }],
            [".", ".", ".", aws_route53_health_check.primary_app.id, { "region" = var.primary_region, "label" = "Primary App" }],
            [".", ".", ".", aws_route53_health_check.dr_api.id, { "region" = var.dr_region, "label" = "DR API" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.primary_region
          title   = "Health Check Status - Both Regions"
          period  = 300
          yAxis = {
            left = {
              min = 0
              max = 1
            }
          }
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
            ["AWS/ECS", "RunningTaskCount", "ServiceName", var.primary_backend_service_name, "ClusterName", var.primary_cluster_name, { "region" = var.primary_region, "label" = "Primary Backend Tasks" }],
            [".", ".", ".", var.dr_backend_service_name, ".", var.dr_cluster_name, { "region" = var.dr_region, "label" = "DR Backend Tasks" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.primary_region
          title   = "ECS Running Tasks - Both Regions"
          period  = 300
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 12
        width  = 24
        height = 6

        properties = {
          query   = "SOURCE '/aws/route53/healthchecks' | fields @timestamp, @message | filter @message like /FAILURE/ | sort @timestamp desc | limit 20"
          region  = var.primary_region
          title   = "Recent Health Check Failures"
          view    = "table"
        }
      }
    ]
  })

  tags = var.common_tags
}

# =============================================================================
# LAMBDA FUNCTION FOR AUTOMATED FAILOVER TRIGGER
# =============================================================================

# Lambda function that can be triggered by CloudWatch alarms
resource "aws_lambda_function" "failover_trigger" {
  provider = aws.primary

  filename         = "failover_trigger.zip"
  function_name    = "${var.name_prefix}-failover-trigger"
  role            = aws_iam_role.failover_trigger_lambda.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.failover_trigger_lambda.output_base64sha256
  runtime         = "python3.9"
  timeout         = 300

  environment {
    variables = {
      DR_REGION           = var.dr_region
      DR_CLUSTER_NAME     = var.dr_cluster_name
      FAILOVER_CONFIG_S3  = var.failover_config_s3_path
      SNS_TOPIC_ARN       = var.failover_sns_topic_arn
    }
  }

  tags = var.common_tags
}

# Lambda deployment package
data "archive_file" "failover_trigger_lambda" {
  type        = "zip"
  output_path = "failover_trigger.zip"
  source {
    content = templatefile("${path.module}/lambda/failover_trigger.py", {
      dr_region       = var.dr_region
      dr_cluster_name = var.dr_cluster_name
    })
    filename = "index.py"
  }
}

# IAM Role for Lambda
resource "aws_iam_role" "failover_trigger_lambda" {
  provider = aws.primary

  name = "${var.name_prefix}-failover-trigger-lambda-role"

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

resource "aws_iam_role_policy" "failover_trigger_lambda" {
  provider = aws.primary

  name = "${var.name_prefix}-failover-trigger-lambda-policy"
  role = aws_iam_role.failover_trigger_lambda.id

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
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeClusters"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "route53:ChangeResourceRecordSets",
          "route53:GetChange"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = var.failover_sns_topic_arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = "${var.failover_config_s3_path}/*"
      }
    ]
  })
}

# SNS Topic subscription for automated failover
resource "aws_sns_topic_subscription" "failover_trigger" {
  provider = aws.primary

  topic_arn = var.failover_sns_topic_arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.failover_trigger.arn
}

resource "aws_lambda_permission" "allow_sns_failover" {
  provider = aws.primary

  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.failover_trigger.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = var.failover_sns_topic_arn
}