# Security Groups for different service tiers with least privilege access

# ALB Security Group - Restrictive ingress with rate limiting considerations
resource "aws_security_group" "alb" {
  name_prefix = "${var.name_prefix}-alb-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for Application Load Balancer with least privilege access"

  # HTTP traffic (will be redirected to HTTPS)
  ingress {
    description = "HTTP - redirect to HTTPS"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS traffic from internet
  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Restrictive egress - only to frontend and backend services
  egress {
    description     = "HTTP to Frontend services"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.frontend.id]
  }

  egress {
    description     = "HTTP to Backend services"
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  # Allow health checks
  egress {
    description = "Health checks to private subnets"
    from_port   = 80
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = [var.private_subnet_cidrs[0], var.private_subnet_cidrs[1], var.private_subnet_cidrs[2]]
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-alb-sg"
    SecurityLevel = "internet-facing"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Frontend Service Security Group - Least privilege access
resource "aws_security_group" "frontend" {
  name_prefix = "${var.name_prefix}-frontend-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for Frontend ECS service with least privilege"

  # Only allow traffic from ALB
  ingress {
    description     = "HTTP from ALB only"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Restrictive egress - only necessary outbound connections
  egress {
    description     = "HTTPS to Backend API"
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  # Allow HTTPS for CDN and external API calls
  egress {
    description = "HTTPS for external APIs and CDN"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # DNS resolution
  egress {
    description = "DNS resolution"
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-frontend-sg"
    SecurityLevel = "public-subnet"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Backend Service Security Group - Highly restrictive
resource "aws_security_group" "backend" {
  name_prefix = "${var.name_prefix}-backend-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for Backend ECS service with minimal access"

  # Only allow traffic from ALB and Frontend
  ingress {
    description     = "API traffic from ALB"
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "API traffic from Frontend"
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.frontend.id]
  }

  # Restrictive egress - only necessary connections
  egress {
    description     = "Face Recognition microservice"
    from_port       = 8001
    to_port         = 8001
    protocol        = "tcp"
    security_groups = [aws_security_group.face_recognition.id]
  }

  egress {
    description     = "Redis cache"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.elasticache.id]
  }

  egress {
    description     = "EFS storage"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.efs.id]
  }

  # HTTPS for external APIs (Supabase, Pinecone)
  egress {
    description = "HTTPS for external APIs"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # DNS resolution
  egress {
    description = "DNS resolution"
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # VPC endpoints access
  egress {
    description     = "VPC endpoints"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.vpc_endpoints.id]
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-backend-sg"
    SecurityLevel = "private-subnet"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Face Recognition Service Security Group - Isolated microservice
resource "aws_security_group" "face_recognition" {
  name_prefix = "${var.name_prefix}-face-rec-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for Face Recognition microservice - isolated access"

  # Only allow traffic from Backend service
  ingress {
    description     = "API traffic from Backend only"
    from_port       = 8001
    to_port         = 8001
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  # Minimal egress - only necessary connections
  egress {
    description     = "Redis cache access"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.elasticache.id]
  }

  egress {
    description     = "EFS storage access"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.efs.id]
  }

  # HTTPS for Pinecone vector database
  egress {
    description = "HTTPS for Pinecone API"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # DNS resolution
  egress {
    description = "DNS resolution"
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # VPC endpoints access
  egress {
    description     = "VPC endpoints"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.vpc_endpoints.id]
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-face-recognition-sg"
    SecurityLevel = "private-subnet-isolated"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ElastiCache Security Group
resource "aws_security_group" "elasticache" {
  name_prefix = "${var.name_prefix}-elasticache-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for ElastiCache Redis cluster"

  ingress {
    description     = "Redis from Backend"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  ingress {
    description     = "Redis from Face Recognition"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.face_recognition.id]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-elasticache-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# EFS Security Group
resource "aws_security_group" "efs" {
  name_prefix = "${var.name_prefix}-efs-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for EFS file system"

  ingress {
    description     = "NFS from Backend"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  ingress {
    description     = "NFS from Face Recognition"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.face_recognition.id]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-efs-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# VPC Endpoints Security Group
resource "aws_security_group" "vpc_endpoints" {
  name_prefix = "${var.name_prefix}-vpc-endpoints-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for VPC endpoints"

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-vpc-endpoints-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}