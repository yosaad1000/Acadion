# Clean up EC2 instance and deploy real backend
param(
    [string]$InstanceIP = "54.167.95.26",
    [string]$KeyFile = "acadion-key.pem"
)

Write-Host "🧹 Cleaning up EC2 instance..." -ForegroundColor Yellow

# Stop all running containers
Write-Host "Stopping all Docker containers..." -ForegroundColor Yellow
ssh -i $KeyFile -o StrictHostKeyChecking=no ec2-user@$InstanceIP "sudo docker stop `$(sudo docker ps -q) || true"

# Remove all containers
Write-Host "Removing all Docker containers..." -ForegroundColor Yellow
ssh -i $KeyFile -o StrictHostKeyChecking=no ec2-user@$InstanceIP "sudo docker rm `$(sudo docker ps -aq) || true"

# Remove all Docker images
Write-Host "Removing Docker images..." -ForegroundColor Yellow
ssh -i $KeyFile -o StrictHostKeyChecking=no ec2-user@$InstanceIP "sudo docker rmi `$(sudo docker images -q) || true"

# Clean up files
Write-Host "Removing old files..." -ForegroundColor Yellow
ssh -i $KeyFile -o StrictHostKeyChecking=no ec2-user@$InstanceIP "rm -rf /home/ec2-user/app /home/ec2-user/acadion-backend /home/ec2-user/Dockerfile /home/ec2-user/main.py /home/ec2-user/requirements.txt /home/ec2-user/quick-setup.sh /tmp/backend.zip"

# Check what's left
Write-Host "Checking remaining files..." -ForegroundColor Green
ssh -i $KeyFile -o StrictHostKeyChecking=no ec2-user@$InstanceIP "ls -la /home/ec2-user/"

Write-Host "✅ EC2 instance cleaned up!" -ForegroundColor Green