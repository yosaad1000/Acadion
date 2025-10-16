# CloudWatch Module for AWS Free Tier Deployment
# Free tier: 10 custom metrics, 1M API requests, 5GB log ingestion

# CloudWatch Dashboard for monitoring
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.name_prefix}-dashboard"

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
            ["AWS/EC2", "CPUUtilization", "InstanceId", var.ec2_instance_id],
            [".", "NetworkIn", ".", "."],
            [".", "NetworkOut", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "EC2 Instance Metrics"
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
            ["AWS/Lambda", "Duration", "FunctionName", var.lambda_function_name],
            [".", "Errors", ".", "."],
            [".", "Invocations", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "Lambda Function Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfVisibleMessages", "QueueName", "${var.name_prefix}-face-processing"],
            [".", "NumberOfMessagesSent", ".", "."],
            [".", "NumberOfMessagesReceived", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "SQS Queue Metrics"
          period  = 300
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 18
        width  = 24
        height = 6

        properties = {
          query   = "SOURCE '/aws/ec2/${var.name_prefix}' | fields @timestamp, @message | sort @timestamp desc | limit 100"
          region  = data.aws_region.current.name
          title   = "Recent EC2 Logs"
        }
      }
    ]
  })

  tags = var.tags
}

# CloudWatch Alarms for EC2 monitoring
resource "aws_cloudwatch_metric_alarm" "ec2_cpu_high" {
  alarm_name          = "${var.name_prefix}-ec2-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ec2 cpu utilization"
  alarm_actions       = var.alarm_actions

  dimensions = {
    InstanceId = var.ec2_instance_id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "ec2_status_check" {
  alarm_name          = "${var.name_prefix}-ec2-status-check"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Maximum"
  threshold           = "0"
  alarm_description   = "This metric monitors ec2 status check"
  alarm_actions       = var.alarm_actions

  dimensions = {
    InstanceId = var.ec2_instance_id
  }

  tags = var.tags
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
    FunctionName = var.lambda_function_name
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
  threshold           = "25000"  # 25 seconds
  alarm_description   = "This metric monitors lambda duration"
  alarm_actions       = var.alarm_actions

  dimensions = {
    FunctionName = var.lambda_function_name
  }

  tags = var.tags
}

# Custom CloudWatch Metrics for application monitoring
resource "aws_cloudwatch_log_metric_filter" "error_count" {
  name           = "${var.name_prefix}-error-count"
  log_group_name = "/aws/ec2/${var.name_prefix}"
  pattern        = "ERROR"

  metric_transformation {
    name      = "ErrorCount"
    namespace = "Acadion/Application"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "api_response_time" {
  name           = "${var.name_prefix}-api-response-time"
  log_group_name = "/aws/ec2/${var.name_prefix}"
  pattern        = "[timestamp, request_id, method, path, status_code, response_time]"

  metric_transformation {
    name      = "APIResponseTime"
    namespace = "Acadion/Application"
    value     = "$response_time"
  }
}

# CloudWatch Alarm for application errors
resource "aws_cloudwatch_metric_alarm" "application_errors" {
  alarm_name          = "${var.name_prefix}-application-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ErrorCount"
  namespace           = "Acadion/Application"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors application errors"
  alarm_actions       = var.alarm_actions
  treat_missing_data  = "notBreaching"

  tags = var.tags
}

# CloudWatch Alarm for API response time
resource "aws_cloudwatch_metric_alarm" "api_response_time" {
  alarm_name          = "${var.name_prefix}-api-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "APIResponseTime"
  namespace           = "Acadion/Application"
  period              = "300"
  statistic           = "Average"
  threshold           = "2000"  # 2 seconds
  alarm_description   = "This metric monitors API response time"
  alarm_actions       = var.alarm_actions
  treat_missing_data  = "notBreaching"

  tags = var.tags
}

# SNS Topic for alarm notifications (free tier: 1,000 notifications)
resource "aws_sns_topic" "alarms" {
  count = var.create_sns_topic ? 1 : 0
  name  = "${var.name_prefix}-alarms"

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-alarms"
    Type = "Notifications"
  })
}

# SNS Topic Subscription for email notifications
resource "aws_sns_topic_subscription" "email_alerts" {
  count     = var.create_sns_topic && var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alarms[0].arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# CloudWatch Composite Alarm for overall system health
resource "aws_cloudwatch_composite_alarm" "system_health" {
  alarm_name        = "${var.name_prefix}-system-health"
  alarm_description = "Overall system health composite alarm"

  alarm_rule = join(" OR ", [
    "ALARM(${aws_cloudwatch_metric_alarm.ec2_cpu_high.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.ec2_status_check.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.lambda_errors.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.application_errors.alarm_name})"
  ])

  alarm_actions = var.create_sns_topic ? [aws_sns_topic.alarms[0].arn] : var.alarm_actions

  tags = var.tags
}

# CloudWatch Insights queries for troubleshooting
resource "aws_cloudwatch_query_definition" "error_analysis" {
  name = "${var.name_prefix}-error-analysis"

  log_group_names = [
    "/aws/ec2/${var.name_prefix}",
    "/aws/lambda/${var.name_prefix}-face-recognition"
  ]

  query_string = <<EOF
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100
EOF
}

resource "aws_cloudwatch_query_definition" "performance_analysis" {
  name = "${var.name_prefix}-performance-analysis"

  log_group_names = [
    "/aws/ec2/${var.name_prefix}"
  ]

  query_string = <<EOF
fields @timestamp, @message
| filter @message like /response_time/
| stats avg(response_time) by bin(5m)
| sort @timestamp desc
EOF
}

# Cost monitoring (using CloudWatch billing metrics)
resource "aws_cloudwatch_metric_alarm" "estimated_charges" {
  count               = var.enable_billing_alerts ? 1 : 0
  alarm_name          = "${var.name_prefix}-estimated-charges"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = "86400"  # 24 hours
  statistic           = "Maximum"
  threshold           = var.billing_alert_threshold
  alarm_description   = "This metric monitors estimated AWS charges"
  alarm_actions       = var.create_sns_topic ? [aws_sns_topic.alarms[0].arn] : var.alarm_actions

  dimensions = {
    Currency = "USD"
  }

  tags = var.tags
}

# Data source for current region
data "aws_region" "current" {}