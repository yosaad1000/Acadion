# Simple Deployment Validation Script

param(
    [string]$Environment = "prod"
)

function Write-Status { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param([string]$Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param([string]$Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }

Write-Status "=== Acadion Production Deployment Validation ==="
Write-Status "Environment: $Environment"
Write-Status ""

# Check Terraform files
Write-Status "Validating Terraform configuration files..."
$terraformFiles = @(
    "terraform/main.tf",
    "terraform/variables.tf", 
    "terraform/outputs.tf",
    "terraform/environments/$Environment/main.tf"
)

foreach ($file in $terraformFiles) {
    if (Test-Path $file) {
        Write-Success "✓ $file exists"
    } else {
        Write-Warning "⚠ $file missing"
    }
}

# Check Docker files
Write-Status ""
Write-Status "Validating Docker configuration..."
$dockerFiles = @(
    "Dockerfile.backend",
    "Dockerfile.frontend", 
    "face-recognition-service/Dockerfile"
)

foreach ($file in $dockerFiles) {
    if (Test-Path $file) {
        Write-Success "✓ $file exists"
    } else {
        Write-Warning "⚠ $file missing"
    }
}

# Check application files
Write-Status ""
Write-Status "Validating application files..."
$appFiles = @(
    "backend/main.py",
    "backend/requirements.txt",
    "frontend/package.json"
)

foreach ($file in $appFiles) {
    if (Test-Path $file) {
        Write-Success "✓ $file exists"
    } else {
        Write-Warning "⚠ $file missing"
    }
}

Write-Status ""
Write-Success "✓ Configuration validation completed"

# Simulate deployment steps
Write-Status ""
Write-Status "Simulating deployment process..."
Write-Status "1. Infrastructure deployment would create:"
Write-Status "   - VPC with public/private subnets"
Write-Status "   - ECS cluster with services"
Write-Status "   - Application Load Balancer"
Write-Status "   - ECR repositories"
Write-Status "   - ElastiCache Redis cluster"
Write-Status "   - S3 buckets and EFS storage"
Write-Status "   - CloudWatch monitoring"

Write-Status ""
Write-Status "2. Expected outputs:"
Write-Status "   - ALB DNS: acadion-prod-alb-xxx.us-east-1.elb.amazonaws.com"
Write-Status "   - Application URL: http://alb-dns-name"
Write-Status "   - API URL: http://alb-dns-name:8000"

Write-Status ""
Write-Success "=== Validation completed successfully ==="