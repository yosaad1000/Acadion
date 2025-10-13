# Staging Environment Variables
# This file defines variables specific to the staging environment

variable "aws_region" {
  description = "AWS region for staging deployment"
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
  description = "ARN of the GitHub Actions OIDC provider for staging"
  type        = string
  default     = ""
}

# Secure Parameters (Secrets) - Staging Environment
# These should be provided via environment variables or secure CI/CD variables

variable "jwt_secret_key" {
  description = "JWT secret key for token signing (staging)"
  type        = string
  sensitive   = true
}

variable "encryption_key" {
  description = "Application encryption key (staging)"
  type        = string
  sensitive   = true
}

variable "supabase_url" {
  description = "Supabase project URL (staging)"
  type        = string
  sensitive   = true
}

variable "supabase_key" {
  description = "Supabase anon key (staging)"
  type        = string
  sensitive   = true
}

variable "supabase_service_key" {
  description = "Supabase service role key (staging)"
  type        = string
  sensitive   = true
}

variable "pinecone_api_key" {
  description = "Pinecone API key (staging)"
  type        = string
  sensitive   = true
}

variable "pinecone_environment" {
  description = "Pinecone environment (staging)"
  type        = string
  sensitive   = true
  default     = "us-east-1-aws"
}

variable "pinecone_index_name" {
  description = "Pinecone index name (staging)"
  type        = string
  sensitive   = true
  default     = "acadion-faces-staging"
}

variable "cloudfront_domain" {
  description = "CloudFront distribution domain (staging)"
  type        = string
  default     = "staging.acadion.com"
}