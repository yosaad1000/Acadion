#!/bin/bash
# EC2 User Data Script for Acadion Backend Setup
# Optimized for t2.micro (1GB RAM) with Docker

set -e

# Log all output
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "Starting Acadion backend setup..."

# Update system packages
yum update -y

# Install required packages
yum install -y \
    docker \
    awscli \
    amazon-cloudwatch-agent \
    htop \
    git \
    curl \
    wget

# Configure Docker for t2.micro (1GB RAM)
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ],
  "default-ulimits": {
    "memlock": {
      "Hard": -1,
      "Name": "memlock",
      "Soft": -1
    }
  }
}
EOF

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Add ec2-user to docker group
usermod -a -G docker ec2-user

# Configure AWS CLI region
aws configure set region ${aws_region}

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create application directory
mkdir -p /opt/acadion
chown ec2-user:ec2-user /opt/acadion

# Create systemd service for Acadion backend
cat > /etc/systemd/system/acadion-backend.service << 'EOF'
[Unit]
Description=Acadion Backend Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/acadion
ExecStartPre=/bin/bash -c 'aws ecr get-login-password --region ${aws_region} | docker login --username AWS --password-stdin ${ecr_repository_uri}'
ExecStart=/bin/bash -c 'docker pull ${ecr_repository_uri}:latest && docker run -d --name acadion-backend --restart unless-stopped -p 8000:8000 -e AWS_DEFAULT_REGION=${aws_region} ${ecr_repository_uri}:latest'
ExecStop=/usr/bin/docker stop acadion-backend
ExecStopPost=/usr/bin/docker rm acadion-backend
User=ec2-user
Group=docker

[Install]
WantedBy=multi-user.target
EOF

# Create deployment script for CodeDeploy
mkdir -p /opt/codedeploy-agent
cat > /opt/codedeploy-agent/deploy.sh << 'EOF'
#!/bin/bash
# CodeDeploy deployment script

set -e

DEPLOYMENT_DIR="/opt/acadion"
ECR_URI="${ecr_repository_uri}"
AWS_REGION="${aws_region}"

echo "Starting deployment..."

# Stop existing container
docker stop acadion-backend || true
docker rm acadion-backend || true

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI

# Pull latest image
IMAGE_TAG=$(cat $DEPLOYMENT_DIR/image_tag.txt || echo "latest")
docker pull $ECR_URI:$IMAGE_TAG

# Start new container
docker run -d \
  --name acadion-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  -e AWS_DEFAULT_REGION=$AWS_REGION \
  -e ENVIRONMENT=production \
  $ECR_URI:$IMAGE_TAG

echo "Deployment completed successfully"
EOF

chmod +x /opt/codedeploy-agent/deploy.sh

# Install CodeDeploy agent
yum install -y ruby
cd /home/ec2-user
wget https://aws-codedeploy-${aws_region}.s3.${aws_region}.amazonaws.com/latest/install
chmod +x ./install
./install auto

# Configure CloudWatch agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "cwagent"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/messages",
            "log_group_name": "/aws/ec2/acadion-prod",
            "log_stream_name": "{instance_id}/messages"
          },
          {
            "file_path": "/var/log/user-data.log",
            "log_group_name": "/aws/ec2/acadion-prod",
            "log_stream_name": "{instance_id}/user-data"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "Acadion/EC2",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_iowait",
          "cpu_usage_user",
          "cpu_usage_system"
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          "used_percent"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          "mem_used_percent"
        ],
        "metrics_collection_interval": 60
      }
    }
  }
}
EOF

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
  -s

# Create health check script
cat > /opt/acadion/health-check.sh << 'EOF'
#!/bin/bash
# Health check script for Acadion backend

HEALTH_URL="http://localhost:8000/health"
MAX_RETRIES=3
RETRY_DELAY=5

for i in $(seq 1 $MAX_RETRIES); do
  if curl -f -s $HEALTH_URL > /dev/null; then
    echo "Health check passed"
    exit 0
  fi
  
  echo "Health check failed (attempt $i/$MAX_RETRIES)"
  if [ $i -lt $MAX_RETRIES ]; then
    sleep $RETRY_DELAY
  fi
done

echo "Health check failed after $MAX_RETRIES attempts"
exit 1
EOF

chmod +x /opt/acadion/health-check.sh

# Create cron job for health checks
echo "*/5 * * * * /opt/acadion/health-check.sh" | crontab -u ec2-user -

# Set up log rotation for Docker logs
cat > /etc/logrotate.d/docker << 'EOF'
/var/lib/docker/containers/*/*.log {
  rotate 7
  daily
  compress
  size=10M
  missingok
  delaycompress
  copytruncate
}
EOF

# Optimize system for t2.micro
echo 'vm.swappiness=10' >> /etc/sysctl.conf
echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
sysctl -p

# Create swap file for additional memory (1GB)
fallocate -l 1G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Enable and start services
systemctl enable amazon-cloudwatch-agent
systemctl enable codedeploy-agent
systemctl start codedeploy-agent

# Create initial deployment marker
touch /opt/acadion/deployment-ready

echo "Acadion backend setup completed successfully"
echo "Instance is ready for deployment"
EOF