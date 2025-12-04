#!/bin/bash

# Setup HTTPS for FastAPI backend on EC2
set -e

echo "🔒 Setting up HTTPS for FastAPI backend..."

# Create SSL directory
mkdir -p ssl

# Generate self-signed certificate for the IP address
echo "📜 Generating self-signed SSL certificate..."
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=54.167.95.26"

# Set proper permissions
chmod 600 ssl/key.pem
chmod 644 ssl/cert.pem

echo "✅ SSL certificates generated successfully!"
echo "📁 Certificates location:"
echo "  Certificate: ssl/cert.pem"
echo "  Private Key: ssl/key.pem"

echo ""
echo "🔧 Next steps:"
echo "1. Update docker-compose to mount SSL certificates"
echo "2. Modify FastAPI to use HTTPS"
echo "3. Update frontend API URL to use HTTPS"