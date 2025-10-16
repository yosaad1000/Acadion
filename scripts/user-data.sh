#!/bin/bash

# EC2 User Data Script for Acadion Application
# This script runs when the EC2 instance first starts

set -e

# Log all output
exec > >(tee /var/log/user-data.log)
exec 2>&1

echo "Starting Acadion EC2 setup..."

# Update system packages
apt-get update -y

# Install essential packages
apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# Install Node.js (for potential frontend builds)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install Python and pip (for backend)
apt-get install -y python3 python3-pip python3-venv

# Create application directory
mkdir -p /opt/acadion
chown ubuntu:ubuntu /opt/acadion

# Install AWS CLI (for potential future use)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
rm -rf aws awscliv2.zip

# Create a simple health check script
cat > /opt/acadion/health-check.sh << 'EOF'
#!/bin/bash
echo "Acadion Health Check - $(date)"
echo "Docker Status: $(systemctl is-active docker)"
echo "Running Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "System Resources:"
echo "Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
echo "Disk: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}')"
echo "CPU Load: $(uptime | awk -F'load average:' '{print $2}')"
EOF

chmod +x /opt/acadion/health-check.sh
chown ubuntu:ubuntu /opt/acadion/health-check.sh

# Create log rotation for application logs
cat > /etc/logrotate.d/acadion << 'EOF'
/opt/acadion/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
}
EOF

# Create logs directory
mkdir -p /opt/acadion/logs
chown ubuntu:ubuntu /opt/acadion/logs

# Set up automatic security updates
apt-get install -y unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades

# Configure firewall (UFW)
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp  # Backend API
ufw allow 5173/tcp  # Frontend dev server

# Create a simple monitoring script
cat > /opt/acadion/monitor.sh << 'EOF'
#!/bin/bash
# Simple monitoring script for Acadion

LOG_FILE="/opt/acadion/logs/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check if containers are running
BACKEND_STATUS=$(docker ps --filter "name=backend" --format "{{.Status}}" | head -1)
FRONTEND_STATUS=$(docker ps --filter "name=frontend" --format "{{.Status}}" | head -1)
REDIS_STATUS=$(docker ps --filter "name=redis" --format "{{.Status}}" | head -1)

echo "[$DATE] Backend: $BACKEND_STATUS, Frontend: $FRONTEND_STATUS, Redis: $REDIS_STATUS" >> $LOG_FILE

# Restart containers if they're not running
if [ -z "$BACKEND_STATUS" ]; then
    echo "[$DATE] Backend container not running, attempting restart..." >> $LOG_FILE
    cd /home/ubuntu/acadion && docker-compose restart backend
fi

if [ -z "$REDIS_STATUS" ]; then
    echo "[$DATE] Redis container not running, attempting restart..." >> $LOG_FILE
    cd /home/ubuntu/acadion && docker-compose restart redis
fi
EOF

chmod +x /opt/acadion/monitor.sh
chown ubuntu:ubuntu /opt/acadion/monitor.sh

# Set up cron job for monitoring (every 5 minutes)
echo "*/5 * * * * /opt/acadion/monitor.sh" | crontab -u ubuntu -

# Create welcome message
cat > /etc/motd << 'EOF'
 
 █████╗  ██████╗ █████╗ ██████╗ ██╗ ██████╗ ███╗   ██╗
██╔══██╗██╔════╝██╔══██╗██╔══██╗██║██╔═══██╗████╗  ██║
███████║██║     ███████║██║  ██║██║██║   ██║██╔██╗ ██║
██╔══██║██║     ██╔══██║██║  ██║██║██║   ██║██║╚██╗██║
██║  ██║╚██████╗██║  ██║██████╔╝██║╚██████╔╝██║ ╚████║
╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═════╝ ╚═╝ ╚═════╝ ╚═╝  ╚═══╝

Welcome to your Acadion application server!

Quick Commands:
  - Check application status: /opt/acadion/health-check.sh
  - View application logs: cd ~/acadion && docker-compose logs
  - Restart services: cd ~/acadion && docker-compose restart
  - Update application: cd ~/acadion && git pull && docker-compose up -d --build

Application URLs:
  - Frontend: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):5173
  - Backend API: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000
  - API Docs: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000/docs

EOF

echo "Acadion EC2 setup completed successfully!"
echo "Instance is ready for application deployment."