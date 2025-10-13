# Face Recognition Microservice Variables

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "acadion"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# Networking
variable "vpc_id" {
  description = "VPC ID where resources will be created"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "Security group ID of the Application Load Balancer"
  type        = string
}

variable "backend_security_group_id" {
  description = "Security group ID of the backend service"
  type        = string
}

variable "alb_listener_arn" {
  description = "ARN of the ALB listener"
  type        = string
}

variable "listener_rule_priority" {
  description = "Priority for the ALB listener rule"
  type        = number
  default     = 100
}

# Instance Configuration
variable "gpu_instance_type" {
  description = "EC2 instance type with GPU support"
  type        = string
  default     = "g4dn.xlarge"
  
  validation {
    condition = can(regex("^g4dn\\.|^g4ad\\.|^g5\\.|^p3\\.|^p4d\\.", var.gpu_instance_type))
    error_message = "Instance type must be a GPU-enabled instance (g4dn, g4ad, g5, p3, or p4d family)."
  }
}

# Auto Scaling Configuration
variable "min_capacity" {
  description = "Minimum number of instances"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum number of instances"
  type        = number
  default     = 5
}

variable "desired_capacity" {
  description = "Desired number of instances"
  type        = number
  default     = 2
}

# ECS Task Configuration
variable "task_cpu" {
  description = "CPU units for the ECS task (1024 = 1 vCPU)"
  type        = number
  default     = 4096
}

variable "task_memory" {
  description = "Memory for the ECS task in MB"
  type        = number
  default     = 16384
}

variable "task_memory_reservation" {
  description = "Soft memory limit for the container in MB"
  type        = number
  default     = 8192
}

variable "service_desired_count" {
  description = "Desired number of ECS service tasks"
  type        = number
  default     = 2
}

# Container Configuration
variable "image_tag" {
  description = "Docker image tag for the face recognition service"
  type        = string
  default     = "latest"
}

# Face Recognition Configuration
variable "pinecone_api_key" {
  description = "Pinecone API key"
  type        = string
  sensitive   = true
}

variable "pinecone_index_name" {
  description = "Pinecone index name"
  type        = string
  default     = "acadion-faces"
}

variable "face_threshold" {
  description = "Face recognition threshold"
  type        = number
  default     = 0.6
  
  validation {
    condition     = var.face_threshold >= 0.0 && var.face_threshold <= 1.0
    error_message = "Face threshold must be between 0.0 and 1.0."
  }
}

variable "max_concurrent_requests" {
  description = "Maximum concurrent requests for face recognition service"
  type        = number
  default     = 10
}

# Auto Scaling Targets
variable "cpu_target_value" {
  description = "Target CPU utilization percentage for auto scaling"
  type        = number
  default     = 70
}

variable "queue_target_value" {
  description = "Target queue length for auto scaling"
  type        = number
  default     = 5
}

# Monitoring Configuration
variable "log_level" {
  description = "Log level for the face recognition service"
  type        = string
  default     = "INFO"
  
  validation {
    condition     = contains(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"], var.log_level)
    error_message = "Log level must be one of: DEBUG, INFO, WARNING, ERROR, CRITICAL."
  }
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "enable_execute_command" {
  description = "Enable ECS Exec for debugging"
  type        = bool
  default     = false
}

# Notification Configuration
variable "sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  type        = string
}

# Tags
variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "Acadion"
    Service     = "FaceRecognition"
    ManagedBy   = "Terraform"
  }
}