# Development Environment Variables
# This file defines variables specific to the development environment

variable "aws_region" {
  description = "AWS region for development deployment"
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

# Secure Parameters (Secrets) - Development Environment
# These should be provided via environment variables or secure CI/CD variables

variable "jwt_secret_key" {
  description = "JWT secret key for token signing (development)"
  type        = string
  sensitive   = true
}

variable "encryption_key" {
  description = "Application encryption key (development)"
  type        = string
  sensitive   = true
}

variable "supabase_url" {
  description = "Supabase project URL (development)"
  type        = string
  sensitive   = true
}

variable "supabase_key" {
  description = "Supabase anon key (development)"
  type        = string
  sensitive   = true
}

variable "supabase_service_key" {
  description = "Supabase service role key (development)"
  type        = string
  sensitive   = true
}

variable "pinecone_api_key" {
  description = "Pinecone API key (development)"
  type        = string
  sensitive   = true
}

variable "pinecone_environment" {
  description = "Pinecone environment (development)"
  type        = string
  sensitive   = true
  default     = "us-east-1-aws"
}

variable "pinecone_index_name" {
  description = "Pinecone index name (development)"
  type        = string
  sensitive   = true
  default     = "acadion-faces-dev"
}

variable "cloudfront_domain" {
  description = "CloudFront distribution domain (development)"
  type        = string
  default     = ""
}