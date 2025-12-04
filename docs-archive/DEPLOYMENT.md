# Attendify Deployment Guide

This guide covers deploying Attendify to a server using DockerHub.

## Prerequisites

- Docker and Docker Compose installed on your local machine and server
- DockerHub account
- Server with Docker installed (Ubuntu/CentOS/etc.)
- Domain name (optional, for HTTPS)

## Step 1: Prepare for Deployment

### 1.1 Set up environment variables

```bash
# Set your DockerHub username
export DOCKER_USERNAME=your-dockerhub-username
export VERSION=v1.0.0  # or latest
```

### 1.2 Create production environment file

```bash
cp .env.production.example .env
# Edit .env with your actual production values
```

## Step 2: Build and Push Images

### Option A: Using the automated script (Linux/Mac)

```bash
chmod +x scripts/build-and-push.sh
./scripts/build-and-push.sh
```

### Option B: Using the automated script (Windows)

```cmd
scripts\build-and-push.bat
```

### Option C: Manual build and push

```bash
# Build images
docker build -f Dockerfile.backend -t $DOCKER_USERNAME/attendify-backend:$VERSION .
docker build -f Dockerfile.frontend -t $DOCKER_USERNAME/attendify-frontend:$VERSION .

# Login to DockerHub
docker login

# Push images
docker push $DOCKER_USERNAME/attendify-backend:$VERSION
docker push $DOCKER_USERNAME/attendify-frontend:$VERSION
```

## Step 3: Deploy to Server

### 3.1 Copy files to server

```bash
# Copy deployment files to your server
scp docker-compose.deploy.yml user@your-server:/path/to/deployment/
scp .env user@your-server:/path/to/deployment/
scp scripts/deploy-server.sh user@your-server:/path/to/deployment/
```

### 3.2 Deploy on server

```bash
# SSH into your server
ssh user@your-server

# Navigate to deployment directory
cd /path/to/deployment/

# Set environment variables
export DOCKER_USERNAME=your-dockerhub-username
export VERSION=v1.0.0

# Run deployment script
chmod +x deploy-server.sh
./deploy-server.sh
```

### 3.3 Manual deployment (alternative)

```bash
# Pull and start services
docker-compose -f docker-compose.deploy.yml pull
docker-compose -f docker-compose.deploy.yml up -d

# Check status
docker-compose -f docker-compose.deploy.yml ps
```

## Step 4: Verify Deployment

### 4.1 Check service health

```bash
# Check container status
docker-compose -f docker-compose.deploy.yml ps

# Check logs
docker-compose -f docker-compose.deploy.yml logs

# Test endpoints
curl http://your-server-ip:8000/api/health
curl http://your-server-ip/
```

### 4.2 Access your application

- **Frontend**: http://your-server-ip
- **Backend API**: http://your-server-ip:8000
- **API Documentation**: http://your-server-ip:8000/docs

## Step 5: Production Considerations

### 5.1 Set up reverse proxy (recommended)

Install Nginx or Traefik to handle:
- SSL termination
- Load balancing
- Static file serving

### 5.2 Configure SSL/HTTPS

```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 5.3 Set up monitoring

Consider adding:
- Health checks
- Log aggregation
- Performance monitoring
- Backup strategies

## Updating the Application

### 5.1 Build new version

```bash
export VERSION=v1.1.0
./scripts/build-and-push.sh
```

### 5.2 Deploy update

```bash
# On server
export VERSION=v1.1.0
docker-compose -f docker-compose.deploy.yml pull
docker-compose -f docker-compose.deploy.yml up -d
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 80, 443, 8000 are available
2. **Environment variables**: Check .env file has all required values
3. **Docker permissions**: Ensure user has Docker permissions
4. **Network issues**: Check firewall settings

### Useful Commands

```bash
# View logs
docker-compose -f docker-compose.deploy.yml logs -f

# Restart services
docker-compose -f docker-compose.deploy.yml restart

# Scale services
docker-compose -f docker-compose.deploy.yml up -d --scale backend=2

# Clean up
docker-compose -f docker-compose.deploy.yml down
docker system prune -a
```

## Security Checklist

- [ ] Use strong passwords for Redis and JWT secrets
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Configure firewall to only allow necessary ports
- [ ] Regularly update Docker images
- [ ] Use non-root users in containers
- [ ] Enable Docker security scanning
- [ ] Set up log monitoring and alerting

## Support

For issues and questions:
1. Check the logs: `docker-compose logs`
2. Verify environment variables
3. Check network connectivity
4. Review the troubleshooting section above