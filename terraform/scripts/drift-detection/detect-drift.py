#!/usr/bin/env python3
"""
Configuration Drift Detection Script

This script detects configuration drift by comparing current infrastructure
state with Terraform configuration and AWS Config rules.
"""

import boto3
import json
import subprocess
import sys
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DriftDetector:
    def __init__(self, config: Dict):
        """Initialize drift detector with configuration"""
        self.config = config
        self.aws_region = config['aws_region']
        self.terraform_dir = config.get('terraform_dir', '.')
        
        # Initialize AWS clients
        self.config_client = boto3.client('config', region_name=self.aws_region)
        self.s3_client = boto3.client('s3', region_name=self.aws_region)
        self.sns_client = boto3.client('sns', region_name=self.aws_region)
        
        # Drift detection results
        self.drift_results = []
    
    def run_terraform_plan(self) -> Tuple[bool, str]:
        """Run terraform plan to detect infrastructure drift"""
        logger.info("Running Terraform plan to detect drift...")
        
        try:
            # Change to terraform directory
            original_dir = os.getcwd()
            os.chdir(self.terraform_dir)
            
            # Run terraform plan
            result = subprocess.run(
                ['terraform', 'plan', '-detailed-exitcode', '-no-color'],
                capture_output=True,
                text=True,
                timeout=300
            )
            
            os.chdir(original_dir)
            
            # Exit code 0: no changes, 1: error, 2: changes detected
            if result.returncode == 0:
                logger.info("No infrastructure drift detected")
                return False, "No changes detected"
            elif result.returncode == 2:
                logger.warning("Infrastructure drift detected")
                return True, result.stdout
            else:
                logger.error(f"Terraform plan failed: {result.stderr}")
                return True, f"Terraform error: {result.stderr}"
                
        except subprocess.TimeoutExpired:
            logger.error("Terraform plan timed out")
            return True, "Terraform plan timed out"
        except Exception as e:
            logger.error(f"Error running terraform plan: {e}")
            return True, f"Error: {str(e)}"
    
    def check_aws_config_compliance(self) -> List[Dict]:
        """Check AWS Config compliance for drift detection"""
        logger.info("Checking AWS Config compliance...")
        
        compliance_issues = []
        
        try:
            # Get compliance details for all config rules
            paginator = self.config_client.get_paginator('describe_compliance_by_config_rule')
            
            for page in paginator.paginate():
                for compliance in page['ComplianceByConfigRules']:
                    rule_name = compliance['ConfigRuleName']
                    compliance_type = compliance['Compliance']['ComplianceType']
                    
                    if compliance_type != 'COMPLIANT':
                        logger.warning(f"Config rule {rule_name} is {compliance_type}")
                        
                        # Get detailed compliance information
                        try:
                            details = self.config_client.get_compliance_details_by_config_rule(
                                ConfigRuleName=rule_name
                            )
                            
                            non_compliant_resources = []
                            for result in details['EvaluationResults']:
                                if result['ComplianceType'] != 'COMPLIANT':
                                    non_compliant_resources.append({
                                        'resource_type': result['EvaluationResultIdentifier']['EvaluationResultQualifier']['ResourceType'],
                                        'resource_id': result['EvaluationResultIdentifier']['EvaluationResultQualifier']['ResourceId'],
                                        'compliance_type': result['ComplianceType'],
                                        'result_recorded_time': result['ResultRecordedTime'].isoformat()
                                    })
                            
                            compliance_issues.append({
                                'rule_name': rule_name,
                                'compliance_type': compliance_type,
                                'non_compliant_resources': non_compliant_resources
                            })
                            
                        except Exception as e:
                            logger.warning(f"Could not get details for rule {rule_name}: {e}")
            
            return compliance_issues
            
        except Exception as e:
            logger.error(f"Error checking AWS Config compliance: {e}")
            return []
    
    def check_resource_tags(self) -> List[Dict]:
        """Check for resources with missing or incorrect tags"""
        logger.info("Checking resource tag compliance...")
        
        tag_issues = []
        required_tags = self.config.get('required_tags', ['Environment', 'Project', 'ManagedBy'])
        
        try:
            # This is a simplified example - in practice you'd check multiple resource types
            # Check ECS clusters
            ecs_client = boto3.client('ecs', region_name=self.aws_region)
            
            clusters = ecs_client.list_clusters()
            for cluster_arn in clusters['clusterArns']:
                cluster_name = cluster_arn.split('/')[-1]
                
                try:
                    tags_response = ecs_client.list_tags_for_resource(resourceArn=cluster_arn)
                    existing_tags = {tag['key']: tag['value'] for tag in tags_response['tags']}
                    
                    missing_tags = [tag for tag in required_tags if tag not in existing_tags]
                    
                    if missing_tags:
                        tag_issues.append({
                            'resource_type': 'ECS Cluster',
                            'resource_name': cluster_name,
                            'resource_arn': cluster_arn,
                            'missing_tags': missing_tags,
                            'existing_tags': existing_tags
                        })
                        
                except Exception as e:
                    logger.warning(f"Could not check tags for cluster {cluster_name}: {e}")
            
            return tag_issues
            
        except Exception as e:
            logger.error(f"Error checking resource tags: {e}")
            return []
    
    def check_security_groups(self) -> List[Dict]:
        """Check for security group configuration drift"""
        logger.info("Checking security group configurations...")
        
        sg_issues = []
        
        try:
            ec2_client = boto3.client('ec2', region_name=self.aws_region)
            
            # Get all security groups
            response = ec2_client.describe_security_groups()
            
            for sg in response['SecurityGroups']:
                sg_id = sg['GroupId']
                sg_name = sg['GroupName']
                
                # Check for overly permissive rules
                for rule in sg['IpPermissions']:
                    for ip_range in rule.get('IpRanges', []):
                        if ip_range.get('CidrIp') == '0.0.0.0/0':
                            # Check if this is an expected public rule
                            if not self._is_expected_public_rule(sg_name, rule):
                                sg_issues.append({
                                    'security_group_id': sg_id,
                                    'security_group_name': sg_name,
                                    'issue': 'overly_permissive_rule',
                                    'rule': rule,
                                    'cidr': '0.0.0.0/0'
                                })
            
            return sg_issues
            
        except Exception as e:
            logger.error(f"Error checking security groups: {e}")
            return []
    
    def _is_expected_public_rule(self, sg_name: str, rule: Dict) -> bool:
        """Check if a public security group rule is expected"""
        # Define expected public rules (customize based on your requirements)
        expected_public_rules = [
            {'port': 80, 'protocol': 'tcp'},   # HTTP
            {'port': 443, 'protocol': 'tcp'},  # HTTPS
        ]
        
        # Check if this is an ALB security group
        if 'alb' in sg_name.lower() or 'load-balancer' in sg_name.lower():
            rule_port = rule.get('FromPort')
            rule_protocol = rule.get('IpProtocol')
            
            for expected in expected_public_rules:
                if (rule_port == expected['port'] and 
                    rule_protocol == expected['protocol']):
                    return True
        
        return False
    
    def generate_drift_report(self) -> Dict:
        """Generate comprehensive drift detection report"""
        logger.info("Generating drift detection report...")
        
        # Run all drift detection checks
        terraform_drift, terraform_output = self.run_terraform_plan()
        config_issues = self.check_aws_config_compliance()
        tag_issues = self.check_resource_tags()
        sg_issues = self.check_security_groups()
        
        # Compile report
        report = {
            'timestamp': datetime.now().isoformat(),
            'aws_region': self.aws_region,
            'summary': {
                'terraform_drift_detected': terraform_drift,
                'config_compliance_issues': len(config_issues),
                'tag_compliance_issues': len(tag_issues),
                'security_group_issues': len(sg_issues),
                'total_issues': len(config_issues) + len(tag_issues) + len(sg_issues) + (1 if terraform_drift else 0)
            },
            'details': {
                'terraform_drift': {
                    'detected': terraform_drift,
                    'output': terraform_output
                },
                'config_compliance': config_issues,
                'tag_compliance': tag_issues,
                'security_groups': sg_issues
            },
            'recommendations': []
        }
        
        # Add recommendations based on findings
        if terraform_drift:
            report['recommendations'].append("Review Terraform plan output and apply changes or update configuration")
        
        if config_issues:
            report['recommendations'].append("Review AWS Config compliance issues and remediate non-compliant resources")
        
        if tag_issues:
            report['recommendations'].append("Update resource tags to meet compliance requirements")
        
        if sg_issues:
            report['recommendations'].append("Review security group rules and restrict overly permissive access")
        
        if report['summary']['total_issues'] == 0:
            report['recommendations'].append("No configuration drift detected - infrastructure is compliant")
        
        return report
    
    def store_report(self, report: Dict) -> str:
        """Store drift report in S3"""
        logger.info("Storing drift detection report...")
        
        try:
            bucket_name = self.config['report_bucket']
            report_key = f"drift-reports/{datetime.now().strftime('%Y/%m/%d')}/drift-report-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
            
            self.s3_client.put_object(
                Bucket=bucket_name,
                Key=report_key,
                Body=json.dumps(report, indent=2),
                ContentType='application/json',
                Metadata={
                    'report-type': 'drift-detection',
                    'timestamp': report['timestamp'],
                    'total-issues': str(report['summary']['total_issues'])
                }
            )
            
            logger.info(f"Report stored at s3://{bucket_name}/{report_key}")
            return f"s3://{bucket_name}/{report_key}"
            
        except Exception as e:
            logger.error(f"Error storing report: {e}")
            return ""
    
    def send_notifications(self, report: Dict, report_location: str = "") -> None:
        """Send drift detection notifications"""
        logger.info("Sending drift detection notifications...")
        
        try:
            topic_arn = self.config['sns_topic_arn']
            total_issues = report['summary']['total_issues']
            
            if total_issues > 0:
                subject = f"Configuration Drift Detected - {total_issues} Issues Found"
                severity = "WARNING" if total_issues < 5 else "CRITICAL"
            else:
                subject = "Configuration Drift Check - No Issues Found"
                severity = "INFO"
            
            message = {
                'severity': severity,
                'timestamp': report['timestamp'],
                'aws_region': self.aws_region,
                'summary': report['summary'],
                'report_location': report_location,
                'recommendations': report['recommendations'][:3]  # Top 3 recommendations
            }
            
            self.sns_client.publish(
                TopicArn=topic_arn,
                Subject=subject,
                Message=json.dumps(message, indent=2)
            )
            
            logger.info("Drift detection notifications sent")
            
        except Exception as e:
            logger.error(f"Error sending notifications: {e}")

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
        print("Usage: python detect-drift.py <config_file>")
        sys.exit(1)
    
    config_file = sys.argv[1]
    config = load_config(config_file)
    
    # Initialize and run drift detection
    detector = DriftDetector(config)
    report = detector.generate_drift_report()
    
    # Store and notify
    report_location = detector.store_report(report)
    detector.send_notifications(report, report_location)
    
    # Print summary
    print("\n" + "="*50)
    print("CONFIGURATION DRIFT DETECTION REPORT")
    print("="*50)
    print(f"Timestamp: {report['timestamp']}")
    print(f"Total Issues: {report['summary']['total_issues']}")
    print(f"Terraform Drift: {'Yes' if report['summary']['terraform_drift_detected'] else 'No'}")
    print(f"Config Issues: {report['summary']['config_compliance_issues']}")
    print(f"Tag Issues: {report['summary']['tag_compliance_issues']}")
    print(f"Security Group Issues: {report['summary']['security_group_issues']}")
    
    if report['recommendations']:
        print("\nRecommendations:")
        for rec in report['recommendations']:
            print(f"  - {rec}")
    
    if report_location:
        print(f"\nFull report: {report_location}")
    
    # Exit with appropriate code
    sys.exit(1 if report['summary']['total_issues'] > 0 else 0)

if __name__ == "__main__":
    main()