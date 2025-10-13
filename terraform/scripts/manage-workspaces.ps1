# PowerShell script for managing Terraform workspaces
# This script helps create and manage environment-specific Terraform workspaces

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("create", "select", "list", "delete", "show")]
    [string]$Action,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Cyan = "Cyan"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Show-Usage {
    Write-ColorOutput "Terraform Workspace Management Script" $Cyan
    Write-ColorOutput "=====================================" $Cyan
    Write-ColorOutput ""
    Write-ColorOutput "Usage:" $Yellow
    Write-ColorOutput "  .\manage-workspaces.ps1 -Action <action> [-Environment <env>] [-Force]" $Yellow
    Write-ColorOutput ""
    Write-ColorOutput "Actions:" $Yellow
    Write-ColorOutput "  create    - Create a new workspace for the specified environment"
    Write-ColorOutput "  select    - Select/switch to an existing workspace"
    Write-ColorOutput "  list      - List all available workspaces"
    Write-ColorOutput "  delete    - Delete a workspace (use with caution!)"
    Write-ColorOutput "  show      - Show current workspace"
    Write-ColorOutput ""
    Write-ColorOutput "Environments:" $Yellow
    Write-ColorOutput "  dev       - Development environment"
    Write-ColorOutput "  staging   - Staging environment"
    Write-ColorOutput "  prod      - Production environment"
    Write-ColorOutput ""
    Write-ColorOutput "Examples:" $Yellow
    Write-ColorOutput "  .\manage-workspaces.ps1 -Action create -Environment dev"
    Write-ColorOutput "  .\manage-workspaces.ps1 -Action select -Environment prod"
    Write-ColorOutput "  .\manage-workspaces.ps1 -Action list"
}

function Test-TerraformInstalled {
    try {
        $version = terraform version
        Write-ColorOutput "✅ Terraform is installed: $($version[0])" $Green
        return $true
    }
    catch {
        Write-ColorOutput "❌ Terraform is not installed or not in PATH" $Red
        Write-ColorOutput "Please install Terraform from: https://www.terraform.io/downloads.html" $Yellow
        return $false
    }
}

function Initialize-Terraform {
    Write-ColorOutput "🔧 Initializing Terraform..." $Cyan
    
    try {
        terraform init
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Terraform initialized successfully" $Green
            return $true
        }
        else {
            Write-ColorOutput "❌ Terraform initialization failed" $Red
            return $false
        }
    }
    catch {
        Write-ColorOutput "❌ Error during Terraform initialization: $($_.Exception.Message)" $Red
        return $false
    }
}

function Get-CurrentWorkspace {
    try {
        $workspace = terraform workspace show
        return $workspace.Trim()
    }
    catch {
        return "unknown"
    }
}

function Get-AllWorkspaces {
    try {
        $workspaces = terraform workspace list
        return $workspaces | ForEach-Object { $_.Trim().Replace("*", "").Trim() } | Where-Object { $_ -ne "" }
    }
    catch {
        return @()
    }
}

function Create-Workspace {
    param([string]$WorkspaceName)
    
    Write-ColorOutput "🏗️ Creating workspace: $WorkspaceName" $Cyan
    
    # Check if workspace already exists
    $existingWorkspaces = Get-AllWorkspaces
    if ($existingWorkspaces -contains $WorkspaceName) {
        Write-ColorOutput "⚠️ Workspace '$WorkspaceName' already exists" $Yellow
        
        if (-not $Force) {
            $response = Read-Host "Do you want to select it instead? (y/N)"
            if ($response -eq "y" -or $response -eq "Y") {
                Select-Workspace $WorkspaceName
                return
            }
            else {
                Write-ColorOutput "Operation cancelled" $Yellow
                return
            }
        }
    }
    
    try {
        terraform workspace new $WorkspaceName
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Workspace '$WorkspaceName' created and selected" $Green
            
            # Show workspace info
            Show-WorkspaceInfo $WorkspaceName
        }
        else {
            Write-ColorOutput "❌ Failed to create workspace '$WorkspaceName'" $Red
        }
    }
    catch {
        Write-ColorOutput "❌ Error creating workspace: $($_.Exception.Message)" $Red
    }
}

function Select-Workspace {
    param([string]$WorkspaceName)
    
    Write-ColorOutput "🔄 Selecting workspace: $WorkspaceName" $Cyan
    
    try {
        terraform workspace select $WorkspaceName
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Switched to workspace '$WorkspaceName'" $Green
            Show-WorkspaceInfo $WorkspaceName
        }
        else {
            Write-ColorOutput "❌ Failed to select workspace '$WorkspaceName'" $Red
            Write-ColorOutput "Available workspaces:" $Yellow
            List-Workspaces
        }
    }
    catch {
        Write-ColorOutput "❌ Error selecting workspace: $($_.Exception.Message)" $Red
    }
}

