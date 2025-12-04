# Vercel CLI Deployment Script
Write-Host "🚀 Deploying to Vercel using CLI..." -ForegroundColor Green

# Navigate to frontend directory
Set-Location frontend

# First, let's remove any cached functions configuration
Write-Host "🧹 Cleaning Vercel cache..." -ForegroundColor Yellow
vercel env rm FUNCTIONS --yes 2>$null
vercel env rm functions --yes 2>$null

# Set environment variables
Write-Host "🌍 Setting environment variables..." -ForegroundColor Yellow
vercel env add VITE_SUPABASE_URL production --force
Write-Host "Enter: https://scijpejtvneuqbhkoxuz.supabase.co"

vercel env add VITE_SUPABASE_ANON_KEY production --force  
Write-Host "Enter: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaWpwZWp0dm5ldXFiaGtveHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTcxNDEsImV4cCI6MjA3MTE3MzE0MX0.Z6Q_DmsuHYOOvCGed5hcKDrT93XPL5hHwCyGDREcmmw"

vercel env add VITE_API_URL production --force
Write-Host "Enter: http://54.167.95.26:8000"

vercel env add VITE_ENVIRONMENT production --force
Write-Host "Enter: production"

# Deploy
Write-Host "🚀 Deploying to production..." -ForegroundColor Green
vercel --prod

Write-Host "✅ Deployment complete!" -ForegroundColor Green

# Go back to root
Set-Location ..