# Deployment Validation Script
# This script validates the infrastructure configuration and simulates deployment

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment = "prod",
    
    [switch]$SkipPrerequisites,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Status { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param([string]$Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param([string]$Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param([string]$Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

function Test-Prerequisites {
    if ($SkipPrerequisites) {
        Write-Status "Skipping prerequisites check"
        return
    }
    
    Write-Status "Validating deployment prerequisites..."
    
    $issues = @()
    
    # Check if Terraform would be available
    Write-Status "Checking Terraform availability..."
    try {
        $terraformCheck = Get-Command terraform -ErrorAction SilentlyContinue
        if ($terraformCheck) {
            Write-Success "✓ Terraform is available"
        } else {
            $issues += "Terraform not found - install from https://www.terraform.io/downloads.html"
        }
    }
    catch {
        $issues += "Terraform not found - install from https://www.terraform.io/downloads.html"
    }
    
    # Check if AWS CLI would be available
    Write-Status "Checking AWS CLI availability..."
    try {
        $awsCheck = Get-Command aws -ErrorAction SilentlyContinue
        if ($awsCheck) {
            Write-Success "✓ AWS CLI is available"
        } else {
            $issues += "AWS CLI not found - install from https://aws.amazon.com/cli/"
        }
    }
    catch {
        $issues += "AWS CLI not found - install from https://aws.amazon.com/cli/"
    }
    
    # Check Docker availability
    Write-Status "Checking Docker availability..."
    try {
        $dockerCheck = Get-Command docker -ErrorAction SilentlyContinue
        if ($dockerCheck) {
            Write-Success "✓ Docker is available"
        } else {
            $issues += "Docker not found - install from https://www.docker.com/products/docker-desktop"
        }
    }
    catch {
        $issues += "Docker not found - install from https://www.docker.com/products/docker-desktop"
    }
    
    if ($issues.Count -gt 0) {
        Write-Warning "Prerequisites issues found:"
        foreach ($issue in $issues) {
            Write-Warning "  - $issue"
        }
        Write-Status "These tools would be required for actual deployment"
    } else {
        Write-Success "✓ All prerequisites would be met"
    }
}

function Test-TerraformConfiguration {
    Write-Status "Validating Terraform configuration files..."
    
    $terraformRoot = "terraform"
    $envPath = "terraform/environments/$Environment"
    
    # Check main configuration files
    $requiredFiles = @(
        "$terraformRoot/main.tf",
        "$terraformRoot/variables.tf", 
        "$terraformRoot/outputs.tf",
        "$envPath/main.tf",
        "$envPath/variables.tf",
        "$envPath/outputs.tf"
    )
    
    $missingFiles = @()
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            $missingFiles += $file
        }
    }
    
    if ($missingFiles.Count -gt 0) {
        Write-Error "Missing required Terraform files:"
        foreach ($file in $missingFiles) {
            Write-Error "  - $file"
        }
        return $false
    }
    
    Write-Success "✓ All required Terraform files exist"
    
    # Check module directories
    $moduleDir = "$terraformRoot/modules"
    $requiredModules = @("networking", "ecr", "ecs", "storage", "parameter-store", "monitoring")
    
    foreach ($module in $requiredModules) {
        $modulePath = "$moduleDir/$module"
        if (Test-Path $modulePath) {
            Write-Success "✓ Module exists: $module"
        } else {
            Write-Warning "⚠ Module missing: $module"
        }
    }
    
    return $true
}

function Test-EnvironmentVariables {
    Write-Status "Checking required environment variables for $Environment..."
    
    $requiredVars = @(
        "TF_VAR_jwt_secret_key",
        "TF_VAR_encryption_key",
        "TF_VAR_supabase_url", 
        "TF_VAR_supabase_key",
        "TF_VAR_supabase_service_key",
        "TF_VAR_pinecone_api_key",
        "TF_VAR_pinecone_environment",
        "TF_VAR_pinecone_index_name",
        "TF_VAR_github_repository"
    )
    
    $missingVars = @()
    $setVars = @()
    
    foreach ($var in $requiredVars) {
        if (Get-Item "Env:$var" -ErrorAction SilentlyContinue) {
            $setVars += $var
        } else {
            $missingVars += $var
        }
    }
    
    if ($setVars.Count -gt 0) {
        Write-Success "✓ Environment variables set: $($setVars.Count)/$($requiredVars.Count)"
        if ($Verbose) {
            foreach ($var in $setVars) {
                Write-Status "  ✓ $var"
            }
        }
    }
    
    if ($missingVars.Count -gt 0) {
        Write-Warning "Missing environment variables:"
        foreach ($var in $missingVars) {
            Write-Warning "  - $var"
        }
        Write-Status "Set these variables before deployment"
        return $false
    }
    
    Write-Success "✓ All required environment variables are set"
    return $true
}

function Test-DockerConfiguration {
    Write-Status "Validating Docker configuration..."
    
    $dockerFiles = @(
        "Dockerfile.backend",
        "Dockerfile.frontend", 
        "face-recognition-service/Dockerfile"
    )
    
    foreach ($dockerfile in $dockerFiles) {
        if (Test-Path $dockerfile) {
            Write-Success "✓ Dockerfile exists: $dockerfile"
        } else {
            Write-Warning "⚠ Dockerfile missing: $dockerfile"
        }
    }
    
    # Check for required application files
    $appFiles = @(
        "backend/main.py",
        "backend/requirements.txt",
        "frontend/package.json",
        "face-recognition-service/main.py",
        "face-recognition-service/requirements.txt"
    )
    
    foreach ($file in $appFiles) {
        if (Test-Path $file) {
            Write-Success "✓ Application file exists: $file"
        } else {
            Write-Warning "⚠ Application file missing: $file"
        }
    }
}

function Simulate-Deployment {
    Write-Status "Simulating deployment process for $Environment environment..."
    
    # Simulate Terraform init
    Write-Status "1. Terraform initialization..."
    Start-Sleep -Seconds 1
    Write-Success "   ✓ Terraform initialized successfully"
    
    # Simulate Terraform plan
    Write-Status "2. Terraform planning..."
    Start-Sleep -Seconds 2
    Write-Success "   ✓ Plan completed - 47 resources to create"
    
    # Simulate infrastructure creation
    Write-Status "3. Creating AWS infrastructure..."
    $resources = @(
        "VPC and networking components",
        "Security groups and NACLs", 
        "ECR repositories",
        "ECS cluster and services",
        "Application Load Balancer",
        "ElastiCache Redis cluster",
        "EFS file system",
        "S3 buckets for storage",
        "IAM roles and policies",
        "Parameter Store parameters",
        "CloudWatch log groups",
        "SNS topics for notifications"
    )
    
    foreach ($resource in $resources) {
        Write-Status "   Creating: $resource"
        Start-Sleep -Milliseconds 500
        Write-Success "   ✓ Created: $resource"
    }
    
    # Simulate image building
    Write-Status "4. Building Docker images..."
    $images = @("Backend", "Frontend", "Face Recognition Service")
    foreach ($image in $images) {
        Write-Status "   Building: $image"
        Start-Sleep -Seconds 1
        Write-Success "   ✓ Built: $image"
    }
    
    # Simulate ECR push
    Write-Status "5. Pushing images to ECR..."
    foreach ($image in $images) {
        Write-Status "   Pushing: $image"
        Start-Sleep -Seconds 1
        Write-Success "   ✓ Pushed: $image"
    }
    
    # Simulate service deployment
    Write-Status "6. Deploying ECS services..."
    Start-Sleep -Seconds 2
    Write-Success "   ✓ All services deployed and healthy"
    
    Write-Success "✓ Deployment simulation completed successfully!"
}

function Show-ExpectedOutputs {
    Write-Status "Expected infrastructure outputs after deployment:"
    Write-Status ""
    
    $outputs = @{
        "vpc_id" = "vpc-0123456789abcdef0"
        "alb_dns_name" = "acadion-prod-alb-1234567890.us-east-1.elb.amazonaws.com"
        "ecs_cluster_name" = "acadion-prod-cluster"
        "backend_repository_url" = "123456789012.dkr.ecr.us-east-1.amazonaws.com/acadion-prod-backend"
        "frontend_repository_url" = "123456789012.dkr.ecr.us-east-1.amazonaws.com/acadion-prod-frontend"
        "face_recognition_repository_url" = "123456789012.dkr.ecr.us-east-1.amazonaws.com/acadion-prod-face-recognition"
        "redis_endpoint" = "acadion-prod-redis.abc123.cache.amazonaws.com:6379"
        "application_url" = "http://acadion-prod-alb-1234567890.us-east-1.elb.amazonaws.com"
        "api_url" = "http://acadion-prod-alb-1234567890.us-east-1.elb.amazonaws.com:8000"
    }
    
    foreach ($key in $outputs.Keys) {
        Write-Status "$key = $($outputs[$key])"
    }
}

function Show-NextSteps {
    Write-Status ""
    Write-Success "=== Next Steps After Deployment ==="
    Write-Status ""
    Write-Status "1. Configure Parameter Store with production secrets:"
    Write-Status "   aws ssm put-parameter --name '/acadion/prod/jwt-secret-key' --value 'your-secret' --type 'SecureString'"
    Write-Status ""
    Write-Status "2. Build and push Docker images:"
    Write-Status "   .\scripts\build-and-push-images.ps1 -Environment prod"
    Write-Status ""
    Write-Status "3. Update ECS services to use new images:"
    Write-Status "   aws ecs update-service --cluster acadion-prod-cluster --service acadion-prod-backend --force-new-deployment"
    Write-Status ""
    Write-Status "4. Configure DNS (optional):"
    Write-Status "   Point your domain to the ALB DNS name"
    Write-Status ""
    Write-Status "5. Test the deployment:"
    Write-Status "   curl http://your-alb-dns-name/api/health"
    Write-Status ""
    Write-Status "6. Set up monitoring and alerts"
    Write-Status "7. Configure backup notifications"
    Write-Status "8. Review security settings"
}

# Main execution
Write-Status "=== Acadion Production Deployment Validation ==="
Write-Status "Environment: $Environment"
Write-Status ""

Test-Prerequisites
$configValid = Test-TerraformConfiguration
$varsValid = Test-EnvironmentVariables
Test-DockerConfiguration

if ($configValid -and $varsValid) {
    Write-Success "✓ Configuration validation passed"
    Simulate-Deployment
    Show-ExpectedOutputs
    Show-NextSteps
} else {
    Write-Warning "⚠ Configuration issues found - resolve before deployment"
}

Write-Status ""
Write-Success "=== Validation completed ==="