function List-Workspaces {
    Write-ColorOutput "📋 Available Terraform workspaces:" $Cyan
    
    try {
        $workspaces = terraform workspace list
        $current = Get-CurrentWorkspace
        
        Write-ColorOutput ""
        foreach ($workspace in $workspaces) {
            $cleanWorkspace = $workspace.Trim()
            if ($cleanWorkspace.StartsWith("*")) {
                $workspaceName = $cleanWorkspace.Substring(1).Trim()
                Write-ColorOutput "  * $workspaceName (current)" $Green
            }
            else {
                Write-ColorOutput "    $cleanWorkspace"
            }
        }
        Write-ColorOutput ""
    }
    catch {
        Write-ColorOutput "❌ Error listing workspaces: $($_.Exception.Message)" $Red
    }
}

function Delete-Workspace {
    param([string]$WorkspaceName)
    
    Write-ColorOutput "🗑️ Deleting workspace: $WorkspaceName" $Yellow
    
    # Safety checks
    if ($WorkspaceName -eq "default") {
        Write-ColorOutput "❌ Cannot delete the default workspace" $Red
        return
    }
    
    $current = Get-CurrentWorkspace
    if ($current -eq $WorkspaceName) {
        Write-ColorOutput "❌ Cannot delete the currently selected workspace" $Red
        Write-ColorOutput "Please switch to another workspace first" $Yellow
        return
    }
    
    if (-not $Force) {
        Write-ColorOutput "⚠️ WARNING: This will permanently delete workspace '$WorkspaceName' and all its state!" $Red
        $response = Read-Host "Are you sure you want to continue? Type 'DELETE' to confirm"
        if ($response -ne "DELETE") {
            Write-ColorOutput "Operation cancelled" $Yellow
            return
        }
    }
    
    try {
        terraform workspace delete $WorkspaceName
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Workspace '$WorkspaceName' deleted successfully" $Green
        }
        else {
            Write-ColorOutput "❌ Failed to delete workspace '$WorkspaceName'" $Red
        }
    }
    catch {
        Write-ColorOutput "❌ Error deleting workspace: $($_.Exception.Message)" $Red
    }
}

function Show-WorkspaceInfo {
    param([string]$WorkspaceName)
    
    Write-ColorOutput ""
    Write-ColorOutput "📊 Workspace Information" $Cyan
    Write-ColorOutput "========================" $Cyan
    Write-ColorOutput "Current Workspace: $WorkspaceName" $Green
    
    # Show corresponding tfvars file
    $tfvarsFile = "environments\$WorkspaceName.tfvars"
    if (Test-Path $tfvarsFile) {
        Write-ColorOutput "Configuration File: $tfvarsFile ✅" $Green
    }
    else {
        Write-ColorOutput "Configuration File: $tfvarsFile ❌ (not found)" $Red
        Write-ColorOutput "You may need to create this file for environment-specific configuration" $Yellow
    }
    
    # Show state file location
    Write-ColorOutput "State File: terraform.tfstate.d\$WorkspaceName\terraform.tfstate"
    
    Write-ColorOutput ""
    Write-ColorOutput "Next steps:" $Yellow
    Write-ColorOutput "1. Review/create the configuration file: $tfvarsFile"
    Write-ColorOutput "2. Run: terraform plan -var-file=`"$tfvarsFile`""
    Write-ColorOutput "3. Run: terraform apply -var-file=`"$tfvarsFile`""
    Write-ColorOutput ""
}

function Show-CurrentWorkspace {
    $current = Get-CurrentWorkspace
    Write-ColorOutput "Current workspace: $current" $Green
    Show-WorkspaceInfo $current
}

# Main script execution
Write-ColorOutput "🚀 Terraform Workspace Manager" $Cyan
Write-ColorOutput "==============================" $Cyan

# Check if Terraform is installed
if (-not (Test-TerraformInstalled)) {
    exit 1
}

# Change to terraform directory if not already there
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$terraformDir = Split-Path -Parent $scriptDir
Push-Location $terraformDir

try {
    # Initialize Terraform if needed
    if (-not (Test-Path ".terraform")) {
        if (-not (Initialize-Terraform)) {
            exit 1
        }
    }
    
    # Execute the requested action
    switch ($Action.ToLower()) {
        "create" {
            if (-not $Environment) {
                Write-ColorOutput "❌ Environment parameter is required for create action" $Red
                Show-Usage
                exit 1
            }
            Create-Workspace $Environment
        }
        
        "select" {
            if (-not $Environment) {
                Write-ColorOutput "❌ Environment parameter is required for select action" $Red
                Show-Usage
                exit 1
            }
            Select-Workspace $Environment
        }
        
        "list" {
            List-Workspaces
        }
        
        "delete" {
            if (-not $Environment) {
                Write-ColorOutput "❌ Environment parameter is required for delete action" $Red
                Show-Usage
                exit 1
            }
            Delete-Workspace $Environment
        }
        
        "show" {
            Show-CurrentWorkspace
        }
        
        default {
            Write-ColorOutput "❌ Invalid action: $Action" $Red
            Show-Usage
            exit 1
        }
    }
}
finally {
    Pop-Location
}

Write-ColorOutput ""
Write-ColorOutput "✅ Workspace management completed" $Green