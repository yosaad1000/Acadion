#!/bin/bash

# Simple domain SSL setup for existing Docker deployment
# Usage: ./setup-domain-simple.sh

DOMAIN="api.acadion.online"

echo "🚀 Setting up SSL for: $DOMAIN"

# Check if domain points to this server
echo "🔍 Checking DNS configuration..."
DOMAIN_IP=$(dig +short $DOMAIN)
SERVER_IP=$(curl -s ifconfig.me)

echo "Domain $DOMAIN points to: $DOMAIN_IP"
echo "This server IP: $SERVER_IP"

if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    echo "⚠️  DNS not configured correctly. Please set:"
    echo "   A record: $DOMAIN → $SERVER_IP"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    sudo yum update -y
    sudo yum install -y certbot
fi

# Stop nginx temporarily
echo "🛑 Stopping nginx temporarily..."
sudo systemctl stop nginx 2>/dev/null || true

# Get SSL certificate using standalone mode
echo "🔐 Getting SSL certificate for $DOMAIN..."
sudo certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email admin@acadion.online \
    -d $DOMAIN

if [ $? -ne 0 ]; then
    echo "❌ Failed to get SSL certificate"
    exit 1
fi

# Set up auto-renewal
echo "⏰ Setting up auto-renewal..."
sudo systemctl enable certbot-renew.timer 2>/dev/null || true
sudo systemctl start certbot-renew.timer 2>/dev/null || true

# Create renewal hook to restart nginx
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy
sudo tee /etc/letsencrypt/renewal-hooks/deploy/restart-nginx.sh > /dev/null <<EOF
#!/bin/bash
systemctl restart nginx
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/restart-nginx.sh

echo "✅ SSL certificate obtained successfully!"
echo "📋 Certificate files:"
echo "   Cert: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "   Key:  /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo ""
echo "🎉 Domain SSL setup complete!"
echo "   Now deploy with docker-compose.nginx.yml to use the domain SSL"