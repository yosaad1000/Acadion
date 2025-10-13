#!/bin/bash

# ECS GPU Instance User Data Script
# Configures ECS agent and GPU support for face recognition workloads

set -e

# Variables from Terraform
CLUSTER_NAME="${cluster_name}"
REGION="${region}"

# Update system packages
yum update -y

# Install additional packages
yum install -y \
    htop \
    iotop \
    nvidia-smi \
    aws-cli \
    jq

# Configure ECS agent
echo "ECS_CLUSTER=$CLUSTER_NAME" >> /etc/ecs/ecs.config
echo "ECS_ENABLE_GPU_SUPPORT=true" >> /etc/ecs/ecs.config
echo "ECS_ENABLE_CONTAINER_METADATA=true" >> /etc/ecs/ecs.config
echo "ECS_ENABLE_TASK_IAM_ROLE=true" >> /etc/ecs/ecs.config
echo "ECS_ENABLE_TASK_IAM_ROLE_NETWORK_HOST=true" >> /etc/ecs/ecs.config
echo "ECS_LOGFILE=/log/ecs-agent.log" >> /etc/ecs/ecs.config
echo "ECS_AVAILABLE_LOGGING_DRIVERS=[\"json-file\",\"awslogs\"]" >> /etc/ecs/ecs.config
echo "ECS_LOGLEVEL=info" >> /etc/ecs/ecs.config

# Configure CloudWatch agent for GPU metrics
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
    "agent": {
        "metrics_collection_interval": 60,
        "run_as_user": "cwagent"
    },
    "metrics": {
        "namespace": "CWAgent",
        "metrics_collected": {
            "cpu": {
                "measurement": [
                    "cpu_usage_idle",
                    "cpu_usage_iowait",
                    "cpu_usage_user",
                    "cpu_usage_system"
                ],
                "metrics_collection_interval": 60,
                "totalcpu": false
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
            "diskio": {
                "measurement": [
                    "io_time"
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
            },
            "netstat": {
                "measurement": [
                    "tcp_established",
                    "tcp_time_wait"
                ],
                "metrics_collection_interval": 60
            },
            "swap": {
                "measurement": [
                    "swap_used_percent"
                ],
                "metrics_collection_interval": 60
            }
        }
    },
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/ecs/ecs-agent.log",
                        "log_group_name": "/aws/ecs/containerinsights/$CLUSTER_NAME/performance",
                        "log_stream_name": "{instance_id}/ecs-agent.log"
                    },
                    {
                        "file_path": "/var/log/messages",
                        "log_group_name": "/aws/ec2/system",
                        "log_stream_name": "{instance_id}/messages"
                    }
                ]
            }
        }
    }
}
EOF

# Install and start CloudWatch agent
yum install -y amazon-cloudwatch-agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
    -s

# Create GPU monitoring script
cat > /usr/local/bin/gpu-metrics.sh << 'EOF'
#!/bin/bash

# GPU Metrics Collection Script
# Sends GPU utilization metrics to CloudWatch

INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)

# Check if nvidia-smi is available
if ! command -v nvidia-smi &> /dev/null; then
    echo "nvidia-smi not found, skipping GPU metrics"
    exit 0
fi

# Get GPU metrics
GPU_UTIL=$(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits | head -1)
GPU_MEM_UTIL=$(nvidia-smi --query-gpu=utilization.memory --format=csv,noheader,nounits | head -1)
GPU_TEMP=$(nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits | head -1)
GPU_POWER=$(nvidia-smi --query-gpu=power.draw --format=csv,noheader,nounits | head -1)

# Send metrics to CloudWatch
aws cloudwatch put-metric-data \
    --region $REGION \
    --namespace "AWS/EC2/GPU" \
    --metric-data \
        MetricName=GPUUtilization,Value=$GPU_UTIL,Unit=Percent,Dimensions=InstanceId=$INSTANCE_ID \
        MetricName=GPUMemoryUtilization,Value=$GPU_MEM_UTIL,Unit=Percent,Dimensions=InstanceId=$INSTANCE_ID \
        MetricName=GPUTemperature,Value=$GPU_TEMP,Unit=None,Dimensions=InstanceId=$INSTANCE_ID \
        MetricName=GPUPowerDraw,Value=$GPU_POWER,Unit=None,Dimensions=InstanceId=$INSTANCE_ID

