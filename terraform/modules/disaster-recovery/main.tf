# Disaster Recovery Module
# Creates infrastructure for disaster recovery environment

# Data sources
data "aws_availability_zones" "dr_available" {
  state = "available"
}

# Local values for DR environment
locals {
  dr_name_prefix = "${var.name_prefix}-dr"
  dr_azs         = slice(data.aws_availability_zones.dr_available.names, 0, 3)
}

# =============================================================================
# DISASTER RECOVERY VPC AND NETWORKING
# =============================================================================

# DR VPC
resource "aws_vpc" "dr_vpc" {
  cidr_block           = var.dr_vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.common_tags, {
    Name    = "${local.dr_name_prefix}-vpc"
    Purpose = "DisasterRecovery"
  })
}

# DR Internet Gateway
resource "aws_internet_gateway" "dr_igw" {
  vpc_id = aws_vpc.dr_vpc.id

  tags = merge(var.common_tags, {
    Name    = "${local.dr_name_prefix}-igw"
    Purpose = "DisasterRecovery"
  })
}

# DR Public Subnets
resource "aws_subnet" "dr_public" {
  count = length(local.dr_azs)

  vpc_id                  = aws_vpc.dr_vpc.id
  cidr_block              = cidrsubnet(var.dr_vpc_cidr, 8, count.index)
  availability_zone       = local.dr_azs[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.common_tags, {
    Name    = "${local.dr_name_prefix}-public-${count.index + 1}"
    Type    = "Public"
    Purpose = "DisasterRecovery"
  })
}

# DR Private Subnets
resource "aws_subnet" "dr_private" {
  count = length(local.dr_azs)

  vpc_id            = aws_vpc.dr_vpc.id
  cidr_block        = cidrsubnet(var.dr_vpc_cidr, 8, count.index + 10)
  availability_zone = local.dr_azs[count.index]

  tags = merge(var.common_tags, {
    Name    = "${local.dr_name_prefix}-private-${count.index + 1}"
    Type    = "Private"
    Purpose = "DisasterRecovery"
  })
}

# DR NAT Gateways
resource "aws_eip" "dr_nat" {
  count = var.enable_dr_nat_gateway ? length(local.dr_azs) : 0

  domain = "vpc"

  tags = merge(var.common_tags, {
    Name    = "${local.dr_name_prefix}-nat-eip-${count.index + 1}"
    Purpose = "DisasterRecovery"
  })

  depends_on = [aws_internet_gateway.dr_igw]
}

resource "aws_nat_gateway" "dr_nat" {
  count = var.enable_dr_nat_gateway ? length(local.dr_azs) : 0

  allocation_id = aws_eip.dr_nat[count.index].id
  subnet_id     = aws_subnet.dr_public[count.index].id

  tags = merge(var.common_tags, {
    Name    = "${local.dr_name_prefix}-nat-${count.index + 1}"
    Purpose = "DisasterRecovery"
  })

  depends_on = [aws_internet_gateway.dr_igw]
}

# DR Route Tables
resource "aws_route_table" "dr_public" {
  vpc_id = aws_vpc.dr_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.dr_igw.id
  }

  tags = merge(var.common_tags, {
    Name    = "${local.dr_name_prefix}-public-rt"
    Purpose = "DisasterRecovery"
  })
}

resource "aws_route_table" "dr_private" {
  count = length(local.dr_azs)

  vpc_id = aws_vpc.dr_vpc.id

  dynamic "route" {
    for_each = var.enable_dr_nat_gateway ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = aws_nat_gateway.dr_nat[count.index].id
    }
  }

  tags = merge(var.common_tags, {
    Name    = "${local.dr_name_prefix}-private-rt-${count.index + 1}"
    Purpose = "DisasterRecovery"
  })
}

# DR Route Table Associations
resource "aws_route_table_association" "dr_public" {
  count = length(aws_subnet.dr_public)

  subnet_id      = aws_subnet.dr_public[count.index].id
  route_table_id = aws_route_table.dr_public.id
}

resource "aws_route_table_association" "dr_private" {
  count = length(aws_subnet.dr_private)

  subnet_id      = aws_subnet.dr_private[count.index].id
  route_table_id = aws_route_table.dr_private[count.index].id
}

# =============================================================================
# DISASTER RECOVERY SECURITY GROUPS
# =============================================================================

# DR ALB Security Group
resource "aws_security_group" "dr_alb" {
  name_prefix = "${local.dr_name_prefix}-alb-"
  vpc_id      = aws_vpc.dr_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name    = "${local.dr_name_prefix}-alb-sg"
    Purpose = "DisasterRecovery"
  })
}

