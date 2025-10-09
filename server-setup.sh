#!/bin/bash

# Server Setup Script for Ubuntu Server
# Run this on the server: ubuntu@attendify.nitgoa.ac.in

set -e

echo "🔧 Setting up Ubuntu server for Attendify deployment..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    echo "✅ Docker is already installed"
fi

# Install Docker Compose if not already installed
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo "✅ Docker Compose is already installed"
fi

# Install other useful tools
echo "🛠️ Installing additional tools..."
sudo apt install -y curl wget htop nano ufw

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8000/tcp
sudo ufw --force enable

# Create deployment directory
echo "📁 Creating deployment directory..."
mkdir -p /home/ubuntu/attendify
cd /home/ubuntu/attendify

# Set up log rotation
echo "📝 Setting up log rotation..."
sudo tee /etc/logrotate.d/attendify > /dev/null <<EOF
/home/ubuntu/attendify/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
}
EOF

# Create logs directory
mkdir -p logs

# Display system information
echo ""
echo "✅ Server setup completed!"
echo ""
echo "📊 System Information:"
echo "  OS: $(lsb_release -d | cut -f2)"
echo "  Kernel: $(uname -r)"
echo "  Docker: $(docker --version)"
echo "  Docker Compose: $(docker-compose --version)"
echo "  Available Memory: $(free -h | grep Mem | awk '{print $7}')"
echo "  Available Disk: $(df -h / | tail -1 | awk '{print $4}')"
echo ""
echo "🔥 Firewall Status:"
sudo ufw status
echo ""
echo "🚀 Server is ready for Attendify deployment!"
echo ""
echo "📋 Next steps:"
echo "  1. Copy deployment files to this server"
echo "  2. Update .env with your actual credentials"
echo "  3. Run the deployment script"
echo ""
echo "⚠️  Note: You may need to log out and back in for Docker group changes to take effect"