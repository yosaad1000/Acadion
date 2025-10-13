# Terraform Workspace Manager for Acadion AWS Deployment
# This script helps manage Terraform workspaces for different environments

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment,
    
    [Parameter(Mandatory=$true)]
    [ValidateSet("init", "plan", "apply", "destroy", "output", "switch")]
    [string]$Action,
    
    [switch]$AutoApprove,
    [switch]$Verbose
)

# Configuration
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$TerraformRoot = Join-Path $ProjectRoot "terraform"
$EnvironmentPath = Join-Path $TerraformRoot "environments" $Environment

# Colors for output
$Colors = @{
    Info = "Cyan"
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
}

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Test-Prerequisites {
    Write-ColorOutput "Checking prerequisites..." "Info"
    
    # Check if Terraform is installed
    try {
        $terraformVersion = terraform version
        Write-ColorOutput "✓ Terraform found: $($terraformVersion[0])" "Success"
    }
    catch {
        Write-ColorOutput "✗ Terraform not found. Please install Terraform." "Error"
        exit 1
    }
    
    # Check if AWS CLI is configured
    try {
        $awsIdentity = aws sts get-caller-identity 2>$null
        if ($awsIdentity) {
            $identity = $awsIdentity | ConvertFrom-Json
            Write-ColorOutput "✓ AWS CLI configured for account: $($identity.Account)" "Success"
        }
    }
    catch {
        Write-ColorOutput "⚠ AWS CLI not configured. Make sure you have valid AWS credentials." "Warning"
    }
    
    # Check if environment directory exists
    if (-not (Test-Path $EnvironmentPath)) {
        Write-ColorOutput "✗ Environment directory not found: $EnvironmentPath" "Error"
        exit 1
    }
    
    Write-ColorOutput "✓ Prerequisites check completed" "Success"
}

function Initialize-Environment {
    Write-ColorOutput "Initializing $Environment environment..." "Info"
    
    Set-Location $EnvironmentPath
    
    # Initialize Terraform
    $initArgs = @("init")
    if ($Verbose) { $initArgs += "-verbose" }
    
    Write-ColorOutput "Running: terraform $($initArgs -join ' ')" "Info"
    & terraform @initArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✓ Terraform initialization completed successfully" "Success"
    } else {
        Write-ColorOutput "✗ Terraform initialization failed" "Error"
        exit 1
    }
}

function Plan-Environment {
    Write-ColorOutput "Planning $Environment environment..." "Info"
    
    Set-Location $EnvironmentPath
    
    $planArgs = @("plan")
    if ($Verbose) { $planArgs += "-verbose" }
    
    Write-ColorOutput "Running: terraform $($planArgs -join ' ')" "Info"
    & terraform @planArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✓ Terraform plan completed successfully" "Success"
    } else {
        Write-ColorOutput "✗ Terraform plan failed" "Error"
        exit 1
    }
}

function Apply-Environment {
    Write-ColorOutput "Applying $Environment environment..." "Info"
    
    Set-Location $EnvironmentPath
    
    $applyArgs = @("apply")
    if ($AutoApprove) { $applyArgs += "-auto-approve" }
    if ($Verbose) { $applyArgs += "-verbose" }
    
    if (-not $AutoApprove) {
        Write-ColorOutput "⚠ This will create/modify AWS resources in the $Environment environment." "Warning"
        $confirmation = Read-Host "Do you want to continue? (yes/no)"
        if ($confirmation -ne "yes") {
            Write-ColorOutput "Operation cancelled by user" "Info"
            exit 0
        }
    }
    
    Write-ColorOutput "Running: terraform $($applyArgs -join ' ')" "Info"
    & terraform @applyArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✓ Terraform apply completed successfully" "Success"
        Write-ColorOutput "Environment $Environment is now deployed!" "Success"
    } else {
        Write-ColorOutput "✗ Terraform apply failed" "Error"
        exit 1
    }
}

function Destroy-Environment {
    Write-ColorOutput "Destroying $Environment environment..." "Warning"
    
    Set-Location $EnvironmentPath
    
    Write-ColorOutput "⚠ WARNING: This will DESTROY all resources in the $Environment environment!" "Error"
    Write-ColorOutput "This action cannot be undone!" "Error"
    
    $confirmation = Read-Host "Type 'destroy-$Environment' to confirm destruction"
    if ($confirmation -ne "destroy-$Environment") {
        Write-ColorOutput "Operation cancelled - confirmation text did not match" "Info"
        exit 0
    }
    
    $destroyArgs = @("destroy")
    if ($AutoApprove) { $destroyArgs += "-auto-approve" }
    if ($Verbose) { $destroyArgs += "-verbose" }
    
    Write-ColorOutput "Running: terraform $($destroyArgs -join ' ')" "Info"
    & terraform @destroyArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✓ Environment $Environment destroyed successfully" "Success"
    } else {
        Write-ColorOutput "✗ Terraform destroy failed" "Error"
        exit 1
    }
}

function Show-Output {
    Write-ColorOutput "Showing outputs for $Environment environment..." "Info"
    
    Set-Location $EnvironmentPath
    
    Write-ColorOutput "Running: terraform output" "Info"
    terraform output
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✓ Outputs displayed successfully" "Success"
    } else {
        Write-ColorOutput "✗ Failed to show outputs" "Error"
        exit 1
    }
}

function Switch-Environment {
    Write-ColorOutput "Switching to $Environment environment..." "Info"
    Write-ColorOutput "Environment path: $EnvironmentPath" "Info"
    Write-ColorOutput "Use this path for Terraform operations in the $Environment environment" "Success"
}

# Main execution
Write-ColorOutput "=== Acadion Terraform Workspace Manager ===" "Info"
Write-ColorOutput "Environment: $Environment" "Info"
Write-ColorOutput "Action: $Action" "Info"
Write-ColorOutput "" "Info"

Test-Prerequisites

switch ($Action) {
    "init" { Initialize-Environment }
    "plan" { Plan-Environment }
    "apply" { Apply-Environment }
    "destroy" { Destroy-Environment }
    "output" { Show-Output }
    "switch" { Switch-Environment }
}

Write-ColorOutput "" "Info"
Write-ColorOutput "=== Operation completed ===" "Success"