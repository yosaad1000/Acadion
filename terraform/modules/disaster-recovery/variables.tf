# Variables for disaster recovery module

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "dr_vpc_cidr" {
  description = "CIDR block for DR VPC"
  type        = string
  default     = "10.1.0.0/16"
}

variable "enable_dr_nat_gateway" {
  description = "Enable NAT Gateway for DR private subnets"
  type        = bool
  default     = true
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 30
}

variable "primary_domain" {
  description = "Primary domain for health checks"
  type        = string
}

variable "primary_region" {
  description = "Primary AWS region"
  type        = string
}

variable "dr_sns_topic_arn" {
  description = "SNS topic ARN for DR notifications"
  type        = string
}

# ECS Configuration for DR
variable "dr_backend_cpu" {
  description = "CPU units for DR backend service"
  type        = number
  default     = 1024
}

variable "dr_backend_memory" {
  description = "Memory for DR backend service"
  type        = number
  default     = 2048
}

variable "dr_frontend_cpu" {
  description = "CPU units for DR frontend service"
  type        = number
  default     = 256
}

variable "dr_frontend_memory" {
  description = "Memory for DR frontend service"
  type        = number
  default     = 512
}

# Storage Configuration for DR
variable "dr_redis_node_type" {
  description = "ElastiCache Redis node type for DR"
  type        = string
  default     = "cache.r6g.large"
}

variable "dr_redis_num_cache_nodes" {
  description = "Number of cache nodes in DR Redis cluster"
  type        = number
  default     = 2
}