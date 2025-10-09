#!/bin/bash

# Server Deployment Script for Attendify
set -e

# Configuration
DOCKER_USERNAME=${DOCKER_USERNAME:-"justs44d"}
VERSION=${VERSION:-"latest"}
ENV_FILE=${ENV_FILE:-".env"}

echo "🚀 Deploying Attendify to server..."

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file $ENV_FILE not found!"
    echo "Please create it with your production environment variables."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install docker-compose."
    exit 1
fi

# Pull latest images
echo "📥 Pulling latest images from DockerHub..."
export DOCKER_USERNAME=$DOCKER_USERNAME
export VERSION=$VERSION

docker-compose -f docker-compose.deploy.yml pull

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.deploy.yml down

# Start new containers
echo "🚀 Starting new containers..."
docker-compose -f docker-compose.deploy.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
docker-compose -f docker-compose.deploy.yml ps

# Show logs
echo "📋 Recent logs:"
docker-compose -f docker-compose.deploy.yml logs --tail=20

echo "✅ Deployment completed!"
echo ""
echo "🌐 Your application should be available at:"
echo "Frontend: http://your-server-ip"
echo "Backend API: http://your-server-ip:8000"
echo "API Docs: http://your-server-ip:8000/docs"