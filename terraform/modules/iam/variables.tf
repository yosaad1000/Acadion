# Variables for IAM module

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# KMS Key ARN for encryption access
variable "kms_key_arn" {
  description = "ARN of KMS key for encryption/decryption access"
  type        = string
}

# S3 Bucket Configuration
variable "s3_bucket_name" {
  description = "Name of the main S3 bucket"
  type        = string
}

variable "cloudtrail_bucket_name" {
  description = "Name of the CloudTrail S3 bucket"
  type        = string
}

# GitHub Configuration for CI/CD
variable "github_repository" {
  description = "GitHub repository in format 'owner/repo'"
  type        = string
}

variable "create_github_oidc_provider" {
  description = "Whether to create GitHub OIDC provider"
  type        = bool
  default     = true
}

# Admin User ARNs for Emergency Access
variable "admin_user_arns" {
  description = "List of admin user ARNs for emergency access"
  type        = list(string)
  default     = []
}

# SNS Topic for Security Alerts
variable "sns_topic_arn" {
  description = "ARN of SNS topic for security alerts"
  type        = string
}