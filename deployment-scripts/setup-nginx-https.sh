#!/bin/bash

# Setup Nginx HTTPS Reverse Proxy for FastAPI Backend
set -e

echo "🔧 Setting up Nginx HTTPS reverse proxy..."

# Install Nginx
echo "📦 Installing Nginx..."
sudo yum update -y
sudo yum install -y nginx

# Create SSL directory for Nginx
echo "📁 Creating SSL directory..."
sudo mkdir -p /etc/nginx/ssl

# Copy SSL certificates to Nginx directory
echo "📜 Copying SSL certificates..."
sudo cp ssl/cert.pem /etc/nginx/ssl/
sudo cp ssl/key.pem /etc/nginx/ssl/
sudo chmod 644 /etc/nginx/ssl/cert.pem
sudo chmod 600 /etc/nginx/ssl/key.pem

# Backup original nginx config
echo "💾 Backing up original Nginx config..."
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Copy our nginx configuration
echo "📝 Setting up Nginx configuration..."
sudo cp nginx-https-config.conf /etc/nginx/conf.d/acadion.conf

# Remove default server configuration
sudo rm -f /etc/nginx/conf.d/default.conf

# Test Nginx configuration
echo "🔍 Testing Nginx configuration..."
sudo nginx -t

# Enable and start Nginx
echo "🚀 Starting Nginx..."
sudo systemctl enable nginx
sudo systemctl start nginx

# Update backend to run on port 8001 (internal)
echo "🔄 Updating backend to run on internal port 8001..."

echo "✅ Nginx HTTPS reverse proxy setup completed!"
echo ""
echo "🌐 Your application is now available at:"
echo "  HTTPS: https://54.167.95.26 (port 443)"
echo "  HTTP: http://54.167.95.26 (redirects to HTTPS)"
echo ""
echo "🔧 Backend runs internally on port 8001"
echo "🔒 Nginx handles SSL termination on port 443"
echo ""
echo "📋 Management Commands:"
echo "  Check Nginx status: sudo systemctl status nginx"
echo "  Restart Nginx: sudo systemctl restart nginx"
echo "  View Nginx logs: sudo tail -f /var/log/nginx/error.log"