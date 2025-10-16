# Production Infrastructure Deployment Script
# This script deploys the Acadion infrastructure to AWS production environment

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("plan", "apply", "destroy", "output", "validate")]
    [string]$Action = "plan",
    
    [switch]$AutoApprove,
    [switch]$Verbose
)

# Configuration
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$TerraformRoot = Join-Path $ProjectRoot "terraform"
$ProdEnvironmentPath = Join-Path $TerraformRoot "environments" "prod"

# Colors for output
function Write-Status { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param([string]$Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param([string]$Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param([string]$Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

function Test-Prerequisites {
    Write-Status "Checking prerequisites for production deployment..."
    
    # Check Terraform
    try {
        $terraformVersion = terraform version
        Write-Success "✓ Terraform found: $($terraformVersion[0])"
    }
    catch {
        Write-Error "✗ Terraform not found. Please install Terraform."
        exit 1
    }
    
    # Check AWS CLI
    try {
        $awsIdentity = aws sts get-caller-identity 2>$null | ConvertFrom-Json
        Write-Success "✓ AWS CLI configured for account: $($awsIdentity.Account)"
        
        # Verify it's not a development account
        if ($awsIdentity.Account -eq "123456789012") {
            Write-Warning "⚠ This appears to be a development AWS account. Verify you're deploying to production."
        }
    }
    catch {
        Write-Error "✗ AWS CLI not configured or invalid credentials."
        exit 1
    }
    
    # Check environment directory
    if (-not (Test-Path $ProdEnvironmentPath)) {
        Write-Error "✗ Production environment directory not found: $ProdEnvironmentPath"
        exit 1
    }
    
    # Check for required environment variables
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
    foreach ($var in $requiredVars) {
        if (-not (Get-Item "Env:$var" -ErrorAction SilentlyContinue)) {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -gt 0) {
        Write-Error "✗ Missing required environment variables:"
        foreach ($var in $missingVars) {
            Write-Error "  - $var"
        }
        Write-Status "Please set these variables or source the .env file"
        exit 1
    }
    
    Write-Success "✓ All prerequisites met"
}

function Initialize-Terraform {
    Write-Status "Initializing Terraform for production environment..."
    
    Set-Location $ProdEnvironmentPath
    
    $initArgs = @("init")
    if ($Verbose) { $initArgs += "-verbose" }
    
    Write-Status "Running: terraform $($initArgs -join ' ')"
    & terraform @initArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✓ Terraform initialization completed"
    } else {
        Write-Error "✗ Terraform initialization failed"
        exit 1
    }
}

function Validate-Configuration {
    Write-Status "Validating Terraform configuration..."
    
    Set-Location $ProdEnvironmentPath
    
    terraform validate
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✓ Configuration is valid"
    } else {
        Write-Error "✗ Configuration validation failed"
        exit 1
    }
}

function Plan-Infrastructure {
    Write-Status "Planning production infrastructure changes..."
    
    Set-Location $ProdEnvironmentPath
    
    $planArgs = @("plan", "-out=tfplan")
    if ($Verbose) { $planArgs += "-verbose" }
    
    Write-Status "Running: terraform $($planArgs -join ' ')"
    & terraform @planArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✓ Plan completed successfully"
        Write-Status "Plan saved to tfplan file"
    } else {
        Write-Error "✗ Planning failed"
        exit 1
    }
}

function Apply-Infrastructure {
    Write-Status "Applying production infrastructure..."
    
    Set-Location $ProdEnvironmentPath
    
    if (-not $AutoApprove) {
        Write-Warning "⚠ You are about to deploy to PRODUCTION environment!"
        Write-Warning "This will create/modify AWS resources that may incur costs."
        $confirmation = Read-Host "Type 'deploy-production' to confirm"
        if ($confirmation -ne "deploy-production") {
            Write-Status "Deployment cancelled by user"
            exit 0
        }
    }
    
    $applyArgs = @("apply")
    if (Test-Path "tfplan") {
        $applyArgs += "tfplan"
        Write-Status "Applying saved plan..."
    } else {
        if ($AutoApprove) { $applyArgs += "-auto-approve" }
        Write-Status "No saved plan found, applying directly..."
    }
    
    if ($Verbose) { $applyArgs += "-verbose" }
    
    Write-Status "Running: terraform $($applyArgs -join ' ')"
    & terraform @applyArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✓ Infrastructure deployed successfully!"
        Show-PostDeploymentInfo
    } else {
        Write-Error "✗ Deployment failed"
        exit 1
    }
}

function Show-PostDeploymentInfo {
    Write-Success "=== Production Deployment Completed ==="
    Write-Status ""
    Write-Status "Next steps:"
    Write-Status "1. Configure Parameter Store with production secrets"
    Write-Status "2. Build and push container images to ECR"
    Write-Status "3. Configure DNS records (if using custom domain)"
    Write-Status "4. Set up monitoring alerts"
    Write-Status "5. Test the deployed application"
    Write-Status ""
    Write-Status "Getting infrastructure outputs..."
    terraform output
}

function Destroy-Infrastructure {
    Write-Warning "⚠ DANGER: You are about to DESTROY the production environment!"
    Write-Warning "This will delete ALL production resources and data!"
    Write-Warning "This action CANNOT be undone!"
    
    $confirmation1 = Read-Host "Type 'destroy-production' to continue"
    if ($confirmation1 -ne "destroy-production") {
        Write-Status "Destruction cancelled"
        exit 0
    }
    
    $confirmation2 = Read-Host "Type 'I-understand-this-will-delete-everything' to confirm"
    if ($confirmation2 -ne "I-understand-this-will-delete-everything") {
        Write-Status "Destruction cancelled"
        exit 0
    }
    
    Set-Location $ProdEnvironmentPath
    
    $destroyArgs = @("destroy")
    if ($AutoApprove) { $destroyArgs += "-auto-approve" }
    if ($Verbose) { $destroyArgs += "-verbose" }
    
    Write-Status "Running: terraform $($destroyArgs -join ' ')"
    & terraform @destroyArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✓ Production environment destroyed"
    } else {
        Write-Error "✗ Destruction failed"
        exit 1
    }
}

function Show-Outputs {
    Write-Status "Production infrastructure outputs:"
    
    Set-Location $ProdEnvironmentPath
    
    terraform output
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "✗ Failed to show outputs"
        exit 1
    }
}

# Main execution
Write-Status "=== Acadion Production Infrastructure Deployment ==="
Write-Status "Action: $Action"
Write-Status "Environment: Production"
Write-Status ""

Test-Prerequisites

# Always initialize and validate first
Initialize-Terraform
Validate-Configuration

# Execute requested action
switch ($Action) {
    "plan" { Plan-Infrastructure }
    "apply" { Apply-Infrastructure }
    "destroy" { Destroy-Infrastructure }
    "output" { Show-Outputs }
    "validate" { Write-Success "✓ Validation completed successfully" }
}

Write-Status ""
Write-Success "=== Operation completed ==="