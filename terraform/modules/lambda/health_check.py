import json
import boto3
import requests
from datetime import datetime

def lambda_handler(event, context):
    """
    Health check Lambda function for Acadion infrastructure
    """
    
    # Initialize clients
    cloudwatch = boto3.client('cloudwatch')
    
    # Health check results
    results = {
        'timestamp': datetime.utcnow().isoformat(),
        'checks': {}
    }
    
    try:
        # Check EC2 instance health (via CloudWatch metrics)
        ec2_health = check_ec2_health(cloudwatch)
        results['checks']['ec2'] = ec2_health
        
        # Check Lambda function health
        lambda_health = check_lambda_health(cloudwatch)
        results['checks']['lambda'] = lambda_health
        
        # Check SQS queue health
        sqs_health = check_sqs_health()
        results['checks']['sqs'] = sqs_health
        
        # Overall health status
        all_healthy = all(check['status'] == 'healthy' for check in results['checks'].values())
        results['overall_status'] = 'healthy' if all_healthy else 'unhealthy'
        
        # Send custom metrics to CloudWatch
        send_health_metrics(cloudwatch, results)
        
        return {
            'statusCode': 200,
            'body': json.dumps(results)
        }
        
    except Exception as e:
        print(f"Health check error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
        }

def check_ec2_health(cloudwatch):
    """Check EC2 instance health via CloudWatch metrics"""
    try:
        # Get CPU utilization for the last 5 minutes
        response = cloudwatch.get_metric_statistics(
            Namespace='AWS/EC2',
            MetricName='CPUUtilization',
            Dimensions=[
                {
                    'Name': 'InstanceId',
                    'Value': '${name_prefix}-backend'  # This will be templated
                }
            ],
            StartTime=datetime.utcnow().replace(minute=datetime.utcnow().minute-5),
            EndTime=datetime.utcnow(),
            Period=300,
            Statistics=['Average']
        )
        
        if response['Datapoints']:
            cpu_avg = response['Datapoints'][-1]['Average']
            status = 'healthy' if cpu_avg < 80 else 'warning'
            return {
                'status': status,
                'cpu_utilization': cpu_avg,
                'message': f'CPU utilization: {cpu_avg:.2f}%'
            }
        else:
            return {
                'status': 'unknown',
                'message': 'No CPU metrics available'
            }
            
    except Exception as e:
        return {
            'status': 'error',
            'message': f'EC2 health check failed: {str(e)}'
        }

def check_lambda_health(cloudwatch):
    """Check Lambda function health"""
    try:
        # Get error rate for the last 5 minutes
        response = cloudwatch.get_metric_statistics(
            Namespace='AWS/Lambda',
            MetricName='Errors',
            Dimensions=[
                {
                    'Name': 'FunctionName',
                    'Value': '${name_prefix}-face-recognition'
                }
            ],
            StartTime=datetime.utcnow().replace(minute=datetime.utcnow().minute-5),
            EndTime=datetime.utcnow(),
            Period=300,
            Statistics=['Sum']
        )
        
        error_count = 0
        if response['Datapoints']:
            error_count = response['Datapoints'][-1]['Sum']
        
        status = 'healthy' if error_count == 0 else 'warning' if error_count < 5 else 'unhealthy'
        
        return {
            'status': status,
            'error_count': error_count,
            'message': f'Errors in last 5 minutes: {error_count}'
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'message': f'Lambda health check failed: {str(e)}'
        }

def check_sqs_health():
    """Check SQS queue health"""
    try:
        sqs = boto3.client('sqs')
        
        # Get queue attributes
        queue_url = f"https://sqs.{boto3.Session().region_name}.amazonaws.com/{boto3.client('sts').get_caller_identity()['Account']}/${name_prefix}-face-processing"
        
        response = sqs.get_queue_attributes(
            QueueUrl=queue_url,
            AttributeNames=['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible']
        )
        
        visible_messages = int(response['Attributes'].get('ApproximateNumberOfMessages', 0))
        invisible_messages = int(response['Attributes'].get('ApproximateNumberOfMessagesNotVisible', 0))
        
        total_messages = visible_messages + invisible_messages
        status = 'healthy' if total_messages < 100 else 'warning' if total_messages < 500 else 'unhealthy'
        
        return {
            'status': status,
            'visible_messages': visible_messages,
            'processing_messages': invisible_messages,
            'message': f'Queue depth: {total_messages} messages'
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'message': f'SQS health check failed: {str(e)}'
        }

def send_health_metrics(cloudwatch, results):
    """Send custom health metrics to CloudWatch"""
    try:
        # Send overall health metric
        overall_healthy = 1 if results['overall_status'] == 'healthy' else 0
        
        cloudwatch.put_metric_data(
            Namespace='Acadion/Health',
            MetricData=[
                {
                    'MetricName': 'OverallHealth',
                    'Value': overall_healthy,
                    'Unit': 'Count',
                    'Timestamp': datetime.utcnow()
                }
            ]
        )
        
        # Send individual service health metrics
        for service, check in results['checks'].items():
            service_healthy = 1 if check['status'] == 'healthy' else 0
            
            cloudwatch.put_metric_data(
                Namespace='Acadion/Health',
                MetricData=[
                    {
                        'MetricName': f'{service.title()}Health',
                        'Value': service_healthy,
                        'Unit': 'Count',
                        'Timestamp': datetime.utcnow()
                    }
                ]
            )
            
    except Exception as e:
        print(f"Failed to send health metrics: {str(e)}")