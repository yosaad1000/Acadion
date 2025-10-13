# Staging environment configuration

environment    = "staging"
aws_region     = "us-east-1"
project_name   = "acadion"

# VPC Configuration
vpc_cidr           = "10.1.0.0/16"
enable_nat_gateway = true

# ECS Configuration
ecs_cluster_name = "acadion-staging-cluster"

# Resource sizing for staging (medium instances)
backend_cpu                = 1024
backend_memory             = 2048
frontend_cpu               = 256
frontend_memory            = 512
face_recognition_cpu       = 2048
face_recognition_memory    = 4096

# ElastiCache Configuration
redis_node_type        = "cache.r6g.large"
redis_num_cache_nodes  = 2

# GitHub repository (update with your actual repository)
github_repository = "your-org/acadion"

# Parameter Store Configuration
create_parameter_store_kms_key = true
parameter_store_kms_deletion_window = 7

# Application Configuration (Staging)
log_level = "INFO"
debug_mode = "false"
cors_origins = "https://staging.acadion.com"
max_upload_size = "10485760"  # 10MB

# Database Configuration (Staging)
database_pool_size = "20"
database_pool_timeout = "30"
database_max_overflow = "30"

# Face Recognition Configuration (Staging)
face_threshold = "0.6"
max_faces_per_image = "50"
face_processing_timeout = "30"

# Cache Configuration (Staging)
cache_ttl_default = "3600"    # 1 hour
cache_ttl_sessions = "1800"   # 30 minutes
cache_max_connections = "100"

# Security Configuration (Staging)
jwt_algorithm = "HS256"
session_timeout = "3600"      # 1 hour
rate_limit_requests = "100"
rate_limit_window = "60"

# IAM Configuration
create_github_actions_role = true   # Enable for CI/CD
github_actions_role_arn = ""        # Will be set up separately

# Note: Sensitive variables should be provided via secure methods
# Example sensitive variables (DO NOT commit actual values):
# jwt_secret_key = "your-staging-jwt-secret-key"
# encryption_key = "your-staging-encryption-key"
# supabase_url = "https://your-staging-project.supabase.co"
# supabase_key = "your-staging-supabase-anon-key"
# supabase_service_key = "your-staging-supabase-service-key"
# pinecone_api_key = "your-pinecone-api-key"
# pinecone_environment = "us-east-1-aws"
# pinecone_index_name = "acadion-faces-staging"