#!/bin/bash

# Bash script for managing Terraform workspaces
# This script helps create and manage environment-specific Terraform workspaces

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to show usage
show_usage() {
    print_color $CYAN "Terraform Workspace Management Script"
    print_color $CYAN "====================================="
    echo ""
    print_color $YELLOW "Usage:"
    print_color $YELLOW "  ./manage-workspaces.sh <action> [environment] [--force]"
    echo ""
    print_color $YELLOW "Actions:"
    echo "  create    - Create a new workspace for the specified environment"
    echo "  select    - Select/switch to an existing workspace"
    echo "  list      - List all available workspaces"
    echo "  delete    - Delete a workspace (use with caution!)"
    echo "  show      - Show current workspace"
    echo ""
    print_color $YELLOW "Environments:"
    echo "  dev       - Development environment"
    echo "  staging   - Staging environment"
    echo "  prod      - Production environment"
    echo ""
    print_color $YELLOW "Examples:"
    echo "  ./manage-workspaces.sh create dev"
    echo "  ./manage-workspaces.sh select prod"
    echo "  ./manage-workspaces.sh list"
}

# Function to check if Terraform is installed
check_terraform() {
    if ! command -v terraform &> /dev/null; then
        print_color $RED "❌ Terraform is not installed or not in PATH"
        print_color $YELLOW "Please install Terraform from: https://www.terraform.io/downloads.html"
        exit 1
    fi
    
    local version=$(terraform version | head -n1)
    print_color $GREEN "✅ Terraform is installed: $version"
}

# Function to initialize Terraform
initialize_terraform() {
    print_color $CYAN "🔧 Initializing Terraform..."
    
    if terraform init; then
        print_color $GREEN "✅ Terraform initialized successfully"
    else
        print_color $RED "❌ Terraform initialization failed"
        exit 1
    fi
}

# Function to get current workspace
get_current_workspace() {
    terraform workspace show 2>/dev/null || echo "unknown"
}

# Function to get all workspaces
get_all_workspaces() {
    terraform workspace list 2>/dev/null | sed 's/[* ]//g' | grep -v '^$'
}

# Function to create workspace
create_workspace() {
    local workspace_name=$1
    
    print_color $CYAN "🏗️ Creating workspace: $workspace_name"
    
    # Check if workspace already exists
    if terraform workspace list | grep -q "\\b$workspace_name\\b"; then
        print_color $YELLOW "⚠️ Workspace '$workspace_name' already exists"
        
        if [[ "$FORCE" != "true" ]]; then
            read -p "Do you want to select it instead? (y/N): " response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                select_workspace "$workspace_name"
                return
            else
                print_color $YELLOW "Operation cancelled"
                return
            fi
        fi
    fi
    
    if terraform workspace new "$workspace_name"; then
        print_color $GREEN "✅ Workspace '$workspace_name' created and selected"
        show_workspace_info "$workspace_name"
    else
        print_color $RED "❌ Failed to create workspace '$workspace_name'"
        exit 1
    fi
}

# Function to select workspace
select_workspace() {
    local workspace_name=$1
    
    print_color $CYAN "🔄 Selecting workspace: $workspace_name"
    
    if terraform workspace select "$workspace_name"; then
        print_color $GREEN "✅ Switched to workspace '$workspace_name'"
        show_workspace_info "$workspace_name"
    else
        print_color $RED "❌ Failed to select workspace '$workspace_name'"
        print_color $YELLOW "Available workspaces:"
        list_workspaces
        exit 1
    fi
}

# Function to list workspaces
list_workspaces() {
    print_color $CYAN "📋 Available Terraform workspaces:"
    echo ""
    
    terraform workspace list | while read -r line; do
        if [[ "$line" == *"*"* ]]; then
            workspace_name=$(echo "$line" | sed 's/[* ]//g')
            print_color $GREEN "  * $workspace_name (current)"
        else
            workspace_name=$(echo "$line" | sed 's/^[ \t]*//')
            if [[ -n "$workspace_name" ]]; then
                echo "    $workspace_name"
            fi
        fi
    done
    echo ""
}

