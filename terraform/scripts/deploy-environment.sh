#!/bin/bash

# Bash script for deploying to specific environments using Terraform workspaces
# This script automates the deployment process for different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Default values
ACTION="plan"
AUTO_APPROVE=false
REFRESH=true
VERBOSE=false
VAR_FILE=""

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to show usage
show_usage() {
    print_color $CYAN "Environment Deployment Script"
    print_color $CYAN "============================="
    echo ""
    print_color $YELLOW "Usage:"
    print_color $YELLOW "  ./deploy-environment.sh <environment> [options]"
    echo ""
    print_color $YELLOW "Parameters:"
    echo "  environment     Target environment (dev, staging, prod)"
    echo ""
    print_color $YELLOW "Options:"
    echo "  --action        Terraform action (plan, apply, destroy) [default: plan]"
    echo "  --auto-approve  Skip interactive approval for apply/destroy"
    echo "  --no-refresh    Skip state refresh before operation"
    echo "  --var-file      Custom variables file (overrides default)"
    echo "  --verbose       Enable verbose output"
    echo "  --help          Show this help message"
    echo ""
    print_color $YELLOW "Examples:"
    echo "  ./deploy-environment.sh dev --action plan"
    echo "  ./deploy-environment.sh staging --action apply --auto-approve"
    echo "  ./deploy-environment.sh prod --action destroy"
}

# Function to check prerequisites
check_prerequisites() {
    print_color $CYAN "🔍 Checking prerequisites..."
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        print_color $RED "❌ Terraform is not installed or not in PATH"
        return 1
    fi
    
    local version=$(terraform version | head -n1)
    print_color $GREEN "✅ Terraform: $version"
    
    # Check AWS CLI (optional but recommended)
    if command -v aws &> /dev/null; then
        local aws_version=$(aws --version 2>&1)
        print_color $GREEN "✅ AWS CLI: $aws_version"
    else
        print_color $YELLOW "⚠️ AWS CLI not found (optional but recommended)"
    fi
    
    return 0
}

# Function to validate environment configuration
validate_environment_config() {
    local environment=$1
    
    print_color $CYAN "🔧 Validating environment configuration..."
    
    # Check tfvars file
    local tfvars_file
    if [[ -n "$VAR_FILE" ]]; then
        tfvars_file="$VAR_FILE"
    else
        tfvars_file="environments/${environment}.tfvars"
    fi
    
    if [[ ! -f "$tfvars_file" ]]; then
        print_color $RED "❌ Configuration file not found: $tfvars_file"
        print_color $YELLOW "Please create this file with environment-specific variables"
        return 1
    fi
    
    print_color $GREEN "✅ Configuration file found: $tfvars_file"
    
    # Validate required variables in tfvars file
    local required_vars=("environment" "aws_region" "project_name" "github_repository")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^[[:space:]]*${var}[[:space:]]*=" "$tfvars_file"; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_color $RED "❌ Missing required variables in $tfvars_file:"
        for var in "${missing_vars[@]}"; do
            print_color $RED "  - $var"
        done
        return 1
    fi
    
    print_color $GREEN "✅ All required variables present"
    return 0
}

# Function to initialize Terraform workspace
initialize_terraform_workspace() {
    local environment=$1
    
    print_color $CYAN "🏗️ Setting up Terraform workspace..."
    
    # Initialize Terraform if needed
    if [[ ! -d ".terraform" ]]; then
        print_color $YELLOW "Initializing Terraform..."
        if ! terraform init; then
            print_color $RED "❌ Terraform initialization failed"
            return 1
        fi
    fi
    
    # Create or select workspace
    local current_workspace=$(terraform workspace show)
    if [[ "$current_workspace" != "$environment" ]]; then
        print_color $YELLOW "Switching to workspace: $environment"
        
        # Try to select existing workspace
        if ! terraform workspace select "$environment" 2>/dev/null; then
            # Create new workspace if it doesn't exist
            print_color $YELLOW "Creating new workspace: $environment"
            if ! terraform workspace new "$environment"; then
                print_color $RED "❌ Failed to create workspace: $environment"
                return 1
            fi
        fi
    fi
    
    current_workspace=$(terraform workspace show)
    print_color $GREEN "✅ Using workspace: $current_workspace"
    
    return 0
}

# Function to show deployment plan
show_deployment_plan() {
    local environment=$1
    local tfvars_file=$2
    
    print_color $CYAN "📋 Generating deployment plan..."
    
    local plan_args=("plan" "-var-file=$tfvars_file")
    
    if [[ "$REFRESH" == "true" ]]; then
        plan_args+=("-refresh=true")
    fi
    
    if [[ "$VERBOSE" == "true" ]]; then
        plan_args+=("-detailed-exitcode")
    fi
    
    print_color $YELLOW "Running: terraform ${plan_args[*]}"
    
    terraform "${plan_args[@]}"
    local exit_code=$?
    
    case $exit_code in
        0)
            print_color $GREEN "✅ No changes needed"
            echo "no-changes"
            ;;
        1)
            print_color $RED "❌ Plan failed"
            echo "error"
            ;;
        2)
            print_color $YELLOW "📝 Changes detected"
            echo "changes"
            ;;
        *)
            print_color $RED "❌ Unexpected exit code: $exit_code"
            echo "error"
            ;;
    esac
}

