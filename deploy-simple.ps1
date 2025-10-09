# Simple PowerShell deployment script for Attendify
$SERVER = "ubuntu@attendify.nitgoa.ac.in"
$DEPLOY_DIR = "/home/ubuntu/attendify"
$SSH_KEY = "$env:USERPROFILE\.ssh\attendify_key"

Write-Host "🚀 Deploying Attendify to $SERVER" -ForegroundColor Green

# Test connection
Write-Host "🔍 Testing connection..." -ForegroundColor Yellow
ssh -i $SSH_KEY $SERVER "echo 'Connected successfully'"

# Create directory and copy files
Write-Host "📁 Creating directory and copying files..." -ForegroundColor Yellow
ssh -i $SSH_KEY $SERVER "mkdir -p $DEPLOY_DIR"
scp -i $SSH_KEY docker-compose.deploy.yml "${SERVER}:${DEPLOY_DIR}/"
scp -i $SSH_KEY .env "${SERVER}:${DEPLOY_DIR}/"

# Install Docker and deploy
Write-Host "🐳 Installing Docker and deploying..." -ForegroundColor Yellow
ssh -i $SSH_KEY $SERVER @'
# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu
    sudo systemctl start docker
    sudo systemctl enable docker
fi

# Install Docker Compose if not present  
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Deploy the application
cd /home/ubuntu/attendify
export DOCKER_USERNAME=justs44d
export VERSION=latest

echo "Pulling Docker images..."
docker-compose -f docker-compose.deploy.yml pull

echo "Starting services..."
docker-compose -f docker-compose.deploy.yml up -d

echo "Checking service status..."
sleep 10
docker-compose -f docker-compose.deploy.yml ps
'@

Write-Host "✅ Deployment completed!" -ForegroundColor Green
Write-Host "🌐 Your app should be available at: http://attendify.nitgoa.ac.in" -ForegroundColor Cyan