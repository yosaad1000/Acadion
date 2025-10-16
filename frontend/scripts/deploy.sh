#!/bin/bash

# Vercel Deployment Script for Acadion Frontend
# Usage: ./scripts/deploy.sh [environment]
# Environment: development, staging, production (default: staging)

set -e

ENVIRONMENT=${1:-staging}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 Deploying Acadion Frontend to Vercel"
echo "📁 Frontend directory: $FRONTEND_DIR"
echo "🌍 Environment: $ENVIRONMENT"

# Change to frontend directory
cd "$FRONTEND_DIR"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel@latest
fi

# Check if required environment variables are set
if [ -z "$VERCEL_TOKEN" ]; then
    echo "⚠️  VERCEL_TOKEN not set. Please set it as an environment variable."
    echo "   You can get your token from: https://vercel.com/account/tokens"
    exit 1
fi

# Load environment-specific variables
if [ -f ".env.$ENVIRONMENT" ]; then
    echo "📋 Loading environment variables from .env.$ENVIRONMENT"
    export $(cat ".env.$ENVIRONMENT" | grep -v '^#' | xargs)
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run tests
echo "🧪 Running tests..."
npm run test

# Type check
echo "🔍 Running type check..."
npm run type-check

# Build the application
echo "🔨 Building application..."
if [ "$ENVIRONMENT" = "production" ]; then
    npm run build:production
else
    npm run build
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
if [ "$ENVIRONMENT" = "production" ]; then
    vercel --prod --token "$VERCEL_TOKEN"
else
    vercel --token "$VERCEL_TOKEN"
fi

echo "✅ Deployment completed successfully!"
echo "🌐 Check your Vercel dashboard for the deployment URL"