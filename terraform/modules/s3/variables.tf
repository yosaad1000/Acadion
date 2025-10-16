# Variables for S3 Module

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "create_face_cache_bucket" {
  description = "Whether to create a face cache bucket"
  type        = bool
  default     = true
}

variable "enable_cloudtrail" {
  description = "Whether to create CloudTrail logs bucket"
  type        = bool
  default     = false
}

variable "codedeploy_role_arn" {
  description = "ARN of the CodeDeploy IAM role"
  type        = string
  default     = ""
}

variable "github_actions_role_arn" {
  description = "ARN of the GitHub Actions IAM role"
  type        = string
  default     = ""
}

variable "ec2_role_arn" {
  description = "ARN of the EC2 IAM role"
  type        = string
  default     = ""
}

variable "lambda_role_arn" {
  description = "ARN of the Lambda IAM role"
  type        = string
  default     = ""
}

variable "sns_topic_arn" {
  description = "ARN of SNS topic for S3 notifications"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}