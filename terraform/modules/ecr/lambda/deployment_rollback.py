import json
import boto3
import os
import logging
from datetime import datetime
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    """
    Lambda function to perform deployment rollbacks
    Can be triggered manually or automatically
    """
    
    try:
        # Parse input parameters
        if 'body' in event:
            # API Gateway invocation
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            # Direct invocation
            body = event
        
        repository_name = body.get('repository_name')
        target_tag = body.get('target_tag')  # Tag to rollback to
        cluster_name = body.get('cluster_name')
        service_name = body.get('service_name')
        rollback_steps = body.get('rollback_steps', 1)  # Number of versions to rollback
        
        if not all([repository_name, cluster_name, service_name]):
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Missing required parameters: repository_name, cluster_name, service_name'
                })
            }
        
        logger.info(f"Starting rollback for {repository_name} in {cluster_name}/{service_name}")
        
        # Initialize AWS clients
        s3_client = boto3.client('s3')
        ecs_client = boto3.client('ecs')
        ecr_client = boto3.client('ecr')
        sns_client = boto3.client('sns')
        
        metadata_bucket = os.environ['METADATA_BUCKET']
        sns_topic_arn = os.environ['SNS_TOPIC_ARN']
        
        # Get rollback manifest
        rollback_key = f"rollback/{repository_name}/recent-deployments.json"
        
        try:
            response = s3_client.get_object(Bucket=metadata_bucket, Key=rollback_key)
            rollback_manifest = json.loads(response['Body'].read())
        except ClientError as e:
            logger.error(f"Error getting rollback manifest: {e}")
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'No rollback manifest found'})
            }
        
        deployments = rollback_manifest.get('deployments', [])
        
        if not deployments:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'No deployments found for rollback'})
            }
        
        # Determine target deployment
        target_deployment = None
        
        if target_tag:
            # Rollback to specific tag
            target_deployment = next((d for d in deployments if d['image_tag'] == target_tag), None)
            if not target_deployment:
                return {
                    'statusCode': 404,
                    'body': json.dumps({'error': f'Target tag {target_tag} not found in rollback history'})
                }
        else:
            # Rollback N steps
            if len(deployments) <= rollback_steps:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'error': f'Not enough deployment history for {rollback_steps} step rollback'})
                }
            target_deployment = deployments[rollback_steps]
        
        target_image_tag = target_deployment['image_tag']
        target_image_digest = target_deployment['image_digest']
        
        logger.info(f"Rolling back to {repository_name}:{target_image_tag}")
        
        # Get current service configuration
        try:
            current_service = ecs_client.describe_services(
                cluster=cluster_name,
                services=[service_name]
            )
            
            if not current_service['services']:
                return {
                    'statusCode': 404,
                    'body': json.dumps({'error': f'Service {service_name} not found in cluster {cluster_name}'})
                }
            
            service = current_service['services'][0]
            current_task_definition_arn = service['taskDefinition']
            
        except ClientError as e:
            logger.error(f"Error getting current service: {e}")
            return {
                'statusCode': 500,
                'body': json.dumps({'error': f'Error getting service configuration: {str(e)}'})
            }
        
        # Get current task definition
        try:
            current_task_def = ecs_client.describe_task_definition(
                taskDefinition=current_task_definition_arn
            )
            
            task_def = current_task_def['taskDefinition']
            
        except ClientError as e:
            logger.error(f"Error getting task definition: {e}")
            return {
                'statusCode': 500,
                'body': json.dumps({'error': f'Error getting task definition: {str(e)}'})
            }
        
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
        
        # Update container definitions with rollback image
        rollback_image_uri = f"{task_def['containerDefinitions'][0]['image'].split(':')[0]}:{target_image_tag}"
        
        for container in task_def['containerDefinitions']:
            new_container = container.copy()
            
            # Update image if it matches the repository we're rolling back
            if repository_name.split('/')[-1] in container['image']:
                new_container['image'] = rollback_image_uri
                logger.info(f"Updated container image to {rollback_image_uri}")
            
            new_task_def['containerDefinitions'].append(new_container)
        
        # Register new task definition
        try:
            new_task_def_response = ecs_client.register_task_definition(**new_task_def)
            new_task_def_arn = new_task_def_response['taskDefinition']['taskDefinitionArn']
            
            logger.info(f"Registered new task definition: {new_task_def_arn}")
            
        except ClientError as e:
            logger.error(f"Error registering task definition: {e}")
            return {
                'statusCode': 500,
                'body': json.dumps({'error': f'Error registering task definition: {str(e)}'})
            }
        
        # Update service with new task definition
        try:
            update_response = ecs_client.update_service(
                cluster=cluster_name,
                service=service_name,
                taskDefinition=new_task_def_arn
            )
            
            logger.info(f"Updated service {service_name} with rollback task definition")
            
        except ClientError as e:
            logger.error(f"Error updating service: {e}")
            return {
                'statusCode': 500,
                'body': json.dumps({'error': f'Error updating service: {str(e)}'})
            }
        
        # Record rollback event
        rollback_metadata = {
            'timestamp': datetime.now().isoformat(),
            'event': 'deployment_rollback',
            'repository_name': repository_name,
            'cluster_name': cluster_name,
            'service_name': service_name,
            'rollback_from': {
                'task_definition': current_task_definition_arn,
                'image_tag': 'current'  # Would need to parse from current image
            },
            'rollback_to': {
                'task_definition': new_task_def_arn,
                'image_tag': target_image_tag,
                'image_digest': target_image_digest
            },
            'rollback_steps': rollback_steps,
            'initiated_by': 'automated_lambda'
        }
        
        # Store rollback metadata
        rollback_metadata_key = f"rollbacks/{repository_name}/{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
        
        try:
            s3_client.put_object(
                Bucket=metadata_bucket,
                Key=rollback_metadata_key,
                Body=json.dumps(rollback_metadata, indent=2),
                ContentType='application/json'
            )
        except Exception as e:
            logger.warning(f"Error storing rollback metadata: {e}")
        
        # Send notification
        try:
            notification_message = {
                'event': 'Deployment Rollback Completed',
                'repository': repository_name,
                'service': f"{cluster_name}/{service_name}",
                'rolled_back_to': target_image_tag,
                'timestamp': rollback_metadata['timestamp'],
                'new_task_definition': new_task_def_arn
            }
            
            sns_client.publish(
                TopicArn=sns_topic_arn,
                Subject=f'Deployment Rollback Completed: {repository_name}',
                Message=json.dumps(notification_message, indent=2)
            )
            
        except Exception as e:
            logger.warning(f"Error sending notification: {e}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Rollback completed successfully',
                'repository': repository_name,
                'rolled_back_to': target_image_tag,
                'new_task_definition': new_task_def_arn,
                'rollback_metadata_key': rollback_metadata_key
            })
        }
        
    except Exception as e:
        error_message = f"Error performing rollback: {str(e)}"
        logger.error(error_message)
        
        # Send error notification
        try:
            sns_client = boto3.client('sns')
            sns_client.publish(
                TopicArn=os.environ.get('SNS_TOPIC_ARN', ''),
                Subject='Deployment Rollback Failed',
                Message=f"Rollback failed with error: {error_message}"
            )
        except:
            pass
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': error_message
            })
        }