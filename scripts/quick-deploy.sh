#!/bin/bash

# Quick deployment script for development/testing
set -e

echo "🚀 Quick Deploy - Attendify"
echo "This script will build and deploy locally for testing"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env from example..."
    cp .env.production.example .env
    echo "⚠️  Please edit .env with your actual values before running again"
    exit 1
fi

# Set default values
export DOCKER_USERNAME=${DOCKER_USERNAME:-"justs44d"}
export VERSION=${VERSION:-"latest"}

echo "Building with:"
echo "  Username: $DOCKER_USERNAME"
echo "  Version: $VERSION"

# Build images locally
echo "🏗️ Building images..."
docker build -f Dockerfile.backend -t $DOCKER_USERNAME/attendify-backend:$VERSION .
docker build -f Dockerfile.frontend -t $DOCKER_USERNAME/attendify-frontend:$VERSION .

# Deploy locally
echo "🚀 Starting services..."
docker-compose -f docker-compose.deploy.yml up -d

echo "⏳ Waiting for services to start..."
sleep 15

# Check status
echo "📊 Service status:"
docker-compose -f docker-compose.deploy.yml ps

echo ""
echo "✅ Quick deployment completed!"
echo "🌐 Access your application:"
echo "  Frontend: http://localhost"
echo "  Backend: http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "📋 Useful commands:"
echo "  View logs: docker-compose -f docker-compose.deploy.yml logs -f"
echo "  Stop: docker-compose -f docker-compose.deploy.yml down"