#!/bin/bash

# Setup script for Student Management Platform

echo "🚀 Setting up Student Management Platform..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating environment file..."
    cp backend/.env.example backend/.env
    echo "✅ Environment file created. Please edit backend/.env with your configuration."
fi

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Services are running!"
    echo ""
    echo "🌐 Access the application:"
    echo "   Web App: http://localhost:3000"
    echo "   API Docs: http://localhost:8000/docs"
    echo ""
    echo "📱 For mobile development:"
    echo "   cd mobile && npm install && npx expo start"
else
    echo "❌ Some services failed to start. Check logs with: docker-compose logs"
fi