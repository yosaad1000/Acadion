# Deploy Frontend to Vercel
param(
    [string]$Environment = "production"
)

Write-Host "🚀 Deploying Frontend to Vercel..." -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "frontend")) {
    Write-Host "❌ Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Navigate to frontend directory
Set-Location frontend

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm ci

# Build the project locally to test
Write-Host "🔨 Building project..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed! Please fix build errors before deploying." -ForegroundColor Red
    Set-Location ..
    exit 1
}

# Deploy to Vercel
Write-Host "🌐 Deploying to Vercel..." -ForegroundColor Yellow

if ($Environment -eq "production") {
    # Production deployment
    vercel --prod --yes
} else {
    # Preview deployment
    vercel --yes
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend deployed successfully!" -ForegroundColor Green
    Write-Host "🔗 Check your Vercel dashboard for the deployment URL" -ForegroundColor Cyan
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
}

# Return to project root
Set-Location ..