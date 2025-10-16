#!/bin/bash

# CloudFront Cache Invalidation Script for Deployments
# Usage: ./invalidate-cache.sh <distribution-id> [paths]

set -e

DISTRIBUTION_ID=$1
PATHS=${2:-"/*"}

if [ -z "$DISTRIBUTION_ID" ]; then
    echo "Error: Distribution ID is required"
    echo "Usage: $0 <distribution-id> [paths]"
    exit 1
fi

echo "Creating CloudFront invalidation for distribution: $DISTRIBUTION_ID"
echo "Paths: $PATHS"

# Create invalidation
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "$PATHS" \
    --query 'Invalidation.Id' \
    --output text)

echo "Invalidation created with ID: $INVALIDATION_ID"

# Wait for invalidation to complete (optional)
if [ "$3" = "--wait" ]; then
    echo "Waiting for invalidation to complete..."
    aws cloudfront wait invalidation-completed \
        --distribution-id "$DISTRIBUTION_ID" \
        --id "$INVALIDATION_ID"
    echo "Invalidation completed successfully"
fi

echo "Cache invalidation initiated successfully"