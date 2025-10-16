# ECS Task Definitions

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.name_prefix}-ecs-task-execution-role"

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

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional IAM Policy for ECS Tasks (S3 and CloudWatch access)
resource "aws_iam_role_policy" "ecs_task_additional_policy" {
  name = "${var.name_prefix}-ecs-task-additional-policy"
  role = split("/", var.parameter_store_task_role_arn)[1]  # Extract role name from ARN

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "arn:aws:s3:::${var.name_prefix}-*/*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:log-group:/ecs/${var.name_prefix}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "efs:ClientMount",
          "efs:ClientWrite",
          "efs:ClientRootAccess"
        ]
        Resource = "arn:aws:elasticfilesystem:${var.aws_region}:*:file-system/*"
      },
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets",
          "xray:GetSamplingStatisticSummaries"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      }
    ]
  })
}

# Backend Task Definition
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.name_prefix}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn           = var.parameter_store_task_role_arn

  container_definitions = jsonencode([
    {
      name  = "backend"
      image = "${var.ecr_repository_url}/backend:latest"
      
      portMappings = [
        {
          containerPort = 8000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "ENVIRONMENT"
          value = var.environment
        },
        {
          name  = "REDIS_URL"
          value = "redis://${var.redis_endpoint}:6379"
        },
        {
          name  = "FACE_RECOGNITION_SERVICE_URL"
          value = "http://${aws_lb.face_recognition.dns_name}:8001"
        },
        {
          name  = "XRAY_ENABLED"
          value = "true"
        },
        {
          name  = "AWS_XRAY_TRACING_NAME"
          value = "acadion-backend"
        },
        {
          name  = "AWS_XRAY_DAEMON_ADDRESS"
          value = "127.0.0.1:2000"
        }
      ]

      secrets = [
        {
          name      = "SUPABASE_URL"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.environment}/${split("-", var.name_prefix)[0]}/secrets/supabase-url"
        },
        {
          name      = "SUPABASE_KEY"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.environment}/${split("-", var.name_prefix)[0]}/secrets/supabase-key"
        },
        {
          name      = "SUPABASE_SERVICE_KEY"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.environment}/${split("-", var.name_prefix)[0]}/secrets/supabase-service-key"
        },
        {
          name      = "SECRET_KEY"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.environment}/${split("-", var.name_prefix)[0]}/secrets/jwt-secret-key"
        },
        {
          name      = "PINECONE_API_KEY"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.environment}/${split("-", var.name_prefix)[0]}/secrets/pinecone-api-key"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.backend.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8000/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      essential = true
    },
    {
      name  = "xray-daemon"
      image = "amazon/aws-xray-daemon:latest"
      
      portMappings = [
        {
          containerPort = 2000
          protocol      = "udp"
        }
      ]

      environment = [
        {
          name  = "AWS_REGION"
          value = var.aws_region
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.backend.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "xray-daemon"
        }
      }

      essential = false
    }
  ])

  tags = var.common_tags
}

# Frontend Task Definition
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.name_prefix}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.frontend_cpu
  memory                   = var.frontend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn           = var.parameter_store_task_role_arn

  container_definitions = jsonencode([
    {
      name  = "frontend"
      image = "${var.ecr_repository_url}/frontend:latest"
      
      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "REACT_APP_ENVIRONMENT"
          value = var.environment
        },
        {
          name  = "REACT_APP_API_URL"
          value = "http://${aws_lb.main.dns_name}:8000"
        }
      ]

      secrets = [
        {
          name      = "REACT_APP_SUPABASE_URL"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.environment}/${split("-", var.name_prefix)[0]}/secrets/supabase-url"
        },
        {
          name      = "REACT_APP_SUPABASE_ANON_KEY"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.environment}/${split("-", var.name_prefix)[0]}/secrets/supabase-key"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.frontend.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:80/ || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }

      essential = true
    }
  ])

  tags = var.common_tags
}

# Face Recognition Task Definition (EC2 for GPU support)
resource "aws_ecs_task_definition" "face_recognition" {
  family                = "${var.name_prefix}-face-recognition"
  network_mode          = "awsvpc"
  requires_compatibilities = ["EC2"]
  cpu                   = var.face_recognition_cpu
  memory                = var.face_recognition_memory
  execution_role_arn    = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn        = var.parameter_store_task_role_arn

  container_definitions = jsonencode([
    {
      name  = "face-recognition"
      image = "${var.ecr_repository_url}/face-recognition:latest"
      
      portMappings = [
        {
          containerPort = 8001
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "ENVIRONMENT"
          value = var.environment
        },
        {
          name  = "REDIS_URL"
          value = "redis://${var.redis_endpoint}:6379"
        },
        {
          name  = "XRAY_ENABLED"
          value = "true"
        },
        {
          name  = "AWS_XRAY_TRACING_NAME"
          value = "acadion-face-recognition"
        },
        {
          name  = "AWS_XRAY_DAEMON_ADDRESS"
          value = "127.0.0.1:2000"
        }
      ]

      secrets = [
        {
          name      = "PINECONE_API_KEY"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.environment}/${split("-", var.name_prefix)[0]}/secrets/pinecone-api-key"
        },
        {
          name      = "PINECONE_ENVIRONMENT"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.environment}/${split("-", var.name_prefix)[0]}/secrets/pinecone-environment"
        },
        {
          name      = "PINECONE_INDEX_NAME"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.environment}/${split("-", var.name_prefix)[0]}/secrets/pinecone-index-name"
        }
      ]

      mountPoints = [
        {
          sourceVolume  = "efs-storage"
          containerPath = "/app/storage"
          readOnly      = false
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.face_recognition.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8001/health || exit 1"]
        interval    = 30
        timeout     = 10
        retries     = 3
        startPeriod = 120
      }

      resourceRequirements = [
        {
          type  = "GPU"
          value = "1"
        }
      ]

      essential = true
    },
    {
      name  = "xray-daemon"
      image = "amazon/aws-xray-daemon:latest"
      
      portMappings = [
        {
          containerPort = 2000
          protocol      = "udp"
        }
      ]

      environment = [
        {
          name  = "AWS_REGION"
          value = var.aws_region
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.face_recognition.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "xray-daemon"
        }
      }

      essential = false
    }
  ])

  volume {
    name = "efs-storage"

    efs_volume_configuration {
      file_system_id = var.efs_file_system_id
      root_directory = "/"
    }
  }

  tags = var.common_tags
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}