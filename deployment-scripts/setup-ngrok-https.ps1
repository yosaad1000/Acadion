#!/usr/bin/env pwsh

# Quick HTTPS fix using ngrok tunnel
Write-Host "🚀 Setting up HTTPS tunnel for backend..." -ForegroundColor Cyan

# Check if ngrok is installed
if (!(Get-Command ngrok -ErrorAction SilentlyContinue)) {
    Write-Host "❌ ngrok not found. Please install it first:" -ForegroundColor Red
    Write-Host "   1. Go to https://ngrok.com/download" -ForegroundColor Yellow
    Write-Host "   2. Download and install ngrok" -ForegroundColor Yellow
    Write-Host "   3. Sign up for free account and get auth token" -ForegroundColor Yellow
    Write-Host "   4. Run: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ ngrok found" -ForegroundColor Green

# Create tunnel to EC2 backend
Write-Host "🌐 Creating HTTPS tunnel to 54.167.95.26:8000..." -ForegroundColor Yellow
Write-Host "   This will give you a public HTTPS URL" -ForegroundColor White

# Start ngrok tunnel (this will run in background)
Start-Process -FilePath "ngrok" -ArgumentList "http", "54.167.95.26:8000", "--log=stdout" -NoNewWindow

Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Copy the HTTPS URL from ngrok (e.g., https://abc123.ngrok.io)" -ForegroundColor White
Write-Host "   2. Update Vercel environment variable:" -ForegroundColor White
Write-Host "      vercel env rm VITE_API_URL --yes" -ForegroundColor Gray
Write-Host "      echo 'https://YOUR_NGROK_URL' | vercel env add VITE_API_URL production" -ForegroundColor Gray
Write-Host "   3. Redeploy frontend:" -ForegroundColor White
Write-Host "      vercel --prod" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Note: Free ngrok URLs change when restarted" -ForegroundColor Red