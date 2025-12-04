#!/bin/bash

# Acadion Microservices Startup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.microservices.yml"
GPU_SUPPORT=${GPU_SUPPORT:-true}
INCLUDE_FRONTEND=${INCLUDE_FRONTEND:-false}
PRODUCTION_MODE=${PRODUCTION_MODE:-false}

echo -e "${GREEN}🚀 Starting Acadion Microservices Architecture${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running${NC}"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Error: docker-compose is not installed${NC}"
    exit 1
fi

# Check for environment file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example .env
        echo -e "${YELLOW}📝 Please edit .env file with your configuration${NC}"
        echo ""
    else
        echo -e "${RED}❌ No .env.example template found${NC}"
        exit 1
    fi
fi

# Build profiles based on configuration
PROFILES=""
if [ "$INCLUDE_FRONTEND" = "true" ]; then
    PROFILES="$PROFILES --profile frontend"
fi

if [ "$PRODUCTION_MODE" = "true" ]; then
    PROFILES="$PROFILES --profile production"
fi

if [ "$GPU_SUPPORT" = "false" ]; then
    PROFILES="$PROFILES --profile cpu-fallback"
fi

echo -e "${BLUE}📋 Configuration:${NC}"
echo "  GPU Support: $GPU_SUPPORT"
echo "  Include Frontend: $INCLUDE_FRONTEND"
echo "  Production Mode: $PRODUCTION_MODE"
echo "  Compose File: $COMPOSE_FILE"
echo ""

# Stop any existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f $COMPOSE_FILE down --remove-orphans

# Build and start services
echo -e "${YELLOW}🔨 Building and starting services...${NC}"
if [ -n "$PROFILES" ]; then
    docker-compose -f $COMPOSE_FILE up --build -d $PROFILES
else
    docker-compose -f $COMPOSE_FILE up --build -d
fi

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Check service health
echo -e "${BLUE}🔍 Checking service health...${NC}"

# Check Redis
if docker-compose -f $COMPOSE_FILE ps redis | grep -q "Up"; then
    echo -e "${GREEN}✅ Redis: Healthy${NC}"
else
    echo -e "${RED}❌ Redis: Unhealthy${NC}"
fi

# Check Backend
if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend: Healthy${NC}"
else
    echo -e "${RED}❌ Backend: Unhealthy${NC}"
fi

# Check Face Recognition Service
if curl -f http://localhost:8001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Face Recognition Service: Healthy${NC}"
else
    echo -e "${RED}❌ Face Recognition Service: Unhealthy${NC}"
    
    # Check CPU fallback if GPU service failed
    if [ "$GPU_SUPPORT" = "false" ] || curl -f http://localhost:8002/health > /dev/null 2>&1; then
        echo -e "${YELLOW}🔄 CPU Fallback Service: Available${NC}"
    fi
fi

# Check Frontend (if enabled)
if [ "$INCLUDE_FRONTEND" = "true" ]; then
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend: Healthy${NC}"
    else
        echo -e "${RED}❌ Frontend: Unhealthy${NC}"
    fi
fi

echo ""
echo -e "${GREEN}🎉 Microservices startup complete!${NC}"
echo ""
echo -e "${BLUE}📡 Service URLs:${NC}"
echo "  Backend API: http://localhost:8000"
echo "  Backend Docs: http://localhost:8000/docs"
echo "  Face Recognition: http://localhost:8001"
echo "  Face Recognition Docs: http://localhost:8001/docs"
echo "  Redis: localhost:6379"

if [ "$INCLUDE_FRONTEND" = "true" ]; then
    echo "  Frontend: http://localhost:3000"
fi

if [ "$PRODUCTION_MODE" = "true" ]; then
    echo "  Load Balancer: http://localhost:80"
fi

echo ""
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo "  View logs: docker-compose -f $COMPOSE_FILE logs -f [service]"
echo "  Stop services: docker-compose -f $COMPOSE_FILE down"
echo "  Restart service: docker-compose -f $COMPOSE_FILE restart [service]"
echo "  Scale service: docker-compose -f $COMPOSE_FILE up -d --scale [service]=N"
echo ""
echo -e "${BLUE}🧪 Test Commands:${NC}"
echo "  Test backend: curl http://localhost:8000/api/health"
echo "  Test face service: curl http://localhost:8001/health"
echo "  Test face recognition: curl -X POST -F 'file=@test.jpg' http://localhost:8001/process-image"