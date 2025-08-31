---
layout: default
title: Deployment
nav_order: 5
---

# 🚀 Deployment Guide

This guide covers deploying Acadion to production environments, from simple single-server setups to scalable cloud deployments.

## Deployment Options

### 1. Docker Compose (Recommended for Small-Medium Scale)
### 2. Cloud Platforms (AWS, GCP, Azure)
### 3. Container Orchestration (Kubernetes)
### 4. Serverless Deployment

## Docker Compose Deployment

### Prerequisites
- Docker and Docker Compose installed
- Domain name with DNS configured
- SSL certificate (Let's Encrypt recommended)

### Production Setup

1. **Clone and Configure**
```bash
git clone https://github.com/yosaad1000/Acadion.git
cd Acadion
cp docker-compose.prod.yml docker-compose.yml
```

2. **Environment Configuration**
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` for production:
```env
# Production Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_production_anon_key
SUPABASE_SERVICE_KEY=your_production_service_key

# Security (Generate strong keys)
SECRET_KEY=your-super-secure-production-key
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com

# AI Services
PINECONE_API_KEY=your_production_pinecone_key
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=acadion-production

# Performance
FACE_THRESHOLD=0.6
MAX_WORKERS=4
```

3. **SSL Configuration**
```bash
# Generate SSL certificates with Let's Encrypt
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com
```

4. **Deploy**
```bash
docker-compose up -d
docker-compose logs -f  # Monitor startup
```

### Production Docker Compose

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/ssl/certs
      - ./nginx.prod.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - ENV=production
    env_file:
      - backend/.env
    ports:
      - "8000:8000"
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

## Cloud Platform Deployment

### AWS Deployment

#### Using AWS ECS (Elastic Container Service)

1. **Create ECS Cluster**
```bash
aws ecs create-cluster --cluster-name attendify-cluster
```

2. **Build and Push Images**
```bash
# Build images
docker build -t attendify-frontend ./frontend
docker build -t attendify-backend ./backend

# Tag for ECR
docker tag attendify-frontend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/attendify-frontend:latest
docker tag attendify-backend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/attendify-backend:latest

# Push to ECR
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/attendify-frontend:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/attendify-backend:latest
```

3. **Create Task Definition**
```json
{
  "family": "acadion-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::123456789:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/acadion-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/acadion",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### Using AWS App Runner (Simpler Option)

1. **Create apprunner.yaml**
```yaml
version: 1.0
runtime: python3
build:
  commands:
    build:
      - pip install -r requirements.txt
run:
  runtime-version: 3.9
  command: uvicorn main:app --host 0.0.0.0 --port 8000
  network:
    port: 8000
    env: PORT
  env:
    - name: ENV
      value: production
```

2. **Deploy via Console or CLI**
```bash
aws apprunner create-service \
  --service-name acadion-backend \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "123456789.dkr.ecr.us-east-1.amazonaws.com/acadion-backend:latest",
      "ImageConfiguration": {
        "Port": "8000"
      },
      "ImageRepositoryType": "ECR"
    },
    "AutoDeploymentsEnabled": true
  }'
```

### Google Cloud Platform

#### Using Cloud Run

1. **Build and Deploy Backend**
```bash
# Build and push to Container Registry
gcloud builds submit --tag gcr.io/your-project/acadion-backend ./backend

# Deploy to Cloud Run
gcloud run deploy acadion-backend \
  --image gcr.io/your-project/acadion-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ENV=production
```

2. **Deploy Frontend to Firebase Hosting**
```bash
# Build frontend
cd frontend
npm run build

# Deploy to Firebase
firebase init hosting
firebase deploy
```

### Microsoft Azure

#### Using Container Instances

1. **Create Resource Group**
```bash
az group create --name acadion-rg --location eastus
```

2. **Deploy Container**
```bash
az container create \
  --resource-group acadion-rg \
  --name acadion-backend \
  --image your-registry/acadion-backend:latest \
  --dns-name-label acadion-api \
  --ports 8000 \
  --environment-variables ENV=production
```

## Kubernetes Deployment

### Kubernetes Manifests

#### Backend Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: acadion-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: acadion-backend
  template:
    metadata:
      labels:
        app: acadion-backend
    spec:
      containers:
      - name: backend
        image: acadion-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: ENV
          value: "production"
        - name: SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: acadion-secrets
              key: supabase-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: acadion-backend-service
spec:
  selector:
    app: acadion-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: LoadBalancer
```

#### Frontend Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: acadion-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: acadion-frontend
  template:
    metadata:
      labels:
        app: acadion-frontend
    spec:
      containers:
      - name: frontend
        image: acadion-frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: acadion-frontend-service
spec:
  selector:
    app: acadion-frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: LoadBalancer
```

#### Ingress Configuration
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: acadion-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - yourdomain.com
    - api.yourdomain.com
    secretName: acadion-tls
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: acadion-frontend-service
            port:
              number: 80
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: acadion-backend-service
            port:
              number: 80
```

## Environment Configuration

### Production Environment Variables

```env
# Application
ENV=production
DEBUG=false
LOG_LEVEL=INFO

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_production_anon_key
SUPABASE_SERVICE_KEY=your_production_service_key

# Security
SECRET_KEY=your-super-secure-production-key-min-32-chars
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
CORS_ALLOW_CREDENTIALS=true

# AI Services
PINECONE_API_KEY=your_production_pinecone_key
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=acadion-production
FACE_THRESHOLD=0.6

# Performance
MAX_WORKERS=4
WORKER_CONNECTIONS=1000
KEEP_ALIVE=2

# Monitoring
SENTRY_DSN=your_sentry_dsn
LOG_FILE=/app/logs/acadion.log
```

## SSL/TLS Configuration

### Nginx SSL Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.com.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.com.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Monitoring and Logging

### Health Checks

```python
# backend/app/routers/health.py
from fastapi import APIRouter
from app.services.supabase_client import supabase

router = APIRouter()

@router.get("/health")
async def health_check():
    try:
        # Check database connection
        result = supabase.table("users").select("count").execute()
        
        return {
            "status": "healthy",
            "database": "connected",
            "version": "2.0.0",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
```

### Logging Configuration

```python
# backend/app/core/logging.py
import logging
import sys
from pathlib import Path

def setup_logging():
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(logging.Formatter(log_format))
    
    # File handler
    log_file = Path("logs/acadion.log")
    log_file.parent.mkdir(exist_ok=True)
    file_handler = logging.FileHandler(log_file)
    file_handler.setFormatter(logging.Formatter(log_format))
    
    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
```

## Performance Optimization

### Database Optimization

1. **Connection Pooling**
```python
# backend/app/core/database.py
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=30,
    pool_pre_ping=True,
    pool_recycle=3600
)
```

2. **Query Optimization**
```sql
-- Add indexes for common queries
CREATE INDEX idx_attendance_subject_date ON attendance(subject_id, date);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_subject_enrollments_user ON subject_enrollments(user_id);
```

### Caching Strategy

```python
# backend/app/services/cache.py
import redis
import json
from typing import Optional, Any

class CacheService:
    def __init__(self):
        self.redis_client = redis.Redis(
            host='redis',
            port=6379,
            decode_responses=True
        )
    
    async def get(self, key: str) -> Optional[Any]:
        value = self.redis_client.get(key)
        return json.loads(value) if value else None
    
    async def set(self, key: str, value: Any, ttl: int = 3600):
        self.redis_client.setex(key, ttl, json.dumps(value))
```

## Backup and Recovery

### Database Backup

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup Supabase (if self-hosted)
pg_dump $DATABASE_URL > $BACKUP_DIR/acadion_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/acadion_$DATE.sql

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: acadion_$DATE.sql.gz"
```

### Automated Backups with Cron

```bash
# Add to crontab
0 2 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1
```

## Security Checklist

- [ ] SSL/TLS certificates configured
- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] API rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers implemented
- [ ] Regular security updates
- [ ] Monitoring and alerting setup
- [ ] Backup and recovery tested
- [ ] Access logs enabled

## Troubleshooting

### Common Issues

**Container won't start:**
```bash
docker-compose logs backend
docker-compose exec backend /bin/bash
```

**Database connection issues:**
```bash
# Test database connection
docker-compose exec backend python -c "from app.services.supabase_client import supabase; print(supabase.table('users').select('*').limit(1).execute())"
```

**SSL certificate issues:**
```bash
# Check certificate validity
openssl x509 -in /path/to/cert.pem -text -noout
```

**Performance issues:**
```bash
# Monitor resource usage
docker stats
htop
```

This deployment guide provides comprehensive instructions for deploying Acadion in various environments, from simple Docker setups to enterprise Kubernetes deployments.