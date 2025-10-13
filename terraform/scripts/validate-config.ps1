# PowerShell script to validate Terraform configuration
# This script performs comprehensive validation of the Terraform setup

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [switch]$CheckParameterStore,
    
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

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Test-TerraformSyntax {
    Write-ColorOutput "🔍 Validating Terraform syntax..." $Cyan
    
    try {
        terraform validate
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Terraform syntax is valid" $Green
            return $true
        }
        else {
            Write-ColorOutput "❌ Terraform syntax validation failed" $Red
            return $false
        }
    }
    catch {
        Write-ColorOutput "❌ Error during syntax validation: $($_.Exception.Message)" $Red
        return $false
    }
}

function Test-TerraformFormat {
    Write-ColorOutput "🎨 Checking Terraform formatting..." $Cyan
    
    try {
        $formatResult = terraform fmt -check -recursive
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Terraform files are properly formatted" $Green
            return $true
        }
        else {
            Write-ColorOutput "⚠️ Some Terraform files need formatting" $Yellow
            Write-ColorOutput "Run 'terraform fmt -recursive' to fix formatting" $Yellow
            return $false
        }
    }
    catch {
        Write-ColorOutput "❌ Error during format check: $($_.Exception.Message)" $Red
        return $false
    }
}

function Test-EnvironmentConfiguration {
    param([string]$Environment)
    
    Write-ColorOutput "📋 Validating environment configuration for: $Environment" $Cyan
    
    $tfvarsFile = "environments\$Environment.tfvars"
    
    if (-not (Test-Path $tfvarsFile)) {
        Write-ColorOutput "❌ Configuration file not found: $tfvarsFile" $Red
        return $false
    }
    
    Write-ColorOutput "✅ Configuration file exists: $tfvarsFile" $Green
    
    # Check required variables
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
        Write-ColorOutput "❌ Missing required variables:" $Red
        foreach ($var in $missingVars) {
            Write-ColorOutput "  - $var" $Red
        }
        return $false
    }
    
    Write-ColorOutput "✅ All required variables are present" $Green
    
    # Validate variable formats
    $validationErrors = @()
    
    # Check environment value
    if ($tfvarsContent -match 'environment\s*=\s*"([^"]+)"') {
        $envValue = $matches[1]
        if ($envValue -ne $Environment) {
            $validationErrors += "Environment value '$envValue' doesn't match expected '$Environment'"
        }
    }
    
    # Check AWS region format
    if ($tfvarsContent -match 'aws_region\s*=\s*"([^"]+)"') {
        $regionValue = $matches[1]
        if ($regionValue -notmatch '^[a-z]{2}-[a-z]+-\d+$') {
            $validationErrors += "AWS region '$regionValue' has invalid format"
        }
    }
    
    # Check GitHub repository format
    if ($tfvarsContent -match 'github_repository\s*=\s*"([^"]+)"') {
        $repoValue = $matches[1]
        if ($repoValue -notmatch '^[^/]+/[^/]+$') {
            $validationErrors += "GitHub repository '$repoValue' should be in format 'owner/repo'"
        }
    }
    
    if ($validationErrors.Count -gt 0) {
        Write-ColorOutput "❌ Configuration validation errors:" $Red
        foreach ($error in $validationErrors) {
            Write-ColorOutput "  - $error" $Red
        }
        return $false
    }
    
    Write-ColorOutput "✅ Configuration validation passed" $Green
    return $true
}

function Test-ModuleStructure {
    Write-ColorOutput "🏗️ Validating module structure..." $Cyan
    
    $requiredModules = @(
        "modules\networking",
        "modules\ecs", 
        "modules\ecr",
        "modules\storage",
        "modules\parameter-store"
    )
    
    $missingModules = @()
    
    foreach ($module in $requiredModules) {
        if (-not (Test-Path $module)) {
            $missingModules += $module
        }
        else {
            # Check for required files in each module
            $requiredFiles = @("main.tf", "variables.tf", "outputs.tf")
            foreach ($file in $requiredFiles) {
                $filePath = Join-Path $module $file
                if (-not (Test-Path $filePath)) {
                    $missingModules += "$module\$file"
                }
            }
        }
    }
    
    if ($missingModules.Count -gt 0) {
        Write-ColorOutput "❌ Missing modules or files:" $Red
        foreach ($missing in $missingModules) {
            Write-ColorOutput "  - $missing" $Red
        }
        return $false
    }
    
    Write-ColorOutput "✅ All required modules are present" $Green
    return $true
}

