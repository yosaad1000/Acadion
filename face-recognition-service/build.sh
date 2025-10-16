#!/bin/bash

# Face Recognition Microservice Build Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="acadion/face-recognition"
VERSION=${1:-latest}
BUILD_GPU=${BUILD_GPU:-true}
BUILD_CPU=${BUILD_CPU:-true}

echo -e "${GREEN}Building Face Recognition Microservice Docker Images${NC}"
echo "Version: $VERSION"
echo "GPU Build: $BUILD_GPU"
echo "CPU Build: $BUILD_CPU"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Build GPU-optimized image
if [ "$BUILD_GPU" = "true" ]; then
    echo -e "${YELLOW}Building GPU-optimized image...${NC}"
    docker build \
        --file Dockerfile \
        --tag ${IMAGE_NAME}:${VERSION}-gpu \
        --tag ${IMAGE_NAME}:latest-gpu \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        .
    
    echo -e "${GREEN}✅ GPU image built successfully${NC}"
    echo "Image: ${IMAGE_NAME}:${VERSION}-gpu"
    echo ""
fi

# Build CPU-only image
if [ "$BUILD_CPU" = "true" ]; then
    echo -e "${YELLOW}Building CPU-only image...${NC}"
    docker build \
        --file Dockerfile.cpu \
        --tag ${IMAGE_NAME}:${VERSION}-cpu \
        --tag ${IMAGE_NAME}:latest-cpu \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        .
    
    echo -e "${GREEN}✅ CPU image built successfully${NC}"
    echo "Image: ${IMAGE_NAME}:${VERSION}-cpu"
    echo ""
fi

# Create multi-arch manifest (optional)
if [ "$BUILD_GPU" = "true" ] && [ "$BUILD_CPU" = "true" ]; then
    echo -e "${YELLOW}Creating multi-arch manifest...${NC}"
    
    # Tag the GPU version as the default
    docker tag ${IMAGE_NAME}:${VERSION}-gpu ${IMAGE_NAME}:${VERSION}
    docker tag ${IMAGE_NAME}:${VERSION}-gpu ${IMAGE_NAME}:latest
    
    echo -e "${GREEN}✅ Multi-arch manifest created${NC}"
    echo "Default image (GPU): ${IMAGE_NAME}:${VERSION}"
fi

echo -e "${GREEN}Build completed successfully!${NC}"
echo ""
echo "Available images:"
docker images | grep ${IMAGE_NAME} | head -10

echo ""
echo "To run the service:"
echo "  GPU version: docker run -p 8001:8001 --gpus all ${IMAGE_NAME}:${VERSION}-gpu"
echo "  CPU version: docker run -p 8001:8001 ${IMAGE_NAME}:${VERSION}-cpu"
echo ""
echo "To push to registry:"
echo "  docker push ${IMAGE_NAME}:${VERSION}-gpu"
echo "  docker push ${IMAGE_NAME}:${VERSION}-cpu"