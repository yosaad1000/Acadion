"""
CloudWatch custom metrics service for application monitoring.
Publishes custom metrics to CloudWatch for business logic monitoring.
"""

import boto3
import time
from typing import Dict, Any, Optional, List
from datetime import datetime
from botocore.exceptions import ClientError, NoCredentialsError
from app.config.logging import get_logger, log_error_with_context

logger = get_logger(__name__)

class CloudWatchMetrics:
    """Service for publishing custom metrics to CloudWatch."""
    
    def __init__(self):
        """Initialize CloudWatch client."""
        try:
            self.cloudwatch = boto3.client('cloudwatch')
            self.namespace = 'Acadion/Application'
            self._connection_healthy = True
            logger.info("CloudWatch metrics service initialized successfully")
        except (ClientError, NoCredentialsError) as e:
            logger.warning(f"CloudWatch not available: {e}")
            self.cloudwatch = None
            self._connection_healthy = False
    
    def is_available(self) -> bool:
        """Check if CloudWatch is available."""
        return self._connection_healthy and self.cloudwatch is not None
    
    def put_metric(
        self,
        metric_name: str,
        value: float,
        unit: str = 'Count',
        dimensions: Optional[Dict[str, str]] = None,
        timestamp: Optional[datetime] = None
    ) -> bool:
        """
        Put a single metric to CloudWatch.
        
        Args:
            metric_name: Name of the metric
            value: Metric value
            unit: Metric unit (Count, Seconds, Bytes, etc.)
            dimensions: Optional dimensions for the metric
            timestamp: Optional timestamp (defaults to now)
        
        Returns:
            True if successful, False otherwise
        """
        if not self.is_available():
            return False
        
        try:
            metric_data = {
                'MetricName': metric_name,
                'Value': value,
                'Unit': unit,
                'Timestamp': timestamp or datetime.utcnow()
            }
            
            if dimensions:
                metric_data['Dimensions'] = [
                    {'Name': key, 'Value': value} for key, value in dimensions.items()
                ]
            
            self.cloudwatch.put_metric_data(
                Namespace=self.namespace,
                MetricData=[metric_data]
            )
            
            logger.debug(f"Published metric: {metric_name} = {value}")
            return True
            
        except Exception as e:
            log_error_with_context(
                logger,
                e,
                {
                    'metric_name': metric_name,
                    'value': value,
                    'unit': unit,
                    'dimensions': dimensions
                }
            )
            return False
    
    def put_metrics(self, metrics: List[Dict[str, Any]]) -> bool:
        """
        Put multiple metrics to CloudWatch in a single call.
        
        Args:
            metrics: List of metric dictionaries
        
        Returns:
            True if successful, False otherwise
        """
        if not self.is_available():
            return False
        
        try:
            metric_data = []
            for metric in metrics:
                data = {
                    'MetricName': metric['name'],
                    'Value': metric['value'],
                    'Unit': metric.get('unit', 'Count'),
                    'Timestamp': metric.get('timestamp', datetime.utcnow())
                }
                
                if 'dimensions' in metric:
                    data['Dimensions'] = [
                        {'Name': key, 'Value': value} 
                        for key, value in metric['dimensions'].items()
                    ]
                
                metric_data.append(data)
            
            # CloudWatch allows up to 20 metrics per call
            for i in range(0, len(metric_data), 20):
                batch = metric_data[i:i+20]
                self.cloudwatch.put_metric_data(
                    Namespace=self.namespace,
                    MetricData=batch
                )
            
            logger.debug(f"Published {len(metrics)} metrics to CloudWatch")
            return True
            
        except Exception as e:
            log_error_with_context(
                logger,
                e,
                {'metrics_count': len(metrics)}
            )
            return False
    
    # Business-specific metric methods
    
    def record_face_processing_time(self, processing_time: float, faces_detected: int) -> None:
        """Record face processing metrics."""
        metrics = [
            {
                'name': 'FaceProcessingTime',
                'value': processing_time,
                'unit': 'Seconds',
                'dimensions': {'Service': 'face-recognition'}
            },
            {
                'name': 'FacesDetected',
                'value': faces_detected,
                'unit': 'Count',
                'dimensions': {'Service': 'face-recognition'}
            }
        ]
        self.put_metrics(metrics)
    
    def record_attendance_session(self, session_type: str, student_count: int) -> None:
        """Record attendance session metrics."""
        metrics = [
            {
                'name': 'AttendanceSession',
                'value': 1,
                'unit': 'Count',
                'dimensions': {'SessionType': session_type}
            },
            {
                'name': 'StudentsInSession',
                'value': student_count,
                'unit': 'Count',
                'dimensions': {'SessionType': session_type}
            }
        ]
        self.put_metrics(metrics)
    
    def record_api_request(self, endpoint: str, method: str, status_code: int, response_time: float) -> None:
        """Record API request metrics."""
        metrics = [
            {
                'name': 'APIRequest',
                'value': 1,
                'unit': 'Count',
                'dimensions': {
                    'Endpoint': endpoint,
                    'Method': method,
                    'StatusCode': str(status_code)
                }
            },
            {
                'name': 'APIResponseTime',
                'value': response_time,
                'unit': 'Seconds',
                'dimensions': {
                    'Endpoint': endpoint,
                    'Method': method
                }
            }
        ]
        self.put_metrics(metrics)
    
    def record_user_activity(self, activity_type: str, user_role: str) -> None:
        """Record user activity metrics."""
        self.put_metric(
            metric_name='UserActivity',
            value=1,
            unit='Count',
            dimensions={
                'ActivityType': activity_type,
                'UserRole': user_role
            }
        )
    
    def record_error(self, error_type: str, service: str) -> None:
        """Record error metrics."""
        self.put_metric(
            metric_name='ApplicationError',
            value=1,
            unit='Count',
            dimensions={
                'ErrorType': error_type,
                'Service': service
            }
        )
    
    def record_queue_length(self, queue_name: str, length: int) -> None:
        """Record queue length metrics."""
        self.put_metric(
            metric_name='QueueLength',
            value=length,
            unit='Count',
            dimensions={'QueueName': queue_name}
        )

# Global instance
cloudwatch_metrics = CloudWatchMetrics()