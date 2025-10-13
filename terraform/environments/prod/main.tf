# Production Environment Configuration
# This file configures the production environment with full resources,
# enhanced security, monitoring, and backup capabilities

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }

  # Backend configuration for production workspace
  # Uncomment and configure when using remote state
  # backend "s3" {
  #   bucket         = "acadion-terraform-state-prod"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "acadion-terraform-locks-prod"
  # }
}

# Configure AWS provider with production-specific settings
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = "prod"
      ManagedBy   = "Terraform"
      Workspace   = "production"
      CostCenter  = "production"
      Owner       = "platform-team"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Local values for production environment
locals {
  environment = "prod"
  name_prefix = "${var.project_name}-${local.environment}"
  azs         = slice(data.aws_availability_zones.available.names, 0, 3)
  
  # Production-specific tags
  common_tags = {
    Project      = var.project_name
    Environment  = local.environment
    ManagedBy    = "Terraform"
    Workspace    = "production"
    CostCenter   = "production"
    Owner        = "platform-team"
    AutoShutdown = "false"    # Never auto-shutdown production
    Backup       = "critical" # Critical backup requirements
    Monitoring   = "full"     # Full monitoring and alerting
    Compliance   = "required" # Compliance requirements
    DataClass    = "sensitive" # Sensitive data classification
  }

  # Production-specific networking (isolated from dev and staging)
  vpc_cidr = "10.2.0.0/16"
  
  # Subnet CIDRs for production
  public_subnet_cidrs  = ["10.2.1.0/24", "10.2.2.0/24", "10.2.3.0/24"]
  private_subnet_cidrs = ["10.2.11.0/24", "10.2.12.0/24", "10.2.13.0/24"]
  db_subnet_cidrs      = ["10.2.21.0/24", "10.2.22.0/24", "10.2.23.0/24"]
}

# Generate Redis auth token for production
resource "random_password" "redis_auth_token" {
  length  = 32
  special = true
  
  keepers = {
    environment = local.environment
  }
}

# Call the main module with production-specific configuration
module "acadion_infrastructure" {
  source = "../.."

  # Environment Configuration
  environment  = local.environment
  aws_region   = var.aws_region
  project_name = var.project_name

  # Networking Configuration (Production - isolated and secure)
  vpc_cidr           = local.vpc_cidr
  enable_nat_gateway = true
  enable_vpn_gateway = false

  # ECS Configuration (Production - full resources)
  ecs_cluster_name        = "${local.name_prefix}-cluster"
  backend_cpu             = 2048
  backend_memory          = 4096
  frontend_cpu            = 512
  frontend_memory         = 1024
  face_recognition_cpu    = 4096
  face_recognition_memory = 8192

  # ElastiCache Configuration (Production - high availability)
  redis_node_type       = "cache.r6g.xlarge"
  redis_num_cache_nodes = 3

  # GitHub Configuration
  github_repository = var.github_repository

  # Parameter Store Configuration (Production - enhanced security)
  create_parameter_store_kms_key      = true
  parameter_store_kms_deletion_window = 30 # Longer retention for production

  # Application Configuration (Production)
  log_level       = "INFO"
  debug_mode      = "false"
  cors_origins    = "https://acadion.com,https://www.acadion.com,https://api.acadion.com"
  max_upload_size = "10485760"

  # Database Configuration (Production - optimized)
  database_pool_size     = "30"
  database_pool_timeout  = "30"
  database_max_overflow  = "50"

  # Face Recognition Configuration (Production)
  face_threshold           = "0.6"
  max_faces_per_image     = "50"
  face_processing_timeout = "45" # Longer timeout for production reliability

  # Cache Configuration (Production - high performance)
  cache_ttl_default     = "3600"
  cache_ttl_sessions    = "1800"
  cache_max_connections = "200"

  # Security Configuration (Production - strict)
  jwt_algorithm       = "HS256"
  session_timeout     = "3600"
  rate_limit_requests = "100"
  rate_limit_window   = "60"

  # IAM Configuration (Production CI/CD)
  create_github_actions_role = true
  github_actions_role_arn    = var.github_actions_role_arn

  # Secure Parameters (provided via environment variables or CI/CD)
  jwt_secret_key       = var.jwt_secret_key
  encryption_key       = var.encryption_key
  supabase_url         = var.supabase_url
  supabase_key         = var.supabase_key
  supabase_service_key = var.supabase_service_key
  pinecone_api_key     = var.pinecone_api_key
  pinecone_environment = var.pinecone_environment
  pinecone_index_name  = var.pinecone_index_name
  cloudfront_domain    = var.cloudfront_domain
}