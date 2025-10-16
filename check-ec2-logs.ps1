# EC2 Log Checker Script
# This script connects to your EC2 instance and checks various logs

param(
    [string]$InstanceIP = "54.167.95.26",
    [string]$KeyFile = "acadion-key.pem",
    [string]$User = "ec2-user"
)

Write-Host "🔍 Checking EC2 Backend Logs..." -ForegroundColor Green
Write-Host "Instance IP: $InstanceIP" -ForegroundColor Cyan
Write-Host "Key File: $KeyFile" -ForegroundColor Cyan

# Check if key file exists
if (-not (Test-Path $KeyFile)) {
    Write-Host "❌ Key file $KeyFile not found!" -ForegroundColor Red
    Write-Host "Available .pem files:" -ForegroundColor Yellow
    Get-ChildItem -Filter "*.pem" | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor White }
    exit 1
}

# Set proper permissions for the key file (Windows equivalent)
Write-Host "🔑 Setting key file permissions..." -ForegroundColor Yellow

# Create SSH command to check logs
$sshCommand = @"
echo '🚀 Checking Acadion Backend Status...'
echo ''

echo '📊 System Status:'
uptime
echo ''

echo '🐳 Docker Status:'
sudo docker ps -a
echo ''

echo '📋 Docker Compose Services:'
if [ -f /home/ec2-user/app/docker-compose.yml ]; then
    cd /home/ec2-user/app
    sudo docker-compose ps
else
    echo 'No docker-compose.yml found in /home/ec2-user/app'
fi
echo ''

echo '📝 Backend Container Logs (last 50 lines):'
BACKEND_CONTAINER=`sudo docker ps --filter 'name=backend' --format '{{.Names}}' | head -1`
if [ ! -z "$BACKEND_CONTAINER" ]; then
    sudo docker logs --tail 50 $BACKEND_CONTAINER
else
    echo 'No backend container found'
fi
echo ''

echo '🔍 All Container Logs:'
sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo ''

echo '📁 Application Directory:'
if [ -d /home/ec2-user/app ]; then
    ls -la /home/ec2-user/app/
else
    echo 'App directory not found'
fi
echo ''

echo '🌐 Network Connectivity:'
curl -s http://localhost:8000/health || echo 'Backend health check failed'
echo ''

echo '💾 Disk Usage:'
df -h
echo ''

echo '🔧 System Logs (last 20 lines):'
sudo tail -20 /var/log/messages
"@

# Execute SSH command
Write-Host "🔗 Connecting to EC2 instance..." -ForegroundColor Yellow
Write-Host "Command: ssh -i $KeyFile $User@$InstanceIP" -ForegroundColor Gray

try {
    # Use SSH to execute the command
    $sshCommand | ssh -i $KeyFile -o StrictHostKeyChecking=no $User@$InstanceIP 'bash -s'
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully retrieved logs from EC2 instance" -ForegroundColor Green
    } else {
        Write-Host "⚠️  SSH command completed with exit code: $LASTEXITCODE" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error connecting to EC2 instance: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "  1. Check if the instance is running: aws ec2 describe-instances" -ForegroundColor White
    Write-Host "  2. Verify security group allows SSH (port 22)" -ForegroundColor White
    Write-Host "  3. Ensure key file has correct permissions" -ForegroundColor White
    Write-Host "  4. Try connecting manually: ssh -i $KeyFile $User@$InstanceIP" -ForegroundColor White
}

Write-Host ""
Write-Host "🔧 Additional Commands you can run:" -ForegroundColor Cyan
Write-Host "  Manual SSH: ssh -i $KeyFile $User@$InstanceIP" -ForegroundColor White
Write-Host "  Check specific container: ssh -i $KeyFile $User@$InstanceIP 'sudo docker logs CONTAINER_NAME'" -ForegroundColor White
Write-Host "  Restart services: ssh -i $KeyFile $User@$InstanceIP 'cd /home/ec2-user/app; sudo docker-compose restart'" -ForegroundColor White