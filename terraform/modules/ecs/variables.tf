# Variables for ECS module

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "Security group ID for ALB"
  type        = string
}

variable "frontend_security_group_id" {
  description = "Security group ID for frontend service"
  type        = string
}

variable "backend_security_group_id" {
  description = "Security group ID for backend service"
  type        = string
}

variable "face_recognition_security_group_id" {
  description = "Security group ID for face recognition service"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "ecr_repository_url" {
  description = "Base URL for ECR repositories"
  type        = string
}

variable "redis_endpoint" {
  description = "Redis cluster endpoint"
  type        = string
}

variable "efs_file_system_id" {
  description = "EFS file system ID"
  type        = string
}

# Task resource configurations
variable "backend_cpu" {
  description = "CPU units for backend service"
  type        = number
  default     = 1024
}

variable "backend_memory" {
  description = "Memory for backend service"
  type        = number
  default     = 2048
}

variable "frontend_cpu" {
  description = "CPU units for frontend service"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Memory for frontend service"
  type        = number
  default     = 512
}

variable "face_recognition_cpu" {
  description = "CPU units for face recognition service"
  type        = number
  default     = 2048
}

variable "face_recognition_memory" {
  description = "Memory for face recognition service"
  type        = number
  default     = 4096
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "parameter_store_task_role_arn" {
  description = "ARN of the IAM role for Parameter Store access"
  type        = string
}

# Auto Scaling Configuration Variables
variable "backend_min_capacity" {
  description = "Minimum number of backend service tasks"
  type        = number
  default     = 2
}

variable "backend_max_capacity" {
  description = "Maximum number of backend service tasks"
  type        = number
  default     = 20
}

variable "frontend_min_capacity" {
  description = "Minimum number of frontend service tasks"
  type        = number
  default     = 2
}

variable "frontend_max_capacity" {
  description = "Maximum number of frontend service tasks"
  type        = number
  default     = 10
}

variable "face_recognition_min_capacity" {
  description = "Minimum number of face recognition service tasks"
  type        = number
  default     = 1
}

variable "face_recognition_max_capacity" {
  description = "Maximum number of face recognition service tasks"
  type        = number
  default     = 5
}

variable "enable_predictive_scaling" {
  description = "Enable predictive scaling for known traffic patterns"
  type        = bool
  default     = true
}