# Network ACLs for additional security layers
# Provides subnet-level security as a second layer of defense

# Public Subnet Network ACL
resource "aws_network_acl" "public" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.public.*.id

  # Inbound Rules
  # Allow HTTP traffic from internet
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  # Allow HTTPS traffic from internet
  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  # Allow return traffic for outbound connections (ephemeral ports)
  ingress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  # Allow SSH from specific IP ranges (for debugging/maintenance)
  ingress {
    protocol   = "tcp"
    rule_no    = 130
    action     = "allow"
    cidr_block = var.admin_cidr_block
    from_port  = 22
    to_port    = 22
  }

  # Allow traffic from private subnets
  ingress {
    protocol   = "tcp"
    rule_no    = 140
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[0]
    from_port  = 0
    to_port    = 65535
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 141
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[1]
    from_port  = 0
    to_port    = 65535
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 142
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[2]
    from_port  = 0
    to_port    = 65535
  }

  # Outbound Rules
  # Allow all outbound traffic to internet
  egress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  egress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  # Allow traffic to private subnets
  egress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[0]
    from_port  = 0
    to_port    = 65535
  }

  egress {
    protocol   = "tcp"
    rule_no    = 121
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[1]
    from_port  = 0
    to_port    = 65535
  }

  egress {
    protocol   = "tcp"
    rule_no    = 122
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[2]
    from_port  = 0
    to_port    = 65535
  }

  # Allow ephemeral ports for return traffic
  egress {
    protocol   = "tcp"
    rule_no    = 130
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  # Allow DNS
  egress {
    protocol   = "udp"
    rule_no    = 140
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 53
    to_port    = 53
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-public-nacl"
  })
}

# Private Subnet Network ACL
resource "aws_network_acl" "private" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.private.*.id

  # Inbound Rules
  # Allow traffic from public subnets (ALB to services)
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = var.public_subnet_cidrs[0]
    from_port  = 0
    to_port    = 65535
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 101
    action     = "allow"
    cidr_block = var.public_subnet_cidrs[1]
    from_port  = 0
    to_port    = 65535
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 102
    action     = "allow"
    cidr_block = var.public_subnet_cidrs[2]
    from_port  = 0
    to_port    = 65535
  }

  # Allow inter-private subnet communication
  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[0]
    from_port  = 0
    to_port    = 65535
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 111
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[1]
    from_port  = 0
    to_port    = 65535
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 112
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[2]
    from_port  = 0
    to_port    = 65535
  }

  # Allow return traffic from internet (ephemeral ports)
  ingress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  # Allow SSH from bastion host (if needed)
  ingress {
    protocol   = "tcp"
    rule_no    = 130
    action     = "allow"
    cidr_block = var.admin_cidr_block
    from_port  = 22
    to_port    = 22
  }

  # Outbound Rules
  # Allow all outbound traffic to internet (for external API calls)
  egress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  egress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  # Allow traffic to public subnets
  egress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = var.public_subnet_cidrs[0]
    from_port  = 0
    to_port    = 65535
  }

  egress {
    protocol   = "tcp"
    rule_no    = 121
    action     = "allow"
    cidr_block = var.public_subnet_cidrs[1]
    from_port  = 0
    to_port    = 65535
  }

  egress {
    protocol   = "tcp"
    rule_no    = 122
    action     = "allow"
    cidr_block = var.public_subnet_cidrs[2]
    from_port  = 0
    to_port    = 65535
  }

  # Allow inter-private subnet communication
  egress {
    protocol   = "tcp"
    rule_no    = 130
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[0]
    from_port  = 0
    to_port    = 65535
  }

  egress {
    protocol   = "tcp"
    rule_no    = 131
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[1]
    from_port  = 0
    to_port    = 65535
  }

  egress {
    protocol   = "tcp"
    rule_no    = 132
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[2]
    from_port  = 0
    to_port    = 65535
  }

  # Allow DNS
  egress {
    protocol   = "udp"
    rule_no    = 140
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 53
    to_port    = 53
  }

  # Allow ephemeral ports for return traffic
  egress {
    protocol   = "tcp"
    rule_no    = 150
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-private-nacl"
  })
}

# Database Subnet Network ACL (for future RDS instances)
resource "aws_network_acl" "database" {
  vpc_id = aws_vpc.main.id
  # subnet_ids will be added when database subnets are created

  # Inbound Rules
  # Allow database traffic from private subnets only
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[0]
    from_port  = 5432  # PostgreSQL
    to_port    = 5432
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 101
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[1]
    from_port  = 5432
    to_port    = 5432
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 102
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[2]
    from_port  = 5432
    to_port    = 5432
  }

  # Allow Redis traffic from private subnets
  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[0]
    from_port  = 6379
    to_port    = 6379
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 111
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[1]
    from_port  = 6379
    to_port    = 6379
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 112
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[2]
    from_port  = 6379
    to_port    = 6379
  }

  # Outbound Rules
  # Allow return traffic to private subnets
  egress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[0]
    from_port  = 1024
    to_port    = 65535
  }

  egress {
    protocol   = "tcp"
    rule_no    = 101
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[1]
    from_port  = 1024
    to_port    = 65535
  }

  egress {
    protocol   = "tcp"
    rule_no    = 102
    action     = "allow"
    cidr_block = var.private_subnet_cidrs[2]
    from_port  = 1024
    to_port    = 65535
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-database-nacl"
  })
}

# Flow Logs for network monitoring
resource "aws_flow_log" "vpc_flow_log" {
  iam_role_arn    = aws_iam_role.flow_log_role.arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_log.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-vpc-flow-log"
  })
}

# CloudWatch Log Group for VPC Flow Logs
resource "aws_cloudwatch_log_group" "vpc_flow_log" {
  name              = "/aws/vpc/flowlogs/${var.name_prefix}"
  retention_in_days = 14

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-vpc-flow-log-group"
  })
}

# IAM Role for VPC Flow Logs
resource "aws_iam_role" "flow_log_role" {
  name = "${var.name_prefix}-flow-log-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

# IAM Policy for VPC Flow Logs
resource "aws_iam_role_policy" "flow_log_policy" {
  name = "${var.name_prefix}-flow-log-policy"
  role = aws_iam_role.flow_log_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}