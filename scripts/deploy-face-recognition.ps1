# Face Recognition Microservice Deployment Script (PowerShell)

param(
    [string]$ProjectName = "acadion",
    [string]$Environment = "dev",
    [string]$AwsRegion = "us-east-1",
    [string]$ImageTag = "latest",
    [bool]$ForceDeploy = $false
)

# Configuration
$EcrRepository = "$ProjectName-face-recognition"
$EcsCluster = "$ProjectName-face-recognition"
$EcsService = "$ProjectName-face-recognition"

Write-Host "🚀 Deploying Face Recognition Microservice" -ForegroundColor Green
Write-Host "Configuration:" -ForegroundColor Blue
Write-Host "  Project: $ProjectName"
Write-Host "  Environment: $Environment"
Write-Host "  Region: $AwsRegion"
Write-Host "  Image Tag: $ImageTag"
Write-Host "  Force Deploy: $ForceDeploy"
Write-Host ""

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow

# Check AWS CLI
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "❌ AWS CLI is not installed" -ForegroundColor Red
    exit 1
}

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker is not installed" -ForegroundColor Red
    exit 1
}

# Check Terraform
if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Terraform is not installed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prerequisites check passed" -ForegroundColor Green

# Get AWS account ID
$AwsAccountId = aws sts get-caller-identity --query Account --output text
$EcrUri = "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com/$EcrRepository"

Write-Host "ECR Repository: $EcrUri" -ForegroundColor Blue

# Build and push Docker image
Write-Host "🔨 Building and pushing Docker image..." -ForegroundColor Yellow

Set-Location face-recognition-service

docker build -t "${EcrRepository}:${ImageTag}" -f Dockerfile .
docker tag "${EcrRepository}:${ImageTag}" "${EcrUri}:${ImageTag}"
docker tag "${EcrRepository}:${ImageTag}" "${EcrUri}:latest"

aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin $EcrUri

docker push "${EcrUri}:${ImageTag}"
docker push "${EcrUri}:latest"

Write-Host "✅ Docker image pushed successfully" -ForegroundColor Green

Set-Location ..

Write-Host "🎉 Face Recognition Microservice deployment completed!" -ForegroundColor Green