# 🚀 Deploy Attendify to attendify.nitgoa.ac.in

Complete guide to deploy your Attendify application to the Ubuntu server.

## 📋 Prerequisites

- SSH access to `ubuntu@attendify.nitgoa.ac.in`
- Docker images already pushed to DockerHub (`justs44d/attendify-backend` & `justs44d/attendify-frontend`)
- Domain `attendify.nitgoa.ac.in` pointing to your server IP

## 🎯 Quick Deployment (Automated)

### Step 1: Deploy from your local machine

```bash
# Make deployment script executable
chmod +x deploy-to-server.sh

# Deploy to server
./deploy-to-server.sh
```

This script will:
- Copy deployment files to the server
- Pull Docker images from DockerHub
- Start all services
- Configure health checks

## 🔧 Manual Deployment (Step by Step)

### Step 1: Prepare the server

```bash
# SSH into the server
ssh ubuntu@attendify.nitgoa.ac.in

# Run server setup (first time only)
curl -sSL https://raw.githubusercontent.com/your-repo/server-setup.sh | bash
# OR copy and run server-setup.sh manually
```

### Step 2: Copy deployment files

```bash
# From your local machine
scp docker-compose.deploy.yml ubuntu@attendify.nitgoa.ac.in:/home/ubuntu/attendify/
scp .env ubuntu@attendify.nitgoa.ac.in:/home/ubuntu/attendify/
scp scripts/deploy-server.sh ubuntu@attendify.nitgoa.ac.in:/home/ubuntu/attendify/
```

### Step 3: Configure environment

```bash
# SSH into server
ssh ubuntu@attendify.nitgoa.ac.in

# Navigate to deployment directory
cd /home/ubuntu/attendify

# Edit environment variables
nano .env
```

**Important**: Update these values in `.env`:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_KEY` - Your Supabase service key
- `SECRET_KEY` - Strong JWT secret (32+ characters)
- `REDIS_PASSWORD` - Strong Redis password
- `PINECONE_API_KEY` - Your Pinecone API key

### Step 4: Deploy the application

```bash
# Make script executable
chmod +x deploy-server.sh

# Set environment variables
export DOCKER_USERNAME=justs44d
export VERSION=latest

# Run deployment
./deploy-server.sh
```

## 🌐 Set Up Domain & SSL (Optional but Recommended)

### Step 1: Install and configure Nginx

```bash
# On the server
sudo apt update
sudo apt install -y nginx

# Copy Nginx configuration
sudo cp nginx-config.conf /etc/nginx/sites-available/attendify
sudo ln -s /etc/nginx/sites-available/attendify /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Step 2: Set up SSL with Let's Encrypt

```bash
# Run SSL setup script
chmod +x ssl-setup.sh
./ssl-setup.sh
```

## 📊 Verify Deployment

### Check service status

```bash
# Check Docker containers
docker-compose -f docker-compose.deploy.yml ps

# Check logs
docker-compose -f docker-compose.deploy.yml logs -f

# Check individual service logs
docker-compose -f docker-compose.deploy.yml logs backend
docker-compose -f docker-compose.deploy.yml logs frontend
docker-compose -f docker-compose.deploy.yml logs redis
```

### Test endpoints

```bash
# Health check
curl http://attendify.nitgoa.ac.in:8000/api/health

# Frontend
curl http://attendify.nitgoa.ac.in/

# API documentation
curl http://attendify.nitgoa.ac.in:8000/docs
```

## 🌐 Access Your Application

After successful deployment:

- **Frontend**: http://attendify.nitgoa.ac.in (or https:// if SSL is configured)
- **Backend API**: http://attendify.nitgoa.ac.in:8000
- **API Documentation**: http://attendify.nitgoa.ac.in:8000/docs
- **Health Check**: http://attendify.nitgoa.ac.in:8000/api/health

## 🔧 Management Commands

### Update application

```bash
# Pull latest images
docker-compose -f docker-compose.deploy.yml pull

# Restart with new images
docker-compose -f docker-compose.deploy.yml up -d
```

### View logs

```bash
# All services
docker-compose -f docker-compose.deploy.yml logs -f

# Specific service
docker-compose -f docker-compose.deploy.yml logs -f backend
```

### Restart services

```bash
# Restart all
docker-compose -f docker-compose.deploy.yml restart

# Restart specific service
docker-compose -f docker-compose.deploy.yml restart backend
```

### Stop services

```bash
docker-compose -f docker-compose.deploy.yml down
```

## 🛠️ Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   sudo netstat -tlnp | grep :80
   sudo netstat -tlnp | grep :8000
   ```

2. **Docker permissions**
   ```bash
   sudo usermod -aG docker ubuntu
   # Log out and back in
   ```

3. **Firewall issues**
   ```bash
   sudo ufw status
   sudo ufw allow 80/tcp
   sudo ufw allow 8000/tcp
   ```

4. **Environment variables**
   ```bash
   # Check if .env is properly loaded
   docker-compose -f docker-compose.deploy.yml config
   ```

### View system resources

```bash
# Memory usage
free -h

# Disk usage
df -h

# Docker system info
docker system df
docker system prune -a  # Clean up unused images
```

## 🔒 Security Checklist

- [ ] Strong passwords in `.env` file
- [ ] Firewall configured (ports 22, 80, 443, 8000)
- [ ] SSL certificate installed
- [ ] Regular security updates enabled
- [ ] Docker images regularly updated
- [ ] Log monitoring configured
- [ ] Backup strategy implemented

## 📞 Support

If you encounter issues:

1. **Check logs**: `docker-compose logs -f`
2. **Verify environment**: Check `.env` file values
3. **Test connectivity**: `curl` commands above
4. **Check resources**: `free -h` and `df -h`
5. **Restart services**: `docker-compose restart`

Your Attendify application should now be running successfully on `attendify.nitgoa.ac.in`! 🎉