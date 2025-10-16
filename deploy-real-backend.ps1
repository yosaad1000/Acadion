# Deploy Real Acadion Backend to EC2
param(
    [string]$InstanceIP = "54.167.95.26",
    [string]$KeyFile = "acadion-key.pem"
)

Write-Host "🚀 Deploying Real Acadion Backend..." -ForegroundColor Green

# Check if backend directory exists
if (-not (Test-Path "backend")) {
    Write-Host "❌ Backend directory not found!" -ForegroundColor Red
    exit 1
}

# Create deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow
$tempDir = "backend-deploy"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir

# Copy all backend files
Copy-Item -Recurse "backend\*" "$tempDir\"

# Create production docker-compose.yml
$dockerCompose = "version: '3.8'`nservices:`n  backend:`n    build: .`n    ports:`n      - `"8000:8000`"`n    environment:`n      - SUPABASE_URL=https://scijpejtvneuqbhkoxuz.supabase.co`n      - SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaWpwZWp0dm5ldXFiaGtveHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTcxNDEsImV4cCI6MjA3MTE3MzE0MX0.Z6Q_DmsuHYOOvCGed5hcKDrT93XPL5hHwCyGDREcmmw`n      - SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaWpwZWp0dm5ldXFiaGtveHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU5NzE0MSwiZXhwIjoyMDcxMTczMTQxfQ.tpQB8d8iSPpCPV7cHfkxfKlobh64nejIczdt5YaG1fM`n      - SECRET_KEY=super-secret-jwt-token-with-at-least-32-characters-long`n      - PINECONE_API_KEY=pcsk_6mKcJ2_8BDyf8mT69ouihdw2wj5cmRU9eqaUoqbz25pmfMWftHiVAox5J3gfi7UaY4ivpn`n      - PINECONE_ENVIRONMENT=us-east-1`n      - PINECONE_INDEX_NAME=student-face-encodings`n      - FACE_THRESHOLD=0.6`n    restart: unless-stopped`n    volumes:`n      - ./logs:/app/logs"

Set-Content -Path "$tempDir\docker-compose.yml" -Value $dockerCompose -Encoding UTF8

# Create production Dockerfile if it doesn't exist
if (-not (Test-Path "$tempDir\Dockerfile")) {
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
    curl \
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
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
"@
    Set-Content -Path "$tempDir\Dockerfile" -Value $dockerfile -Encoding UTF8
}

# Create archive
Write-Host "📁 Creating archive..." -ForegroundColor Yellow
Compress-Archive -Path "$tempDir\*" -DestinationPath "real-backend.zip" -Force

# Upload to EC2
Write-Host "⬆️  Uploading to EC2..." -ForegroundColor Yellow
scp -i $KeyFile -o StrictHostKeyChecking=no "real-backend.zip" "ec2-user@${InstanceIP}:/tmp/"

# Deploy on EC2
Write-Host "🔧 Deploying on EC2..." -ForegroundColor Yellow
ssh -i $KeyFile -o StrictHostKeyChecking=no ec2-user@$InstanceIP @"
echo '🚀 Starting deployment...'
mkdir -p /home/ec2-user/acadion
cd /home/ec2-user/acadion
unzip -o /tmp/real-backend.zip
rm /tmp/real-backend.zip

echo '🐳 Building and starting backend...'
docker-compose up -d --build

echo '📊 Checking status...'
docker-compose ps

echo '🔍 Testing health endpoint...'
sleep 15
curl -f http://localhost:8000/api/health || echo 'Health check failed'

echo '📝 Recent logs:'
docker-compose logs --tail 10
"@

# Clean up local files
Remove-Item -Recurse -Force $tempDir
Remove-Item "real-backend.zip"

Write-Host "`n🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "🔗 API URL: http://$InstanceIP:8000" -ForegroundColor Cyan
Write-Host "📚 API Docs: http://$InstanceIP:8000/docs" -ForegroundColor Cyan

# Test the deployment
Write-Host "`n🧪 Testing deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
try {
    $response = Invoke-RestMethod -Uri "http://$InstanceIP:8000/api/health" -Method Get -TimeoutSec 15
    Write-Host "✅ Backend is healthy: $($response.status)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Health check failed, but deployment may still be starting..." -ForegroundColor Yellow
    Write-Host "Try again in a few minutes: http://$InstanceIP:8000/docs" -ForegroundColor White
}