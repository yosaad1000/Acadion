# Fix Vercel Deployment Issues
Write-Host "🔧 Fixing Vercel Deployment Configuration..." -ForegroundColor Green

# Step 1: Clean the vercel.json to minimal configuration
Write-Host "📝 Creating clean vercel.json..." -ForegroundColor Yellow

$cleanVercelConfig = @"
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
"@

Set-Content -Path "frontend/vercel.json" -Value $cleanVercelConfig -Encoding UTF8

# Step 2: Create environment variables for Vercel
Write-Host "🌍 Environment variables needed for Vercel:" -ForegroundColor Cyan
Write-Host "Add these in your Vercel dashboard under Settings > Environment Variables:" -ForegroundColor White
Write-Host ""
Write-Host "VITE_SUPABASE_URL=https://scijpejtvneuqbhkoxuz.supabase.co" -ForegroundColor Green
Write-Host "VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaWpwZWp0dm5ldXFiaGtveHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTcxNDEsImV4cCI6MjA3MTE3MzE0MX0.Z6Q_DmsuHYOOvCGed5hcKDrT93XPL5hHwCyGDREcmmw" -ForegroundColor Green
Write-Host "VITE_API_URL=http://54.167.95.26:8000" -ForegroundColor Green
Write-Host "VITE_ENVIRONMENT=production" -ForegroundColor Green
Write-Host ""

# Step 3: Instructions for manual deployment
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Go to your Vercel dashboard (vercel.com)" -ForegroundColor White
Write-Host "2. Find your project and go to Settings > Environment Variables" -ForegroundColor White
Write-Host "3. Add the environment variables shown above" -ForegroundColor White
Write-Host "4. Go to Deployments and click 'Redeploy' on the latest deployment" -ForegroundColor White
Write-Host "5. Or push this commit to trigger a new deployment" -ForegroundColor White
Write-Host ""

# Step 4: Test build locally
Write-Host "🔨 Testing build locally..." -ForegroundColor Yellow
Set-Location frontend
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Local build successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Local build failed!" -ForegroundColor Red
}

Set-Location ..

Write-Host ""
Write-Host "🎯 The 'functions' error should be resolved with the clean vercel.json" -ForegroundColor Green
Write-Host "If the error persists, delete the Vercel project and recreate it." -ForegroundColor Yellow