#!/bin/bash

# Setup HTTPS with domain and Let's Encrypt SSL
# Run this on your EC2 instance

DOMAIN="$1"  # Pass your domain as argument, e.g., api.yourdomain.com

if [ -z "$DOMAIN" ]; then
    echo "❌ Please provide your domain name"
    echo "Usage: ./setup-domain-https.sh api.yourdomain.com"
    exit 1
fi

echo "🚀 Setting up HTTPS for domain: $DOMAIN"

# Install certbot for Let's Encrypt
echo "📦 Installing certbot..."
sudo yum update -y
sudo yum install -y certbot python3-certbot-nginx

# Install nginx if not already installed
sudo yum install -y nginx

# Create nginx configuration for your domain
echo "📝 Creating nginx configuration..."
sudo tee /etc/nginx/conf.d/$DOMAIN.conf > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL certificates (will be added by certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # CORS headers for API
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
    
    # Handle preflight requests
    if (\$request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";
        add_header Content-Length 0;
        add_header Content-Type text/plain;
        return 204;
    }
    
    # Proxy to FastAPI backend
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# Test nginx configuration
echo "🔍 Testing nginx configuration..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration error"
    exit 1
fi

# Start nginx
echo "🚀 Starting nginx..."
sudo systemctl enable nginx
sudo systemctl start nginx

# Get SSL certificate from Let's Encrypt
echo "🔐 Getting SSL certificate from Let's Encrypt..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Set up automatic renewal
echo "⏰ Setting up automatic SSL renewal..."
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer

# Test SSL certificate
echo "🧪 Testing SSL certificate..."
sudo certbot certificates

echo ""
echo "✅ HTTPS setup complete!"
echo "🌐 Your API is now available at: https://$DOMAIN"
echo "🔒 SSL certificate will auto-renew every 90 days"
echo ""
echo "📋 Next steps:"
echo "   1. Update your Vercel environment variable:"
echo "      vercel env rm VITE_API_URL --yes"
echo "      echo 'https://$DOMAIN' | vercel env add VITE_API_URL production"
echo "   2. Redeploy your frontend"
echo "   3. Test your API at: https://$DOMAIN/api/health"