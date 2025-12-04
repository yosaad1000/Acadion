# PowerShell deployment script for Attendify
# Deploy to attendify.nitgoa.ac.in using SSH key authentication

$SERVER = "ubuntu@attendify.nitgoa.ac.in"
$DEPLOY_DIR = "/home/ubuntu/attendify"
$DOCKER_USERNAME = "justs44d"
$VERSION = "latest"
$SSH_KEY = "$env:USERPROFILE\.ssh\attendify_key"

Write-Host "🚀 Deploying Attendify to $SERVER" -ForegroundColor Green

# Test server connection
Write-Host "🔍 Testing server connection..." -ForegroundColor Yellow
try {
    $result = ssh -i $SSH_KEY $SERVER "echo 'Connection successful'"
    Write-Host "✅ $result" -ForegroundColor Green
} catch {
    Write-Host "❌ Cannot connect to server" -ForegroundColor Red
    exit 1
}

# Create deployment directory
Write-Host "📁 Creating deployment directory..." -ForegroundColor Yellow
ssh -i $SSH_KEY $SERVER "mkdir -p $DEPLOY_DIR"

# Copy deployment files
Write-Host "📤 Copying deployment files..." -ForegroundColor Yellow
scp -i $SSH_KEY docker-compose.deploy.yml "${SERVER}:${DEPLOY_DIR}/"
scp -i $SSH_KEY .env "${SERVER}:${DEPLOY_DIR}/"
scp -i $SSH_KEY scripts/deploy-server.sh "${SERVER}:${DEPLOY_DIR}/"

# Make deploy script executable
ssh -i $SSH_KEY $SERVER "chmod +x $DEPLOY_DIR/deploy-server.sh"

# Install Docker if needed
Write-Host "🐳 Checking Docker installation..." -ForegroundColor Yellow
$dockerCheck = ssh -i $SSH_KEY $SERVER "command -v docker || echo 'not_installed'"
if ($dockerCheck -eq "not_installed") {
    Write-Host "📦 Installing Docker..." -ForegroundColor Yellow
    ssh -i $SSH_KEY $SERVER "curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh && sudo usermod -aG docker ubuntu"
    Write-Host "⚠️  Docker installed. You may need to log out and back in for group changes to take effect." -ForegroundColor Yellow
    
    # Try to start Docker service
    ssh -i $SSH_KEY $SERVER "sudo systemctl start docker && sudo systemctl enable docker"
}

# Install Docker Compose if needed
Write-Host "🐳 Checking Docker Compose..." -ForegroundColor Yellow
$composeCheck = ssh -i $SSH_KEY $SERVER "command -v docker-compose || echo 'not_installed'"
if ($composeCheck -eq "not_installed") {
    Write-Host "📦 Installing Docker Compose..." -ForegroundColor Yellow
    ssh -i $SSH_KEY $SERVER "sudo curl -L `"https://github.com/docker/compose/releases/latest/download/docker-compose-`$(uname -s)-`$(uname -m)`" -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose"
}

# Deploy the application
Write-Host "🚀 Starting deployment on server..." -ForegroundColor Yellow
ssh -i $SSH_KEY $SERVER "cd $DEPLOY_DIR && export DOCKER_USERNAME=$DOCKER_USERNAME && export VERSION=$VERSION && ./deploy-server.sh"

Write-Host "✅ Deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Your application should be available at:" -ForegroundColor Cyan
Write-Host "  Frontend: http://attendify.nitgoa.ac.in" -ForegroundColor White
Write-Host "  Backend API: http://attendify.nitgoa.ac.in:8000" -ForegroundColor White
Write-Host "  API Docs: http://attendify.nitgoa.ac.in:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "📋 Useful commands:" -ForegroundColor Cyan
Write-Host "  Check status: ssh -i $SSH_KEY $SERVER 'cd $DEPLOY_DIR && docker-compose -f docker-compose.deploy.yml ps'" -ForegroundColor Gray
Write-Host "  View logs: ssh -i $SSH_KEY $SERVER 'cd $DEPLOY_DIR && docker-compose -f docker-compose.deploy.yml logs -f'" -ForegroundColor Gray