# Simple Backend Deployment
param(
    [string]$InstanceIP = "54.167.95.26",
    [string]$KeyFile = "acadion-key.pem"
)

Write-Host "🚀 Deploying Backend..." -ForegroundColor Green

# Create temp directory
$tempDir = "backend-deploy"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir

# Copy backend files
Copy-Item -Recurse "backend\*" "$tempDir\"

# Create docker-compose file separately
$composeContent = @'
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
    restart: unless-stopped
'@

Set-Content -Path "$tempDir\docker-compose.yml" -Value $composeContent

# Create archive and upload
Compress-Archive -Path "$tempDir\*" -DestinationPath "backend-final.zip" -Force
scp -i $KeyFile -o StrictHostKeyChecking=no "backend-final.zip" "ec2-user@${InstanceIP}:/tmp/"

# Deploy
Write-Host "Deploying on EC2..." -ForegroundColor Yellow
ssh -i $KeyFile -o StrictHostKeyChecking=no ec2-user@$InstanceIP 'mkdir -p acadion && cd acadion && unzip -o /tmp/backend-final.zip && docker-compose up -d --build && docker-compose ps'

# Clean up
Remove-Item -Recurse -Force $tempDir
Remove-Item "backend-final.zip"

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "API: http://$InstanceIP:8000" -ForegroundColor Cyan