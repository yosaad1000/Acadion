#!/bin/bash
# AWS Free Tier Infrastructure Deployment Script for Acadion

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if terraform is installed
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform is not installed. Please install Terraform >= 1.0"
        exit 1
    fi
    
    # Check terraform version
    TERRAFORM_VERSION=$(terraform version -json | jq -r '.terraform_version')
    print_status "Terraform version: $TERRAFORM_VERSION"
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install AWS CLI"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Please run 'aws configure'"
        exit 1
    fi
    
    AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION=$(aws configure get region)
    print_status "AWS Account: $AWS_ACCOUNT"
    print_status "AWS Region: $AWS_REGION"
    
    print_success "Prerequisites check passed"
}

# Function to setup terraform variables
setup_variables() {
    print_status "Setting up Terraform variables..."
    
    if [ ! -f "terraform.tfvars" ]; then
        if [ -f "terraform.tfvars.example" ]; then
            cp terraform.tfvars.example terraform.tfvars
            print_warning "Created terraform.tfvars from example. Please edit it with your values."
            print_warning "Required variables: supabase_url, supabase_service_key, pinecone_api_key, jwt_secret_key"
            
            read -p "Press Enter after editing terraform.tfvars to continue..."
        else
            print_error "terraform.tfvars.example not found. Please create terraform.tfvars manually."
            exit 1
        fi
    else
        print_status "terraform.tfvars already exists"
    fi
}

# Function to validate terraform configuration
validate_terraform() {
    print_status "Validating Terraform configuration..."
    
    terraform fmt -check=true -diff=true
    terraform validate
    
    print_success "Terraform configuration is valid"
}

# Function to plan deployment
plan_deployment() {
    print_status "Planning Terraform deployment..."
    
    terraform plan -out=tfplan
    
    print_warning "Please review the plan above carefully."
    print_warning "This will create AWS resources that may incur costs."
    
    read -p "Do you want to proceed with deployment? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_status "Deployment cancelled"
        exit 0
    fi
}

# Function to apply deployment
apply_deployment() {
    print_status "Applying Terraform deployment..."
    
    terraform apply tfplan
    
    print_success "Infrastructure deployment completed!"
}

# Function to show outputs
show_outputs() {
    print_status "Deployment outputs:"
    terraform output
    
    print_status "Important next steps:"
    echo "1. Configure your CI/CD pipeline with the ECR repository URL"
    echo "2. Update your application configuration with the EC2 public IP"
    echo "3. Set up monitoring alerts using the CloudWatch dashboard"
    echo "4. Test the deployment by accessing the health check endpoint"
    
    EC2_IP=$(terraform output -raw ec2_public_ip)
    print_status "Health check URL: http://$EC2_IP:8000/health"
}

# Function to estimate costs
estimate_costs() {
    print_status "AWS Free Tier Resource Summary:"
    echo "┌─────────────────┬──────────────────┬─────────────────────┐"
    echo "│ Service         │ Free Tier Limit  │ Estimated Usage     │"
    echo "├─────────────────┼──────────────────┼─────────────────────┤"
    echo "│ EC2 t2.micro    │ 750 hours/month  │ 744 hours (24/7)    │"
    echo "│ EBS Storage     │ 30GB             │ 30GB                │"
    echo "│ Lambda          │ 1M requests      │ Variable            │"
    echo "│ S3 Storage      │ 5GB              │ <1GB                │"
    echo "│ Data Transfer   │ 15GB/month       │ Variable            │"
    echo "│ ECR Storage     │ 500MB            │ <200MB              │"
    echo "└─────────────────┴──────────────────┴─────────────────────┘"
    echo ""
    print_warning "Estimated monthly cost: \$0-10 (first 12 months)"
    print_warning "After free tier: \$13-18/month"
}

# Main deployment function
main() {
    echo "=========================================="
    echo "  Acadion AWS Free Tier Deployment"
    echo "=========================================="
    echo ""
    
    # Parse command line arguments
    case "${1:-deploy}" in
        "check")
            check_prerequisites
            ;;
        "plan")
            check_prerequisites
            setup_variables
            terraform init
            validate_terraform
            plan_deployment
            ;;
        "deploy")
            check_prerequisites
            setup_variables
            terraform init
            validate_terraform
            plan_deployment
            apply_deployment
            show_outputs
            ;;
        "destroy")
            print_warning "This will destroy all infrastructure and data!"
            read -p "Are you sure you want to destroy everything? (yes/no): " confirm
            if [ "$confirm" = "yes" ]; then
                terraform destroy
                print_success "Infrastructure destroyed"
            else
                print_status "Destroy cancelled"
            fi
            ;;
        "status")
            terraform show
            ;;
        "outputs")
            show_outputs
            ;;
        "costs")
            estimate_costs
            ;;
        *)
            echo "Usage: $0 [check|plan|deploy|destroy|status|outputs|costs]"
            echo ""
            echo "Commands:"
            echo "  check   - Check prerequisites only"
            echo "  plan    - Plan deployment without applying"
            echo "  deploy  - Full deployment (default)"
            echo "  destroy - Destroy all infrastructure"
            echo "  status  - Show current infrastructure state"
            echo "  outputs - Show deployment outputs"
            echo "  costs   - Show cost estimates"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"