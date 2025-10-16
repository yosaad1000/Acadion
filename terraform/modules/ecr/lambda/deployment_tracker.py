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
    Lambda function to track deployment artifacts and metadata
    Triggered by ECR image push events
    """
    
    try:
        # Parse EventBridge event
        detail = event.get('detail', {})
        repository_name = detail.get('repository-name', '')
        image_tag = detail.get('image-tag', 'latest')
        image_digest = detail.get('image-digest', '')
        
        logger.info(f"Processing deployment for {repository_name}:{image_tag}")
        
        # Initialize AWS clients
        s3_client = boto3.client('s3')
        ecr_client = boto3.client('ecr')
        ecs_client = boto3.client('ecs')
        sns_client = boto3.client('sns')
        
        metadata_bucket = os.environ['METADATA_BUCKET']
        sns_topic_arn = os.environ['SNS_TOPIC_ARN']
        
        # Get image details from ECR
        try:
            image_details = ecr_client.describe_images(
                repositoryName=repository_name,
                imageIds=[{'imageTag': image_tag}]
            )
            
            if not image_details['imageDetails']:
                logger.error(f"No image found for {repository_name}:{image_tag}")
                return {'statusCode': 404, 'body': 'Image not found'}
            
            image_detail = image_details['imageDetails'][0]
            
        except ClientError as e:
            logger.error(f"Error getting image details: {e}")
            return {'statusCode': 500, 'body': f'Error: {str(e)}'}
        
        # Create deployment metadata
        deployment_metadata = {
            'timestamp': datetime.now().isoformat(),
            'repository_name': repository_name,
            'image_tag': image_tag,
            'image_digest': image_digest,
            'image_size_bytes': image_detail.get('imageSizeInBytes', 0),
            'image_pushed_at': image_detail.get('imagePushedAt', '').isoformat() if image_detail.get('imagePushedAt') else '',
            'registry_id': image_detail.get('registryId', ''),
            'image_manifest_media_type': image_detail.get('imageManifestMediaType', ''),
            'artifact_media_type': image_detail.get('artifactMediaType', ''),
            'deployment_status': 'artifact_created',
            'rollback_eligible': True
        }
        
        # Get current ECS service information if this is a known service
        service_mapping = {
            'backend': 'backend',
            'frontend': 'frontend', 
            'face-recognition': 'face-recognition'
        }
        
        service_name = None
        for key, value in service_mapping.items():
            if key in repository_name:
                service_name = value
                break
        
        if service_name:
            try:
                # Try to get current service configuration
                # This would need cluster name - for now we'll store what we can
                deployment_metadata['service_name'] = service_name
                deployment_metadata['deployment_target'] = 'ecs'
                
            except Exception as e:
                logger.warning(f"Could not get ECS service info: {e}")
        
        # Store metadata in S3
        metadata_key = f"deployments/{repository_name}/{image_tag}/{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
        
        try:
            s3_client.put_object(
                Bucket=metadata_bucket,
                Key=metadata_key,
                Body=json.dumps(deployment_metadata, indent=2),
                ContentType='application/json',
                Metadata={
                    'repository': repository_name,
                    'tag': image_tag,
                    'deployment-timestamp': deployment_metadata['timestamp']
                }
            )
            
            logger.info(f"Stored deployment metadata at s3://{metadata_bucket}/{metadata_key}")
            
        except ClientError as e:
            logger.error(f"Error storing metadata: {e}")
            return {'statusCode': 500, 'body': f'Error storing metadata: {str(e)}'}
        
        # Create rollback manifest (list of recent deployments for easy rollback)
        rollback_key = f"rollback/{repository_name}/recent-deployments.json"
        
        try:
            # Get existing rollback manifest
            try:
                response = s3_client.get_object(Bucket=metadata_bucket, Key=rollback_key)
                rollback_manifest = json.loads(response['Body'].read())
            except ClientError:
                rollback_manifest = {'deployments': []}
            
            # Add current deployment to manifest
            rollback_entry = {
                'image_tag': image_tag,
                'image_digest': image_digest,
                'timestamp': deployment_metadata['timestamp'],
                'metadata_key': metadata_key,
                'rollback_eligible': True
            }
            
            rollback_manifest['deployments'].insert(0, rollback_entry)
            
            # Keep only last 20 deployments
            rollback_manifest['deployments'] = rollback_manifest['deployments'][:20]
            rollback_manifest['last_updated'] = datetime.now().isoformat()
            
            # Store updated manifest
            s3_client.put_object(
                Bucket=metadata_bucket,
                Key=rollback_key,
                Body=json.dumps(rollback_manifest, indent=2),
                ContentType='application/json'
            )
            
        except Exception as e:
            logger.warning(f"Error updating rollback manifest: {e}")
        
        # Send notification
        try:
            notification_message = {
                'event': 'New Deployment Artifact Created',
                'repository': repository_name,
                'image_tag': image_tag,
                'image_digest': image_digest,
                'timestamp': deployment_metadata['timestamp'],
                'metadata_location': f"s3://{metadata_bucket}/{metadata_key}",
                'rollback_available': True
            }
            
            sns_client.publish(
                TopicArn=sns_topic_arn,
                Subject=f'New Deployment Artifact: {repository_name}:{image_tag}',
                Message=json.dumps(notification_message, indent=2)
            )
            
        except Exception as e:
            logger.warning(f"Error sending notification: {e}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Deployment tracked successfully',
                'repository': repository_name,
                'image_tag': image_tag,
                'metadata_key': metadata_key
            })
        }
        
    except Exception as e:
        error_message = f"Error tracking deployment: {str(e)}"
        logger.error(error_message)
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': error_message
            })
        }