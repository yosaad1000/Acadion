# Outputs for CDN module

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.arn
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "CloudFront Route 53 zone ID"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}

output "cloudfront_status" {
  description = "Current status of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.status
}

output "cloudfront_etag" {
  description = "Current version of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.etag
}

output "origin_access_control_id" {
  description = "ID of the Origin Access Control"
  value       = aws_cloudfront_origin_access_control.s3_oac.id
}

output "security_headers_function_arn" {
  description = "ARN of the CloudFront security headers function"
  value       = aws_cloudfront_function.security_headers.arn
}

# Failover distribution outputs (if enabled)
output "failover_distribution_id" {
  description = "ID of the failover CloudFront distribution"
  value       = var.enable_origin_failover ? aws_cloudfront_distribution.failover[0].id : null
}

output "failover_distribution_domain_name" {
  description = "Domain name of the failover CloudFront distribution"
  value       = var.enable_origin_failover ? aws_cloudfront_distribution.failover[0].domain_name : null
}

# Cache invalidation outputs
output "invalidation_id" {
  description = "ID of the CloudFront cache invalidation"
  value       = var.create_invalidation ? aws_cloudfront_invalidation.deployment[0].id : null
}

output "invalidation_status" {
  description = "Status of the CloudFront cache invalidation"
  value       = var.create_invalidation ? aws_cloudfront_invalidation.deployment[0].status : null
}

# URLs for different environments
output "distribution_url" {
  description = "Full URL of the CloudFront distribution"
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "api_url" {
  description = "API URL through CloudFront"
  value       = "https://${aws_cloudfront_distribution.main.domain_name}/api"
}

output "static_assets_url" {
  description = "Static assets URL through CloudFront"
  value       = "https://${aws_cloudfront_distribution.main.domain_name}/static"
}

# Monitoring and logging
output "cloudfront_monitoring_dashboard_url" {
  description = "URL to CloudFront monitoring dashboard"
  value       = "https://console.aws.amazon.com/cloudfront/v3/home#/distributions/${aws_cloudfront_distribution.main.id}"
}

output "cache_behaviors_count" {
  description = "Number of cache behaviors configured"
  value       = length(aws_cloudfront_distribution.main.ordered_cache_behavior) + 1
}