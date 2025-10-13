# Development Environment Configuration
# This file configures the development environment with appropriate resource sizing
# and networking isolation for development workloads

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

  # Backend configuration for development workspace
  # Uncomment and configure when using remote state
  # backend "s3" {
  #   bucket         = "acadion-terraform-state-dev"
  #   key            = "dev/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "acadion-terraform-locks-dev"
  # }
}

# Configure AWS provider with development-specific settings
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = "dev"
      ManagedBy   = "Terraform"
      Workspace   = "development"
      CostCenter  = "development"
      Owner       = "devops-team"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Local values for development environment
locals {
  environment = "dev"
  name_prefix = "${var.project_name}-${local.environment}"
  azs         = slice(data.aws_availability_zones.available.names, 0, 3)
  
  # Development-specific tags
  common_tags = {
    Project      = var.project_name
    Environment  = local.environment
    ManagedBy    = "Terraform"
    Workspace    = "development"
    CostCenter   = "development"
    Owner        = "devops-team"
    AutoShutdown = "true"  # Enable auto-shutdown for cost optimization
    Backup       = "false" # Disable backups for dev environment
  }

  # Development-specific networking
  vpc_cidr = "10.0.0.0/16"
  
  # Subnet CIDRs for development
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
  db_subnet_cidrs      = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
}

# Generate Redis auth token for development
resource "random_password" "redis_auth_token" {
  length  = 32
  special = true
  
  keepers = {
    environment = local.environment
  }
}

# Call the main module with development-specific configuration
module "acadion_infrastructure" {
  source = "../.."

  # Environment Configuration
  environment  = local.environment
  aws_region   = var.aws_region
  project_name = var.project_name

  # Networking Configuration (Development)
  vpc_cidr           = local.vpc_cidr
  enable_nat_gateway = true
  enable_vpn_gateway = false

  # ECS Configuration (Development - smaller resources)
  ecs_cluster_name        = "${local.name_prefix}-cluster"
  backend_cpu             = 512
  backend_memory          = 1024
  frontend_cpu            = 256
  frontend_memory         = 512
  face_recognition_cpu    = 1024
  face_recognition_memory = 2048

  # ElastiCache Configuration (Development - minimal)
  redis_node_type       = "cache.t3.micro"
  redis_num_cache_nodes = 1

  # GitHub Configuration
  github_repository = var.github_repository

  # Parameter Store Configuration
  create_parameter_store_kms_key      = true
  parameter_store_kms_deletion_window = 7

  # Application Configuration (Development)
  log_level       = "DEBUG"
  debug_mode      = "true"
  cors_origins    = "http://localhost:3000,http://localhost:5173,https://dev.acadion.com"
  max_upload_size = "10485760"

  # Database Configuration (Development)
  database_pool_size     = "10"
  database_pool_timeout  = "30"
  database_max_overflow  = "20"

  # Face Recognition Configuration (Development)
  face_threshold           = "0.6"
  max_faces_per_image     = "20"
  face_processing_timeout = "30"

  # Cache Configuration (Development)
  cache_ttl_default     = "1800"
  cache_ttl_sessions    = "900"
  cache_max_connections = "50"

  # Security Configuration (Development)
  jwt_algorithm       = "HS256"
  session_timeout     = "3600"
  rate_limit_requests = "200"
  rate_limit_window   = "60"

  # IAM Configuration
  create_github_actions_role = false
  github_actions_role_arn    = ""

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