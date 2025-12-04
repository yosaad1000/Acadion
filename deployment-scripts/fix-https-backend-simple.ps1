# Complete HTTPS Backend Fix Script
param(
    [string]$KeyFile = "acadion-key.pem",
    [string]$InstanceIP = "54.167.95.26",
    [string]$SecurityGroupName = "acadion-backend-sg"
)

Write-Host "🔒 Starting Complete HTTPS Backend Setup..." -ForegroundColor Green

# Step 1: Update AWS Security Group
Write-Host "`n📋 Step 1: Updating AWS Security Group..." -ForegroundColor Yellow

$sgId = aws ec2 describe-security-groups --group-names $SecurityGroupName --query 'SecurityGroups[0].GroupId' --output text

if ($sgId -and $sgId -ne "None") {
    Write-Host "✅ Found security group: $sgId" -ForegroundColor Green
    
    # Add HTTPS rule
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 443 --cidr 0.0.0.0/0 2>$null
    Write-Host "✅ HTTPS rule added (or already exists)" -ForegroundColor Green
} else {
    Write-Host "❌ Security group not found" -ForegroundColor Red
    exit 1
}

# Step 2: Create and upload SSL setup script
Write-Host "`n📋 Step 2: Setting up SSL on EC2..." -ForegroundColor Yellow

# Create the SSL setup script content
$sslScript = @"
#!/bin/bash
echo '🔒 Setting up HTTPS for EC2 Backend...'

# Update and install Nginx
sudo yum update -y
sudo yum install -y nginx

# Create SSL directory and certificate
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key \
    -out /etc/nginx/ssl/nginx.crt \
    -subj '/C=US/ST=AWS/L=EC2/O=Acadion/CN=54.167.95.26'

# Create Nginx config
sudo tee /etc/nginx/conf.d/acadion-backend.conf > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name 54.167.95.26;
    return 301 https://`$server_name`$request_uri;
}

server {
    listen 443 ssl;
    server_name 54.167.95.26;
    
    ssl_certificate /etc/nginx/ssl/nginx.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        
        add_header Access-Control-Allow-Origin "https://acadion-yosaad1000s-projects.vercel.app" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept" always;
        add_header Access-Control-Allow-Credentials true always;
        
        if (`$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://acadion-yosaad1000s-projects.vercel.app";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept";
            add_header Access-Control-Allow-Credentials true;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }
}
NGINXEOF

# Test and start Nginx
sudo nginx -t && sudo systemctl start nginx && sudo systemctl enable nginx
echo '✅ SSL setup completed!'
"@

# Save script locally
$sslScript | Out-File -FilePath "ssl-setup.sh" -Encoding UTF8

# Upload and run the script
Write-Host "📤 Uploading SSL setup script..." -ForegroundColor Yellow
scp -i $KeyFile -o StrictHostKeyChecking=no ssl-setup.sh ec2-user@${InstanceIP}:/tmp/ssl-setup.sh

Write-Host "🔧 Running SSL setup on EC2..." -ForegroundColor Yellow
ssh -i $KeyFile -o StrictHostKeyChecking=no ec2-user@$InstanceIP "chmod +x /tmp/ssl-setup.sh && sudo /tmp/ssl-setup.sh"

# Clean up
Remove-Item ssl-setup.sh -Force

# Step 3: Update Vercel environment
Write-Host "`n📋 Step 3: Updating Vercel environment..." -ForegroundColor Yellow
Set-Location frontend

# Update API URL to HTTPS
vercel env rm VITE_API_URL --yes 2>$null
"https://$InstanceIP" | vercel env add VITE_API_URL production

# Step 4: Redeploy
Write-Host "`n📋 Step 4: Redeploying frontend..." -ForegroundColor Yellow
vercel --prod

Set-Location ..

Write-Host "`n🎉 Setup Complete!" -ForegroundColor Green
Write-Host "Backend: https://$InstanceIP" -ForegroundColor Cyan
Write-Host "Frontend: https://acadion-yosaad1000s-projects.vercel.app" -ForegroundColor Cyan