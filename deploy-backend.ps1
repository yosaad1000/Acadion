# Simple AWS EC2 Backend Deployment Script
# This script creates a t2.micro instance and deploys the backend

param(
    [string]$KeyPairName = "acadion-key",
    [string]$InstanceName = "acadion-backend"
)

Write-Host "🚀 Starting AWS EC2 Backend Deployment..." -ForegroundColor Green

# Check if key pair exists, create if not
Write-Host "📋 Checking AWS key pair..." -ForegroundColor Yellow
$keyExists = aws ec2 describe-key-pairs --key-names $KeyPairName 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "🔑 Creating new key pair: $KeyPairName" -ForegroundColor Yellow
    aws ec2 create-key-pair --key-name $KeyPairName --query 'KeyMaterial' --output text > "$KeyPairName.pem"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Key pair created and saved as $KeyPairName.pem" -ForegroundColor Green
        Write-Host "⚠️  Keep this file safe! You'll need it to SSH into your instance." -ForegroundColor Red
    } else {
        Write-Host "❌ Failed to create key pair" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Key pair $KeyPairName already exists" -ForegroundColor Green
}

# Create security group
Write-Host "🔒 Creating security group..." -ForegroundColor Yellow
$sgId = aws ec2 create-security-group --group-name acadion-backend-sg --description "Security group for Acadion backend" --query 'GroupId' --output text 2>$null
if ($LASTEXITCODE -ne 0) {
    # Security group might already exist, get its ID
    $sgId = aws ec2 describe-security-groups --group-names acadion-backend-sg --query 'SecurityGroups[0].GroupId' --output text 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Using existing security group: $sgId" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create or find security group" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Created security group: $sgId" -ForegroundColor Green
    
    # Add rules to security group
    Write-Host "🔓 Adding security group rules..." -ForegroundColor Yellow
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 22 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 8000 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 80 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 443 --cidr 0.0.0.0/0
    Write-Host "✅ Security group rules added" -ForegroundColor Green
}

# User data script for EC2 instance
$userData = @"
#!/bin/bash
yum update -y
yum install -y docker git

# Start Docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Clone repository (you'll need to make this public or use deploy keys)
# For now, we'll create the files manually
mkdir -p /app
cd /app

# Create a simple docker-compose.yml for the backend
cat > docker-compose.yml << 'EOF'
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
      - ALLOWED_ORIGINS=https://acadion-8rygmefra-yosaad1000s-projects.vercel.app,http://localhost:5173
    restart: unless-stopped
EOF

echo "✅ EC2 instance setup complete!" > /var/log/setup-complete.log
"@

# Encode user data
$userDataEncoded = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($userData))

# Launch EC2 instance
Write-Host "🖥️  Launching EC2 instance..." -ForegroundColor Yellow
$instanceId = aws ec2 run-instances `
    --image-id ami-0c02fb55956c7d316 `
    --count 1 `
    --instance-type t2.micro `
    --key-name $KeyPairName `
    --security-group-ids $sgId `
    --user-data $userDataEncoded `
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$InstanceName}]" `
    --query 'Instances[0].InstanceId' `
    --output text

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ EC2 instance launched: $instanceId" -ForegroundColor Green
    
    # Wait for instance to be running
    Write-Host "⏳ Waiting for instance to be running..." -ForegroundColor Yellow
    aws ec2 wait instance-running --instance-ids $instanceId
    
    # Get public IP
    $publicIp = aws ec2 describe-instances --instance-ids $instanceId --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
    
    Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
    Write-Host "📍 Instance ID: $instanceId" -ForegroundColor Cyan
    Write-Host "🌐 Public IP: $publicIp" -ForegroundColor Cyan
    Write-Host "🔗 API URL: http://$publicIp:8000" -ForegroundColor Cyan
    Write-Host "📚 API Docs: http://$publicIp:8000/docs" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️  Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Wait 5-10 minutes for the instance to fully initialize" -ForegroundColor White
    Write-Host "2. SSH into the instance: ssh -i $KeyPairName.pem ec2-user@$publicIp" -ForegroundColor White
    Write-Host "3. Upload your backend code and build the Docker image" -ForegroundColor White
    Write-Host "4. Update Vercel environment variables with the API URL" -ForegroundColor White
    
} else {
    Write-Host "❌ Failed to launch EC2 instance" -ForegroundColor Red
    exit 1
}