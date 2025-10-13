# Variables for storage module

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "elasticache_security_group_id" {
  description = "Security group ID for ElastiCache"
  type        = string
}

variable "efs_security_group_id" {
  description = "Security group ID for EFS"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.r6g.large"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in the Redis cluster"
  type        = number
  default     = 3
}

variable "redis_auth_token" {
  description = "Auth token for Redis cluster"
  type        = string
  sensitive   = true
}

variable "github_repository" {
  description = "GitHub repository in format 'owner/repo'"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}