echo "GPU metrics sent: GPU=$GPU_UTIL%, Memory=$GPU_MEM_UTIL%, Temp=$GPU_TEMP°C, Power=$GPU_POWER W"
EOF

chmod +x /usr/local/bin/gpu-metrics.sh

# Create cron job for GPU metrics (every minute)
echo "* * * * * root /usr/local/bin/gpu-metrics.sh >> /var/log/gpu-metrics.log 2>&1" >> /etc/crontab

# Create health check script
cat > /usr/local/bin/health-check.sh << 'EOF'
#!/bin/bash

# Instance Health Check Script
# Monitors system health and reports to CloudWatch

INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)

# Check ECS agent status
ECS_AGENT_STATUS=$(systemctl is-active ecs)
if [ "$ECS_AGENT_STATUS" = "active" ]; then
    ECS_HEALTHY=1
else
    ECS_HEALTHY=0
fi

# Check GPU availability
if nvidia-smi &> /dev/null; then
    GPU_HEALTHY=1
else
    GPU_HEALTHY=0
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 90 ]; then
    DISK_HEALTHY=1
else
    DISK_HEALTHY=0
fi

# Send health metrics
aws cloudwatch put-metric-data \
    --region $REGION \
    --namespace "AWS/EC2/Health" \
    --metric-data \
        MetricName=ECSAgentHealthy,Value=$ECS_HEALTHY,Unit=None,Dimensions=InstanceId=$INSTANCE_ID \
        MetricName=GPUHealthy,Value=$GPU_HEALTHY,Unit=None,Dimensions=InstanceId=$INSTANCE_ID \
        MetricName=DiskHealthy,Value=$DISK_HEALTHY,Unit=None,Dimensions=InstanceId=$INSTANCE_ID

echo "Health check completed: ECS=$ECS_HEALTHY, GPU=$GPU_HEALTHY, Disk=$DISK_HEALTHY"
EOF

chmod +x /usr/local/bin/health-check.sh

# Create cron job for health checks (every 5 minutes)
echo "*/5 * * * * root /usr/local/bin/health-check.sh >> /var/log/health-check.log 2>&1" >> /etc/crontab

# Configure log rotation
cat > /etc/logrotate.d/gpu-metrics << 'EOF'
/var/log/gpu-metrics.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF

cat > /etc/logrotate.d/health-check << 'EOF'
/var/log/health-check.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF

# Set up Docker daemon configuration for GPU support
cat > /etc/docker/daemon.json << 'EOF'
{
    "default-runtime": "nvidia",
    "runtimes": {
        "nvidia": {
            "path": "nvidia-container-runtime",
            "runtimeArgs": []
        }
    },
    "log-driver": "awslogs",
    "log-opts": {
        "awslogs-region": "REGION_PLACEHOLDER",
        "awslogs-group": "/aws/ecs/containerinsights/CLUSTER_PLACEHOLDER/performance"
    }
}
EOF

# Replace placeholders in Docker daemon config
sed -i "s/REGION_PLACEHOLDER/$REGION/g" /etc/docker/daemon.json
sed -i "s/CLUSTER_PLACEHOLDER/$CLUSTER_NAME/g" /etc/docker/daemon.json

# Restart Docker daemon
systemctl restart docker

# Start and enable ECS agent
systemctl enable ecs
systemctl start ecs

# Wait for ECS agent to register
sleep 30

# Verify ECS agent registration
echo "Verifying ECS agent registration..."
aws ecs list-container-instances --cluster $CLUSTER_NAME --region $REGION

# Create startup completion marker
touch /var/log/user-data-complete

echo "User data script completed successfully"