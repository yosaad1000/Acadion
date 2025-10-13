# Development environment configuration

environment    = "dev"
aws_region     = "us-east-1"
project_name   = "acadion"

# VPC Configuration
vpc_cidr           = "10.0.0.0/16"
enable_nat_gateway = true

# ECS Configuration
ecs_cluster_name = "acadion-dev-cluster"

# Resource sizing for development (smaller instances)
backend_cpu                = 512
backend_memory             = 1024
frontend_cpu               = 256
frontend_memory            = 512
face_recognition_cpu       = 1024
face_recognition_memory    = 2048

# ElastiCache Configuration (smaller for dev)
redis_node_type        = "cache.t3.micro"
redis_num_cache_nodes  = 1

# GitHub repository (update with your actual repository)
github_repository = "your-org/acadion"

# Parameter Store Configuration
create_parameter_store_kms_key = true
parameter_store_kms_deletion_window = 7

# Application Configuration (Development)
log_level = "DEBUG"
debug_mode = "true"
cors_origins = "http://localhost:3000,http://localhost:5173"
max_upload_size = "10485760"  # 10MB

# Database Configuration (Development)
database_pool_size = "10"
database_pool_timeout = "30"
database_max_overflow = "20"

# Face Recognition Configuration (Development)
face_threshold = "0.6"
max_faces_per_image = "20"
face_processing_timeout = "30"

# Cache Configuration (Development)
cache_ttl_default = "1800"    # 30 minutes
cache_ttl_sessions = "900"    # 15 minutes
cache_max_connections = "50"

# Security Configuration (Development)
jwt_algorithm = "HS256"
session_timeout = "3600"      # 1 hour
rate_limit_requests = "200"   # Higher limit for dev
rate_limit_window = "60"

# IAM Configuration
create_github_actions_role = false  # Set to true when setting up CI/CD
github_actions_role_arn = ""

# Note: Sensitive variables (secrets) should be provided via:
# - Environment variables (TF_VAR_*)
# - Terraform Cloud/Enterprise workspace variables
# - AWS Systems Manager Parameter Store (for existing deployments)
# - Secure CI/CD pipeline variables

# Example sensitive variables (DO NOT commit actual values):
# jwt_secret_key = "your-jwt-secret-key"
# encryption_key = "your-encryption-key"
# supabase_url = "https://your-project.supabase.co"
# supabase_key = "your-supabase-anon-key"
# supabase_service_key = "your-supabase-service-key"
# pinecone_api_key = "your-pinecone-api-key"
# pinecone_environment = "us-east-1-aws"
# pinecone_index_name = "acadion-faces-dev"