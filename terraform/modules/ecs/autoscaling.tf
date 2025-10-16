# Enhanced Auto-Scaling Configuration for ECS Services

# Custom CloudWatch Metrics for Application-Specific Scaling
resource "aws_cloudwatch_metric_alarm" "backend_request_count_high" {
  alarm_name          = "${var.name_prefix}-backend-request-count-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "RequestCount"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Sum"
  threshold           = "1000"
  alarm_description   = "This metric monitors backend request count"
  alarm_actions       = [aws_appautoscaling_policy.backend_scale_up.arn]

  dimensions = {
    TargetGroup = aws_lb_target_group.backend.arn_suffix
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "backend_request_count_low" {
  alarm_name          = "${var.name_prefix}-backend-request-count-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "RequestCount"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "100"
  alarm_description   = "This metric monitors backend request count for scale down"
  alarm_actions       = [aws_appautoscaling_policy.backend_scale_down.arn]

  dimensions = {
    TargetGroup = aws_lb_target_group.backend.arn_suffix
  }

  tags = var.common_tags
}

# Step Scaling Policies for Backend
resource "aws_appautoscaling_policy" "backend_scale_up" {
  name               = "${var.name_prefix}-backend-scale-up"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown               = 300
    metric_aggregation_type = "Average"

    step_adjustment {
      metric_interval_lower_bound = 0
      scaling_adjustment          = 2
    }
  }
}

resource "aws_appautoscaling_policy" "backend_scale_down" {
  name               = "${var.name_prefix}-backend-scale-down"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown               = 300
    metric_aggregation_type = "Average"

    step_adjustment {
      metric_interval_upper_bound = 0
      scaling_adjustment          = -1
    }
  }
}

# Custom Metrics for Face Recognition Service
resource "aws_cloudwatch_metric_alarm" "face_recognition_queue_depth_high" {
  alarm_name          = "${var.name_prefix}-face-rec-queue-depth-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ApproximateNumberOfMessages"
  namespace           = "AWS/SQS"
  period              = "60"
  statistic           = "Average"
  threshold           = "10"
  alarm_description   = "This metric monitors face recognition queue depth"
  alarm_actions       = [aws_appautoscaling_policy.face_recognition_scale_up.arn]

  dimensions = {
    QueueName = "${var.name_prefix}-face-recognition-queue"
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "face_recognition_gpu_utilization_high" {
  alarm_name          = "${var.name_prefix}-face-rec-gpu-util-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "GPUUtilization"
  namespace           = "CWAgent"
  period              = "60"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors GPU utilization for face recognition"
  alarm_actions       = [aws_appautoscaling_policy.face_recognition_scale_up.arn]

  dimensions = {
    ServiceName = aws_ecs_service.face_recognition.name
  }

  tags = var.common_tags
}

# Step Scaling for Face Recognition Service
resource "aws_appautoscaling_policy" "face_recognition_scale_up" {
  name               = "${var.name_prefix}-face-rec-scale-up"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.face_recognition.resource_id
  scalable_dimension = aws_appautoscaling_target.face_recognition.scalable_dimension
  service_namespace  = aws_appautoscaling_target.face_recognition.service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown               = 600  # Longer cooldown for GPU instances
    metric_aggregation_type = "Average"

    step_adjustment {
      metric_interval_lower_bound = 0
      scaling_adjustment          = 1
    }
  }
}

# Predictive Scaling for Backend Service (AWS Application Auto Scaling)
resource "aws_appautoscaling_scheduled_action" "backend_morning_scale_up" {
  name               = "${var.name_prefix}-backend-morning-scale-up"
  service_namespace  = aws_appautoscaling_target.backend.service_namespace
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  schedule           = "cron(0 7 * * MON-FRI)"  # 7 AM weekdays

  scalable_target_action {
    min_capacity = 4
    max_capacity = 15
  }
}

resource "aws_appautoscaling_scheduled_action" "backend_evening_scale_down" {
  name               = "${var.name_prefix}-backend-evening-scale-down"
  service_namespace  = aws_appautoscaling_target.backend.service_namespace
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  schedule           = "cron(0 22 * * *)"  # 10 PM daily

  scalable_target_action {
    min_capacity = 2
    max_capacity = 10
  }
}

# Weekend scaling schedule
resource "aws_appautoscaling_scheduled_action" "backend_weekend_scale_down" {
  name               = "${var.name_prefix}-backend-weekend-scale-down"
  service_namespace  = aws_appautoscaling_target.backend.service_namespace
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  schedule           = "cron(0 0 * * SAT)"  # Saturday midnight

  scalable_target_action {
    min_capacity = 1
    max_capacity = 5
  }
}

# Enhanced Auto Scaling Targets with Updated Capacity
resource "aws_appautoscaling_target" "backend_enhanced" {
  max_capacity       = var.backend_max_capacity
  min_capacity       = var.backend_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  tags = var.common_tags
}

resource "aws_appautoscaling_target" "frontend_enhanced" {
  max_capacity       = var.frontend_max_capacity
  min_capacity       = var.frontend_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.frontend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  tags = var.common_tags
}

resource "aws_appautoscaling_target" "face_recognition_enhanced" {
  max_capacity       = var.face_recognition_max_capacity
  min_capacity       = var.face_recognition_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.face_recognition.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  tags = var.common_tags
}

# Target Tracking Scaling Policies with Custom Metrics
resource "aws_appautoscaling_policy" "backend_response_time" {
  name               = "${var.name_prefix}-backend-response-time-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend_enhanced.resource_id
  scalable_dimension = aws_appautoscaling_target.backend_enhanced.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend_enhanced.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.backend.arn_suffix}"
    }
    target_value       = 100.0
    scale_out_cooldown = 300
    scale_in_cooldown  = 300
  }
}

# Custom CloudWatch Dashboard for Auto Scaling Metrics
resource "aws_cloudwatch_dashboard" "autoscaling" {
  dashboard_name = "${var.name_prefix}-autoscaling-dashboard"

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
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.backend.name, "ClusterName", aws_ecs_cluster.main.name],
            [".", "MemoryUtilization", ".", ".", ".", "."],
            ["AWS/ApplicationELB", "RequestCount", "TargetGroup", aws_lb_target_group.backend.arn_suffix],
            [".", "TargetResponseTime", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Backend Service Metrics"
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
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.face_recognition.name, "ClusterName", aws_ecs_cluster.main.name],
            ["CWAgent", "GPUUtilization", "ServiceName", aws_ecs_service.face_recognition.name],
            ["AWS/SQS", "ApproximateNumberOfMessages", "QueueName", "${var.name_prefix}-face-recognition-queue"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Face Recognition Service Metrics"
          period  = 300
        }
      }
    ]
  })

  tags = var.common_tags
}