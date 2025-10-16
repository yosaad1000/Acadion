#!/usr/bin/env python3
"""
Deployment Rollback Automation Script

This script provides automated rollback capabilities for ECS deployments
with integration to the deployment tracking system.
"""

import boto3
import json
import sys
import logging
import argparse
from datetime import datetime
from typing import Dict, List, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DeploymentRollback:
    def __init__(self, aws_region: str = 'us-east-1'):
        """Initialize rollback manager"""
        self.aws_region = aws_region
        
        # Initialize AWS clients
        self.ecs_client = boto3.client('ecs', region_name=aws_region)
        self.s3_client = boto3.client('s3', region_name=aws_region)
        self.sns_client = boto3.client('sns', region_name=aws_region)
        self.lambda_client = boto3.client('lambda', region_name=aws_region)
    
    def list_available_rollbacks(self, repository_name: str, metadata_bucket: str) -> List[Dict]:
        """List available rollback targets for a repository"""
        logger.info(f"Listing available rollbacks for {repository_name}")
        
        try:
            rollback_key = f"rollback/{repository_name}/recent-deployments.json"
            
            response = self.s3_client.get_object(Bucket=metadata_bucket, Key=rollback_key)
            rollback_manifest = json.loads(response['Body'].read())
            
            deployments = rollback_manifest.get('deployments', [])
            
            # Filter for rollback-eligible deployments
            available_rollbacks = [
                d for d in deployments 
                if d.get('rollback_eligible', True)
            ]
            
            return available_rollbacks
            
        except Exception as e:
            logger.error(f"Error listing rollbacks: {e}")
            return []
    
    def get_current_deployment(self, cluster_name: str, service_name: str) -> Optional[Dict]:
        """Get current deployment information"""
        logger.info(f"Getting current deployment for {cluster_name}/{service_name}")
        
        try:
            response = self.ecs_client.describe_services(
                cluster=cluster_name,
                services=[service_name]
            )
            
            if not response['services']:
                logger.error(f"Service {service_name} not found")
                return None
            
            service = response['services'][0]
            task_definition_arn = service['taskDefinition']
            
            # Get task definition details
            task_def_response = self.ecs_client.describe_task_definition(
                taskDefinition=task_definition_arn
            )
            
            task_def = task_def_response['taskDefinition']
            
            # Extract image information
            images = []
            for container in task_def['containerDefinitions']:
                images.append({
                    'container_name': container['name'],
                    'image': container['image']
                })
            
            return {
                'service_name': service_name,
                'cluster_name': cluster_name,
                'task_definition_arn': task_definition_arn,
                'running_count': service['runningCount'],
                'desired_count': service['desiredCount'],
                'status': service['status'],
                'images': images,
                'deployment_created': service['deployments'][0]['createdAt'].isoformat() if service['deployments'] else None
            }
            
        except Exception as e:
            logger.error(f"Error getting current deployment: {e}")
            return None
    
    def execute_rollback_via_lambda(self, rollback_params: Dict) -> bool:
        """Execute rollback using the deployment rollback Lambda function"""
        logger.info("Executing rollback via Lambda function")
        
        try:
            lambda_function_name = rollback_params['lambda_function_name']
            
            # Prepare payload for Lambda
            payload = {
                'repository_name': rollback_params['repository_name'],
                'cluster_name': rollback_params['cluster_name'],
                'service_name': rollback_params['service_name'],
                'target_tag': rollback_params.get('target_tag'),
                'rollback_steps': rollback_params.get('rollback_steps', 1)
            }
            
            # Invoke Lambda function
            response = self.lambda_client.invoke(
                FunctionName=lambda_function_name,
                InvocationType='RequestResponse',
                Payload=json.dumps(payload)
            )
            
            # Parse response
            response_payload = json.loads(response['Payload'].read())
            
            if response['StatusCode'] == 200:
                result = json.loads(response_payload['body'])
                if 'error' in result:
                    logger.error(f"Lambda rollback failed: {result['error']}")
                    return False
                else:
                    logger.info(f"Lambda rollback successful: {result['message']}")
                    return True
            else:
                logger.error(f"Lambda invocation failed with status {response['StatusCode']}")
                return False
                
        except Exception as e:
            logger.error(f"Error executing rollback via Lambda: {e}")
            return False
    
    def execute_direct_rollback(self, rollback_params: Dict) -> bool:
        """Execute rollback directly (without Lambda)"""
        logger.info("Executing direct rollback")
        
        try:
            cluster_name = rollback_params['cluster_name']
            service_name = rollback_params['service_name']
            target_image = rollback_params['target_image']
            
            # Get current task definition
            current_service = self.ecs_client.describe_services(
                cluster=cluster_name,
                services=[service_name]
            )
            
            if not current_service['services']:
                logger.error(f"Service {service_name} not found")
                return False
            
            current_task_def_arn = current_service['services'][0]['taskDefinition']
            
            # Get task definition details
            task_def_response = self.ecs_client.describe_task_definition(
                taskDefinition=current_task_def_arn
            )
            
            task_def = task_def_response['taskDefinition']
            
            # Create new task definition with rollback image
            new_task_def = {
                'family': task_def['family'],
                'taskRoleArn': task_def.get('taskRoleArn'),
                'executionRoleArn': task_def.get('executionRoleArn'),
                'networkMode': task_def.get('networkMode'),
                'requiresCompatibilities': task_def.get('requiresCompatibilities', []),
                'cpu': task_def.get('cpu'),
                'memory': task_def.get('memory'),
                'containerDefinitions': []
            }
            
            # Update container definitions
            for container in task_def['containerDefinitions']:
                new_container = container.copy()
                
                # Update the main application container image
                if container['name'] in ['backend', 'frontend', 'face-recognition']:
                    new_container['image'] = target_image
                    logger.info(f"Updated {container['name']} image to {target_image}")
                
                new_task_def['containerDefinitions'].append(new_container)
            
            # Register new task definition
            new_task_def_response = self.ecs_client.register_task_definition(**new_task_def)
            new_task_def_arn = new_task_def_response['taskDefinition']['taskDefinitionArn']
            
            logger.info(f"Registered new task definition: {new_task_def_arn}")
            
            # Update service
            self.ecs_client.update_service(
                cluster=cluster_name,
                service=service_name,
                taskDefinition=new_task_def_arn
            )
            
            logger.info(f"Updated service {service_name} with rollback task definition")
            
            # Wait for deployment to stabilize
            logger.info("Waiting for service to stabilize...")
            waiter = self.ecs_client.get_waiter('services_stable')
            waiter.wait(
                cluster=cluster_name,
                services=[service_name],
                WaiterConfig={
                    'Delay': 15,
                    'MaxAttempts': 40  # 10 minutes max
                }
            )
            
            logger.info("Rollback completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error executing direct rollback: {e}")
            return False
    
    def verify_rollback_success(self, cluster_name: str, service_name: str, expected_image: str) -> bool:
        """Verify that rollback was successful"""
        logger.info("Verifying rollback success...")
        
        try:
            # Get current service state
            current_deployment = self.get_current_deployment(cluster_name, service_name)
            
            if not current_deployment:
                logger.error("Could not get current deployment state")
                return False
            
            # Check if service is stable
            if current_deployment['status'] != 'ACTIVE':
                logger.error(f"Service status is {current_deployment['status']}, expected ACTIVE")
                return False
            
            # Check if desired count matches running count
            if current_deployment['running_count'] != current_deployment['desired_count']:
                logger.error(f"Running count ({current_deployment['running_count']}) does not match desired count ({current_deployment['desired_count']})")
                return False
            
            # Check if image matches expected
            for image_info in current_deployment['images']:
                if expected_image in image_info['image']:
                    logger.info(f"Rollback verification successful - image {expected_image} is running")
                    return True
            
            logger.error(f"Expected image {expected_image} not found in running containers")
            return False
            
        except Exception as e:
            logger.error(f"Error verifying rollback: {e}")
            return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Deployment Rollback Tool')
    parser.add_argument('--cluster', required=True, help='ECS cluster name')
    parser.add_argument('--service', required=True, help='ECS service name')
    parser.add_argument('--repository', required=True, help='ECR repository name')
    parser.add_argument('--target-tag', help='Target image tag to rollback to')
    parser.add_argument('--rollback-steps', type=int, default=1, help='Number of versions to rollback')
    parser.add_argument('--metadata-bucket', required=True, help='S3 bucket with deployment metadata')
    parser.add_argument('--lambda-function', help='Lambda function name for rollback (optional)')
    parser.add_argument('--region', default='us-east-1', help='AWS region')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without executing')
    parser.add_argument('--list-rollbacks', action='store_true', help='List available rollback targets')
    
    args = parser.parse_args()
    
    # Initialize rollback manager
    rollback_manager = DeploymentRollback(args.region)
    
    # List available rollbacks if requested
    if args.list_rollbacks:
        rollbacks = rollback_manager.list_available_rollbacks(args.repository, args.metadata_bucket)
        
        print(f"\nAvailable rollback targets for {args.repository}:")
        print("-" * 60)
        
        for i, rollback in enumerate(rollbacks):
            print(f"{i+1}. Tag: {rollback['image_tag']}")
            print(f"   Timestamp: {rollback['timestamp']}")
            print(f"   Digest: {rollback['image_digest'][:12]}...")
            print()
        
        return
    
    # Get current deployment info
    current = rollback_manager.get_current_deployment(args.cluster, args.service)
    if not current:
        logger.error("Could not get current deployment information")
        sys.exit(1)
    
    print(f"\nCurrent deployment:")
    print(f"  Service: {args.cluster}/{args.service}")
    print(f"  Status: {current['status']}")
    print(f"  Running/Desired: {current['running_count']}/{current['desired_count']}")
    print(f"  Images: {[img['image'] for img in current['images']]}")
    
    # Get available rollbacks
    rollbacks = rollback_manager.list_available_rollbacks(args.repository, args.metadata_bucket)
    
    if not rollbacks:
        logger.error("No rollback targets available")
        sys.exit(1)
    
    # Determine target rollback
    if args.target_tag:
        target_rollback = next((r for r in rollbacks if r['image_tag'] == args.target_tag), None)
        if not target_rollback:
            logger.error(f"Target tag {args.target_tag} not found in rollback history")
            sys.exit(1)
    else:
        if len(rollbacks) <= args.rollback_steps:
            logger.error(f"Not enough rollback history for {args.rollback_steps} steps")
            sys.exit(1)
        target_rollback = rollbacks[args.rollback_steps]
    
    target_tag = target_rollback['image_tag']
    target_image = f"{args.repository}:{target_tag}"
    
    print(f"\nRollback target:")
    print(f"  Tag: {target_tag}")
    print(f"  Timestamp: {target_rollback['timestamp']}")
    print(f"  Image: {target_image}")
    
    if args.dry_run:
        print("\nDRY RUN - No changes will be made")
        sys.exit(0)
    
    # Confirm rollback
    confirm = input(f"\nProceed with rollback to {target_tag}? (yes/no): ")
    if confirm.lower() != 'yes':
        print("Rollback cancelled")
        sys.exit(0)
    
    # Execute rollback
    rollback_params = {
        'cluster_name': args.cluster,
        'service_name': args.service,
        'repository_name': args.repository,
        'target_tag': target_tag,
        'target_image': target_image,
        'rollback_steps': args.rollback_steps
    }
    
    success = False
    
    if args.lambda_function:
        rollback_params['lambda_function_name'] = args.lambda_function
        success = rollback_manager.execute_rollback_via_lambda(rollback_params)
    else:
        success = rollback_manager.execute_direct_rollback(rollback_params)
    
    if success:
        # Verify rollback
        if rollback_manager.verify_rollback_success(args.cluster, args.service, target_tag):
            print(f"\n✅ Rollback to {target_tag} completed successfully!")
            sys.exit(0)
        else:
            print(f"\n❌ Rollback may have failed - verification unsuccessful")
            sys.exit(1)
    else:
        print(f"\n❌ Rollback failed")
        sys.exit(1)

if __name__ == "__main__":
    main()