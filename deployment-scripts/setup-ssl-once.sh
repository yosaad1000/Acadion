#!/bin/bash
# One-time SSL setup for api.acadion.online
# Run this manually once on the EC2 server

set -e

DOMAIN="api.acadion.online"
EMAIL="yosaad1000@gmail.com"

echo "🔐 Setting up SSL for $DOMAIN (one-time setup)"

# Install certbot if not present (idempotent)
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    sudo yum update -y
    sudo yum install -y certbot python3-certbot-nginx
fi

# Install nginx if not present (idempotent)
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing nginx..."
    sudo yum install -y nginx
fi

# Stop nginx temporarily for certificate generation
sudo systemctl stop nginx 2>/dev/null || true

# Generate SSL certificate (idempotent - certbot handles existing certs)
echo "🔐 Generating SSL certificate for $DOMAIN..."
sudo certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    --expand || echo "Certificate already exists or failed to generate"

# Create nginx configuration for the domain
sudo tee /etc/nginx/conf.d/acadion.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name api.acadion.online;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.acadion.online;

    ssl_certificate /etc/letsencrypt/live/api.acadion.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.acadion.online/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # CORS headers
    add_header Access-Control-Allow-Origin "https://acadion-gamma.vercel.app" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
    add_header Access-Control-Allow-Credentials "true" always;

    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin "https://acadion-gamma.vercel.app";
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With";
        add_header Access-Control-Allow-Credentials "true";
        add_header Content-Length 0;
        add_header Content-Type text/plain;
        return 204;
    }

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# Start and enable nginx (idempotent)
sudo systemctl start nginx
sudo systemctl enable nginx

# Setup auto-renewal (idempotent)
echo "🔄 Setting up SSL certificate auto-renewal..."
(sudo crontab -l 2>/dev/null | grep -v certbot; echo "0 12 * * * /usr/bin/certbot renew --quiet --reload-hook 'systemctl reload nginx'") | sudo crontab -

echo "✅ SSL setup completed!"
echo "🌐 Your API is now available at: https://$DOMAIN"
echo "🔐 SSL certificate will auto-renew"
echo ""
echo "Next steps:"
echo "1. Update your frontend to use https://api.acadion.online"
echo "2. Deploy your backend with docker-compose.nginx.yml"
echo "3. Test the HTTPS endpoint"