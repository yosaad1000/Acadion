# Face Recognition Microservice ECS Configuration with GPU Support

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ami" "ecs_gpu" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-ecs-gpu-hvm-*"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

# ECR Repository for Face Recognition Service
resource "aws_ecr_repository" "face_recognition" {
  name                 = "${var.project_name}-face-recognition"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = var.tags
}

resource "aws_ecr_lifecycle_policy" "face_recognition" {
  repository = aws_ecr_repository.face_recognition.name

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
        description  = "Keep last 5 development images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["dev", "staging"]
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

# IAM Role for ECS Task
resource "aws_iam_role" "face_recognition_task" {
  name = "${var.project_name}-face-recognition-task-role"

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

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "face_recognition_task_execution" {
  role       = aws_iam_role.face_recognition_task.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Custom policy for Pinecone and CloudWatch access
resource "aws_iam_role_policy" "face_recognition_task_policy" {
  name = "${var.project_name}-face-recognition-task-policy"
  role = aws_iam_role.face_recognition_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/face-recognition/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.project_name}/pinecone/*"
        ]
      }
    ]
  })
}

data "aws_caller_identity" "current" {}

# IAM Role for ECS Instance (EC2)
resource "aws_iam_role" "face_recognition_instance" {
  name = "${var.project_name}-face-recognition-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "face_recognition_instance_ecs" {
  role       = aws_iam_role.face_recognition_instance.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

resource "aws_iam_instance_profile" "face_recognition_instance" {
  name = "${var.project_name}-face-recognition-instance-profile"
  role = aws_iam_role.face_recognition_instance.name

  tags = var.tags
}

# Security Group for Face Recognition Service
resource "aws_security_group" "face_recognition" {
  name_prefix = "${var.project_name}-face-recognition-"
  vpc_id      = var.vpc_id
  description = "Security group for Face Recognition microservice"

  # Allow inbound traffic from ALB
  ingress {
    from_port       = 8001
    to_port         = 8001
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
    description     = "Face Recognition API from ALB"
  }

  # Allow inbound traffic from backend service
  ingress {
    from_port       = 8001
    to_port         = 8001
    protocol        = "tcp"
    security_groups = [var.backend_security_group_id]
    description     = "Face Recognition API from Backend"
  }

  # Allow SSH access for debugging (optional)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "SSH access from VPC"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-face-recognition-sg"
  })
}

# Launch Template for GPU Instances
resource "aws_launch_template" "face_recognition_gpu" {
  name_prefix   = "${var.project_name}-face-recognition-gpu-"
  image_id      = data.aws_ami.ecs_gpu.id
  instance_type = var.gpu_instance_type

  vpc_security_group_ids = [aws_security_group.face_recognition.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.face_recognition_instance.name
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    cluster_name = aws_ecs_cluster.face_recognition.name
    region       = var.aws_region
  }))

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 50
      volume_type          = "gp3"
      encrypted            = true
      delete_on_termination = true
    }
  }

  monitoring {
    enabled = true
  }

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  tag_specifications {
    resource_type = "instance"
    tags = merge(var.tags, {
      Name = "${var.project_name}-face-recognition-gpu"
    })
  }

  tags = var.tags
}

# ECS Cluster for Face Recognition
resource "aws_ecs_cluster" "face_recognition" {
  name = "${var.project_name}-face-recognition"

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.face_recognition.name
      }
    }
  }

  tags = var.tags
}

resource "aws_ecs_cluster_capacity_providers" "face_recognition" {
  cluster_name = aws_ecs_cluster.face_recognition.name

  capacity_providers = [aws_ecs_capacity_provider.face_recognition_gpu.name]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = aws_ecs_capacity_provider.face_recognition_gpu.name
  }
}

# ECS Capacity Provider for GPU Instances
resource "aws_ecs_capacity_provider" "face_recognition_gpu" {
  name = "${var.project_name}-face-recognition-gpu"

  auto_scaling_group_provider {
    auto_scaling_group_arn         = aws_autoscaling_group.face_recognition_gpu.arn
    managed_termination_protection = "ENABLED"

    managed_scaling {
      maximum_scaling_step_size = 2
      minimum_scaling_step_size = 1
      status                    = "ENABLED"
      target_capacity           = 100
    }
  }

  tags = var.tags
}

# Auto Scaling Group for GPU Instances
resource "aws_autoscaling_group" "face_recognition_gpu" {
  name                = "${var.project_name}-face-recognition-gpu-asg"
  vpc_zone_identifier = var.private_subnet_ids
  target_group_arns   = [aws_lb_target_group.face_recognition.arn]
  health_check_type   = "ELB"
  health_check_grace_period = 300

  min_size         = var.min_capacity
  max_size         = var.max_capacity
  desired_capacity = var.desired_capacity

  launch_template {
    id      = aws_launch_template.face_recognition_gpu.id
    version = "$Latest"
  }

  # Instance protection for cost optimization
  protect_from_scale_in = true

  tag {
    key                 = "Name"
    value               = "${var.project_name}-face-recognition-gpu-instance"
    propagate_at_launch = true
  }

  dynamic "tag" {
    for_each = var.tags
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "face_recognition" {
  name              = "/ecs/${var.project_name}-face-recognition"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# ECS Task Definition
resource "aws_ecs_task_definition" "face_recognition" {
  family                   = "${var.project_name}-face-recognition"
  requires_compatibilities = ["EC2"]
  network_mode            = "bridge"
  execution_role_arn      = aws_iam_role.face_recognition_task.arn
  task_role_arn           = aws_iam_role.face_recognition_task.arn

  # Resource requirements for GPU instances
  cpu    = var.task_cpu
  memory = var.task_memory

  container_definitions = jsonencode([
    {
      name  = "face-recognition"
      image = "${aws_ecr_repository.face_recognition.repository_url}:${var.image_tag}"

      # GPU resource requirements
      resourceRequirements = [
        {
          type  = "GPU"
          value = "1"
        }
      ]

      # Port mappings
      portMappings = [
        {
          containerPort = 8001
          hostPort      = 0
          protocol      = "tcp"
        }
      ]

      # Environment variables
      environment = [
        {
          name  = "PINECONE_INDEX_NAME"
          value = var.pinecone_index_name
        },
        {
          name  = "FACE_THRESHOLD"
          value = tostring(var.face_threshold)
        },
        {
          name  = "LOG_LEVEL"
          value = var.log_level
        },
        {
          name  = "MAX_CONCURRENT_REQUESTS"
          value = tostring(var.max_concurrent_requests)
        }
      ]

      # Secrets from Parameter Store
      secrets = [
        {
          name      = "PINECONE_API_KEY"
          valueFrom = aws_ssm_parameter.pinecone_api_key.arn
        }
      ]

      # Logging configuration
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.face_recognition.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      # Health check
      healthCheck = {
        command = [
          "CMD-SHELL",
          "python3 -c \"import requests; requests.get('http://localhost:8001/health', timeout=5)\""
        ]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      # Essential container
      essential = true

      # Memory reservation
      memoryReservation = var.task_memory_reservation
    }
  ])

  tags = var.tags
}

# ECS Service
resource "aws_ecs_service" "face_recognition" {
  name            = "${var.project_name}-face-recognition"
  cluster         = aws_ecs_cluster.face_recognition.id
  task_definition = aws_ecs_task_definition.face_recognition.arn
  desired_count   = var.service_desired_count

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.face_recognition_gpu.name
    weight           = 100
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.face_recognition.arn
    container_name   = "face-recognition"
    container_port   = 8001
  }

  # Service discovery
  service_registries {
    registry_arn = aws_service_discovery_service.face_recognition.arn
  }

  # Deployment configuration
  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 50
  }

  # Enable execute command for debugging
  enable_execute_command = var.enable_execute_command

  depends_on = [
    aws_lb_listener.face_recognition,
    aws_iam_role_policy_attachment.face_recognition_task_execution
  ]

  tags = var.tags
}

# Application Load Balancer Target Group
resource "aws_lb_target_group" "face_recognition" {
  name     = "${var.project_name}-face-recognition-tg"
  port     = 8001
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    path                = "/health"
    matcher             = "200"
    port                = "traffic-port"
    protocol            = "HTTP"
  }

  # Deregistration delay for graceful shutdown
  deregistration_delay = 30

  tags = var.tags
}

# ALB Listener Rule for Face Recognition Service
resource "aws_lb_listener_rule" "face_recognition" {
  listener_arn = var.alb_listener_arn
  priority     = var.listener_rule_priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.face_recognition.arn
  }

  condition {
    path_pattern {
      values = ["/face-recognition/*"]
    }
  }

  tags = var.tags
}

# Internal Load Balancer for Service-to-Service Communication
resource "aws_lb" "face_recognition_internal" {
  name               = "${var.project_name}-face-recognition-nlb"
  internal           = true
  load_balancer_type = "network"
  subnets            = var.private_subnet_ids

  enable_deletion_protection = false

  tags = var.tags
}

resource "aws_lb_target_group" "face_recognition_internal" {
  name     = "${var.project_name}-face-recognition-internal-tg"
  port     = 8001
  protocol = "TCP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    port                = "traffic-port"
    protocol            = "TCP"
  }

  tags = var.tags
}

resource "aws_lb_listener" "face_recognition" {
  load_balancer_arn = aws_lb.face_recognition_internal.arn
  port              = "8001"
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.face_recognition_internal.arn
  }

  tags = var.tags
}

# Service Discovery
resource "aws_service_discovery_private_dns_namespace" "face_recognition" {
  name        = "${var.project_name}.local"
  description = "Private DNS namespace for Face Recognition service"
  vpc         = var.vpc_id

  tags = var.tags
}

resource "aws_service_discovery_service" "face_recognition" {
  name = "face-recognition"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.face_recognition.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_grace_period_seconds = 30

  tags = var.tags
}

# Auto Scaling Policies
resource "aws_appautoscaling_target" "face_recognition" {
  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${aws_ecs_cluster.face_recognition.name}/${aws_ecs_service.face_recognition.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  tags = var.tags
}

# CPU-based scaling policy
resource "aws_appautoscaling_policy" "face_recognition_cpu" {
  name               = "${var.project_name}-face-recognition-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.face_recognition.resource_id
  scalable_dimension = aws_appautoscaling_target.face_recognition.scalable_dimension
  service_namespace  = aws_appautoscaling_target.face_recognition.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = var.cpu_target_value
  }
}

# Custom metric scaling policy for queue length
resource "aws_appautoscaling_policy" "face_recognition_queue" {
  name               = "${var.project_name}-face-recognition-queue-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.face_recognition.resource_id
  scalable_dimension = aws_appautoscaling_target.face_recognition.scalable_dimension
  service_namespace  = aws_appautoscaling_target.face_recognition.service_namespace

  target_tracking_scaling_policy_configuration {
    customized_metric_specification {
      metric_name = "QueueLength"
      namespace   = "${var.project_name}/FaceRecognition"
      statistic   = "Average"
    }
    target_value = var.queue_target_value
  }
}

# SSM Parameters for configuration
resource "aws_ssm_parameter" "pinecone_api_key" {
  name  = "/${var.project_name}/face-recognition/pinecone-api-key"
  type  = "SecureString"
  value = var.pinecone_api_key

  tags = var.tags
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "face_recognition_cpu_high" {
  alarm_name          = "${var.project_name}-face-recognition-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors face recognition service CPU utilization"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    ServiceName = aws_ecs_service.face_recognition.name
    ClusterName = aws_ecs_cluster.face_recognition.name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "face_recognition_memory_high" {
  alarm_name          = "${var.project_name}-face-recognition-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors face recognition service memory utilization"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    ServiceName = aws_ecs_service.face_recognition.name
    ClusterName = aws_ecs_cluster.face_recognition.name
  }

  tags = var.tags
}