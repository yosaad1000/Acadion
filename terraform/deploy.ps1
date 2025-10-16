# AWS Free Tier Infrastructure Deployment Script for Acadion (PowerShell)

param(
    [Parameter(Position=0)]
    [ValidateSet("check", "plan", "deploy", "destroy", "status", "outputs", "costs")]
    [string]$Action = "deploy"
)

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Function to check prerequisites
function Test-Prerequisites {
    Write-Status "Checking prerequisites..."
    
    # Check if terraform is installed
    try {
        $terraformVersion = terraform version -json | ConvertFrom-Json
        Write-Status "Terraform version: $($terraformVersion.terraform_version)"
    }
    catch {
        Write-Error "Terraform is not installed. Please install Terraform >= 1.0"
        exit 1
    }
    
    # Check if AWS CLI is installed
    try {
        $awsVersion = aws --version
        Write-Status "AWS CLI: $awsVersion"
    }
    catch {
        Write-Error "AWS CLI is not installed. Please install AWS CLI"
        exit 1
    }
    
    # Check AWS credentials
    try {
        $awsIdentity = aws sts get-caller-identity | ConvertFrom-Json
        Write-Status "AWS Account: $($awsIdentity.Account)"
        
        $awsRegion = aws configure get region
        Write-Status "AWS Region: $awsRegion"
    }
    catch {
        Write-Error "AWS credentials not configured. Please run 'aws configure'"
        exit 1
    }
    
    Write-Success "Prerequisites check passed"
}

# Function to setup terraform variables
function Initialize-Variables {
    Write-Status "Setting up Terraform variables..."
    
    if (-not (Test-Path "terraform.tfvars")) {
        if (Test-Path "terraform.tfvars.example") {
            Copy-Item "terraform.tfvars.example" "terraform.tfvars"
            Write-Warning "Created terraform.tfvars from example. Please edit it with your values."
            Write-Warning "Required variables: supabase_url, supabase_service_key, pinecone_api_key, jwt_secret_key"
            
            Read-Host "Press Enter after editing terraform.tfvars to continue"
        }
        else {
            Write-Error "terraform.tfvars.example not found. Please create terraform.tfvars manually."
            exit 1
        }
    }
    else {
        Write-Status "terraform.tfvars already exists"
    }
}

# Function to validate terraform configuration
function Test-TerraformConfig {
    Write-Status "Validating Terraform configuration..."
    
    terraform fmt -check=true -diff=true
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Terraform formatting check failed"
        exit 1
    }
    
    terraform validate
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Terraform validation failed"
        exit 1
    }
    
    Write-Success "Terraform configuration is valid"
}

# Function to plan deployment
function Start-DeploymentPlan {
    Write-Status "Planning Terraform deployment..."
    
    terraform plan -out=tfplan
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Terraform plan failed"
        exit 1
    }
    
    Write-Warning "Please review the plan above carefully."
    Write-Warning "This will create AWS resources that may incur costs."
    
    $confirm = Read-Host "Do you want to proceed with deployment? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Status "Deployment cancelled"
        exit 0
    }
}

# Function to apply deployment
function Start-Deployment {
    Write-Status "Applying Terraform deployment..."
    
    terraform apply tfplan
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Terraform apply failed"
        exit 1
    }
    
    Write-Success "Infrastructure deployment completed!"
}

# Function to show outputs
function Show-Outputs {
    Write-Status "Deployment outputs:"
    terraform output
    
    Write-Status "Important next steps:"
    Write-Host "1. Configure your CI/CD pipeline with the ECR repository URL"
    Write-Host "2. Update your application configuration with the EC2 public IP"
    Write-Host "3. Set up monitoring alerts using the CloudWatch dashboard"
    Write-Host "4. Test the deployment by accessing the health check endpoint"
    
    try {
        $ec2Ip = terraform output -raw ec2_public_ip
        Write-Status "Health check URL: http://$ec2Ip:8000/health"
    }
    catch {
        Write-Warning "Could not retrieve EC2 IP address"
    }
}

# Function to estimate costs
function Show-CostEstimate {
    Write-Status "AWS Free Tier Resource Summary:"
    Write-Host "┌─────────────────┬──────────────────┬─────────────────────┐"
    Write-Host "│ Service         │ Free Tier Limit  │ Estimated Usage     │"
    Write-Host "├─────────────────┼──────────────────┼─────────────────────┤"
    Write-Host "│ EC2 t2.micro    │ 750 hours/month  │ 744 hours (24/7)    │"
    Write-Host "│ EBS Storage     │ 30GB             │ 30GB                │"
    Write-Host "│ Lambda          │ 1M requests      │ Variable            │"
    Write-Host "│ S3 Storage      │ 5GB              │ <1GB                │"
    Write-Host "│ Data Transfer   │ 15GB/month       │ Variable            │"
    Write-Host "│ ECR Storage     │ 500MB            │ <200MB              │"
    Write-Host "└─────────────────┴──────────────────┴─────────────────────┘"
    Write-Host ""
    Write-Warning "Estimated monthly cost: `$0-10 (first 12 months)"
    Write-Warning "After free tier: `$13-18/month"
}

# Main function
function Main {
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  Acadion AWS Free Tier Deployment" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    
    switch ($Action) {
        "check" {
            Test-Prerequisites
        }
        "plan" {
            Test-Prerequisites
            Initialize-Variables
            terraform init
            Test-TerraformConfig
            Start-DeploymentPlan
        }
        "deploy" {
            Test-Prerequisites
            Initialize-Variables
            terraform init
            Test-TerraformConfig
            Start-DeploymentPlan
            Start-Deployment
            Show-Outputs
        }
        "destroy" {
            Write-Warning "This will destroy all infrastructure and data!"
            $confirm = Read-Host "Are you sure you want to destroy everything? (yes/no)"
            if ($confirm -eq "yes") {
                terraform destroy
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Infrastructure destroyed"
                }
            }
            else {
                Write-Status "Destroy cancelled"
            }
        }
        "status" {
            terraform show
        }
        "outputs" {
            Show-Outputs
        }
        "costs" {
            Show-CostEstimate
        }
        default {
            Write-Host "Usage: .\deploy.ps1 [check|plan|deploy|destroy|status|outputs|costs]"
            Write-Host ""
            Write-Host "Commands:"
            Write-Host "  check   - Check prerequisites only"
            Write-Host "  plan    - Plan deployment without applying"
            Write-Host "  deploy  - Full deployment (default)"
            Write-Host "  destroy - Destroy all infrastructure"
            Write-Host "  status  - Show current infrastructure state"
            Write-Host "  outputs - Show deployment outputs"
            Write-Host "  costs   - Show cost estimates"
        }
    }
}

# Run main function
Main