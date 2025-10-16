# ECS Services

# Backend Service
resource "aws_ecs_service" "backend" {
  name            = "${var.name_prefix}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [var.backend_security_group_id]
    subnets          = var.private_subnet_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8000
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
    
    deployment_circuit_breaker {
      enable   = true
      rollback = true
    }
  }

  depends_on = [
    aws_lb_listener.backend,
    aws_iam_role_policy_attachment.ecs_task_execution_role_policy
  ]

  tags = var.common_tags
}

# Frontend Service
resource "aws_ecs_service" "frontend" {
  name            = "${var.name_prefix}-frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [var.frontend_security_group_id]
    subnets          = var.private_subnet_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 80
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
    
    deployment_circuit_breaker {
      enable   = true
      rollback = true
    }
  }

  depends_on = [
    aws_lb_listener.frontend,
    aws_iam_role_policy_attachment.ecs_task_execution_role_policy
  ]

  tags = var.common_tags
}

# Face Recognition Service (EC2 for GPU support)
resource "aws_ecs_service" "face_recognition" {
  name            = "${var.name_prefix}-face-recognition"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.face_recognition.arn
  desired_count   = 1
  launch_type     = "EC2"

  network_configuration {
    security_groups = [var.face_recognition_security_group_id]
    subnets         = var.private_subnet_ids
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.face_recognition.arn
    container_name   = "face-recognition"
    container_port   = 8001
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 50
    
    deployment_circuit_breaker {
      enable   = true
      rollback = true
    }
  }

  placement_constraints {
    type       = "memberOf"
    expression = "attribute:ecs.instance-type =~ g4dn.*"
  }

  depends_on = [
    aws_lb_listener.face_recognition,
    aws_iam_role_policy_attachment.ecs_task_execution_role_policy
  ]

  tags = var.common_tags
}

# Note: Enhanced auto-scaling configuration is now in autoscaling.tf