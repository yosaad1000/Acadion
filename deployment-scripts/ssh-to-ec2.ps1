# Direct SSH to EC2 Instance
param(
    [string]$InstanceIP = "54.167.95.26",
    [string]$KeyFile = "acadion-key.pem"
)

Write-Host "🔗 Connecting to EC2 instance..." -ForegroundColor Green
Write-Host "Instance: $InstanceIP" -ForegroundColor Cyan
Write-Host "Key: $KeyFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "Once connected, you can run these commands to check the backend:" -ForegroundColor Yellow
Write-Host "  pwd                          # Check current directory" -ForegroundColor White
Write-Host "  ls -la                       # List all files" -ForegroundColor White
Write-Host "  sudo docker ps -a            # Check all containers" -ForegroundColor White
Write-Host "  sudo docker logs CONTAINER   # Check container logs" -ForegroundColor White
Write-Host "  ls -la /tmp/                 # Check uploaded files" -ForegroundColor White
Write-Host "  cat /tmp/backend.zip         # Check if zip file exists" -ForegroundColor White
Write-Host ""

# Start SSH session
ssh -i $KeyFile -o StrictHostKeyChecking=no ec2-user@$InstanceIP