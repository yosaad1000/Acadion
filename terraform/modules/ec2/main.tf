# EC2 Module for AWS Free Tier Deployment
# Free tier: 750 hours/month of t2.micro

# Data source for latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Key Pair for SSH access (optional)
resource "aws_key_pair" "main" {
  count      = var.public_key != "" ? 1 : 0
  key_name   = "${var.name_prefix}-keypair"
  public_key = var.public_key

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-keypair"
  })
}

# EC2 Instance
resource "aws_instance" "backend" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  key_name               = var.public_key != "" ? aws_key_pair.main[0].key_name : null
  vpc_security_group_ids = var.security_group_ids
  subnet_id              = var.subnet_id
  iam_instance_profile   = var.iam_instance_profile

  # EBS root volume (free tier: 30GB)
  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.ebs_volume_size
    delete_on_termination = true
    encrypted             = true

    tags = merge(var.tags, {
      Name = "${var.name_prefix}-root-volume"
    })
  }

  # User data for initial setup
  user_data = var.user_data

  # Enable detailed monitoring (may incur costs)
  monitoring = var.enable_detailed_monitoring

  # Metadata options for security
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
    instance_metadata_tags      = "enabled"
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-backend"
    Type = "Backend"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Elastic IP for consistent public IP (free tier: 1 EIP when attached)
resource "aws_eip" "backend" {
  count    = var.allocate_eip ? 1 : 0
  instance = aws_instance.backend.id
  domain   = "vpc"

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-backend-eip"
  })

  depends_on = [aws_instance.backend]
}

# CloudWatch Log Group for EC2 logs
resource "aws_cloudwatch_log_group" "ec2_logs" {
  name              = "/aws/ec2/${var.name_prefix}"
  retention_in_days = 7  # Free tier: 5GB storage

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-ec2-logs"
  })
}

# CloudWatch Agent configuration (for custom metrics)
resource "aws_ssm_parameter" "cloudwatch_config" {
  name  = "/${var.name_prefix}/cloudwatch-agent-config"
  type  = "String"
  value = jsonencode({
    agent = {
      metrics_collection_interval = 60
      run_as_user                 = "cwagent"
    }
    logs = {
      logs_collected = {
        files = {
          collect_list = [
            {
              file_path      = "/var/log/messages"
              log_group_name = aws_cloudwatch_log_group.ec2_logs.name
              log_stream_name = "{instance_id}/messages"
            },
            {
              file_path      = "/var/log/docker"
              log_group_name = aws_cloudwatch_log_group.ec2_logs.name
              log_stream_name = "{instance_id}/docker"
            }
          ]
        }
      }
    }
    metrics = {
      namespace = "Acadion/EC2"
      metrics_collected = {
        cpu = {
          measurement = [
            "cpu_usage_idle",
            "cpu_usage_iowait",
            "cpu_usage_user",
            "cpu_usage_system"
          ]
          metrics_collection_interval = 60
        }
        disk = {
          measurement = [
            "used_percent"
          ]
          metrics_collection_interval = 60
          resources = [
            "*"
          ]
        }
        diskio = {
          measurement = [
            "io_time"
          ]
          metrics_collection_interval = 60
          resources = [
            "*"
          ]
        }
        mem = {
          measurement = [
            "mem_used_percent"
          ]
          metrics_collection_interval = 60
        }
      }
    }
  })

  tags = var.tags
}

# Auto Scaling Group (optional, for high availability)
resource "aws_launch_template" "backend" {
  count       = var.enable_auto_scaling ? 1 : 0
  name_prefix = "${var.name_prefix}-backend-"
  
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type
  key_name      = var.public_key != "" ? aws_key_pair.main[0].key_name : null
  
  vpc_security_group_ids = var.security_group_ids
  
  iam_instance_profile {
    name = var.iam_instance_profile
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = var.ebs_volume_size
      volume_type           = "gp3"
      delete_on_termination = true
      encrypted             = true
    }
  }

  user_data = var.user_data

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
    instance_metadata_tags      = "enabled"
  }

  tag_specifications {
    resource_type = "instance"
    tags = merge(var.tags, {
      Name = "${var.name_prefix}-backend-asg"
    })
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "backend" {
  count               = var.enable_auto_scaling ? 1 : 0
  name                = "${var.name_prefix}-backend-asg"
  vpc_zone_identifier = [var.subnet_id]
  target_group_arns   = var.target_group_arns
  health_check_type   = "ELB"
  health_check_grace_period = 300

  min_size         = 1
  max_size         = 1  # Keep at 1 for free tier
  desired_capacity = 1

  launch_template {
    id      = aws_launch_template.backend[0].id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.name_prefix}-backend-asg"
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

# EBS Snapshot for backup (free tier: 10GB of snapshots)
resource "aws_ebs_snapshot" "backup" {
  count       = var.enable_backup ? 1 : 0
  volume_id   = aws_instance.backend.root_block_device[0].volume_id
  description = "Backup snapshot for ${var.name_prefix} backend"

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-backup-snapshot"
  })
}

# Data Lifecycle Manager for automated snapshots
resource "aws_dlm_lifecycle_policy" "backup" {
  count              = var.enable_backup ? 1 : 0
  description        = "Automated backup policy for ${var.name_prefix}"
  execution_role_arn = var.dlm_role_arn
  state              = "ENABLED"

  policy_details {
    resource_types   = ["VOLUME"]
    target_tags = {
      Name = "${var.name_prefix}-root-volume"
    }

    schedule {
      name = "Daily Backup"

      create_rule {
        interval      = 24
        interval_unit = "HOURS"
        times         = ["03:00"]
      }

      retain_rule {
        count = var.backup_retention_days
      }

      tags_to_add = merge(var.tags, {
        SnapshotCreator = "DLM"
      })

      copy_tags = true
    }
  }
}