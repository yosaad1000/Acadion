# Variables for ECR module

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Artifact Management Configuration
variable "sns_topic_arn" {
  description = "SNS topic ARN for deployment notifications"
  type        = string
}

variable "retention_policy" {
  description = "Image retention policy configuration"
  type = object({
    prod_images    = number
    staging_images = number
    untagged_days  = number
  })
  default = {
    prod_images    = 10
    staging_images = 5
    untagged_days  = 1
  }
}

variable "enable_deployment_tracking" {
  description = "Enable deployment tracking and rollback capabilities"
  type        = bool
  default     = true
}