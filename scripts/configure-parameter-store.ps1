# Configure AWS Parameter Store for Production Environment
# This script sets up all required parameters for the Acadion application

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment = "prod",
    
    [Parameter(Mandatory=$false)]
    [string]$AWSRegion = "us-east-1",
    
    [switch]$DryRun,
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
    
    # Check AWS CLI
    try {
        $awsIdentity = aws sts get-caller-identity 2>$null | ConvertFrom-Json
        Write-Success "✓ AWS CLI configured for account: $($awsIdentity.Account)"
    }
    catch {
        Write-Error "✗ AWS CLI not configured or invalid credentials"
        exit 1
    }
    
    # Check required environment variables
    $requiredVars = @(
        "TF_VAR_jwt_secret_key",
        "TF_VAR_encryption_key",
        "TF_VAR_supabase_url",
        "TF_VAR_supabase_key", 
        "TF_VAR_supabase_service_key",
        "TF_VAR_pinecone_api_key",
        "TF_VAR_pinecone_environment",
        "TF_VAR_pinecone_index_name"
    )
    
    $missingVars = @()
    foreach ($var in $requiredVars) {
        if (-not (Get-Item "Env:$var" -ErrorAction SilentlyContinue)) {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -gt 0) {
        Write-Error "Missing required environment variables:"
        foreach ($var in $missingVars) {
            Write-Error "  - $var"
        }
        exit 1
    }
    
    Write-Success "✓ All prerequisites met"
}

function Set-Parameter {
    param(
        [string]$Name,
        [string]$Value,
        [string]$Type = "String",
        [string]$Description = ""
    )
    
    $parameterName = "/acadion/$Environment/$Name"
    
    if ($DryRun) {
        Write-Status "DRY RUN: Would set parameter $parameterName"
        return
    }
    
    try {
        if ($Type -eq "SecureString") {
            aws ssm put-parameter --name $parameterName --value $Value --type $Type --description $Description --overwrite --region $AWSRegion | Out-Null
        } else {
            aws ssm put-parameter --name $parameterName --value $Value --type $Type --description $Description --overwrite --region $AWSRegion | Out-Null
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "✓ Set parameter: $parameterName"
        } else {
            Write-Error "✗ Failed to set parameter: $parameterName"
        }
    }
    catch {
        Write-Error "✗ Error setting parameter $parameterName : $_"
    }
}

function Configure-ApplicationParameters {
    Write-Status "Configuring application parameters..."
    
    # Application Configuration
    Set-Parameter -Name "log-level" -Value "INFO" -Description "Application log level"
    Set-Parameter -Name "debug-mode" -Value "false" -Description "Enable debug mode"
    Set-Parameter -Name "cors-origins" -Value "https://acadion.com,https://www.acadion.com,https://api.acadion.com" -Description "Allowed CORS origins"
    Set-Parameter -Name "max-upload-size" -Value "10485760" -Description "Maximum upload size in bytes"
    
    # Database Configuration
    Set-Parameter -Name "database-pool-size" -Value "30" -Description "Database connection pool size"
    Set-Parameter -Name "database-pool-timeout" -Value "30" -Description "Database connection pool timeout"
    Set-Parameter -Name "database-max-overflow" -Value "50" -Description "Database connection pool max overflow"
    
    # Face Recognition Configuration
    Set-Parameter -Name "face-threshold" -Value "0.6" -Description "Face recognition similarity threshold"
    Set-Parameter -Name "max-faces-per-image" -Value "50" -Description "Maximum faces to process per image"
    Set-Parameter -Name "face-processing-timeout" -Value "45" -Description "Face processing timeout in seconds"
    
    # Cache Configuration
    Set-Parameter -Name "cache-ttl-default" -Value "3600" -Description "Default cache TTL in seconds"
    Set-Parameter -Name "cache-ttl-sessions" -Value "1800" -Description "Session cache TTL in seconds"
    Set-Parameter -Name "cache-max-connections" -Value "200" -Description "Maximum Redis connections"
    
    # Security Configuration
    Set-Parameter -Name "jwt-algorithm" -Value "HS256" -Description "JWT signing algorithm"
    Set-Parameter -Name "session-timeout" -Value "3600" -Description "Session timeout in seconds"
    Set-Parameter -Name "rate-limit-requests" -Value "100" -Description "Rate limit requests per window"
    Set-Parameter -Name "rate-limit-window" -Value "60" -Description "Rate limit window in seconds"
}