# Function to delete workspace
delete_workspace() {
    local workspace_name=$1
    
    print_color $YELLOW "🗑️ Deleting workspace: $workspace_name"
    
    # Safety checks
    if [[ "$workspace_name" == "default" ]]; then
        print_color $RED "❌ Cannot delete the default workspace"
        exit 1
    fi
    
    local current=$(get_current_workspace)
    if [[ "$current" == "$workspace_name" ]]; then
        print_color $RED "❌ Cannot delete the currently selected workspace"
        print_color $YELLOW "Please switch to another workspace first"
        exit 1
    fi
    
    if [[ "$FORCE" != "true" ]]; then
        print_color $RED "⚠️ WARNING: This will permanently delete workspace '$workspace_name' and all its state!"
        read -p "Are you sure you want to continue? Type 'DELETE' to confirm: " response
        if [[ "$response" != "DELETE" ]]; then
            print_color $YELLOW "Operation cancelled"
            return
        fi
    fi
    
    if terraform workspace delete "$workspace_name"; then
        print_color $GREEN "✅ Workspace '$workspace_name' deleted successfully"
    else
        print_color $RED "❌ Failed to delete workspace '$workspace_name'"
        exit 1
    fi
}

# Function to show workspace info
show_workspace_info() {
    local workspace_name=$1
    
    echo ""
    print_color $CYAN "📊 Workspace Information"
    print_color $CYAN "========================"
    print_color $GREEN "Current Workspace: $workspace_name"
    
    # Show corresponding tfvars file
    local tfvars_file="environments/${workspace_name}.tfvars"
    if [[ -f "$tfvars_file" ]]; then
        print_color $GREEN "Configuration File: $tfvars_file ✅"
    else
        print_color $RED "Configuration File: $tfvars_file ❌ (not found)"
        print_color $YELLOW "You may need to create this file for environment-specific configuration"
    fi
    
    # Show state file location
    echo "State File: terraform.tfstate.d/${workspace_name}/terraform.tfstate"
    
    echo ""
    print_color $YELLOW "Next steps:"
    echo "1. Review/create the configuration file: $tfvars_file"
    echo "2. Run: terraform plan -var-file=\"$tfvars_file\""
    echo "3. Run: terraform apply -var-file=\"$tfvars_file\""
    echo ""
}

# Function to show current workspace
show_current_workspace() {
    local current=$(get_current_workspace)
    print_color $GREEN "Current workspace: $current"
    show_workspace_info "$current"
}

# Parse command line arguments
ACTION=""
ENVIRONMENT=""
FORCE="false"

while [[ $# -gt 0 ]]; do
    case $1 in
        create|select|list|delete|show)
            ACTION="$1"
            shift
            ;;
        dev|staging|prod)
            ENVIRONMENT="$1"
            shift
            ;;
        --force)
            FORCE="true"
            shift
            ;;
        -h|--help)
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

# Main script execution
print_color $CYAN "🚀 Terraform Workspace Manager"
print_color $CYAN "=============================="

# Validate action
if [[ -z "$ACTION" ]]; then
    print_color $RED "❌ Action is required"
    show_usage
    exit 1
fi

# Check if Terraform is installed
check_terraform

# Change to terraform directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(dirname "$SCRIPT_DIR")"
cd "$TERRAFORM_DIR"

# Initialize Terraform if needed
if [[ ! -d ".terraform" ]]; then
    initialize_terraform
fi

# Execute the requested action
case "$ACTION" in
    create)
        if [[ -z "$ENVIRONMENT" ]]; then
            print_color $RED "❌ Environment parameter is required for create action"
            show_usage
            exit 1
        fi
        create_workspace "$ENVIRONMENT"
        ;;
    
    select)
        if [[ -z "$ENVIRONMENT" ]]; then
            print_color $RED "❌ Environment parameter is required for select action"
            show_usage
            exit 1
        fi
        select_workspace "$ENVIRONMENT"
        ;;
    
    list)
        list_workspaces
        ;;
    
    delete)
        if [[ -z "$ENVIRONMENT" ]]; then
            print_color $RED "❌ Environment parameter is required for delete action"
            show_usage
            exit 1
        fi
        delete_workspace "$ENVIRONMENT"
        ;;
    
    show)
        show_current_workspace
        ;;
    
    *)
        print_color $RED "❌ Invalid action: $ACTION"
        show_usage
        exit 1
        ;;
esac

echo ""
print_color $GREEN "✅ Workspace management completed"