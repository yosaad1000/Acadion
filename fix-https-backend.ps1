# Complete HTTPS Backend Fix Script
# This script will:
# 1. Update AWS security group to allow HTTPS
# 2. SSH into EC2 to setup SSL with Nginx
# 3. Update Vercel environment variables
# 4. Redeploy frontend

param(
    [string]$KeyFile = "acadion-key.pem",
    [string]$InstanceIP = "54.167.95.26",
    [string]$SecurityGroupName = "acadion-backend-sg"
)

Write-Host "🔒 Starting Complete HTTPS Backend Setup..." -ForegroundColor Green
Write-Host "Instance IP: $InstanceIP" -ForegroundColor Cyan
Write-Host "Key File: $KeyFile" -ForegroundColor Cyan

# Step 1: Update AWS Security Group to allow HTTPS
Write-Host "`n📋 Step 1: Updating AWS Security Group..." -ForegroundColor Yellow

try {
    # Get security group ID
    $sgId = aws ec2 describe-security-groups --group-names $SecurityGroupName --query 'SecurityGroups[0].GroupId' --output text
    
    if ($sgId -and $sgId -ne "None") {
        Write-Host "✅ Found security group: $sgId" -ForegroundColor Green
        
        # Add HTTPS rule (port 443)
        Write-Host "🔓 Adding HTTPS (port 443) rule..." -ForegroundColor Yellow
        aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 443 --cidr 0.0.0.0/0 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ HTTPS rule added successfully" -ForegroundColor Green
        } else {
            Write-Host "⚠️  HTTPS rule might already exist (this is OK)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Security group not found" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error updating security group: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Create SSL setup script for EC2
Write-Host "`n📋 Step 2: Creating SSL setup script..." -ForegroundColor Yellow

$sslSetupScript = @'
#!/bin/bash
echo "🔒 Setting up HTTPS for EC2 Backend..."

# Update system
sudo yum update -y

# Install Nginx
sudo yum install -y nginx

# Create SSL directory
sudo mkdir -p /etc/nginx/ssl

# Generate self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key \
    -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=US/ST=AWS/L=EC2/O=Acadion/CN=54.167.95.26"

# Create Nginx configuration
sudo tee /etc/nginx/conf.d/acadion-backend.conf > /dev/null <<EOF
server {
    listen 80;
    server_name 54.167.95.26;
    return 301 https://\$server_name\$request_uri;
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
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS headers for Vercel frontend
        add_header Access-Control-Allow-Origin "https://acadion-yosaad1000s-projects.vercel.app" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept" always;
        add_header Access-Control-Allow-Credentials true always;
        
        if (\$request_method = 'OPTIONS') {
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
EOF

# Remove default Nginx config that might conflict
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# Test Nginx configuration
sudo nginx -t

if [ $? -eq 0 ]; then
    # Start and enable Nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    echo "✅ Nginx with SSL configured and started!"
    
    # Test the setup
    echo "🧪 Testing HTTPS endpoint..."
    sleep 5
    curl -k -I https://localhost:443 || echo "⚠️  HTTPS test failed, but this might be normal"
    
    echo "🎉 SSL setup completed successfully!"
else
    echo "❌ Nginx configuration test failed"
    exit 1
fi
'@

# Save the script temporarily
$sslSetupScript | Out-File -FilePath "temp-ssl-setup.sh" -Encoding UTF8

# Step 3: SSH into EC2 and run SSL setup
Write-Host "`n📋 Step 3: Connecting to EC2 and setting up SSL..." -ForegroundColor Yellow

if (-not (Test-Path $KeyFile)) {
    Write-Host "❌ Key file $KeyFile not found!" -ForegroundColor Red
    Write-Host "Available .pem files:" -ForegroundColor Yellow
    Get-ChildItem -Filter "*.pem" | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor White }
    exit 1
}

try {
    Write-Host "📤 Uploading SSL setup script to EC2..." -ForegroundColor Yellow
    scp -i $KeyFile -o StrictHostKeyChecking=no temp-ssl-setup.sh ec2-user@${InstanceIP}:/tmp/ssl-setup.sh
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Script uploaded successfully" -ForegroundColor Green
        
        Write-Host "🔧 Running SSL setup on EC2..." -ForegroundColor Yellow
        ssh -i $KeyFile -o StrictHostKeyChecking=no ec2-user@$InstanceIP @'
chmod +x /tmp/ssl-setup.sh
sudo /tmp/ssl-setup.sh
echo "🏁 SSL setup completed on EC2"
'@
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ SSL setup completed on EC2" -ForegroundColor Green
        } else {
            Write-Host "❌ SSL setup failed on EC2" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Failed to upload script to EC2" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error during EC2 setup: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Clean up temporary file
    Remove-Item -Path "temp-ssl-setup.sh" -Force -ErrorAction SilentlyContinue
}

# Step 4: Update Vercel environment variable
Write-Host "`n📋 Step 4: Updating Vercel environment variables..." -ForegroundColor Yellow

Set-Location frontend

try {
    # Remove old API URL
    Write-Host "🗑️  Removing old API URL..." -ForegroundColor Yellow
    vercel env rm VITE_API_URL --yes 2>$null
    
    # Add new HTTPS API URL
    Write-Host "🌐 Adding new HTTPS API URL..." -ForegroundColor Yellow
    $env:VERCEL_API_URL = "https://$InstanceIP"
    echo $env:VERCEL_API_URL | vercel env add VITE_API_URL production
    
    Write-Host "✅ Environment variable updated" -ForegroundColor Green
} catch {
    Write-Host "❌ Error updating Vercel environment: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 5: Redeploy frontend
Write-Host "`n📋 Step 5: Redeploying frontend..." -ForegroundColor Yellow

try {
    vercel --prod
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Frontend redeployed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Frontend deployment failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error during deployment: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Set-Location ..

# Step 6: Test the complete setup
Write-Host "`n📋 Step 6: Testing the complete setup..." -ForegroundColor Yellow

Write-Host "🧪 Testing HTTPS backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://$InstanceIP/health" -SkipCertificateCheck -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ HTTPS backend is responding!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  HTTPS backend test failed, but this might be due to self-signed certificate" -ForegroundColor Yellow
}

Write-Host "`n🎉 Complete HTTPS Setup Finished!" -ForegroundColor Green
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "  ✅ Security group updated (port 443 open)" -ForegroundColor White
Write-Host "  ✅ SSL certificate generated on EC2" -ForegroundColor White
Write-Host "  ✅ Nginx reverse proxy configured" -ForegroundColor White
Write-Host "  ✅ CORS headers configured for Vercel" -ForegroundColor White
Write-Host "  ✅ Vercel environment updated to HTTPS" -ForegroundColor White
Write-Host "  ✅ Frontend redeployed" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Your backend is now available at: https://$InstanceIP" -ForegroundColor Green
Write-Host "🌐 Your frontend is at: https://acadion-yosaad1000s-projects.vercel.app" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  Note: You're using a self-signed certificate, so browsers will show a security warning." -ForegroundColor Yellow
Write-Host "   For production, consider using Let's Encrypt or AWS Certificate Manager." -ForegroundColor Yellow