function Configure-SecureParameters {
    Write-Status "Configuring secure parameters..."
    
    # JWT and Encryption Keys
    Set-Parameter -Name "jwt-secret-key" -Value $env:TF_VAR_jwt_secret_key -Type "SecureString" -Description "JWT secret key for token signing"
    Set-Parameter -Name "encryption-key" -Value $env:TF_VAR_encryption_key -Type "SecureString" -Description "Application encryption key"
    
    # Supabase Configuration
    Set-Parameter -Name "supabase-url" -Value $env:TF_VAR_supabase_url -Type "SecureString" -Description "Supabase project URL"
    Set-Parameter -Name "supabase-key" -Value $env:TF_VAR_supabase_key -Type "SecureString" -Description "Supabase anon key"
    Set-Parameter -Name "supabase-service-key" -Value $env:TF_VAR_supabase_service_key -Type "SecureString" -Description "Supabase service role key"
    
    # Pinecone Configuration
    Set-Parameter -Name "pinecone-api-key" -Value $env:TF_VAR_pinecone_api_key -Type "SecureString" -Description "Pinecone API key"
    Set-Parameter -Name "pinecone-environment" -Value $env:TF_VAR_pinecone_environment -Type "SecureString" -Description "Pinecone environment"
    Set-Parameter -Name "pinecone-index-name" -Value $env:TF_VAR_pinecone_index_name -Type "SecureString" -Description "Pinecone index name"
}

function Configure-InfrastructureParameters {
    Write-Status "Configuring infrastructure parameters..."
    
    # These would typically be set by Terraform outputs
    # For now, we'll set placeholder values that would be updated after infrastructure deployment
    
    Set-Parameter -Name "redis-endpoint" -Value "acadion-prod-redis.cache.amazonaws.com:6379" -Description "Redis cluster endpoint"
    Set-Parameter -Name "s3-bucket-name" -Value "acadion-prod-static-assets" -Description "S3 bucket for static assets"
    Set-Parameter -Name "cloudfront-domain" -Value "cdn.acadion.com" -Description "CloudFront distribution domain"
    Set-Parameter -Name "efs-file-system-id" -Value "fs-0123456789abcdef0" -Description "EFS file system ID"
}

function Verify-Parameters {
    Write-Status "Verifying parameter configuration..."
    
    try {
        $parameters = aws ssm get-parameters-by-path --path "/acadion/$Environment" --recursive --region $AWSRegion | ConvertFrom-Json
        
        $paramCount = $parameters.Parameters.Count
        Write-Success "✓ Found $paramCount parameters in /acadion/$Environment"
        
        if ($Verbose) {
            Write-Status "Parameter list:"
            foreach ($param in $parameters.Parameters) {
                $name = $param.Name -replace "/acadion/$Environment/", ""
                Write-Status "  - $name"
            }
        }
    }
    catch {
        Write-Warning "⚠ Could not verify parameters: $_"
    }
}

function Show-NextSteps {
    Write-Status ""
    Write-Success "=== Parameter Store Configuration Complete ==="
    Write-Status ""
    Write-Status "Next steps:"
    Write-Status "1. Update ECS task definitions to use these parameters"
    Write-Status "2. Deploy application services to ECS"
    Write-Status "3. Test parameter access from running containers"
    Write-Status "4. Configure CloudFront distribution"
    Write-Status "5. Set up DNS records"
    Write-Status ""
    Write-Status "To view all parameters:"
    Write-Status "aws ssm get-parameters-by-path --path '/acadion/$Environment' --recursive"
    Write-Status ""
    Write-Status "To update a parameter:"
    Write-Status "aws ssm put-parameter --name '/acadion/$Environment/parameter-name' --value 'new-value' --overwrite"
}

# Main execution
Write-Status "=== Configuring AWS Parameter Store for $Environment Environment ==="
Write-Status "AWS Region: $AWSRegion"
if ($DryRun) { Write-Warning "DRY RUN MODE - No changes will be made" }
Write-Status ""

Test-Prerequisites
Configure-ApplicationParameters
Configure-SecureParameters
Configure-InfrastructureParameters
Verify-Parameters
Show-NextSteps

Write-Status ""
Write-Success "=== Parameter Store configuration completed ==="