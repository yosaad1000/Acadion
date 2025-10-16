# Build and Push Docker Images to ECR
# This script builds the application images and pushes them to AWS ECR

param(
    [Parameter(Mandatory=$true)]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [string]$AWSRegion = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$ImageTag = "latest",
    
    [switch]$SkipBuild,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Status { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param([string]$Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param([string]$Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param([string]$Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

function Test-Prerequisites {
    Write-Status "Checking prerequisites..."
    
    # Check Docker
    try {
        $dockerVersion = docker --version
        Write-Success "✓ Docker found: $dockerVersion"
    }
    catch {
        Write-Error "✗ Docker not found. Please install Docker."
        exit 1
    }
    
    # Check AWS CLI
    try {
        $awsIdentity = aws sts get-caller-identity 2>$null | ConvertFrom-Json
        Write-Success "✓ AWS CLI configured for account: $($awsIdentity.Account)"
    }
    catch {
        Write-Error "✗ AWS CLI not configured."
        exit 1
    }
    
    # Check if Docker daemon is running
    try {
        docker info | Out-Null
        Write-Success "✓ Docker daemon is running"
    }
    catch {
        Write-Error "✗ Docker daemon is not running. Please start Docker."
        exit 1
    }
}

function Get-ECRRepositories {
    Write-Status "Getting ECR repository URLs..."
    
    try {
        # Get repository URLs from Terraform outputs
        $terraformOutputs = terraform output -json -state="terraform/environments/$Environment/terraform.tfstate" | ConvertFrom-Json
        
        $repositories = @{
            backend = $terraformOutputs.backend_repository_url.value
            frontend = $terraformOutputs.frontend_repository_url.value
            face_recognition = $terraformOutputs.face_recognition_repository_url.value
        }
        
        Write-Success "✓ Retrieved ECR repository URLs"
        return $repositories
    }
    catch {
        Write-Error "✗ Failed to get ECR repository URLs from Terraform outputs"
        Write-Status "Make sure the infrastructure is deployed first"
        exit 1
    }
}

function Login-ToECR {
    param([string]$Region)
    
    Write-Status "Logging in to Amazon ECR..."
    
    try {
        aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin "$((aws sts get-caller-identity --query Account --output text)).dkr.ecr.$Region.amazonaws.com"
        Write-Success "✓ Successfully logged in to ECR"
    }
    catch {
        Write-Error "✗ Failed to login to ECR"
        exit 1
    }
}

function Build-BackendImage {
    param([string]$RepositoryUrl, [string]$Tag)
    
    if ($SkipBuild) {
        Write-Status "Skipping backend image build"
        return
    }
    
    Write-Status "Building backend Docker image..."
    
    $imageName = "$RepositoryUrl:$Tag"
    
    try {
        $buildArgs = @(
            "build",
            "-f", "Dockerfile.backend",
            "-t", $imageName,
            "."
        )
        
        if ($Verbose) {
            $buildArgs += "--progress=plain"
        }
        
        Write-Status "Running: docker $($buildArgs -join ' ')"
        & docker @buildArgs
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "✓ Backend image built successfully: $imageName"
        } else {
            Write-Error "✗ Backend image build failed"
            exit 1
        }
    }
    catch {
        Write-Error "✗ Failed to build backend image: $_"
        exit 1
    }
}

function Build-FrontendImage {
    param([string]$RepositoryUrl, [string]$Tag)
    
    if ($SkipBuild) {
        Write-Status "Skipping frontend image build"
        return
    }
    
    Write-Status "Building frontend Docker image..."
    
    $imageName = "$RepositoryUrl:$Tag"
    
    try {
        $buildArgs = @(
            "build",
            "-f", "Dockerfile.frontend",
            "-t", $imageName,
            "."
        )
        
        if ($Verbose) {
            $buildArgs += "--progress=plain"
        }
        
        Write-Status "Running: docker $($buildArgs -join ' ')"
        & docker @buildArgs
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "✓ Frontend image built successfully: $imageName"
        } else {
            Write-Error "✗ Frontend image build failed"
            exit 1
        }
    }
    catch {
        Write-Error "✗ Failed to build frontend image: $_"
        exit 1
    }
}

function Build-FaceRecognitionImage {
    param([string]$RepositoryUrl, [string]$Tag)
    
    if ($SkipBuild) {
        Write-Status "Skipping face recognition image build"
        return
    }
    
    Write-Status "Building face recognition Docker image..."
    
    $imageName = "$RepositoryUrl:$Tag"
    
    try {
        $buildArgs = @(
            "build",
            "-f", "face-recognition-service/Dockerfile",
            "-t", $imageName,
            "face-recognition-service/"
        )
        
        if ($Verbose) {
            $buildArgs += "--progress=plain"
        }
        
        Write-Status "Running: docker $($buildArgs -join ' ')"
        & docker @buildArgs
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "✓ Face recognition image built successfully: $imageName"
        } else {
            Write-Error "✗ Face recognition image build failed"
            exit 1
        }
    }
    catch {
        Write-Error "✗ Failed to build face recognition image: $_"
        exit 1
    }
}

function Push-Image {
    param([string]$RepositoryUrl, [string]$Tag)
    
    $imageName = "$RepositoryUrl:$Tag"
    
    Write-Status "Pushing image: $imageName"
    
    try {
        docker push $imageName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "✓ Successfully pushed: $imageName"
        } else {
            Write-Error "✗ Failed to push: $imageName"
            exit 1
        }
    }
    catch {
        Write-Error "✗ Failed to push image: $_"
        exit 1
    }
}

# Main execution
Write-Status "=== Building and Pushing Docker Images to ECR ==="
Write-Status "Environment: $Environment"
Write-Status "AWS Region: $AWSRegion"
Write-Status "Image Tag: $ImageTag"
Write-Status ""

Test-Prerequisites

# Get ECR repository URLs
$repositories = Get-ECRRepositories

# Login to ECR
Login-ToECR -Region $AWSRegion

# Build images
Write-Status "Building Docker images..."
Build-BackendImage -RepositoryUrl $repositories.backend -Tag $ImageTag
Build-FrontendImage -RepositoryUrl $repositories.frontend -Tag $ImageTag
Build-FaceRecognitionImage -RepositoryUrl $repositories.face_recognition -Tag $ImageTag

# Push images
Write-Status "Pushing images to ECR..."
Push-Image -RepositoryUrl $repositories.backend -Tag $ImageTag
Push-Image -RepositoryUrl $repositories.frontend -Tag $ImageTag
Push-Image -RepositoryUrl $repositories.face_recognition -Tag $ImageTag

Write-Success "=== All images built and pushed successfully ==="
Write-Status ""
Write-Status "Images pushed:"
Write-Status "- Backend: $($repositories.backend):$ImageTag"
Write-Status "- Frontend: $($repositories.frontend):$ImageTag"
Write-Status "- Face Recognition: $($repositories.face_recognition):$ImageTag"