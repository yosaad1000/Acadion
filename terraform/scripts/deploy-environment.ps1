# PowerShell script for deploying to specific environments using Terraform workspaces
# This script automates the deployment process for different environments

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("plan", "apply", "destroy")]
    [string]$Action = "plan",
    
    [Parameter(Mandatory=$false)]
    [switch]$AutoApprove,
    
    [Parameter(Mandatory=$false)]
    [switch]$Refresh = $true,
    
    [Parameter(Mandatory=$false)]
    [string]$VarFile,
    
    [Parameter(Mandatory=$false)]
    [switch]$Verbose
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Cyan = "Cyan"
$Magenta = "Magenta"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Show-Usage {
    Write-ColorOutput "Environment Deployment Script" $Cyan
    Write-ColorOutput "=============================" $Cyan
    Write-ColorOutput ""
    Write-ColorOutput "Usage:" $Yellow
    Write-ColorOutput "  .\deploy-environment.ps1 -Environment <env> [-Action <action>] [options]" $Yellow
    Write-ColorOutput ""
    Write-ColorOutput "Parameters:" $Yellow
    Write-ColorOutput "  -Environment    Target environment (dev, staging, prod)"
    Write-ColorOutput "  -Action         Terraform action (plan, apply, destroy) [default: plan]"
    Write-ColorOutput "  -AutoApprove    Skip interactive approval for apply/destroy"
    Write-ColorOutput "  -Refresh        Refresh state before operation [default: true]"
    Write-ColorOutput "  -VarFile        Custom variables file (overrides default)"
    Write-ColorOutput "  -Verbose        Enable verbose output"
    Write-ColorOutput ""
    Write-ColorOutput "Examples:" $Yellow
    Write-ColorOutput "  .\deploy-environment.ps1 -Environment dev -Action plan"
    Write-ColorOutput "  .\deploy-environment.ps1 -Environment staging -Action apply -AutoApprove"
    Write-ColorOutput "  .\deploy-environment.ps1 -Environment prod -Action destroy"
}

function Test-Prerequisites {
    Write-ColorOutput "🔍 Checking prerequisites..." $Cyan
    
    # Check Terraform
    try {
        $version = terraform version
        Write-ColorOutput "✅ Terraform: $($version[0])" $Green
    }
    catch {
        Write-ColorOutput "❌ Terraform is not installed or not in PATH" $Red
        return $false
    }
    
    # Check AWS CLI (optional but recommended)
    try {
        $awsVersion = aws --version 2>$null
        Write-ColorOutput "✅ AWS CLI: $awsVersion" $Green
    }
    catch {
        Write-ColorOutput "⚠️ AWS CLI not found (optional but recommended)" $Yellow
    }
    
    return $true
}

