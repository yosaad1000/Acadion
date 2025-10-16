#!/usr/bin/env pwsh

# GitHub Actions Workflow Cleanup Script
# Removes conflicting and unused workflows

Write-Host "🧹 Cleaning up GitHub Actions workflows..." -ForegroundColor Cyan

# Workflows to KEEP (essential for current deployment)
$keepWorkflows = @(
    "ci-cd-full.yml",
    "deploy-frontend.yml", 
    "deploy-to-ec2.yml"
)

# Workflows to REMOVE (causing conflicts)
$removeWorkflows = @(
    "automated-rollback.yml",
    "build-and-push-ecr.yml",
    "deploy-async-processing.yml",
    "deploy-docs.yml",
    "deploy-to-aws.yml",
    "deploy.yml",
    "pages-simple.yml",
    "production-approval.yml",
    "security-scanning.yml",
    "setup-ecr-repositories.yml",
    "test-and-quality.yml",
    "vercel-deployment.yml"
)

Write-Host "`n📋 Workflows to keep:" -ForegroundColor Green
foreach ($workflow in $keepWorkflows) {
    Write-Host "  ✅ $workflow" -ForegroundColor Green
}

Write-Host "`n🗑️  Workflows to remove:" -ForegroundColor Red
foreach ($workflow in $removeWorkflows) {
    if (Test-Path ".github/workflows/$workflow") {
        Write-Host "  ❌ $workflow" -ForegroundColor Red
    } else {
        Write-Host "  ⚠️  $workflow (not found)" -ForegroundColor Yellow
    }
}

Write-Host "`n⚠️  This will:" -ForegroundColor Yellow
Write-Host "  - Remove conflicting workflows" -ForegroundColor Yellow
Write-Host "  - Keep only essential CI/CD pipelines" -ForegroundColor Yellow
Write-Host "  - Fix workflow conflicts and failures" -ForegroundColor Yellow

$confirm = Read-Host "`nProceed with cleanup? (y/N)"

if ($confirm -eq "y" -or $confirm -eq "Y") {
    Write-Host "`n🧹 Starting cleanup..." -ForegroundColor Cyan
    
    $removedCount = 0
    foreach ($workflow in $removeWorkflows) {
        $filePath = ".github/workflows/$workflow"
        if (Test-Path $filePath) {
            Remove-Item $filePath -Force
            Write-Host "  ✅ Removed $workflow" -ForegroundColor Green
            $removedCount++
        }
    }
    
    Write-Host "`n🎉 Cleanup completed!" -ForegroundColor Green
    Write-Host "  Removed: $removedCount workflows" -ForegroundColor Green
    Write-Host "  Remaining: $($keepWorkflows.Count) essential workflows" -ForegroundColor Green
    
    Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Review remaining workflows" -ForegroundColor White
    Write-Host "  2. Commit changes: git add . && git commit -m 'cleanup: remove conflicting workflows'" -ForegroundColor White
    Write-Host "  3. Push changes: git push origin main" -ForegroundColor White
    Write-Host "  4. Monitor GitHub Actions for successful runs" -ForegroundColor White
    
} else {
    Write-Host "`n❌ Cleanup cancelled" -ForegroundColor Red
}