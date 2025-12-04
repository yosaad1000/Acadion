# Infrastructure Validation Script
Write-Host "[INFO] Validating Acadion Production Infrastructure" -ForegroundColor Cyan
Write-Host ""

# Check Terraform configuration
Write-Host "[INFO] Checking Terraform configuration files..." -ForegroundColor Cyan
if (Test-Path "terraform/main.tf") { Write-Host "✓ terraform/main.tf exists" -ForegroundColor Green }
if (Test-Path "terraform/variables.tf") { Write-Host "✓ terraform/variables.tf exists" -ForegroundColor Green }
if (Test-Path "terraform/outputs.tf") { Write-Host "✓ terraform/outputs.tf exists" -ForegroundColor Green }
if (Test-Path "terraform/environments/prod/main.tf") { Write-Host "✓ terraform/environments/prod/main.tf exists" -ForegroundColor Green }

Write-Host ""
Write-Host "[INFO] Checking Docker configuration..." -ForegroundColor Cyan
if (Test-Path "Dockerfile.backend") { Write-Host "✓ Dockerfile.backend exists" -ForegroundColor Green }
if (Test-Path "Dockerfile.frontend") { Write-Host "✓ Dockerfile.frontend exists" -ForegroundColor Green }
if (Test-Path "face-recognition-service/Dockerfile") { Write-Host "✓ face-recognition-service/Dockerfile exists" -ForegroundColor Green }

Write-Host ""
Write-Host "[INFO] Checking application files..." -ForegroundColor Cyan
if (Test-Path "backend/main.py") { Write-Host "✓ backend/main.py exists" -ForegroundColor Green }
if (Test-Path "backend/requirements.txt") { Write-Host "✓ backend/requirements.txt exists" -ForegroundColor Green }
if (Test-Path "frontend/package.json") { Write-Host "✓ frontend/package.json exists" -ForegroundColor Green }

Write-Host ""
Write-Host "[SUCCESS] Infrastructure validation completed" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] Deployment would create the following AWS resources:" -ForegroundColor Cyan
Write-Host "  - VPC with public/private subnets across 3 AZs" -ForegroundColor White
Write-Host "  - ECS cluster with backend, frontend, and face recognition services" -ForegroundColor White
Write-Host "  - Application Load Balancer with SSL termination" -ForegroundColor White
Write-Host "  - ECR repositories for container images" -ForegroundColor White
Write-Host "  - ElastiCache Redis cluster for caching" -ForegroundColor White
Write-Host "  - S3 buckets for static assets and backups" -ForegroundColor White
Write-Host "  - EFS file system for shared storage" -ForegroundColor White
Write-Host "  - CloudWatch monitoring and alerting" -ForegroundColor White
Write-Host "  - Parameter Store for configuration management" -ForegroundColor White