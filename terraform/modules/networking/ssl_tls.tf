# SSL/TLS and Certificate Management Configuration
# Provides HTTPS encryption for all endpoints and proper certificate management

# ACM Certificate for the main domain
resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-main-certificate"
  })
}

# Route53 records for certificate validation
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.route53_zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]

  timeouts {
    create = "5m"
  }
}

# Wildcard certificate for subdomains (optional)
resource "aws_acm_certificate" "wildcard" {
  count = var.enable_wildcard_certificate ? 1 : 0

  domain_name       = "*.${var.domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-wildcard-certificate"
  })
}

# Route53 records for wildcard certificate validation
resource "aws_route53_record" "wildcard_cert_validation" {
  for_each = var.enable_wildcard_certificate ? {
    for dvo in aws_acm_certificate.wildcard[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.route53_zone_id
}

# Wildcard certificate validation
resource "aws_acm_certificate_validation" "wildcard" {
  count = var.enable_wildcard_certificate ? 1 : 0

  certificate_arn         = aws_acm_certificate.wildcard[0].arn
  validation_record_fqdns = [for record in aws_route53_record.wildcard_cert_validation : record.fqdn]

  timeouts {
    create = "5m"
  }
}

# CloudWatch Certificate Expiry Monitoring
resource "aws_cloudwatch_metric_alarm" "certificate_expiry" {
  alarm_name          = "${var.name_prefix}-certificate-expiry"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "DaysToExpiry"
  namespace           = "AWS/CertificateManager"
  period              = "86400"  # 24 hours
  statistic           = "Minimum"
  threshold           = "30"     # Alert 30 days before expiry
  alarm_description   = "SSL certificate expires in less than 30 days"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    CertificateArn = aws_acm_certificate.main.arn
  }

  tags = var.common_tags
}

# CloudWatch Certificate Expiry Monitoring for Wildcard (if enabled)
resource "aws_cloudwatch_metric_alarm" "wildcard_certificate_expiry" {
  count = var.enable_wildcard_certificate ? 1 : 0

  alarm_name          = "${var.name_prefix}-wildcard-certificate-expiry"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "DaysToExpiry"
  namespace           = "AWS/CertificateManager"
  period              = "86400"
  statistic           = "Minimum"
  threshold           = "30"
  alarm_description   = "Wildcard SSL certificate expires in less than 30 days"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    CertificateArn = aws_acm_certificate.wildcard[0].arn
  }

  tags = var.common_tags
}

# Security Policy for ALB (TLS 1.2 minimum)
locals {
  ssl_policy = "ELBSecurityPolicy-TLS-1-2-2017-01"
}

# Lambda function for certificate rotation monitoring
resource "aws_lambda_function" "certificate_monitor" {
  filename         = "certificate_monitor.zip"
  function_name    = "${var.name_prefix}-certificate-monitor"
  role            = aws_iam_role.certificate_monitor_role.arn
  handler         = "index.handler"
  runtime         = "python3.9"
  timeout         = 60

  source_code_hash = data.archive_file.certificate_monitor_zip.output_base64sha256

  environment {
    variables = {
      SNS_TOPIC_ARN = var.sns_topic_arn
      DOMAIN_NAME   = var.domain_name
    }
  }

  tags = var.common_tags
}

# Create Lambda deployment package for certificate monitoring
data "archive_file" "certificate_monitor_zip" {
  type        = "zip"
  output_path = "certificate_monitor.zip"
  source {
    content = <<EOF
import json
import boto3
import logging
from datetime import datetime, timedelta
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

acm = boto3.client('acm')
sns = boto3.client('sns')

def handler(event, context):
    """Monitor certificate expiry and send alerts"""
    
    try:
        domain_name = os.environ['DOMAIN_NAME']
        sns_topic_arn = os.environ['SNS_TOPIC_ARN']
        
        # List certificates
        response = acm.list_certificates(
            CertificateStatuses=['ISSUED']
        )
        
        for cert in response['CertificateSummaryList']:
            if domain_name in cert['DomainName']:
                cert_details = acm.describe_certificate(
                    CertificateArn=cert['CertificateArn']
                )
                
                expiry_date = cert_details['Certificate']['NotAfter']
                days_until_expiry = (expiry_date.replace(tzinfo=None) - datetime.utcnow()).days
                
                logger.info(f"Certificate {cert['DomainName']} expires in {days_until_expiry} days")
                
                # Alert if certificate expires in less than 30 days
                if days_until_expiry <= 30:
                    message = f"""
🚨 SSL Certificate Expiry Alert

Domain: {cert['DomainName']}
Certificate ARN: {cert['CertificateArn']}
Expiry Date: {expiry_date}
Days Until Expiry: {days_until_expiry}

Please renew the certificate immediately.
                    """
                    
                    sns.publish(
                        TopicArn=sns_topic_arn,
                        Subject=f'SSL Certificate Expiry Alert: {cert["DomainName"]}',
                        Message=message
                    )
                    
                    logger.warning(f"Expiry alert sent for {cert['DomainName']}")
        
        return {
            'statusCode': 200,
            'body': json.dumps('Certificate monitoring completed successfully')
        }
        
    except Exception as e:
        logger.error(f"Error monitoring certificates: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }
EOF
    filename = "index.py"
  }
}

# IAM role for certificate monitoring Lambda
resource "aws_iam_role" "certificate_monitor_role" {
  name = "${var.name_prefix}-certificate-monitor-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

# IAM policy for certificate monitoring Lambda
resource "aws_iam_role_policy" "certificate_monitor_policy" {
  name = "${var.name_prefix}-certificate-monitor-policy"
  role = aws_iam_role.certificate_monitor_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "acm:ListCertificates",
          "acm:DescribeCertificate"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = var.sns_topic_arn
      }
    ]
  })
}

# EventBridge rule to trigger certificate monitoring daily
resource "aws_cloudwatch_event_rule" "certificate_monitor_schedule" {
  name                = "${var.name_prefix}-certificate-monitor-schedule"
  description         = "Trigger certificate monitoring daily"
  schedule_expression = "rate(1 day)"

  tags = var.common_tags
}

# EventBridge target for certificate monitoring Lambda
resource "aws_cloudwatch_event_target" "certificate_monitor_target" {
  rule      = aws_cloudwatch_event_rule.certificate_monitor_schedule.name
  target_id = "CertificateMonitorTarget"
  arn       = aws_lambda_function.certificate_monitor.arn
}

# Lambda permission for EventBridge
resource "aws_lambda_permission" "allow_eventbridge_certificate_monitor" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.certificate_monitor.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.certificate_monitor_schedule.arn
}