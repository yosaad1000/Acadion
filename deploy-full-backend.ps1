# Deploy Full Acadion Backend to EC2
param(
    [string]$InstanceIP = "54.167.95.26",
    [string]$KeyFile = "acadion-key.pem"
)

Write-Host "🚀 Deploying Full Acadion Backend to EC2..." -ForegroundColor Green

# First, let's check what's currently running
Write-Host "📊 Current Status:" -ForegroundColor Yellow
ssh -i $KeyFile -o StrictHostKeyChecking=no ec2-user@$InstanceIP "sudo docker ps"

Write-Host "`n🛑 Stopping current container..." -ForegroundColor Yellow
ssh -i $KeyFile -o StrictHostKeyChecking=no ec2-user@$InstanceIP "sudo docker stop acadion-backend-v2 || true"
ssh -i $KeyFile -o StrictHostKeyChecking=no ec2-user@$InstanceIP "sudo docker rm acadion-backend-v2 || true"

# Create a deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow
$tempDir = "temp-deploy"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir

# Copy backend files
Copy-Item -Recurse "backend/*" "$tempDir/"

# Create a proper docker-compose.yml for production
$dockerCompose = @"
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
      - FACE_THRESHOLD=0.6
      - ALLOWED_ORIGINS=https://acadion-8rygmefra-yosaad1000s-projects.vercel.app,http://localhost:5173
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
"@

Set-Content -Path "$tempDir/docker-compose.yml" -Value $dockerCompose

# Create production Dockerfile
$dockerfile = @"
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    python3-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
"@

Set-Content -Path "$tempDir/Dockerfile" -Value $dockerfile

# Create deployment archive
Write-Host "📁 Creating deployment archive..." -ForegroundColor Yellow
Compress-Archive -Path "$tempDir/*" -DestinationPath "backend-deploy.zip" -Force

# Upload to EC2
Write-Host "⬆️  Uploading to EC2..." -ForegroundColor Yellow
scp -i $KeyFile -o StrictHostKeyChecking=no "backend-deploy.zip" ec2-user@$InstanceIP:/tmp/

# Deploy on EC2
Write-Host "🔧 Deploying on EC2..." -ForegroundColor Yellow
$deployScript = @"
#!/bin/bash
set -e

echo '🚀 Starting deployment...'

# Clean up old deployment
sudo rm -rf /home/ec2-user/acadion-backend
mkdir -p /home/ec2-user/acadion-backend
cd /home/ec2-user/acadion-backend

# Extract new deployment
unzip -o /tmp/backend-deploy.zip
rm /tmp/backend-deploy.zip

echo '🐳 Building and starting services...'

# Stop any existing containers
sudo docker-compose down || true

# Build and start
sudo docker-compose up -d --build

echo '✅ Deployment complete!'

# Show status
echo '📊 Container Status:'
sudo docker-compose ps

echo '🔍 Checking health...'
sleep 10
curl -f http://localhost:8000/api/health || echo 'Health check failed'

echo '📝 Recent logs:'
sudo docker-compose logs --tail 20
"@

# Execute deployment script on EC2
echo $deployScript | ssh -i $KeyFile -o StrictHostKeyChecking=no ec2-user@$InstanceIP 'cat > /tmp/deploy.sh && chmod +x /tmp/deploy.sh && /tmp/deploy.sh'

# Clean up local files
Remove-Item -Recurse -Force $tempDir
Remove-Item "backend-deploy.zip"

Write-Host "`n🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "🔗 API URL: http://$InstanceIP:8000" -ForegroundColor Cyan
Write-Host "📚 API Docs: http://$InstanceIP:8000/docs" -ForegroundColor Cyan

# Test the deployment
Write-Host "`n🧪 Testing deployment..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://$InstanceIP:8000/api/health" -Method Get -TimeoutSec 10
    Write-Host "✅ Health check passed: $($response.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n📋 Useful commands:" -ForegroundColor Cyan
Write-Host "  Check logs: ssh -i $KeyFile ec2-user@$InstanceIP 'cd acadion-backend; sudo docker-compose logs'" -ForegroundColor White
Write-Host "  Restart: ssh -i $KeyFile ec2-user@$InstanceIP 'cd acadion-backend; sudo docker-compose restart'" -ForegroundColor White
Write-Host "  Status: ssh -i $KeyFile ec2-user@$InstanceIP 'cd acadion-backend; sudo docker-compose ps'" -ForegroundColor White