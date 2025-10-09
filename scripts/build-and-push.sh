#!/bin/bash

# Build and Push Script for Attendify
set -e

# Configuration
DOCKER_USERNAME=${DOCKER_USERNAME:-"justs44d"}
VERSION=${VERSION:-"latest"}
BACKEND_IMAGE="$DOCKER_USERNAME/attendify-backend:$VERSION"
FRONTEND_IMAGE="$DOCKER_USERNAME/attendify-frontend:$VERSION"

echo "🚀 Building and pushing Attendify Docker images..."
echo "Backend Image: $BACKEND_IMAGE"
echo "Frontend Image: $FRONTEND_IMAGE"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Login to DockerHub
echo "🔐 Logging into DockerHub..."
docker login

# Build backend image
echo "🏗️ Building backend image..."
docker build -f Dockerfile.backend -t $BACKEND_IMAGE .

# Build frontend image
echo "🏗️ Building frontend image..."
docker build -f Dockerfile.frontend -t $FRONTEND_IMAGE .

# Push images to DockerHub
echo "📤 Pushing backend image to DockerHub..."
docker push $BACKEND_IMAGE

echo "📤 Pushing frontend image to DockerHub..."
docker push $FRONTEND_IMAGE

# Tag as latest if version is not latest
if [ "$VERSION" != "latest" ]; then
    echo "🏷️ Tagging images as latest..."
    docker tag $BACKEND_IMAGE $DOCKER_USERNAME/attendify-backend:latest
    docker tag $FRONTEND_IMAGE $DOCKER_USERNAME/attendify-frontend:latest
    
    docker push $DOCKER_USERNAME/attendify-backend:latest
    docker push $DOCKER_USERNAME/attendify-frontend:latest
fi

echo "✅ Successfully built and pushed all images!"
echo ""
echo "📋 Deployment Commands:"
echo "export DOCKER_USERNAME=$DOCKER_USERNAME"
echo "export VERSION=$VERSION"
echo "docker-compose -f docker-compose.deploy.yml up -d"