# Function to apply deployment plan
apply_deployment_plan() {
    local environment=$1
    local tfvars_file=$2
    local auto_approve=$3
    
    print_color $CYAN "🚀 Applying deployment..."
    
    local apply_args=("apply" "-var-file=$tfvars_file")
    
    if [[ "$auto_approve" == "true" ]]; then
        apply_args+=("-auto-approve")
    fi
    
    if [[ "$REFRESH" == "true" ]]; then
        apply_args+=("-refresh=true")
    fi
    
    print_color $YELLOW "Running: terraform ${apply_args[*]}"
    
    if [[ "$auto_approve" != "true" ]]; then
        echo ""
        print_color $YELLOW "⚠️ This will apply changes to the $environment environment"
        print_color $YELLOW "Please review the plan above carefully before proceeding"
        echo ""
    fi
    
    if terraform "${apply_args[@]}"; then
        print_color $GREEN "✅ Deployment completed successfully"
        return 0
    else
        print_color $RED "❌ Deployment failed"
        return 1
    fi
}

# Function to destroy environment
destroy_environment() {
    local environment=$1
    local tfvars_file=$2
    local auto_approve=$3
    
    print_color $RED "💥 Destroying environment..."
    
    if [[ "$auto_approve" != "true" ]]; then
        echo ""
        print_color $RED "⚠️ WARNING: This will DESTROY all resources in the $environment environment!"
        print_color $RED "This action cannot be undone!"
        echo ""
        
        read -p "Type 'DESTROY' to confirm destruction of $environment environment: " confirmation
        if [[ "$confirmation" != "DESTROY" ]]; then
            print_color $YELLOW "Operation cancelled"
            return 1
        fi
    fi
    
    local destroy_args=("destroy" "-var-file=$tfvars_file")
    
    if [[ "$auto_approve" == "true" ]]; then
        destroy_args+=("-auto-approve")
    fi
    
    print_color $YELLOW "Running: terraform ${destroy_args[*]}"
    
    if terraform "${destroy_args[@]}"; then
        print_color $GREEN "✅ Environment destroyed successfully"
        return 0
    else
        print_color $RED "❌ Destruction failed"
        return 1
    fi
}

# Function to show deployment summary
show_deployment_summary() {
    local environment=$1
    local action=$2
    local success=$3
    
    echo ""
    print_color $CYAN "📊 Deployment Summary"
    print_color $CYAN "====================="
    echo "Environment: $environment"
    echo "Action: $action"
    if [[ "$success" == "0" ]]; then
        echo "Status: SUCCESS ✅"
    else
        echo "Status: FAILED ❌"
    fi
    echo "Workspace: $(terraform workspace show)"
    echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    
    if [[ "$success" == "0" && "$action" == "apply" ]]; then
        echo ""
        print_color $YELLOW "🔗 Useful commands:"
        echo "  View outputs: terraform output"
        echo "  Show state: terraform show"
        echo "  Refresh state: terraform refresh -var-file=\"environments/${environment}.tfvars\""
    fi
    
    echo ""
}

# Parse command line arguments
ENVIRONMENT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        dev|staging|prod)
            ENVIRONMENT="$1"
            shift
            ;;
        --action)
            ACTION="$2"
            if [[ ! "$ACTION" =~ ^(plan|apply|destroy)$ ]]; then
                print_color $RED "❌ Invalid action: $ACTION"
                show_usage
                exit 1
            fi
            shift 2
            ;;
        --auto-approve)
            AUTO_APPROVE=true
            shift
            ;;
        --no-refresh)
            REFRESH=false
            shift
            ;;
        --var-file)
            VAR_FILE="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            print_color $RED "❌ Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate required parameters
if [[ -z "$ENVIRONMENT" ]]; then
    print_color $RED "❌ Environment is required"
    show_usage
    exit 1
fi

# Main script execution
print_color $CYAN "🚀 Environment Deployment Script"
print_color $CYAN "================================="
print_color $GREEN "Environment: $ENVIRONMENT"
print_color $GREEN "Action: $ACTION"
echo ""

# Check prerequisites
if ! check_prerequisites; then
    exit 1
fi

# Change to terraform directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(dirname "$SCRIPT_DIR")"
cd "$TERRAFORM_DIR"

# Validate environment configuration
if ! validate_environment_config "$ENVIRONMENT"; then
    exit 1
fi

# Set tfvars file
if [[ -n "$VAR_FILE" ]]; then
    tfvars_file="$VAR_FILE"
else
    tfvars_file="environments/${ENVIRONMENT}.tfvars"
fi

# Initialize workspace
if ! initialize_terraform_workspace "$ENVIRONMENT"; then
    exit 1
fi

# Execute the requested action
success=1

case "$ACTION" in
    plan)
        plan_result=$(show_deployment_plan "$ENVIRONMENT" "$tfvars_file")
        if [[ "$plan_result" != "error" ]]; then
            success=0
        fi
        ;;
    
    apply)
        # Always show plan first for apply
        plan_result=$(show_deployment_plan "$ENVIRONMENT" "$tfvars_file")
        
        if [[ "$plan_result" == "error" ]]; then
            print_color $RED "❌ Cannot apply due to plan errors"
            success=1
        elif [[ "$plan_result" == "no-changes" ]]; then
            print_color $GREEN "✅ No changes to apply"
            success=0
        else
            if apply_deployment_plan "$ENVIRONMENT" "$tfvars_file" "$AUTO_APPROVE"; then
                success=0
            fi
        fi
        ;;
    
    destroy)
        if destroy_environment "$ENVIRONMENT" "$tfvars_file" "$AUTO_APPROVE"; then
            success=0
        fi
        ;;
esac

# Show summary
show_deployment_summary "$ENVIRONMENT" "$ACTION" "$success"

if [[ "$success" != "0" ]]; then
    exit 1
fi

print_color $GREEN "✅ Script completed successfully"