function Test-ParameterStoreConfiguration {
    param([string]$Environment)
    
    Write-ColorOutput "🔐 Validating Parameter Store configuration..." $Cyan
    
    try {
        # Check if AWS CLI is available
        $awsVersion = aws --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "⚠️ AWS CLI not available, skipping Parameter Store validation" $Yellow
            return $true
        }
        
        Write-ColorOutput "✅ AWS CLI available: $awsVersion" $Green
        
        # Check AWS credentials
        $identity = aws sts get-caller-identity 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "⚠️ AWS credentials not configured, skipping Parameter Store validation" $Yellow
            return $true
        }
        
        $identityObj = $identity | ConvertFrom-Json
        Write-ColorOutput "✅ AWS credentials configured for: $($identityObj.Arn)" $Green
        
        # Check Parameter Store access
        $parameterPrefix = "/$Environment/acadion"
        
        Write-ColorOutput "Checking Parameter Store access for prefix: $parameterPrefix" $Yellow
        
        $parameters = aws ssm get-parameters-by-path --path $parameterPrefix --recursive 2>$null
        if ($LASTEXITCODE -eq 0) {
            $parameterObj = $parameters | ConvertFrom-Json
            $paramCount = $parameterObj.Parameters.Count
            Write-ColorOutput "✅ Parameter Store accessible, found $paramCount parameters" $Green
            
            if ($Verbose -and $paramCount -gt 0) {
                Write-ColorOutput "Parameter Store contents:" $Cyan
                foreach ($param in $parameterObj.Parameters) {
                    $name = $param.Name
                    $type = $param.Type
                    Write-ColorOutput "  - $name ($type)" $Yellow
                }
            }
        }
        else {
            Write-ColorOutput "⚠️ Cannot access Parameter Store (may not exist yet)" $Yellow
        }
        
        return $true
    }
    catch {
        Write-ColorOutput "❌ Error validating Parameter Store: $($_.Exception.Message)" $Red
        return $false
    }
}

function Test-TerraformPlan {
    param([string]$Environment)
    
    Write-ColorOutput "📊 Testing Terraform plan for environment: $Environment" $Cyan
    
    try {
        # Select workspace
        terraform workspace select $Environment 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "⚠️ Workspace '$Environment' doesn't exist, creating it..." $Yellow
            terraform workspace new $Environment
            if ($LASTEXITCODE -ne 0) {
                Write-ColorOutput "❌ Failed to create workspace '$Environment'" $Red
                return $false
            }
        }
        
        $tfvarsFile = "environments\$Environment.tfvars"
        
        # Run terraform plan
        Write-ColorOutput "Running terraform plan..." $Yellow
        terraform plan -var-file="$tfvarsFile" -detailed-exitcode
        
        $exitCode = $LASTEXITCODE
        
        switch ($exitCode) {
            0 { 
                Write-ColorOutput "✅ Plan successful - no changes needed" $Green
                return $true
            }
            1 { 
                Write-ColorOutput "❌ Plan failed with errors" $Red
                return $false
            }
            2 { 
                Write-ColorOutput "✅ Plan successful - changes detected" $Green
                return $true
            }
            default {
                Write-ColorOutput "❌ Plan failed with unexpected exit code: $exitCode" $Red
                return $false
            }
        }
    }
    catch {
        Write-ColorOutput "❌ Error during plan validation: $($_.Exception.Message)" $Red
        return $false
    }
}

function Show-ValidationSummary {
    param([hashtable]$Results)
    
    Write-ColorOutput ""
    Write-ColorOutput "📊 Validation Summary" $Cyan
    Write-ColorOutput "====================" $Cyan
    
    $totalTests = $Results.Count
    $passedTests = ($Results.Values | Where-Object { $_ -eq $true }).Count
    $failedTests = $totalTests - $passedTests
    
    foreach ($test in $Results.GetEnumerator()) {
        $status = if ($test.Value) { "✅ PASS" } else { "❌ FAIL" }
        $color = if ($test.Value) { $Green } else { $Red }
        Write-ColorOutput "$status - $($test.Key)" $color
    }
    
    Write-ColorOutput ""
    Write-ColorOutput "Total Tests: $totalTests" $Cyan
    Write-ColorOutput "Passed: $passedTests" $Green
    Write-ColorOutput "Failed: $failedTests" $(if ($failedTests -eq 0) { $Green } else { $Red })
    
    if ($failedTests -eq 0) {
        Write-ColorOutput ""
        Write-ColorOutput "🎉 All validations passed! Configuration is ready for deployment." $Green
    }
    else {
        Write-ColorOutput ""
        Write-ColorOutput "⚠️ Some validations failed. Please fix the issues before deployment." $Yellow
    }
    
    return ($failedTests -eq 0)
}

# Main script execution
Write-ColorOutput "🔍 Terraform Configuration Validator" $Cyan
Write-ColorOutput "====================================" $Cyan
Write-ColorOutput "Environment: $Environment" $Green
Write-ColorOutput ""

# Change to terraform directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$terraformDir = Split-Path -Parent $scriptDir
Push-Location $terraformDir

try {
    # Initialize Terraform if needed
    if (-not (Test-Path ".terraform")) {
        Write-ColorOutput "Initializing Terraform..." $Yellow
        terraform init
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "❌ Terraform initialization failed" $Red
            exit 1
        }
    }
    
    # Run validation tests
    $results = @{}
    
    $results["Terraform Syntax"] = Test-TerraformSyntax
    $results["Terraform Formatting"] = Test-TerraformFormat
    $results["Module Structure"] = Test-ModuleStructure
    $results["Environment Configuration"] = Test-EnvironmentConfiguration $Environment
    
    if ($CheckParameterStore) {
        $results["Parameter Store Access"] = Test-ParameterStoreConfiguration $Environment
    }
    
    $results["Terraform Plan"] = Test-TerraformPlan $Environment
    
    # Show summary
    $allPassed = Show-ValidationSummary $results
    
    if (-not $allPassed) {
        exit 1
    }
}
finally {
    Pop-Location
}

Write-ColorOutput ""
Write-ColorOutput "✅ Validation completed successfully" $Green