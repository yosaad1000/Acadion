# Simple Backend Deployment Script
param(
    [string]$InstanceIP = "54.167.95.26",
    [string]$KeyFile = "acadion-key.pem"
)

Write-Host "🚀 Deploying Full Backend..." -ForegroundColor Green

# Stop current container
Write-Host "Stopping current container..." -ForegroundColor Yellow
ssh -i $KeyFile -o StrictHostKeyChecking=no ec2-user@$InstanceIP "sudo docker stop acadion-backend-v2 || true"

# Create deployment package
Write-Host "Creating deployment package..." -ForegroundColor Yellow
$tempDir = "temp-deploy"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir
Copy-Item -Recurse "backend/*" "$tempDir/"

# Create docker-compose.yml
@"
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - SUPABASE_URL=https://scijpejtvneuqbhkoxuz.supabase.co
      - SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaWpwZWp0dm5ldXFiaGtveHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTcxNDEsImV4cCI6MjA3MTE3MzE0MX0.Z6Q_DmsuHYOOvCGed5hcKDrT93XPL5hHwCyGDREcmmw
      - SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaWpwZWp0dm5ldXFiaGtveHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU5NzE0MSwiZXhwIjoyMDcxMTczMTQxfQ.tpQB8d8iSPpCPV7cHfkxfKlobh64nejIczdt5YaG1fM
      - SECRET_KEY=super-secret-jwt-token-with-at-least-32-characters-long
      - PINECONE_API_KEY=pcsk_6mKcJ2_8BDyf8mT69ouihdw2wj5cmRU9eqaUoqbz25pmfMWftHiVAox5J3gfi7UaY4ivpn
      - PINECONE_ENVIRONMENT=us-east-1
      - PINECONE_INDEX_NAME=student-face-encodings
    restart: unless-stopped
"@ | Out-File "$tempDir/docker-compose.yml" -Encoding UTF8

# Upload and deploy
Write-Host "Uploading to EC2..." -ForegroundColor Yellow
Compress-Archive -Path "$tempDir/*" -DestinationPath "backend.zip" -Force
scp -i $KeyFile -o StrictHostKeyChecking=no "backend.zip" "ec2-user@${InstanceIP}:/tmp/"

Write-Host "Deploying on EC2..." -ForegroundColor Yellow
ssh -i $KeyFile -o StrictHostKeyChecking=no ec2-user@$InstanceIP @"
rm -rf acadion-backend
mkdir acadion-backend
cd acadion-backend
unzip -o /tmp/backend.zip
sudo docker-compose up -d --build
sudo docker-compose ps
"@

# Clean up
Remove-Item -Recurse -Force $tempDir
Remove-Item "backend.zip"

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "API URL: http://$InstanceIP:8000" -ForegroundColor Cyan