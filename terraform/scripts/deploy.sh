#!/bin/bash

# Terraform deployment script for Acadion AWS infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [ENVIRONMENT] [ACTION]"
    echo ""
    echo "ENVIRONMENT:"
    echo "  dev       - Development environment"
    echo "  staging   - Staging environment"
    echo "  prod      - Production environment"
    echo ""
    echo "ACTION:"
    echo "  plan      - Show what will be created/changed"
    echo "  apply     - Apply the infrastructure changes"
    echo "  destroy   - Destroy the infrastructure (use with caution)"
    echo "  output    - Show terraform outputs"
    echo ""
    echo "Examples:"
    echo "  $0 dev plan"
    echo "  $0 staging apply"
    echo "  $0 prod output"
}

# Check if correct number of arguments provided
if [ $# -ne 2 ]; then
    show_usage
    exit 1
fi

ENVIRONMENT=$1
ACTION=$2

# Validate environment
case $ENVIRONMENT in
    dev|staging|prod)
        ;;
    *)
        print_error "Invalid environment: $ENVIRONMENT"
        show_usage
        exit 1
        ;;
esac

# Validate action
case $ACTION in
    plan|apply|destroy|output)
        ;;
    *)
        print_error "Invalid action: $ACTION"
        show_usage
        exit 1
        ;;
esac

# Set variables
TFVARS_FILE="environments/${ENVIRONMENT}.tfvars"
TERRAFORM_DIR="$(dirname "$0")/.."

# Change to terraform directory
cd "$TERRAFORM_DIR"

# Check if tfvars file exists
if [ ! -f "$TFVARS_FILE" ]; then
    print_error "Environment file not found: $TFVARS_FILE"
    exit 1
fi

print_status "Using environment: $ENVIRONMENT"
print_status "Action: $ACTION"

# Initialize Terraform if not already done
if [ ! -d ".terraform" ]; then
    print_status "Initializing Terraform..."
    terraform init
fi

# Execute the requested action
case $ACTION in
    plan)
        print_status "Planning infrastructure changes..."
        terraform plan -var-file="$TFVARS_FILE"
        ;;
    apply)
        print_status "Applying infrastructure changes..."
        if [ "$ENVIRONMENT" = "prod" ]; then
            print_warning "You are about to deploy to PRODUCTION!"
            read -p "Are you sure you want to continue? (yes/no): " confirm
            if [ "$confirm" != "yes" ]; then
                print_status "Deployment cancelled."
                exit 0
            fi
        fi
        terraform apply -var-file="$TFVARS_FILE"
        
        if [ $? -eq 0 ]; then
            print_status "Deployment completed successfully!"
            print_status "Don't forget to configure Parameter Store with your secrets."
            echo ""
            print_status "Next steps:"
            echo "1. Configure Parameter Store parameters"
            echo "2. Set up GitHub Actions with the IAM role"
            echo "3. Push container images to ECR"
            echo "4. Configure DNS (optional)"
        fi
        ;;
    destroy)
        print_warning "You are about to DESTROY infrastructure for $ENVIRONMENT!"
        print_warning "This action cannot be undone!"
        read -p "Type 'destroy' to confirm: " confirm
        if [ "$confirm" != "destroy" ]; then
            print_status "Destruction cancelled."
            exit 0
        fi
        terraform destroy -var-file="$TFVARS_FILE"
        ;;
    output)
        print_status "Showing terraform outputs..."
        terraform output
        ;;
esac