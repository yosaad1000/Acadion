# Manual Domain Deployment Script for acadion.online
# Run this after adding DNS records

Write-Host "🚀 Deploying to acadion.online domain" -ForegroundColor Green
Write-Host ""

# Step 1: Check DNS
Write-Host "🔍 Checking DNS configuration..." -ForegroundColor Yellow
$mainDomain = nslookup acadion.online 2>$null | Select-String "Address:" | Select-Object -Last 1
$apiDomain = nslookup api.acadion.online 2>$null | Select-String "Address:" | Select-Object -Last 1

Write-Host "Main domain: $mainDomain"
Write-Host "API domain: $apiDomain"

if ($mainDomain -notlike "*54.167.95.26*") {
    Write-Host "❌ acadion.online does not point to 54.167.95.26" -ForegroundColor Red
    Write-Host "Please add DNS A record: acadion.online → 54.167.95.26" -ForegroundColor Yellow
    exit 1
}

if ($apiDomain -notlike "*54.167.95.26*") {
    Write-Host "❌ api.acadion.online does not point to 54.167.95.26" -ForegroundColor Red
    Write-Host "Please add DNS A record: api.acadion.online → 54.167.95.26" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ DNS configuration looks good!" -ForegroundColor Green
Write-Host ""

# Step 2: Setup SSL on server
Write-Host "🔐 Setting up SSL certificates..." -ForegroundColor Yellow
ssh -i acadion-key.pem ec2-user@54.167.95.26 'chmod +x /tmp/setup-existing-domain.sh && /tmp/setup-existing-domain.sh acadion.online'

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ SSL setup failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ SSL certificates configured!" -ForegroundColor Green
Write-Host ""

# Step 3: Deploy backend
Write-Host "🚀 Deploying backend..." -ForegroundColor Yellow
& ".\.github\workflows\deploy-to-ec2.yml"

# Step 4: Update frontend API URL
Write-Host "🔧 Updating frontend API URL..." -ForegroundColor Yellow
Write-Host "Please run these commands manually:" -ForegroundColor Yellow
Write-Host "1. vercel login" -ForegroundColor Cyan
Write-Host "2. cd frontend" -ForegroundColor Cyan
Write-Host "3. vercel env rm VITE_API_URL production --yes" -ForegroundColor Cyan
Write-Host "4. echo 'https://api.acadion.online' | vercel env add VITE_API_URL production" -ForegroundColor Cyan
Write-Host "5. vercel --prod" -ForegroundColor Cyan

Write-Host ""
Write-Host "🎉 Domain deployment initiated!" -ForegroundColor Green
Write-Host "Frontend: https://acadion-gamma.vercel.app" -ForegroundColor Cyan
Write-Host "Backend:  https://api.acadion.online" -ForegroundColor Cyan