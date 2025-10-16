# Quick HTTPS tunnel setup using ngrok
Write-Host "🚀 Setting up HTTPS tunnel for EC2 backend..." -ForegroundColor Green

# Instructions for manual setup
Write-Host "📋 Manual Setup Steps:" -ForegroundColor Yellow
Write-Host "1. SSH into your EC2 instance:" -ForegroundColor White
Write-Host "   ssh -i acadion-key.pem ec2-user@54.167.95.26" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Install ngrok on EC2:" -ForegroundColor White
Write-Host "   curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null" -ForegroundColor Gray
Write-Host "   echo 'deb https://ngrok-agent.s3.amazonaws.com buster main' | sudo tee /etc/apt/sources.list.d/ngrok.list" -ForegroundColor Gray
Write-Host "   sudo apt update && sudo apt install ngrok" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Create ngrok tunnel:" -ForegroundColor White
Write-Host "   ngrok http 8000" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)" -ForegroundColor White
Write-Host "5. Update your Vercel environment variable VITE_API_URL to the ngrok HTTPS URL" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Note: ngrok free tier URLs change on restart" -ForegroundColor Red