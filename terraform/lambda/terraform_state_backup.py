import json
import boto3
import datetime
import os
from botocore.exceptions import ClientError

def handler(event, context):
    """
    Lambda function to backup Terraform state files to a separate S3 bucket
    """
    
    # Initialize AWS clients
    s3 = boto3.client('s3')
    sns = boto3.client('sns')
    
    # Environment variables
    source_bucket = os.environ['SOURCE_BUCKET']
    destination_bucket = os.environ['DESTINATION_BUCKET']
    sns_topic_arn = os.environ['SNS_TOPIC_ARN']
    
    # Generate backup timestamp
    timestamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
    
    try:
        # List all objects in source bucket
        print(f"Listing objects in source bucket: {source_bucket}")
        response = s3.list_objects_v2(Bucket=source_bucket)
        
        if 'Contents' not in response:
            print("No objects found in source bucket")
            return {
                'statusCode': 200,
                'body': json.dumps({'message': 'No objects to backup'})
            }
        
        backed_up_files = []
        
        # Copy each object to destination bucket
        for obj in response['Contents']:
            source_key = obj['Key']
            destination_key = f"backup-{timestamp}/{source_key}"
            
            print(f"Copying {source_key} to {destination_key}")
            
            # Copy object
            s3.copy_object(
                CopySource={'Bucket': source_bucket, 'Key': source_key},
                Bucket=destination_bucket,
                Key=destination_key
            )
            
            backed_up_files.append({
                'source_key': source_key,
                'destination_key': destination_key,
                'size': obj['Size'],
                'last_modified': obj['LastModified'].isoformat()
            })
        
        # Send success notification
        message = {
            'status': 'SUCCESS',
            'source_bucket': source_bucket,
            'destination_bucket': destination_bucket,
            'timestamp': timestamp,
            'files_backed_up': len(backed_up_files),
            'backed_up_files': backed_up_files,
            'message': f'Successfully backed up {len(backed_up_files)} Terraform state files'
        }
        
        sns.publish(
            TopicArn=sns_topic_arn,
            Subject=f'Terraform State Backup Success - {timestamp}',
            Message=json.dumps(message, indent=2, default=str)
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Backup completed successfully',
                'files_backed_up': len(backed_up_files),
                'timestamp': timestamp
            })
        }
        
    except ClientError as e:
        error_message = f"Error backing up Terraform state: {str(e)}"
        print(error_message)
        
        # Send failure notification
        error_details = {
            'status': 'FAILED',
            'source_bucket': source_bucket,
            'destination_bucket': destination_bucket,
            'error': str(e),
            'timestamp': timestamp
        }
        
        sns.publish(
            TopicArn=sns_topic_arn,
            Subject=f'Terraform State Backup Failed - {timestamp}',
            Message=json.dumps(error_details, indent=2)
        )
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': error_message
            })
        }
    
    except Exception as e:
        error_message = f"Unexpected error: {str(e)}"
        print(error_message)
        
        # Send failure notification
        error_details = {
            'status': 'FAILED',
            'source_bucket': source_bucket,
            'destination_bucket': destination_bucket,
            'error': str(e),
            'timestamp': timestamp
        }
        
        sns.publish(
            TopicArn=sns_topic_arn,
            Subject=f'Terraform State Backup Failed - {timestamp}',
            Message=json.dumps(error_details, indent=2)
        )
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': error_message
            })
        }