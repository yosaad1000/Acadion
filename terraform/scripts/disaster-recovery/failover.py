#!/usr/bin/env python3
"""
Automated Disaster Recovery Failover Script

This script automates the failover process from primary region to DR region.
It performs the following steps:
1. Verify primary region is down
2. Start DR services
3. Update DNS records
4. Verify DR services are healthy
5. Send notifications
"""

import boto3
import json
import time
import sys
import logging
from datetime import datetime
from typing import Dict, List, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DisasterRecoveryFailover:
    def __init__(self, config: Dict):
        """Initialize DR failover with configuration"""
        self.config = config
        self.primary_region = config['primary_region']
        self.dr_region = config['dr_region']
        
        # Initialize AWS clients
        self.primary_ecs = boto3.client('ecs', region_name=self.primary_region)
        self.dr_ecs = boto3.client('ecs', region_name=self.dr_region)
        self.route53 = boto3.client('route53')
        self.sns = boto3.client('sns', region_name=self.dr_region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=self.dr_region)
        
    def verify_primary_down(self) -> bool:
        """Verify that primary region services are actually down"""
        logger.info("Verifying primary region status...")
        
        try:
            # Check ECS cluster status
            cluster_name = self.config['primary_cluster_name']
            response = self.primary_ecs.describe_clusters(clusters=[cluster_name])
            
            if not response['clusters']:
                logger.warning(f"Primary cluster {cluster_name} not found")
                return True
                
            cluster = response['clusters'][0]
            if cluster['status'] != 'ACTIVE':
                logger.warning(f"Primary cluster status: {cluster['status']}")
                return True
                
            # Check service health
            services_response = self.primary_ecs.list_services(cluster=cluster_name)
            if not services_response['serviceArns']:
                logger.warning("No services found in primary cluster")
                return True
                
            # Check if services are running
            services_detail = self.primary_ecs.describe_services(
                cluster=cluster_name,
                services=services_response['serviceArns']
            )
            
            unhealthy_services = 0
            for service in services_detail['services']:
                if service['runningCount'] == 0 or service['desiredCount'] == 0:
                    unhealthy_services += 1
                    logger.warning(f"Service {service['serviceName']} is not running")
            
            # If more than 50% of services are down, consider primary region down
            if unhealthy_services > len(services_detail['services']) / 2:
                logger.info("Primary region appears to be down")
                return True
                
            logger.info("Primary region appears to be healthy")
            return False
            
        except Exception as e:
            logger.error(f"Error checking primary region: {e}")
            return True  # Assume down if we can't check
    
    def start_dr_services(self) -> bool:
        """Start services in DR region"""
        logger.info("Starting DR services...")
        
        try:
            cluster_name = self.config['dr_cluster_name']
            services = self.config['dr_services']
            
            for service_config in services:
                service_name = service_config['name']
                desired_count = service_config['desired_count']
                
                logger.info(f"Starting service {service_name} with {desired_count} tasks")
                
                # Update service to desired count
                self.dr_ecs.update_service(
                    cluster=cluster_name,
                    service=service_name,
                    desiredCount=desired_count
                )
                
                # Wait for service to stabilize
                logger.info(f"Waiting for service {service_name} to stabilize...")
                waiter = self.dr_ecs.get_waiter('services_stable')
                waiter.wait(
                    cluster=cluster_name,
                    services=[service_name],
                    WaiterConfig={
                        'Delay': 15,
                        'MaxAttempts': 40  # 10 minutes max
                    }
                )
                
                logger.info(f"Service {service_name} is now stable")
            
            return True
            
        except Exception as e:
            logger.error(f"Error starting DR services: {e}")
            return False
    
    def update_dns_records(self) -> bool:
        """Update Route 53 DNS records to point to DR region"""
        logger.info("Updating DNS records to DR region...")
        
        try:
            hosted_zone_id = self.config['hosted_zone_id']
            dns_records = self.config['dns_records']
            
            for record in dns_records:
                record_name = record['name']
                record_type = record['type']
                dr_value = record['dr_value']
                ttl = record.get('ttl', 60)  # Short TTL for faster failover
                
                logger.info(f"Updating {record_name} to point to {dr_value}")
                
                change_batch = {
                    'Comment': f'DR Failover - {datetime.now().isoformat()}',
                    'Changes': [{
                        'Action': 'UPSERT',
                        'ResourceRecordSet': {
                            'Name': record_name,
                            'Type': record_type,
                            'TTL': ttl,
                            'ResourceRecords': [{'Value': dr_value}]
                        }
                    }]
                }
                
                response = self.route53.change_resource_record_sets(
                    HostedZoneId=hosted_zone_id,
                    ChangeBatch=change_batch
                )
                
                change_id = response['ChangeInfo']['Id']
                logger.info(f"DNS change initiated: {change_id}")
                
                # Wait for change to propagate
                waiter = self.route53.get_waiter('resource_record_sets_changed')
                waiter.wait(Id=change_id)
                
                logger.info(f"DNS record {record_name} updated successfully")
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating DNS records: {e}")
            return False
    
    def verify_dr_health(self) -> bool:
        """Verify DR services are healthy"""
        logger.info("Verifying DR services health...")
        
        try:
            cluster_name = self.config['dr_cluster_name']
            services = self.config['dr_services']
            
            for service_config in services:
                service_name = service_config['name']
                expected_count = service_config['desired_count']
                
                # Check service status
                response = self.dr_ecs.describe_services(
                    cluster=cluster_name,
                    services=[service_name]
                )
                
                if not response['services']:
                    logger.error(f"Service {service_name} not found")
                    return False
                
                service = response['services'][0]
                running_count = service['runningCount']
                
                if running_count < expected_count:
                    logger.error(f"Service {service_name} has {running_count}/{expected_count} tasks running")
                    return False
                
                logger.info(f"Service {service_name} is healthy: {running_count}/{expected_count} tasks")
            
            # Additional health checks can be added here
            # e.g., HTTP health checks, database connectivity, etc.
            
            return True
            
        except Exception as e:
            logger.error(f"Error verifying DR health: {e}")
            return False
    
    def send_notifications(self, success: bool, details: str = "") -> None:
        """Send notifications about failover status"""
        logger.info("Sending failover notifications...")
        
        try:
            topic_arn = self.config['sns_topic_arn']
            timestamp = datetime.now().isoformat()
            
            if success:
                subject = f"DR Failover Successful - {timestamp}"
                message = f"""
Disaster Recovery Failover Completed Successfully

Timestamp: {timestamp}
Primary Region: {self.primary_region}
DR Region: {self.dr_region}

Services have been successfully failed over to the DR region.
DNS records have been updated to point to DR infrastructure.

{details}
"""
            else:
                subject = f"DR Failover Failed - {timestamp}"
                message = f"""
Disaster Recovery Failover Failed

Timestamp: {timestamp}
Primary Region: {self.primary_region}
DR Region: {self.dr_region}

Failover process encountered errors. Manual intervention may be required.

Error Details:
{details}
"""
            
            self.sns.publish(
                TopicArn=topic_arn,
                Subject=subject,
                Message=message
            )
            
            logger.info("Notifications sent successfully")
            
        except Exception as e:
            logger.error(f"Error sending notifications: {e}")
    
    def execute_failover(self) -> bool:
        """Execute the complete failover process"""
        logger.info("Starting disaster recovery failover process...")
        
        start_time = datetime.now()
        
        try:
            # Step 1: Verify primary is down
            if not self.verify_primary_down():
                logger.warning("Primary region appears healthy. Aborting failover.")
                return False
            
            # Step 2: Start DR services
            if not self.start_dr_services():
                self.send_notifications(False, "Failed to start DR services")
                return False
            
            # Step 3: Update DNS records
            if not self.update_dns_records():
                self.send_notifications(False, "Failed to update DNS records")
                return False
            
            # Step 4: Verify DR health
            if not self.verify_dr_health():
                self.send_notifications(False, "DR services are not healthy after failover")
                return False
            
            # Success!
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            details = f"Failover completed in {duration:.2f} seconds"
            self.send_notifications(True, details)
            
            logger.info(f"Disaster recovery failover completed successfully in {duration:.2f} seconds")
            return True
            
        except Exception as e:
            error_details = f"Unexpected error during failover: {str(e)}"
            logger.error(error_details)
            self.send_notifications(False, error_details)
            return False

def load_config(config_file: str) -> Dict:
    """Load configuration from JSON file"""
    try:
        with open(config_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading config file {config_file}: {e}")
        sys.exit(1)

def main():
    """Main function"""
    if len(sys.argv) != 2:
        print("Usage: python failover.py <config_file>")
        sys.exit(1)
    
    config_file = sys.argv[1]
    config = load_config(config_file)
    
    # Initialize and execute failover
    dr_failover = DisasterRecoveryFailover(config)
    success = dr_failover.execute_failover()
    
    if success:
        logger.info("Disaster recovery failover completed successfully")
        sys.exit(0)
    else:
        logger.error("Disaster recovery failover failed")
        sys.exit(1)

if __name__ == "__main__":
    main()