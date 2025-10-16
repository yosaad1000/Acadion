# Vercel Deployment Script for Acadion Frontend (PowerShell)
# Usage: .\scripts\deploy.ps1 [environment]
# Environment: development, staging, production (default: staging)

param(
    [string]$Environment = "staging"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying Acadion Frontend to Vercel" -ForegroundColor Green
Write-Host "🌍 Environment: $Environment" -ForegroundColor Cyan

# Change to frontend directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Split-Path -Parent $ScriptDir
Set-Location $FrontendDir

Write-Host "📁 Frontend directory: $FrontendDir" -ForegroundColor Cyan

# Check if Vercel CLI is installed
try {
    vercel --version | Out-Null
    Write-Host "✅ Vercel CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g vercel@latest
}

# Check if required environment variables are set
if (-not $env:VERCEL_TOKEN) {
    Write-Host "⚠️  VERCEL_TOKEN not set. Please set it as an environment variable." -ForegroundColor Red
    Write-Host "   You can get your token from: https://vercel.com/account/tokens" -ForegroundColor Yellow
    exit 1
}

# Load environment-specific variables
$EnvFile = ".env.$Environment"
if (Test-Path $EnvFile) {
    Write-Host "📋 Loading environment variables from $EnvFile" -ForegroundColor Cyan
    Get-Content $EnvFile | Where-Object { $_ -notmatch '^#' -and $_ -match '=' } | ForEach-Object {
        $key, $value = $_ -split '=', 2
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
npm ci

# Run tests
Write-Host "🧪 Running tests..." -ForegroundColor Cyan
npm run test

# Type check
Write-Host "🔍 Running type check..." -ForegroundColor Cyan
npm run type-check

# Build the application
Write-Host "🔨 Building application..." -ForegroundColor Cyan
if ($Environment -eq "production") {
    npm run build:production
} else {
    npm run build
}

# Deploy to Vercel
Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Cyan
if ($Environment -eq "production") {
    vercel --prod --token $env:VERCEL_TOKEN
} else {
    vercel --token $env:VERCEL_TOKEN
}

Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host "🌐 Check your Vercel dashboard for the deployment URL" -ForegroundColor Cyan