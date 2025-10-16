import json
import boto3
import os
import logging
from datetime import datetime

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    """
    Lambda function triggered by CloudWatch alarms to initiate DR failover
    """
    
    try:
        # Parse SNS message
        sns_message = json.loads(event['Records'][0]['Sns']['Message'])
        alarm_name = sns_message.get('AlarmName', 'Unknown')
        new_state = sns_message.get('NewStateValue', 'Unknown')
        
        logger.info(f"Received alarm: {alarm_name}, State: {new_state}")
        
        # Only proceed if alarm is in ALARM state
        if new_state != 'ALARM':
            logger.info("Alarm is not in ALARM state, skipping failover")
            return {
                'statusCode': 200,
                'body': json.dumps('Alarm not in ALARM state')
            }
        
        # Check if this is a composite alarm indicating primary region is down
        if 'primary-region-down' not in alarm_name:
            logger.info("Not a primary region down alarm, skipping automated failover")
            return {
                'statusCode': 200,
                'body': json.dumps('Not a failover trigger alarm')
            }
        
        # Initialize AWS clients
        dr_region = os.environ['DR_REGION']
        dr_cluster_name = os.environ['DR_CLUSTER_NAME']
        sns_topic_arn = os.environ['SNS_TOPIC_ARN']
        
        ecs_client = boto3.client('ecs', region_name=dr_region)
        sns_client = boto3.client('sns', region_name=dr_region)
        
        # Start DR services
        logger.info("Starting DR services...")
        
        # Define services to start
        services_to_start = [
            {'name': f'{dr_cluster_name.replace("-cluster", "")}-backend', 'desired_count': 2},
            {'name': f'{dr_cluster_name.replace("-cluster", "")}-frontend', 'desired_count': 2},
            {'name': f'{dr_cluster_name.replace("-cluster", "")}-face-recognition', 'desired_count': 1}
        ]
        
        started_services = []
        
        for service in services_to_start:
            service_name = service['name']
            desired_count = service['desired_count']
            
            try:
                logger.info(f"Starting service {service_name} with {desired_count} tasks")
                
                response = ecs_client.update_service(
                    cluster=dr_cluster_name,
                    service=service_name,
                    desiredCount=desired_count
                )
                
                started_services.append({
                    'service_name': service_name,
                    'desired_count': desired_count,
                    'status': 'started'
                })
                
                logger.info(f"Successfully started service {service_name}")
                
            except Exception as e:
                logger.error(f"Failed to start service {service_name}: {str(e)}")
                started_services.append({
                    'service_name': service_name,
                    'desired_count': desired_count,
                    'status': 'failed',
                    'error': str(e)
                })
        
        # Send notification about automated failover initiation
        notification_message = {
            'timestamp': datetime.now().isoformat(),
            'event': 'Automated DR Failover Initiated',
            'trigger_alarm': alarm_name,
            'dr_region': dr_region,
            'services_started': started_services,
            'next_steps': [
                'Monitor service health in DR region',
                'Update DNS records if not automated',
                'Verify application functionality',
                'Investigate primary region issues'
            ]
        }
        
        sns_client.publish(
            TopicArn=sns_topic_arn,
            Subject=f'URGENT: Automated DR Failover Initiated - {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}',
            Message=json.dumps(notification_message, indent=2)
        )
        
        logger.info("Automated failover initiation completed")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Automated failover initiated successfully',
                'services_started': len([s for s in started_services if s['status'] == 'started']),
                'services_failed': len([s for s in started_services if s['status'] == 'failed']),
                'timestamp': datetime.now().isoformat()
            })
        }
        
    except Exception as e:
        error_message = f"Error in automated failover: {str(e)}"
        logger.error(error_message)
        
        # Send error notification
        try:
            sns_client = boto3.client('sns', region_name=os.environ.get('DR_REGION', 'us-west-2'))
            sns_client.publish(
                TopicArn=os.environ.get('SNS_TOPIC_ARN', ''),
                Subject='ERROR: Automated DR Failover Failed',
                Message=f"Automated failover failed with error: {error_message}\n\nManual intervention required."
            )
        except:
            pass  # Don't fail if notification fails
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': error_message
            })
        }