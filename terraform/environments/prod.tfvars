# Production environment configuration

environment    = "prod"
aws_region     = "us-east-1"
project_name   = "acadion"

# VPC Configuration
vpc_cidr           = "10.2.0.0/16"
enable_nat_gateway = true

# ECS Configuration
ecs_cluster_name = "acadion-prod-cluster"

# Resource sizing for production (full instances)
backend_cpu                = 2048
backend_memory             = 4096
frontend_cpu               = 512
frontend_memory            = 1024
face_recognition_cpu       = 4096
face_recognition_memory    = 8192

# ElastiCache Configuration
redis_node_type        = "cache.r6g.xlarge"
redis_num_cache_nodes  = 3

# GitHub repository (update with your actual repository)
github_repository = "your-org/acadion"

# Parameter Store Configuration
create_parameter_store_kms_key = true
parameter_store_kms_deletion_window = 30  # Longer retention for production

# Application Configuration (Production)
log_level = "INFO"
debug_mode = "false"
cors_origins = "https://acadion.com,https://www.acadion.com"
max_upload_size = "10485760"  # 10MB

# Database Configuration (Production)
database_pool_size = "30"
database_pool_timeout = "30"
database_max_overflow = "50"

# Face Recognition Configuration (Production)
face_threshold = "0.6"
max_faces_per_image = "50"
face_processing_timeout = "45"  # Longer timeout for production

# Cache Configuration (Production)
cache_ttl_default = "3600"    # 1 hour
cache_ttl_sessions = "1800"   # 30 minutes
cache_max_connections = "200" # Higher for production load

# Security Configuration (Production)
jwt_algorithm = "HS256"
session_timeout = "3600"      # 1 hour
rate_limit_requests = "100"
rate_limit_window = "60"

# IAM Configuration
create_github_actions_role = true   # Enable for CI/CD
github_actions_role_arn = ""        # Will be set up separately

# Note: Sensitive variables MUST be provided via secure methods in production
# Use AWS Systems Manager Parameter Store, Terraform Cloud, or secure CI/CD variables
# NEVER commit actual production secrets to version control

# Example sensitive variables (DO NOT commit actual values):
# jwt_secret_key = "your-production-jwt-secret-key"
# encryption_key = "your-production-encryption-key"
# supabase_url = "https://your-production-project.supabase.co"
# supabase_key = "your-production-supabase-anon-key"
# supabase_service_key = "your-production-supabase-service-key"
# pinecone_api_key = "your-pinecone-api-key"
# pinecone_environment = "us-east-1-aws"
# pinecone_index_name = "acadion-faces-prod"