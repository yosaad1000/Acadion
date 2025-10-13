#!/bin/bash

# Terraform Workspace Manager for Acadion AWS Deployment
# This script helps manage Terraform workspaces for different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
TERRAFORM_ROOT="$PROJECT_ROOT/terraform"

# Functions
print_info() {
    echo -e "${CYAN}$1${NC}"
}

print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

print_error() {
    echo -e "${RED}$1${NC}"
}

show_usage() {
    echo "Usage: $0 <environment> <action> [options]"
    echo ""
    echo "Environments:"
    echo "  dev      - Development environment"
    echo "  staging  - Staging environment"
    echo "  prod     - Production environment"
    echo ""
    echo "Actions:"
    echo "  init     - Initialize Terraform"
    echo "  plan     - Plan Terraform changes"
    echo "  apply    - Apply Terraform changes"
    echo "  destroy  - Destroy Terraform resources"
    echo "  output   - Show Terraform outputs"
    echo "  switch   - Switch to environment directory"
    echo ""
    echo "Options:"
    echo "  --auto-approve  - Auto-approve apply/destroy operations"
    echo "  --verbose       - Enable verbose output"
    echo ""
    echo "Examples:"
    echo "  $0 dev init"
    echo "  $0 staging plan"
    echo "  $0 prod apply --auto-approve"
    echo "  $0 dev destroy"
}

check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check if Terraform is installed
    if command -v terraform >/dev/null 2>&1; then
        TERRAFORM_VERSION=$(terraform version | head -n1)
        print_success "✓ Terraform found: $TERRAFORM_VERSION"
    else
        print_error "✗ Terraform not found. Please install Terraform."
        exit 1
    fi
    
    # Check if AWS CLI is configured
    if command -v aws >/dev/null 2>&1; then
        if aws sts get-caller-identity >/dev/null 2>&1; then
            AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
            print_success "✓ AWS CLI configured for account: $AWS_ACCOUNT"
        else
            print_warning "⚠ AWS CLI not configured. Make sure you have valid AWS credentials."
        fi
    else
        print_warning "⚠ AWS CLI not found. Install AWS CLI for better integration."
    fi
    
    # Check if environment directory exists
    if [ ! -d "$ENVIRONMENT_PATH" ]; then
        print_error "✗ Environment directory not found: $ENVIRONMENT_PATH"
        exit 1
    fi
    
    print_success "✓ Prerequisites check completed"
}

init_environment() {
    print_info "Initializing $ENVIRONMENT environment..."
    
    cd "$ENVIRONMENT_PATH"
    
    INIT_ARGS="init"
    if [ "$VERBOSE" = "true" ]; then
        INIT_ARGS="$INIT_ARGS -verbose"
    fi
    
    print_info "Running: terraform $INIT_ARGS"
    terraform $INIT_ARGS
    
    print_success "✓ Terraform initialization completed successfully"
}

plan_environment() {
    print_info "Planning $ENVIRONMENT environment..."
    
    cd "$ENVIRONMENT_PATH"
    
    PLAN_ARGS="plan"
    if [ "$VERBOSE" = "true" ]; then
        PLAN_ARGS="$PLAN_ARGS -verbose"
    fi
    
    print_info "Running: terraform $PLAN_ARGS"
    terraform $PLAN_ARGS
    
    print_success "✓ Terraform plan completed successfully"
}

apply_environment() {
    print_info "Applying $ENVIRONMENT environment..."
    
    cd "$ENVIRONMENT_PATH"
    
    APPLY_ARGS="apply"
    if [ "$AUTO_APPROVE" = "true" ]; then
        APPLY_ARGS="$APPLY_ARGS -auto-approve"
    fi
    if [ "$VERBOSE" = "true" ]; then
        APPLY_ARGS="$APPLY_ARGS -verbose"
    fi
    
    if [ "$AUTO_APPROVE" != "true" ]; then
        print_warning "⚠ This will create/modify AWS resources in the $ENVIRONMENT environment."
        read -p "Do you want to continue? (yes/no): " confirmation
        if [ "$confirmation" != "yes" ]; then
            print_info "Operation cancelled by user"
            exit 0
        fi
    fi
    
    print_info "Running: terraform $APPLY_ARGS"
    terraform $APPLY_ARGS
    
    print_success "✓ Terraform apply completed successfully"
    print_success "Environment $ENVIRONMENT is now deployed!"
}

destroy_environment() {
    print_warning "Destroying $ENVIRONMENT environment..."
    
    cd "$ENVIRONMENT_PATH"
    
    print_error "⚠ WARNING: This will DESTROY all resources in the $ENVIRONMENT environment!"
    print_error "This action cannot be undone!"
    
    read -p "Type 'destroy-$ENVIRONMENT' to confirm destruction: " confirmation
    if [ "$confirmation" != "destroy-$ENVIRONMENT" ]; then
        print_info "Operation cancelled - confirmation text did not match"
        exit 0
    fi
    
    DESTROY_ARGS="destroy"
    if [ "$AUTO_APPROVE" = "true" ]; then
        DESTROY_ARGS="$DESTROY_ARGS -auto-approve"
    fi
    if [ "$VERBOSE" = "true" ]; then
        DESTROY_ARGS="$DESTROY_ARGS -verbose"
    fi
    
    print_info "Running: terraform $DESTROY_ARGS"
    terraform $DESTROY_ARGS
    
    print_success "✓ Environment $ENVIRONMENT destroyed successfully"
}

show_output() {
    print_info "Showing outputs for $ENVIRONMENT environment..."
    
    cd "$ENVIRONMENT_PATH"
    
    print_info "Running: terraform output"
    terraform output
    
    print_success "✓ Outputs displayed successfully"
}

switch_environment() {
    print_info "Switching to $ENVIRONMENT environment..."
    print_info "Environment path: $ENVIRONMENT_PATH"
    print_success "Use this path for Terraform operations in the $ENVIRONMENT environment"
}

# Parse arguments
if [ $# -lt 2 ]; then
    show_usage
    exit 1
fi

ENVIRONMENT=$1
ACTION=$2
AUTO_APPROVE=false
VERBOSE=false

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
    init|plan|apply|destroy|output|switch)
        ;;
    *)
        print_error "Invalid action: $ACTION"
        show_usage
        exit 1
        ;;
esac

# Parse options
shift 2
while [[ $# -gt 0 ]]; do
    case $1 in
        --auto-approve)
            AUTO_APPROVE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

ENVIRONMENT_PATH="$TERRAFORM_ROOT/environments/$ENVIRONMENT"

# Main execution
print_info "=== Acadion Terraform Workspace Manager ==="
print_info "Environment: $ENVIRONMENT"
print_info "Action: $ACTION"
echo ""

check_prerequisites

case $ACTION in
    init)
        init_environment
        ;;
    plan)
        plan_environment
        ;;
    apply)
        apply_environment
        ;;
    destroy)
        destroy_environment
        ;;
    output)
        show_output
        ;;
    switch)
        switch_environment
        ;;
esac

echo ""
print_success "=== Operation completed ==="