# DR Backend Security Group
resource "aws_security_group" "dr_backend" {
  name_prefix = "${local.dr_name_prefix}-backend-"
  vpc_id      = aws_vpc.dr_vpc.id

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.dr_alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name    = "${local.dr_name_prefix}-backend-sg"
    Purpose = "DisasterRecovery"
  })
}

# DR Frontend Security Group
resource "aws_security_group" "dr_frontend" {
  name_prefix = "${local.dr_name_prefix}-frontend-"
  vpc_id      = aws_vpc.dr_vpc.id

  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.dr_alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name    = "${local.dr_name_prefix}-frontend-sg"
    Purpose = "DisasterRecovery"
  })
}

# =============================================================================
# DISASTER RECOVERY ECS CLUSTER
# =============================================================================

# DR ECS Cluster
resource "aws_ecs_cluster" "dr_cluster" {
  name = "${local.dr_name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(var.common_tags, {
    Name    = "${local.dr_name_prefix}-cluster"
    Purpose = "DisasterRecovery"
  })
}

# DR Application Load Balancer
resource "aws_lb" "dr_alb" {
  name               = "${local.dr_name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.dr_alb.id]
  subnets            = aws_subnet.dr_public[*].id

  enable_deletion_protection = false

  tags = merge(var.common_tags, {
    Name    = "${local.dr_name_prefix}-alb"
    Purpose = "DisasterRecovery"
  })
}

# DR Target Groups (created but not used until failover)
resource "aws_lb_target_group" "dr_backend" {
  name     = "${local.dr_name_prefix}-backend-tg"
  port     = 8000
  protocol = "HTTP"
  vpc_id   = aws_vpc.dr_vpc.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/api/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = merge(var.common_tags, {
    Name    = "${local.dr_name_prefix}-backend-tg"
    Purpose = "DisasterRecovery"
  })
}

resource "aws_lb_target_group" "dr_frontend" {
  name     = "${local.dr_name_prefix}-frontend-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.dr_vpc.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = merge(var.common_tags, {
    Name    = "${local.dr_name_prefix}-frontend-tg"
    Purpose = "DisasterRecovery"
  })
}

# =============================================================================
# DISASTER RECOVERY STORAGE
# =============================================================================

# DR ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "dr_cache" {
  name       = "${local.dr_name_prefix}-cache-subnet"
  subnet_ids = aws_subnet.dr_private[*].id

  tags = var.common_tags
}

# DR ElastiCache Security Group
resource "aws_security_group" "dr_elasticache" {
  name_prefix = "${local.dr_name_prefix}-elasticache-"
  vpc_id      = aws_vpc.dr_vpc.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.dr_backend.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name    = "${local.dr_name_prefix}-elasticache-sg"
    Purpose = "DisasterRecovery"
  })
}

# DR EFS Security Group
resource "aws_security_group" "dr_efs" {
  name_prefix = "${local.dr_name_prefix}-efs-"
  vpc_id      = aws_vpc.dr_vpc.id

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.dr_backend.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name    = "${local.dr_name_prefix}-efs-sg"
    Purpose = "DisasterRecovery"
  })
}

# =============================================================================
# DISASTER RECOVERY MONITORING
# =============================================================================

# CloudWatch Log Group for DR
resource "aws_cloudwatch_log_group" "dr_logs" {
  name              = "/aws/ecs/${local.dr_name_prefix}"
  retention_in_days = var.log_retention_days

  tags = merge(var.common_tags, {
    Purpose = "DisasterRecovery"
  })
}

# Route 53 Health Check for Primary Region
resource "aws_route53_health_check" "primary_region" {
  fqdn                            = var.primary_domain
  port                            = 443
  type                            = "HTTPS"
  resource_path                   = "/api/health"
  failure_threshold               = "3"
  request_interval                = "30"
  cloudwatch_alarm_region         = var.primary_region
  cloudwatch_alarm_name           = "${var.name_prefix}-primary-health-check"
  insufficient_data_health_status = "Failure"

  tags = merge(var.common_tags, {
    Name    = "${var.name_prefix}-primary-health-check"
    Purpose = "DisasterRecovery"
  })
}

# CloudWatch Alarm for Primary Region Health
resource "aws_cloudwatch_metric_alarm" "primary_region_health" {
  alarm_name          = "${var.name_prefix}-primary-region-health"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = "60"
  statistic           = "Minimum"
  threshold           = "1"
  alarm_description   = "Primary region health check failure"
  alarm_actions       = [var.dr_sns_topic_arn]

  dimensions = {
    HealthCheckId = aws_route53_health_check.primary_region.id
  }

  tags = var.common_tags
}