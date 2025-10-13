# Terraform deployment script for Acadion AWS infrastructure (PowerShell)

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment,
    
    [Parameter(Mandatory=$true)]
    [ValidateSet("plan", "apply", "destroy", "output")]
    [string]$Action
)

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Function to show usage
function Show-Usage {
    Write-Host "Usage: .\deploy.ps1 -Environment <env> -Action <action>"
    Write-Host ""
    Write-Host "Environment:"
    Write-Host "  dev       - Development environment"
    Write-Host "  staging   - Staging environment"
    Write-Host "  prod      - Production environment"
    Write-Host ""
    Write-Host "Action:"
    Write-Host "  plan      - Show what will be created/changed"
    Write-Host "  apply     - Apply the infrastructure changes"
    Write-Host "  destroy   - Destroy the infrastructure (use with caution)"
    Write-Host "  output    - Show terraform outputs"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\deploy.ps1 -Environment dev -Action plan"
    Write-Host "  .\deploy.ps1 -Environment staging -Action apply"
    Write-Host "  .\deploy.ps1 -Environment prod -Action output"
}

# Set variables
$TfvarsFile = "environments\$Environment.tfvars"
$TerraformDir = Split-Path -Parent $PSScriptRoot

# Change to terraform directory
Set-Location $TerraformDir

# Check if tfvars file exists
if (-not (Test-Path $TfvarsFile)) {
    Write-Error "Environment file not found: $TfvarsFile"
    exit 1
}

Write-Status "Using environment: $Environment"
Write-Status "Action: $Action"

# Initialize Terraform if not already done
if (-not (Test-Path ".terraform")) {
    Write-Status "Initializing Terraform..."
    terraform init
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Terraform initialization failed"
        exit 1
    }
}

# Execute the requested action
switch ($Action) {
    "plan" {
        Write-Status "Planning infrastructure changes..."
        terraform plan -var-file="$TfvarsFile"
    }
    "apply" {
        Write-Status "Applying infrastructure changes..."
        if ($Environment -eq "prod") {
            Write-Warning "You are about to deploy to PRODUCTION!"
            $confirm = Read-Host "Are you sure you want to continue? (yes/no)"
            if ($confirm -ne "yes") {
                Write-Status "Deployment cancelled."
                exit 0
            }
        }
        terraform apply -var-file="$TfvarsFile"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Status "Deployment completed successfully!"
            Write-Status "Don't forget to configure Parameter Store with your secrets."
            Write-Host ""
            Write-Status "Next steps:"
            Write-Host "1. Configure Parameter Store parameters"
            Write-Host "2. Set up GitHub Actions with the IAM role"
            Write-Host "3. Push container images to ECR"
            Write-Host "4. Configure DNS (optional)"
        }
    }
    "destroy" {
        Write-Warning "You are about to DESTROY infrastructure for $Environment!"
        Write-Warning "This action cannot be undone!"
        $confirm = Read-Host "Type 'destroy' to confirm"
        if ($confirm -ne "destroy") {
            Write-Status "Destruction cancelled."
            exit 0
        }
        terraform destroy -var-file="$TfvarsFile"
    }
    "output" {
        Write-Status "Showing terraform outputs..."
        terraform output
    }
}