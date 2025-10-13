# Example usage of Face Recognition Microservice module

# Face Recognition Microservice
module "face_recognition" {
  source = "./modules/face-recognition"

  # Project configuration
  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  # Networking (from VPC module)
  vpc_id                    = module.vpc.vpc_id
  vpc_cidr                  = module.vpc.vpc_cidr_block
  private_subnet_ids        = module.vpc.private_subnets
  alb_security_group_id     = module.alb.security_group_id
  backend_security_group_id = module.backend.security_group_id
  alb_listener_arn          = module.alb.listener_arn

  # Instance configuration
  gpu_instance_type = var.face_recognition_instance_type
  min_capacity      = var.face_recognition_min_capacity
  max_capacity      = var.face_recognition_max_capacity
  desired_capacity  = var.face_recognition_desired_capacity

  # ECS task configuration
  task_cpu                = var.face_recognition_task_cpu
  task_memory             = var.face_recognition_task_memory
  task_memory_reservation = var.face_recognition_task_memory_reservation
  service_desired_count   = var.face_recognition_service_desired_count

  # Container configuration
  image_tag = var.face_recognition_image_tag

  # Face recognition configuration
  pinecone_api_key        = var.pinecone_api_key
  pinecone_index_name     = var.pinecone_index_name
  face_threshold          = var.face_threshold
  max_concurrent_requests = var.face_recognition_max_concurrent_requests

  # Auto scaling configuration
  cpu_target_value   = var.face_recognition_cpu_target
  queue_target_value = var.face_recognition_queue_target

  # Monitoring configuration
  log_level               = var.log_level
  log_retention_days      = var.log_retention_days
  enable_execute_command  = var.enable_execute_command
  sns_topic_arn          = module.monitoring.sns_topic_arn

  # Tags
  tags = local.common_tags
}

# Variables for face recognition configuration
variable "face_recognition_instance_type" {
  description = "Instance type for face recognition service"
  type        = string
  default     = "g4dn.xlarge"
}

variable "face_recognition_min_capacity" {
  description = "Minimum capacity for face recognition auto scaling"
  type        = number
  default     = 1
}

variable "face_recognition_max_capacity" {
  description = "Maximum capacity for face recognition auto scaling"
  type        = number
  default     = 5
}

variable "face_recognition_desired_capacity" {
  description = "Desired capacity for face recognition auto scaling"
  type        = number
  default     = 2
}

variable "face_recognition_task_cpu" {
  description = "CPU units for face recognition ECS task"
  type        = number
  default     = 4096
}

variable "face_recognition_task_memory" {
  description = "Memory for face recognition ECS task"
  type        = number
  default     = 16384
}

variable "face_recognition_task_memory_reservation" {
  description = "Memory reservation for face recognition container"
  type        = number
  default     = 8192
}

variable "face_recognition_service_desired_count" {
  description = "Desired count for face recognition ECS service"
  type        = number
  default     = 2
}

variable "face_recognition_image_tag" {
  description = "Docker image tag for face recognition service"
  type        = string
  default     = "latest"
}

variable "face_recognition_max_concurrent_requests" {
  description = "Maximum concurrent requests for face recognition"
  type        = number
  default     = 10
}

variable "face_recognition_cpu_target" {
  description = "CPU target for auto scaling"
  type        = number
  default     = 70
}

variable "face_recognition_queue_target" {
  description = "Queue length target for auto scaling"
  type        = number
  default     = 5
}

# Outputs
output "face_recognition_service_url" {
  description = "Face recognition service URL"
  value       = module.face_recognition.service_url
}

output "face_recognition_ecr_repository" {
  description = "Face recognition ECR repository URL"
  value       = module.face_recognition.ecr_repository_url
}

output "face_recognition_cluster_name" {
  description = "Face recognition ECS cluster name"
  value       = module.face_recognition.ecs_cluster_id
}