function Test-EnvironmentConfiguration {
    param([string]$Environment)
    
    Write-ColorOutput "🔧 Validating environment configuration..." $Cyan
    
    # Check tfvars file
    $tfvarsFile = if ($VarFile) { $VarFile } else { "environments\$Environment.tfvars" }
    
    if (-not (Test-Path $tfvarsFile)) {
        Write-ColorOutput "❌ Configuration file not found: $tfvarsFile" $Red
        Write-ColorOutput "Please create this file with environment-specific variables" $Yellow
        return $false
    }
    
    Write-ColorOutput "✅ Configuration file found: $tfvarsFile" $Green
    
    # Validate required variables in tfvars file
    $requiredVars = @(
        "environment",
        "aws_region", 
        "project_name",
        "github_repository"
    )
    
    $tfvarsContent = Get-Content $tfvarsFile -Raw
    $missingVars = @()
    
    foreach ($var in $requiredVars) {
        if ($tfvarsContent -notmatch "$var\s*=") {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -gt 0) {
        Write-ColorOutput "❌ Missing required variables in $tfvarsFile" $Red
        foreach ($var in $missingVars) {
            Write-ColorOutput "  - $var" $Red
        }
        return $false
    }
    
    Write-ColorOutput "✅ All required variables present" $Green
    return $true
}

function Initialize-TerraformWorkspace {
    param([string]$Environment)
    
    Write-ColorOutput "🏗️ Setting up Terraform workspace..." $Cyan
    
    # Initialize Terraform if needed
    if (-not (Test-Path ".terraform")) {
        Write-ColorOutput "Initializing Terraform..." $Yellow
        terraform init
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "❌ Terraform initialization failed" $Red
            return $false
        }
    }
    
    # Create or select workspace
    $currentWorkspace = terraform workspace show
    if ($currentWorkspace -ne $Environment) {
        Write-ColorOutput "Switching to workspace: $Environment" $Yellow
        
        # Try to select existing workspace
        terraform workspace select $Environment 2>$null
        if ($LASTEXITCODE -ne 0) {
            # Create new workspace if it doesn't exist
            Write-ColorOutput "Creating new workspace: $Environment" $Yellow
            terraform workspace new $Environment
            if ($LASTEXITCODE -ne 0) {
                Write-ColorOutput "❌ Failed to create workspace: $Environment" $Red
                return $false
            }
        }
    }
    
    $currentWorkspace = terraform workspace show
    Write-ColorOutput "✅ Using workspace: $currentWorkspace" $Green
    
    return $true
}

function Show-DeploymentPlan {
    param(
        [string]$Environment,
        [string]$TfvarsFile
    )
    
    Write-ColorOutput "📋 Generating deployment plan..." $Cyan
    
    $planArgs = @(
        "plan"
        "-var-file=`"$TfvarsFile`""
    )
    
    if ($Refresh) {
        $planArgs += "-refresh=true"
    }
    
    if ($Verbose) {
        $planArgs += "-detailed-exitcode"
    }
    
    Write-ColorOutput "Running: terraform $($planArgs -join ' ')" $Yellow
    
    & terraform @planArgs
    $exitCode = $LASTEXITCODE
    
    switch ($exitCode) {
        0 { 
            Write-ColorOutput "✅ No changes needed" $Green
            return "no-changes"
        }
        1 { 
            Write-ColorOutput "❌ Plan failed" $Red
            return "error"
        }
        2 { 
            Write-ColorOutput "📝 Changes detected" $Yellow
            return "changes"
        }
        default {
            Write-ColorOutput "❌ Unexpected exit code: $exitCode" $Red
            return "error"
        }
    }
}

function Apply-DeploymentPlan {
    param(
        [string]$Environment,
        [string]$TfvarsFile,
        [bool]$AutoApprove
    )
    
    Write-ColorOutput "🚀 Applying deployment..." $Cyan
    
    $applyArgs = @(
        "apply"
        "-var-file=`"$TfvarsFile`""
    )
    
    if ($AutoApprove) {
        $applyArgs += "-auto-approve"
    }
    
    if ($Refresh) {
        $applyArgs += "-refresh=true"
    }
    
    Write-ColorOutput "Running: terraform $($applyArgs -join ' ')" $Yellow
    
    if (-not $AutoApprove) {
        Write-ColorOutput ""
        Write-ColorOutput "⚠️ This will apply changes to the $Environment environment" $Yellow
        Write-ColorOutput "Please review the plan above carefully before proceeding" $Yellow
        Write-ColorOutput ""
    }
    
    & terraform @applyArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✅ Deployment completed successfully" $Green
        return $true
    }
    else {
        Write-ColorOutput "❌ Deployment failed" $Red
        return $false
    }
}

