# Staging Environment Configuration
# This file configures the staging environment with production-like resources
# for testing and validation before production deployment

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

  # Backend configuration for staging workspace
  # Uncomment and configure when using remote state
  # backend "s3" {
  #   bucket         = "acadion-terraform-state-staging"
  #   key            = "staging/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "acadion-terraform-locks-staging"
  # }
}

# Configure AWS provider with staging-specific settings
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = "staging"
      ManagedBy   = "Terraform"
      Workspace   = "staging"
      CostCenter  = "staging"
      Owner       = "devops-team"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Local values for staging environment
locals {
  environment = "staging"
  name_prefix = "${var.project_name}-${local.environment}"
  azs         = slice(data.aws_availability_zones.available.names, 0, 3)
  
  # Staging-specific tags
  common_tags = {
    Project      = var.project_name
    Environment  = local.environment
    ManagedBy    = "Terraform"
    Workspace    = "staging"
    CostCenter   = "staging"
    Owner        = "devops-team"
    AutoShutdown = "false" # Keep staging running for testing
    Backup       = "true"  # Enable backups for staging
    Monitoring   = "enhanced"
  }

  # Staging-specific networking (isolated from dev and prod)
  vpc_cidr = "10.1.0.0/16"
  
  # Subnet CIDRs for staging
  public_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
  private_subnet_cidrs = ["10.1.11.0/24", "10.1.12.0/24", "10.1.13.0/24"]
  db_subnet_cidrs      = ["10.1.21.0/24", "10.1.22.0/24", "10.1.23.0/24"]
}

# Generate Redis auth token for staging
resource "random_password" "redis_auth_token" {
  length  = 32
  special = true
  
  keepers = {
    environment = local.environment
  }
}

# Call the main module with staging-specific configuration
module "acadion_infrastructure" {
  source = "../.."

  # Environment Configuration
  environment  = local.environment
  aws_region   = var.aws_region
  project_name = var.project_name

  # Networking Configuration (Staging - isolated network)
  vpc_cidr           = local.vpc_cidr
  enable_nat_gateway = true
  enable_vpn_gateway = false

  # ECS Configuration (Staging - medium resources)
  ecs_cluster_name        = "${local.name_prefix}-cluster"
  backend_cpu             = 1024
  backend_memory          = 2048
  frontend_cpu            = 256
  frontend_memory         = 512
  face_recognition_cpu    = 2048
  face_recognition_memory = 4096

  # ElastiCache Configuration (Staging - production-like)
  redis_node_type       = "cache.r6g.large"
  redis_num_cache_nodes = 2

  # GitHub Configuration
  github_repository = var.github_repository

  # Parameter Store Configuration
  create_parameter_store_kms_key      = true
  parameter_store_kms_deletion_window = 7

  # Application Configuration (Staging)
  log_level       = "INFO"
  debug_mode      = "false"
  cors_origins    = "https://staging.acadion.com,https://staging-api.acadion.com"
  max_upload_size = "10485760"

  # Database Configuration (Staging)
  database_pool_size     = "20"
  database_pool_timeout  = "30"
  database_max_overflow  = "30"

  # Face Recognition Configuration (Staging)
  face_threshold           = "0.6"
  max_faces_per_image     = "50"
  face_processing_timeout = "30"

  # Cache Configuration (Staging)
  cache_ttl_default     = "3600"
  cache_ttl_sessions    = "1800"
  cache_max_connections = "100"

  # Security Configuration (Staging)
  jwt_algorithm       = "HS256"
  session_timeout     = "3600"
  rate_limit_requests = "100"
  rate_limit_window   = "60"

  # IAM Configuration (Enable CI/CD for staging)
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