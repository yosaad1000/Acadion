# CloudFront Cache Invalidation Script for Deployments (PowerShell)
# Usage: .\invalidate-cache.ps1 -DistributionId <distribution-id> [-Paths <paths>] [-Wait]

param(
    [Parameter(Mandatory=$true)]
    [string]$DistributionId,
    
    [Parameter(Mandatory=$false)]
    [string]$Paths = "/*",
    
    [Parameter(Mandatory=$false)]
    [switch]$Wait
)

try {
    Write-Host "Creating CloudFront invalidation for distribution: $DistributionId"
    Write-Host "Paths: $Paths"

    # Create invalidation
    $invalidationResult = aws cloudfront create-invalidation `
        --distribution-id $DistributionId `
        --paths $Paths `
        --query 'Invalidation.Id' `
        --output text

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create CloudFront invalidation"
    }

    $invalidationId = $invalidationResult.Trim()
    Write-Host "Invalidation created with ID: $invalidationId"

    # Wait for invalidation to complete (optional)
    if ($Wait) {
        Write-Host "Waiting for invalidation to complete..."
        aws cloudfront wait invalidation-completed `
            --distribution-id $DistributionId `
            --id $invalidationId

        if ($LASTEXITCODE -eq 0) {
            Write-Host "Invalidation completed successfully" -ForegroundColor Green
        } else {
            Write-Warning "Invalidation wait command failed, but invalidation may still be in progress"
        }
    }

    Write-Host "Cache invalidation initiated successfully" -ForegroundColor Green
}
catch {
    Write-Error "Error during cache invalidation: $_"
    exit 1
}