function Destroy-Environment {
    param(
        [string]$Environment,
        [string]$TfvarsFile,
        [bool]$AutoApprove
    )
    
    Write-ColorOutput "💥 Destroying environment..." $Red
    
    if (-not $AutoApprove) {
        Write-ColorOutput ""
        Write-ColorOutput "⚠️ WARNING: This will DESTROY all resources in the $Environment environment!" $Red
        Write-ColorOutput "This action cannot be undone!" $Red
        Write-ColorOutput ""
        
        $confirmation = Read-Host "Type 'DESTROY' to confirm destruction of $Environment environment"
        if ($confirmation -ne "DESTROY") {
            Write-ColorOutput "Operation cancelled" $Yellow
            return $false
        }
    }
    
    $destroyArgs = @(
        "destroy"
        "-var-file=`"$TfvarsFile`""
    )
    
    if ($AutoApprove) {
        $destroyArgs += "-auto-approve"
    }
    
    Write-ColorOutput "Running: terraform $($destroyArgs -join ' ')" $Yellow
    
    & terraform @destroyArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✅ Environment destroyed successfully" $Green
        return $true
    }
    else {
        Write-ColorOutput "❌ Destruction failed" $Red
        return $false
    }
}

function Show-DeploymentSummary {
    param(
        [string]$Environment,
        [string]$Action,
        [bool]$Success
    )
    
    Write-ColorOutput ""
    Write-ColorOutput "📊 Deployment Summary" $Cyan
    Write-ColorOutput "=====================" $Cyan
    Write-ColorOutput "Environment: $Environment"
    Write-ColorOutput "Action: $Action"
    Write-ColorOutput "Status: $(if ($Success) { 'SUCCESS ✅' } else { 'FAILED ❌' })"
    Write-ColorOutput "Workspace: $(terraform workspace show)"
    Write-ColorOutput "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    
    if ($Success -and $Action -eq "apply") {
        Write-ColorOutput ""
        Write-ColorOutput "🔗 Useful commands:" $Yellow
        Write-ColorOutput "  View outputs: terraform output"
        Write-ColorOutput "  Show state: terraform show"
        Write-ColorOutput "  Refresh state: terraform refresh -var-file=`"environments\$Environment.tfvars`""
    }
    
    Write-ColorOutput ""
}

# Main script execution
Write-ColorOutput "🚀 Environment Deployment Script" $Cyan
Write-ColorOutput "=================================" $Cyan
Write-ColorOutput "Environment: $Environment" $Green
Write-ColorOutput "Action: $Action" $Green
Write-ColorOutput ""

# Check prerequisites
if (-not (Test-Prerequisites)) {
    exit 1
}

# Change to terraform directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$terraformDir = Split-Path -Parent $scriptDir
Push-Location $terraformDir

try {
    # Validate environment configuration
    if (-not (Test-EnvironmentConfiguration $Environment)) {
        exit 1
    }
    
    # Set tfvars file
    $tfvarsFile = if ($VarFile) { $VarFile } else { "environments\$Environment.tfvars" }
    
    # Initialize workspace
    if (-not (Initialize-TerraformWorkspace $Environment)) {
        exit 1
    }
    
    # Execute the requested action
    $success = $false
    
    switch ($Action.ToLower()) {
        "plan" {
            $planResult = Show-DeploymentPlan $Environment $tfvarsFile
            $success = ($planResult -ne "error")
        }
        
        "apply" {
            # Always show plan first for apply
            $planResult = Show-DeploymentPlan $Environment $tfvarsFile
            
            if ($planResult -eq "error") {
                Write-ColorOutput "❌ Cannot apply due to plan errors" $Red
                $success = $false
            }
            elseif ($planResult -eq "no-changes") {
                Write-ColorOutput "✅ No changes to apply" $Green
                $success = $true
            }
            else {
                $success = Apply-DeploymentPlan $Environment $tfvarsFile $AutoApprove
            }
        }
        
        "destroy" {
            $success = Destroy-Environment $Environment $tfvarsFile $AutoApprove
        }
    }
    
    # Show summary
    Show-DeploymentSummary $Environment $Action $success
    
    if (-not $success) {
        exit 1
    }
}
finally {
    Pop-Location
}

Write-ColorOutput "✅ Script completed successfully" $Green