#!/usr/bin/env pwsh

# Test Deployment Script
# Tests both frontend and backend endpoints after CI/CD deployment

Write-Host "🚀 Testing Acadion Deployment..." -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Test Backend Health
Write-Host "`n📡 Testing Backend Health..." -ForegroundColor Yellow
try {
    $backendResponse = Invoke-WebRequest -Uri "http://54.167.95.26:8000/api/health" -UseBasicParsing -TimeoutSec 10
    if ($backendResponse.StatusCode -eq 200) {
        $healthData = $backendResponse.Content | ConvertFrom-Json
        Write-Host "✅ Backend Status: $($healthData.status)" -ForegroundColor Green
        Write-Host "✅ Database: $($healthData.database)" -ForegroundColor Green
        Write-Host "✅ Version: $($healthData.version)" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend returned status: $($backendResponse.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Backend Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Frontend
Write-Host "`n🌐 Testing Frontend..." -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri "https://acadion-gamma.vercel.app" -UseBasicParsing -TimeoutSec 10
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "✅ Frontend Status: $($frontendResponse.StatusCode)" -ForegroundColor Green
        Write-Host "✅ Content Length: $($frontendResponse.RawContentLength) bytes" -ForegroundColor Green
        
        # Check if it contains expected content
        if ($frontendResponse.Content -match "Acadion") {
            Write-Host "✅ Frontend contains expected content" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Frontend content may be incomplete" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Frontend returned status: $($frontendResponse.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Frontend Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test API Connection from Frontend perspective
Write-Host "`n🔗 Testing API Connection..." -ForegroundColor Yellow
try {
    $apiResponse = Invoke-WebRequest -Uri "http://54.167.95.26:8000/api/subjects" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ API Endpoints accessible: $($apiResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  API Connection: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n🎯 Deployment Test Complete!" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Show URLs for manual testing
Write-Host "`n📋 Manual Testing URLs:" -ForegroundColor Magenta
Write-Host "Frontend: https://acadion-gamma.vercel.app" -ForegroundColor White
Write-Host "Backend:  http://54.167.95.26:8000" -ForegroundColor White
Write-Host "API Docs: http://54.167.95.26:8000/docs" -ForegroundColor White
Write-Host "GitHub:   https://github.com/yosaad1000/Acadion/actions" -ForegroundColor White