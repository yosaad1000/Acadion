#!/bin/bash

# SSL Setup Script for attendify.nitgoa.ac.in
# Run this on the server after basic deployment

set -e

DOMAIN="attendify.nitgoa.ac.in"
EMAIL="admin@nitgoa.ac.in"  # Change this to your email

echo "🔒 Setting up SSL for $DOMAIN"

# Install Nginx if not already installed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    sudo apt update
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
else
    echo "✅ Nginx is already installed"
fi

# Install Certbot
echo "📦 Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Copy Nginx configuration
echo "📝 Setting up Nginx configuration..."
sudo cp nginx-config.conf /etc/nginx/sites-available/attendify

# Enable the site
sudo ln -sf /etc/nginx/sites-available/attendify /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "🔍 Testing Nginx configuration..."
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Get SSL certificate
echo "🔒 Obtaining SSL certificate..."
sudo certbot --nginx -d $DOMAIN --email $EMAIL --agree-tos --non-interactive

# Set up auto-renewal
echo "🔄 Setting up SSL auto-renewal..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test auto-renewal
sudo certbot renew --dry-run

echo "✅ SSL setup completed!"
echo ""
echo "🌐 Your application is now available at:"
echo "  HTTPS: https://$DOMAIN"
echo "  HTTP: http://$DOMAIN (redirects to HTTPS)"
echo ""
echo "🔒 SSL Certificate Information:"
sudo certbot certificates

echo ""
echo "📋 SSL Management Commands:"
echo "  Check status: sudo certbot certificates"
echo "  Renew manually: sudo certbot renew"
echo "  Test renewal: sudo certbot renew --dry-run"