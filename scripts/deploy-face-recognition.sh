#!/bin/bash

# Face Recognition Microservice Deployment Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME=${PROJECT_NAME:-"acadion"}
ENVIRONMENT=${ENVIRONMENT:-"dev"}
AWS_REGION=${AWS_REGION:-"us-east-1"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
FORCE_DEPLOY=${FORCE_DEPLOY:-false}

# Derived variables
ECR_REPOSITORY="${PROJECT_NAME}-face-recognition"
ECS_CLUSTER="${PROJECT_NAME}-face-recognition"
ECS_SERVICE="${PROJECT_NAME}-face-recognition"

echo -e "${GREEN}🚀 Deploying Face Recognition Microservice${NC}"
echo -e "${BLUE}Configuration:${NC}"
echo "  Project: $PROJECT_NAME"
echo "  Environment: $ENVIRONMENT"
echo "  Region: $AWS_REGION"
echo "  Image Tag: $IMAGE_TAG"
echo "  Force Deploy: $FORCE_DEPLOY"
echo ""

# Check prerequisites
echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

# Check Terraform
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed${NC}"
    exit 1
fi

# Verify AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"

echo -e "${BLUE}ECR Repository: ${ECR_URI}${NC}"

# Step 1: Build and push Docker image
echo -e "${YELLOW}🔨 Building and pushing Docker image...${NC}"

# Navigate to face recognition service directory
cd face-recognition-service

# Build the image
echo "Building Docker image..."
docker build -t ${ECR_REPOSITORY}:${IMAGE_TAG} -f Dockerfile .

# Tag for ECR
docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${ECR_URI}:${IMAGE_TAG}
docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${ECR_URI}:latest

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_URI}

# Create ECR repository if it doesn't exist
if ! aws ecr describe-repositories --repository-names ${ECR_REPOSITORY} --region ${AWS_REGION} &> /dev/null; then
    echo "Creating ECR repository..."
    aws ecr create-repository \
        --repository-name ${ECR_REPOSITORY} \
        --region ${AWS_REGION} \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256
fi

# Push image
echo "Pushing image to ECR..."
docker push ${ECR_URI}:${IMAGE_TAG}
docker push ${ECR_URI}:latest

echo -e "${GREEN}✅ Docker image pushed successfully${NC}"

# Go back to root directory
cd ..

# Step 2: Deploy infrastructure with Terraform
echo -e "${YELLOW}🏗️ Deploying infrastructure with Terraform...${NC}"

cd terraform

# Initialize Terraform
terraform init

# Plan deployment
echo "Planning Terraform deployment..."
terraform plan \
    -var="project_name=${PROJECT_NAME}" \
    -var="environment=${ENVIRONMENT}" \
    -var="aws_region=${AWS_REGION}" \
    -var="face_recognition_image_tag=${IMAGE_TAG}" \
    -out=tfplan

# Apply if force deploy or user confirms
if [ "$FORCE_DEPLOY" = "true" ]; then
    echo "Force deploy enabled, applying Terraform plan..."
    terraform apply tfplan
else
    echo -e "${YELLOW}Review the Terraform plan above.${NC}"
    read -p "Do you want to apply these changes? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        terraform apply tfplan
    else
        echo "Deployment cancelled by user"
        exit 0
    fi
fi

echo -e "${GREEN}✅ Infrastructure deployed successfully${NC}"

# Go back to root directory
cd ..

# Step 3: Wait for service to be stable
echo -e "${YELLOW}⏳ Waiting for ECS service to stabilize...${NC}"

aws ecs wait services-stable \
    --cluster ${ECS_CLUSTER} \
    --services ${ECS_SERVICE} \
    --region ${AWS_REGION}

echo -e "${GREEN}✅ ECS service is stable${NC}"

# Step 4: Verify deployment
echo -e "${YELLOW}🔍 Verifying deployment...${NC}"

# Get service status
SERVICE_STATUS=$(aws ecs describe-services \
    --cluster ${ECS_CLUSTER} \
    --services ${ECS_SERVICE} \
    --region ${AWS_REGION} \
    --query 'services[0].status' \
    --output text)

RUNNING_COUNT=$(aws ecs describe-services \
    --cluster ${ECS_CLUSTER} \
    --services ${ECS_SERVICE} \
    --region ${AWS_REGION} \
    --query 'services[0].runningCount' \
    --output text)

DESIRED_COUNT=$(aws ecs describe-services \
    --cluster ${ECS_CLUSTER} \
    --services ${ECS_SERVICE} \
    --region ${AWS_REGION} \
    --query 'services[0].desiredCount' \
    --output text)

echo "Service Status: $SERVICE_STATUS"
echo "Running Tasks: $RUNNING_COUNT"
echo "Desired Tasks: $DESIRED_COUNT"

if [ "$SERVICE_STATUS" = "ACTIVE" ] && [ "$RUNNING_COUNT" = "$DESIRED_COUNT" ]; then
    echo -e "${GREEN}✅ Service is healthy${NC}"
else
    echo -e "${RED}❌ Service is not healthy${NC}"
    exit 1
fi

# Get load balancer DNS name
LB_DNS=$(aws elbv2 describe-load-balancers \
    --names "${PROJECT_NAME}-face-recognition-nlb" \
    --region ${AWS_REGION} \
    --query 'LoadBalancers[0].DNSName' \
    --output text 2>/dev/null || echo "Not found")

# Step 5: Test the service
echo -e "${YELLOW}🧪 Testing the service...${NC}"

if [ "$LB_DNS" != "Not found" ]; then
    SERVICE_URL="http://${LB_DNS}:8001"
    echo "Testing health endpoint: $SERVICE_URL/health"
    
    # Wait a bit for the load balancer to be ready
    sleep 30
    
    if curl -f -s "$SERVICE_URL/health" > /dev/null; then
        echo -e "${GREEN}✅ Health check passed${NC}"
    else
        echo -e "${YELLOW}⚠️ Health check failed (service may still be starting)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Load balancer not found, skipping health check${NC}"
fi

# Step 6: Display deployment information
echo ""
echo -e "${GREEN}🎉 Face Recognition Microservice deployment completed!${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo "  ECR Repository: ${ECR_URI}"
echo "  Image Tag: ${IMAGE_TAG}"
echo "  ECS Cluster: ${ECS_CLUSTER}"
echo "  ECS Service: ${ECS_SERVICE}"
echo "  Service Status: ${SERVICE_STATUS}"
echo "  Running Tasks: ${RUNNING_COUNT}/${DESIRED_COUNT}"

if [ "$LB_DNS" != "Not found" ]; then
    echo "  Service URL: http://${LB_DNS}:8001"
    echo "  Health Check: http://${LB_DNS}:8001/health"
    echo "  API Docs: http://${LB_DNS}:8001/docs"
fi

echo ""
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo "  View service: aws ecs describe-services --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE}"
echo "  View tasks: aws ecs list-tasks --cluster ${ECS_CLUSTER} --service-name ${ECS_SERVICE}"
echo "  View logs: aws logs tail /ecs/${PROJECT_NAME}-face-recognition --follow"
echo "  Scale service: aws ecs update-service --cluster ${ECS_CLUSTER} --service ${ECS_SERVICE} --desired-count N"
echo ""
echo -e "${BLUE}🔍 Monitoring:${NC}"
echo "  CloudWatch Logs: /ecs/${PROJECT_NAME}-face-recognition"
echo "  CloudWatch Metrics: AWS/ECS namespace"
echo "  GPU Metrics: AWS/EC2/GPU namespace"