# Variables for networking module

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Security-related variables
variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
}

variable "admin_cidr_block" {
  description = "CIDR block for admin access (SSH, etc.)"
  type        = string
  default     = "10.0.0.0/8"
}

# ECR and ECS related variables
variable "ecs_task_role_arn" {
  description = "ARN of ECS task role"
  type        = string
  default     = ""
}

variable "ecs_execution_role_arn" {
  description = "ARN of ECS execution role"
  type        = string
  default     = ""
}

variable "cicd_role_arn" {
  description = "ARN of CI/CD role for ECR access"
  type        = string
  default     = ""
}

# S3 bucket name for VPC endpoints
variable "s3_bucket_name" {
  description = "Name of S3 bucket for VPC endpoint policy"
  type        = string
  default     = ""
}

# WAF Configuration Variables
variable "waf_rate_limit" {
  description = "Rate limit for WAF (requests per 5 minutes)"
  type        = number
  default     = 2000
}

variable "api_rate_limit" {
  description = "Rate limit for API endpoints (requests per 5 minutes)"
  type        = number
  default     = 1000
}

variable "face_recognition_rate_limit" {
  description = "Rate limit for face recognition endpoints (requests per 5 minutes)"
  type        = number
  default     = 100
}

variable "allowed_country_codes" {
  description = "List of allowed country codes for geo-blocking"
  type        = list(string)
  default     = ["US", "CA", "GB", "AU", "DE", "FR", "JP"]
}

variable "blocked_country_codes" {
  description = "List of blocked country codes"
  type        = list(string)
  default     = ["CN", "RU", "KP", "IR"]
}

variable "allowed_ip_addresses" {
  description = "List of allowed IP addresses for whitelisting"
  type        = list(string)
  default     = []
}

variable "blocked_ip_addresses" {
  description = "List of blocked IP addresses"
  type        = list(string)
  default     = []
}

variable "alb_arn" {
  description = "ARN of Application Load Balancer for WAF association"
  type        = string
  default     = ""
}

variable "sns_topic_arn" {
  description = "ARN of SNS topic for security alerts"
  type        = string
  default     = ""
}

# SSL/TLS Configuration Variables
variable "domain_name" {
  description = "Primary domain name for SSL certificate"
  type        = string
}

variable "subject_alternative_names" {
  description = "Subject alternative names for SSL certificate"
  type        = list(string)
  default     = []
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for certificate validation"
  type        = string
}

variable "enable_wildcard_certificate" {
  description = "Enable wildcard SSL certificate"
  type        = bool
  default     = false
}