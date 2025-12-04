#!/bin/bash

# Deploy Attendify to attendify.nitgoa.ac.in
set -e

SERVER="ubuntu@attendify.nitgoa.ac.in"
DEPLOY_DIR="/home/ubuntu/attendify"
DOCKER_USERNAME="justs44d"
VERSION="latest"

echo "🚀 Deploying Attendify to $SERVER"

# Check if we can connect to the server
echo "🔍 Testing server connection..."
if ! ssh -o ConnectTimeout=10 $SERVER "echo 'Connection successful'"; then
    echo "❌ Cannot connect to server. Please check:"
    echo "  - SSH key is configured"
    echo "  - Server is accessible"
    echo "  - Username and hostname are correct"
    exit 1
fi

# Create deployment directory on server
echo "📁 Creating deployment directory..."
ssh $SERVER "mkdir -p $DEPLOY_DIR"

# Copy deployment files to server
echo "📤 Copying deployment files..."
scp docker-compose.deploy.yml $SERVER:$DEPLOY_DIR/
scp .env $SERVER:$DEPLOY_DIR/
scp scripts/deploy-server.sh $SERVER:$DEPLOY_DIR/

# Make deploy script executable
ssh $SERVER "chmod +x $DEPLOY_DIR/deploy-server.sh"

# Deploy on server
echo "🚀 Starting deployment on server..."
ssh $SERVER "cd $DEPLOY_DIR && export DOCKER_USERNAME=$DOCKER_USERNAME && export VERSION=$VERSION && ./deploy-server.sh"

echo "✅ Deployment completed!"
echo ""
echo "🌐 Your application should be available at:"
echo "  Frontend: http://attendify.nitgoa.ac.in"
echo "  Backend API: http://attendify.nitgoa.ac.in:8000"
echo "  API Docs: http://attendify.nitgoa.ac.in:8000/docs"
echo ""
echo "📋 To check status:"
echo "  ssh $SERVER 'cd $DEPLOY_DIR && docker-compose -f docker-compose.deploy.yml ps'"
echo ""
echo "📋 To view logs:"
echo "  ssh $SERVER 'cd $DEPLOY_DIR && docker-compose -f docker-compose.deploy.yml logs -f'"