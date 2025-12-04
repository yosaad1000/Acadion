#!/bin/bash
# Setup SSL for EC2 Backend

echo "🔒 Setting up HTTPS for EC2 Backend..."

# Update system
sudo yum update -y

# Install Nginx
sudo yum install -y nginx

# Install Certbot for Let's Encrypt (if you have a domain)
sudo yum install -y certbot python3-certbot-nginx

# Create Nginx configuration for reverse proxy
sudo tee /etc/nginx/conf.d/acadion-backend.conf > /dev/null <<EOF
server {
    listen 80;
    server_name 54.167.95.26;  # Your EC2 IP
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl;
    server_name 54.167.95.26;
    
    # Self-signed SSL certificate (temporary solution)
    ssl_certificate /etc/nginx/ssl/nginx.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx.key;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Proxy to your FastAPI backend
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "https://acadion-yosaad1000s-projects.vercel.app" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept" always;
        add_header Access-Control-Allow-Credentials true always;
        
        # Handle preflight requests
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

# Create SSL directory
sudo mkdir -p /etc/nginx/ssl

# Generate self-signed certificate (temporary solution)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key \
    -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=54.167.95.26"

# Test Nginx configuration
sudo nginx -t

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Open port 443 in security group (you'll need to do this manually in AWS Console)
echo "✅ Nginx with SSL configured!"
echo "🔧 Don't forget to:"
echo "1. Open port 443 in your EC2 security group"
echo "2. Update your frontend API URL to: https://54.167.95.26"
echo "3. Test the HTTPS endpoint"