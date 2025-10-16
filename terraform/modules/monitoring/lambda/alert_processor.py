"""
AWS Lambda function for processing CloudWatch alerts and sending formatted notifications.
Handles alert enrichment, formatting, and routing to different notification channels.
"""

import json
import os
import urllib3
from datetime import datetime
from typing import Dict, Any, Optional

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Process CloudWatch alerts from SNS and send formatted notifications.
    
    Args:
        event: SNS event containing CloudWatch alarm data
        context: Lambda context object
    
    Returns:
        Response dictionary with processing status
    """
    
    try:
        # Parse SNS message
        for record in event.get('Records', []):
            if record.get('EventSource') == 'aws:sns':
                message = json.loads(record['Sns']['Message'])
                process_alarm(message)
        
        return {
            'statusCode': 200,
            'body': json.dumps('Alerts processed successfully')
        }
        
    except Exception as e:
        print(f"Error processing alerts: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error processing alerts: {str(e)}')
        }

def process_alarm(alarm_data: Dict[str, Any]) -> None:
    """
    Process individual CloudWatch alarm and send notifications.
    
    Args:
        alarm_data: CloudWatch alarm data from SNS message
    """
    
    alarm_name = alarm_data.get('AlarmName', 'Unknown Alarm')
    new_state = alarm_data.get('NewStateValue', 'UNKNOWN')
    old_state = alarm_data.get('OldStateValue', 'UNKNOWN')
    reason = alarm_data.get('NewStateReason', 'No reason provided')
    timestamp = alarm_data.get('StateChangeTime', datetime.utcnow().isoformat())
    
    # Determine severity based on alarm name and state
    severity = determine_severity(alarm_name, new_state)
    
    # Create formatted message
    message = format_alert_message(
        alarm_name=alarm_name,
        new_state=new_state,
        old_state=old_state,
        reason=reason,
        timestamp=timestamp,
        severity=severity
    )
    
    # Send to appropriate channels based on severity
    if severity == 'critical':
        send_slack_notification(message, urgent=True)
    else:
        send_slack_notification(message, urgent=False)
    
    print(f"Processed alarm: {alarm_name} - {new_state}")

def determine_severity(alarm_name: str, state: str) -> str:
    """
    Determine alert severity based on alarm name and state.
    
    Args:
        alarm_name: Name of the CloudWatch alarm
        state: Current alarm state
    
    Returns:
        Severity level (critical, high, medium, low)
    """
    
    if state != 'ALARM':
        return 'info'
    
    critical_keywords = [
        'service-health',
        'database-connection',
        '5xx-errors'
    ]
    
    high_keywords = [
        'cpu-high',
        'memory-high',
        'response-time-high'
    ]
    
    alarm_lower = alarm_name.lower()
    
    if any(keyword in alarm_lower for keyword in critical_keywords):
        return 'critical'
    elif any(keyword in alarm_lower for keyword in high_keywords):
        return 'high'
    else:
        return 'medium'

def format_alert_message(
    alarm_name: str,
    new_state: str,
    old_state: str,
    reason: str,
    timestamp: str,
    severity: str
) -> Dict[str, Any]:
    """
    Format alert message for Slack notification.
    
    Args:
        alarm_name: Name of the alarm
        new_state: New alarm state
        old_state: Previous alarm state
        reason: Reason for state change
        timestamp: Timestamp of state change
        severity: Alert severity level
    
    Returns:
        Formatted message dictionary
    """
    
    # Color coding based on state and severity
    color_map = {
        'ALARM': {
            'critical': '#FF0000',  # Red
            'high': '#FF6600',      # Orange
            'medium': '#FFCC00',    # Yellow
            'low': '#CCCCCC'        # Gray
        },
        'OK': '#00FF00',            # Green
        'INSUFFICIENT_DATA': '#0099FF'  # Blue
    }
    
    color = color_map.get(new_state, {}).get(severity, '#CCCCCC') if new_state == 'ALARM' else color_map.get(new_state, '#CCCCCC')
    
    # Emoji based on severity
    emoji_map = {
        'critical': '🚨',
        'high': '⚠️',
        'medium': '⚡',
        'low': 'ℹ️',
        'info': '✅'
    }
    
    emoji = emoji_map.get(severity, 'ℹ️')
    
    # Create Slack message
    message = {
        'attachments': [
            {
                'color': color,
                'title': f"{emoji} {alarm_name}",
                'fields': [
                    {
                        'title': 'State',
                        'value': f"{old_state} → {new_state}",
                        'short': True
                    },
                    {
                        'title': 'Severity',
                        'value': severity.upper(),
                        'short': True
                    },
                    {
                        'title': 'Environment',
                        'value': os.getenv('ENVIRONMENT', 'unknown'),
                        'short': True
                    },
                    {
                        'title': 'Time',
                        'value': timestamp,
                        'short': True
                    },
                    {
                        'title': 'Reason',
                        'value': reason,
                        'short': False
                    }
                ],
                'footer': 'Acadion Monitoring',
                'ts': int(datetime.utcnow().timestamp())
            }
        ]
    }
    
    return message

def send_slack_notification(message: Dict[str, Any], urgent: bool = False) -> None:
    """
    Send notification to Slack webhook.
    
    Args:
        message: Formatted Slack message
        urgent: Whether this is an urgent notification
    """
    
    webhook_url = os.getenv('SLACK_WEBHOOK_URL')
    if not webhook_url:
        print("No Slack webhook URL configured")
        return
    
    try:
        http = urllib3.PoolManager()
        
        # Add urgency indicator for critical alerts
        if urgent:
            message['text'] = "🚨 CRITICAL ALERT 🚨"
        
        response = http.request(
            'POST',
            webhook_url,
            body=json.dumps(message),
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status == 200:
            print("Slack notification sent successfully")
        else:
            print(f"Failed to send Slack notification: {response.status}")
            
    except Exception as e:
        print(f"Error sending Slack notification: {str(e)}")

def get_runbook_link(alarm_name: str) -> Optional[str]:
    """
    Get runbook link for specific alarm type.
    
    Args:
        alarm_name: Name of the CloudWatch alarm
    
    Returns:
        URL to relevant runbook or None
    """
    
    runbook_base_url = "https://github.com/your-org/acadion/wiki/runbooks"
    
    runbook_map = {
        'cpu-high': f"{runbook_base_url}/High-CPU-Usage",
        'memory-high': f"{runbook_base_url}/High-Memory-Usage",
        '5xx-errors': f"{runbook_base_url}/5XX-Errors",
        'response-time-high': f"{runbook_base_url}/High-Response-Time",
        'database-connection': f"{runbook_base_url}/Database-Connection-Issues",
        'face-recognition-failures': f"{runbook_base_url}/Face-Recognition-Issues"
    }
    
    for keyword, url in runbook_map.items():
        if keyword in alarm_name.lower():
            return url
    
    return f"{runbook_base_url}/General-Troubleshooting"