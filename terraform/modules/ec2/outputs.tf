# Outputs for EC2 Module

output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.backend.id
}

output "instance_arn" {
  description = "ARN of the EC2 instance"
  value       = aws_instance.backend.arn
}

output "public_ip" {
  description = "Public IP address of the instance"
  value       = var.allocate_eip ? aws_eip.backend[0].public_ip : aws_instance.backend.public_ip
}

output "private_ip" {
  description = "Private IP address of the instance"
  value       = aws_instance.backend.private_ip
}

output "public_dns" {
  description = "Public DNS name of the instance"
  value       = aws_instance.backend.public_dns
}

output "private_dns" {
  description = "Private DNS name of the instance"
  value       = aws_instance.backend.private_dns
}

output "availability_zone" {
  description = "Availability zone of the instance"
  value       = aws_instance.backend.availability_zone
}

output "key_name" {
  description = "Name of the key pair"
  value       = aws_instance.backend.key_name
}

output "security_groups" {
  description = "List of security group IDs"
  value       = aws_instance.backend.vpc_security_group_ids
}

output "subnet_id" {
  description = "ID of the subnet"
  value       = aws_instance.backend.subnet_id
}

output "root_volume_id" {
  description = "ID of the root EBS volume"
  value       = aws_instance.backend.root_block_device[0].volume_id
}

output "eip_id" {
  description = "ID of the Elastic IP"
  value       = var.allocate_eip ? aws_eip.backend[0].id : null
}

output "eip_allocation_id" {
  description = "Allocation ID of the Elastic IP"
  value       = var.allocate_eip ? aws_eip.backend[0].allocation_id : null
}

output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.ec2_logs.name
}

output "cloudwatch_log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.ec2_logs.arn
}

output "launch_template_id" {
  description = "ID of the launch template"
  value       = var.enable_auto_scaling ? aws_launch_template.backend[0].id : null
}

output "autoscaling_group_name" {
  description = "Name of the Auto Scaling Group"
  value       = var.enable_auto_scaling ? aws_autoscaling_group.backend[0].name : null
}

output "backup_snapshot_id" {
  description = "ID of the backup snapshot"
  value       = var.enable_backup ? aws_ebs_snapshot.backup[0].id : null
}