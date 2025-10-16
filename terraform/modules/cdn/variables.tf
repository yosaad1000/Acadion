# Variables for CDN module

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket for static assets"
  type        = string
}

variable "s3_bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  type        = string
}

variable "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  type        = string
}

variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
  default     = ""
}

variable "domain_aliases" {
  description = "List of domain aliases for CloudFront distribution"
  type        = list(string)
  default     = []
}

variable "ssl_certificate_arn" {
  description = "ARN of the SSL certificate in ACM (us-east-1)"
  type        = string
  default     = null
}

variable "price_class" {
  description = "CloudFront distribution price class"
  type        = string
  default     = "PriceClass_100"
  validation {
    condition = contains([
      "PriceClass_All",
      "PriceClass_200",
      "PriceClass_100"
    ], var.price_class)
    error_message = "Price class must be PriceClass_All, PriceClass_200, or PriceClass_100."
  }
}

variable "geo_restriction_type" {
  description = "Type of geographic restriction (none, whitelist, blacklist)"
  type        = string
  default     = "none"
  validation {
    condition = contains([
      "none",
      "whitelist",
      "blacklist"
    ], var.geo_restriction_type)
    error_message = "Geo restriction type must be none, whitelist, or blacklist."
  }
}

variable "geo_restriction_locations" {
  description = "List of country codes for geographic restrictions"
  type        = list(string)
  default     = []
}

variable "web_acl_id" {
  description = "AWS WAF Web ACL ID to associate with CloudFront"
  type        = string
  default     = null
}

variable "logging_bucket_domain_name" {
  description = "Domain name of S3 bucket for CloudFront access logs"
  type        = string
  default     = null
}

variable "enable_origin_failover" {
  description = "Enable origin failover configuration"
  type        = bool
  default     = false
}

variable "failover_s3_bucket_domain_name" {
  description = "Domain name of failover S3 bucket"
  type        = string
  default     = ""
}

variable "create_invalidation" {
  description = "Create CloudFront invalidation for deployment"
  type        = bool
  default     = false
}

variable "invalidation_paths" {
  description = "List of paths to invalidate in CloudFront"
  type        = list(string)
  default     = ["/*"]
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Cache behavior configuration
variable "api_cache_ttl" {
  description = "TTL settings for API cache behavior"
  type = object({
    min_ttl     = number
    default_ttl = number
    max_ttl     = number
  })
  default = {
    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }
}

variable "static_cache_ttl" {
  description = "TTL settings for static assets cache behavior"
  type = object({
    min_ttl     = number
    default_ttl = number
    max_ttl     = number
  })
  default = {
    min_ttl     = 31536000  # 1 year
    default_ttl = 31536000  # 1 year
    max_ttl     = 31536000  # 1 year
  }
}

variable "assets_cache_ttl" {
  description = "TTL settings for assets cache behavior"
  type = object({
    min_ttl     = number
    default_ttl = number
    max_ttl     = number
  })
  default = {
    min_ttl     = 86400    # 1 day
    default_ttl = 604800   # 1 week
    max_ttl     = 31536000 # 1 year
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}