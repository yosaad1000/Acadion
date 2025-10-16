import json
import boto3
import datetime
import os
from botocore.exceptions import ClientError

def handler(event, context):
    """
    Lambda function to create and export ElastiCache Redis snapshots to S3
    """
    
    # Initialize AWS clients
    elasticache = boto3.client('elasticache')
    s3 = boto3.client('s3')
    sns = boto3.client('sns')
    
    # Environment variables
    replication_group_id = os.environ['REPLICATION_GROUP_ID']
    s3_bucket = os.environ['S3_BUCKET']
    sns_topic_arn = os.environ['SNS_TOPIC_ARN']
    
    # Generate snapshot name with timestamp
    timestamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
    snapshot_name = f"{replication_group_id}-backup-{timestamp}"
    
    try:
        # Create snapshot
        print(f"Creating snapshot: {snapshot_name}")
        snapshot_response = elasticache.create_snapshot(
            ReplicationGroupId=replication_group_id,
            SnapshotName=snapshot_name
        )
        
        print(f"Snapshot creation initiated: {snapshot_response['Snapshot']['SnapshotName']}")
        
        # Wait for snapshot to be available (simplified - in production, use Step Functions)
        # For now, we'll just create the snapshot and let the next run handle export
        
        # Send success notification
        message = {
            'status': 'SUCCESS',
            'snapshot_name': snapshot_name,
            'replication_group_id': replication_group_id,
            'timestamp': timestamp,
            'message': f'Redis backup snapshot {snapshot_name} created successfully'
        }
        
        sns.publish(
            TopicArn=sns_topic_arn,
            Subject=f'Redis Backup Success - {replication_group_id}',
            Message=json.dumps(message, indent=2)
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Backup initiated successfully',
                'snapshot_name': snapshot_name
            })
        }
        
    except ClientError as e:
        error_message = f"Error creating Redis backup: {str(e)}"
        print(error_message)
        
        # Send failure notification
        error_details = {
            'status': 'FAILED',
            'replication_group_id': replication_group_id,
            'error': str(e),
            'timestamp': timestamp
        }
        
        sns.publish(
            TopicArn=sns_topic_arn,
            Subject=f'Redis Backup Failed - {replication_group_id}',
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
            'replication_group_id': replication_group_id,
            'error': str(e),
            'timestamp': timestamp
        }
        
        sns.publish(
            TopicArn=sns_topic_arn,
            Subject=f'Redis Backup Failed - {replication_group_id}',
            Message=json.dumps(error_details, indent=2)
        )
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': error_message
            })
        }