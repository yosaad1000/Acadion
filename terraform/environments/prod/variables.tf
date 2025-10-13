# Production Environment Variables
# This file defines variables specific to the production environment

variable "aws_region" {
  description = "AWS region for production deployment"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "acadion"
}

variable "github_repository" {
  description = "GitHub repository in format 'owner/repo'"
  type        = string
}

variable "github_actions_role_arn" {
  description = "ARN of the GitHub Actions OIDC provider for production"
  type        = string
  default     = ""
}

# Secure Parameters (Secrets) - Production Environment
# These MUST be provided via secure methods in production
# NEVER commit actual production secrets to version control

variable "jwt_secret_key" {
  description = "JWT secret key for token signing (production)"
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.jwt_secret_key) >= 32
    error_message = "Production JWT secret key must be at least 32 characters long."
  }
}

variable "encryption_key" {
  description = "Application encryption key (production)"
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.encryption_key) >= 32
    error_message = "Production encryption key must be at least 32 characters long."
  }
}

variable "supabase_url" {
  description = "Supabase project URL (production)"
  type        = string
  sensitive   = true
  validation {
    condition     = can(regex("^https://[a-z0-9]+\\.supabase\\.co$", var.supabase_url))
    error_message = "Supabase URL must be a valid production Supabase URL."
  }
}

variable "supabase_key" {
  description = "Supabase anon key (production)"
  type        = string
  sensitive   = true
}

variable "supabase_service_key" {
  description = "Supabase service role key (production)"
  type        = string
  sensitive   = true
}

variable "pinecone_api_key" {
  description = "Pinecone API key (production)"
  type        = string
  sensitive   = true
}

variable "pinecone_environment" {
  description = "Pinecone environment (production)"
  type        = string
  sensitive   = true
  default     = "us-east-1-aws"
}

variable "pinecone_index_name" {
  description = "Pinecone index name (production)"
  type        = string
  sensitive   = true
  default     = "acadion-faces-prod"
}

variable "cloudfront_domain" {
  description = "CloudFront distribution domain (production)"
  type        = string
  default     = "acadion.com"
  validation {
    condition     = can(regex("^[a-z0-9.-]+\\.[a-z]{2,}$", var.cloudfront_domain)) || var.cloudfront_domain == ""
    error_message = "CloudFront domain must be a valid domain name."
  }
}