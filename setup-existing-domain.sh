#!/bin/bash

# Setup HTTPS with existing domain
# Usage: ./setup-existing-domain.sh yourdomain.com

DOMAIN="$1"
API_DOMAIN="api.$1"

if [ -z "$DOMAIN" ]; then
    echo "❌ Please provide your domain name"
    echo "Usage: ./setup-existing-domain.sh yourdomain.com"
    exit 1
fi

echo "🚀 Setting up HTTPS for:"
echo "   Frontend: https://$DOMAIN"
echo "   Backend:  https://$API_DOMAIN"
echo ""

# Check if domain points to this server
echo "🔍 Checking DNS configuration..."
DOMAIN_IP=$(dig +short $DOMAIN)
API_IP=$(dig +short $API_DOMAIN)
SERVER_IP=$(curl -s ifconfig.me)

echo "Domain $DOMAIN points to: $DOMAIN_IP"
echo "API domain $API_DOMAIN points to: $API_IP"
echo "This server IP: $SERVER_IP"

if [ "$DOMAIN_IP" != "$SERVER_IP" ] || [ "$API_IP" != "$SERVER_IP" ]; then
    echo "⚠️  DNS not configured correctly. Please set:"
    echo "   A record: $DOMAIN → $SERVER_IP"
    echo "   A record: $API_DOMAIN → $SERVER_IP"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install required packages
echo "📦 Installing nginx and certbot..."
sudo yum update -y
sudo yum install -y nginx certbot python3-certbot-nginx

# Create nginx configuration for both domains
echo "📝 Creating nginx configuration..."

# Frontend configuration
sudo tee /etc/nginx/conf.d/$DOMAIN.conf > /dev/null <<EOF
# Frontend domain configuration
server {
    listen 80;
    server_name $DOMAIN;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL certificates (will be added by certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    
    # Serve frontend static files
    root /var/www/$DOMAIN;
    index index.html;
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Optional: Proxy API calls to backend
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Backend API configuration
sudo tee /etc/nginx/conf.d/$API_DOMAIN.conf > /dev/null <<EOF
# Backend API domain configuration
server {
    listen 80;
    server_name $API_DOMAIN;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $API_DOMAIN;
    
    # SSL certificates (will be added by certbot)
    ssl_certificate /etc/letsencrypt/live/$API_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$API_DOMAIN/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    
    # CORS headers
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

# Create web directories
sudo mkdir -p /var/www/certbot
sudo mkdir -p /var/www/$DOMAIN

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

# Get SSL certificates
echo "🔐 Getting SSL certificates..."
sudo certbot --nginx -d $DOMAIN -d $API_DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Set up auto-renewal
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer

echo ""
echo "✅ Domain setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Deploy your frontend to: /var/www/$DOMAIN"
echo "   2. Update Vercel to use your domain:"
echo "      vercel env rm VITE_API_URL --yes"
echo "      echo 'https://$API_DOMAIN' | vercel env add VITE_API_URL production"
echo "   3. Test your setup:"
echo "      Frontend: https://$DOMAIN"
echo "      Backend:  https://$API_DOMAIN/api/health"
echo ""
echo "🎉 Your app will be available at: https://$DOMAIN"