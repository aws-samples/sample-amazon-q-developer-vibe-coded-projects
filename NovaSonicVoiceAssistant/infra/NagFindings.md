# CDK Nag Findings for Smart Todo App

This document lists all the security and best practice findings identified by CDK Nag in the Smart Todo App infrastructure.

## S3 Bucket Issues

| Finding ID | Severity | Description | Resource | Suppression Reason |
|------------|----------|-------------|----------|-------------------|
| AwsSolutions-S1 | Error | S3 bucket has server access logs disabled | WebsiteBucket | Server access logs not required for demo application |
| ~~AwsSolutions-S10~~ | ~~Error~~ | ~~S3 bucket doesn't require SSL/TLS for requests~~ | ~~WebsiteBucket, WebsiteBucket/Policy~~ | ~~Fixed: Added enforceSSL: true to the S3 bucket configuration~~ |

## CloudFront Distribution Issues

| Finding ID | Severity | Description | Resource | Suppression Reason |
|------------|----------|-------------|----------|-------------------|
| AwsSolutions-CFR1 | Warning | CloudFront distribution may require Geo restrictions | Distribution | Geo restrictions not required for demo application |
| AwsSolutions-CFR2 | Warning | CloudFront distribution may require AWS WAF integration | Distribution | WAF integration not required for demo application |
| AwsSolutions-CFR3 | Error | CloudFront distribution doesn't have access logging enabled | Distribution | Access logging not required for demo application |
| ~~AwsSolutions-CFR4~~ | ~~Error~~ | ~~CloudFront distribution allows for SSLv3 or TLSv1~~ | ~~Distribution~~ | ~~Fixed: Set minimumProtocolVersion to TLS_V1_2_2021~~ |
| AwsSolutions-CFR7 | Error | CloudFront distribution doesn't use origin access control with S3 | Distribution | Using S3 origin instead of OAC for demo purposes |

## IAM Issues

| Finding ID | Severity | Description | Resource | Suppression Reason |
|------------|----------|-------------|----------|-------------------|
| ~~AwsSolutions-IAM4~~ | ~~Error~~ | ~~Using AWS managed policies instead of customer-managed policies~~ | ~~Multiple roles~~ | ~~Fixed: Replaced all AWS managed policies with custom policies~~ |
| ~~AwsSolutions-IAM5~~ | ~~Error~~ | ~~Wildcard permissions in IAM policies~~ | ~~Multiple policies~~ | ~~Fixed: Replaced wildcard permissions with specific resource patterns~~ |

## Lambda Issues

| Finding ID | Severity | Description | Resource | Suppression Reason |
|------------|----------|-------------|----------|-------------------|
| AwsSolutions-L1 | Error | Lambda functions not configured to use the latest runtime version | CDKBucketDeployment | Using specific runtime version for compatibility |

## Cognito Issues

| Finding ID | Severity | Description | Resource | Suppression Reason |
|------------|----------|-------------|----------|-------------------|
| ~~AwsSolutions-COG1~~ | ~~Error~~ | ~~Cognito user pool doesn't have a strong password policy~~ | ~~UserPool~~ | ~~Fixed: Now requires symbols and has a strong password policy~~ |
| AwsSolutions-COG2 | Warning | Cognito user pool doesn't require MFA | UserPool | MFA not required for demo application |
| AwsSolutions-COG3 | Error | Cognito user pool doesn't have AdvancedSecurityMode set to ENFORCED | UserPool | Advanced security mode requires Cognito User Pool Plus features plan |

## DynamoDB Issues

| Finding ID | Severity | Description | Resource | Suppression Reason |
|------------|----------|-------------|----------|-------------------|
| AwsSolutions-DDB3 | Warning | DynamoDB table doesn't have Point-in-time Recovery enabled | SmartTodoTable | Point-in-time recovery not required for demo application |

## VPC Issues

| Finding ID | Severity | Description | Resource | Suppression Reason |
|------------|----------|-------------|----------|-------------------|
| AwsSolutions-VPC7 | Error | The VPC does not have an associated Flow Log | ApiVpc | Flow logs not required for demo application |

## Load Balancer Issues

| Finding ID | Severity | Description | Resource | Suppression Reason |
|------------|----------|-------------|----------|-------------------|
| AwsSolutions-ELB2 | Error | The ELB does not have access logs enabled | ApiLoadBalancer | Access logs not required for demo application |
| CdkNagValidationFailure[AwsSolutions-EC23] | Warning | Security group validation failure | LbSecurityGroup, ServiceSecurityGroup | Intrinsic function used in CIDR block parameter |

## Remaining Suppressions

The following findings are suppressed for the demo application:

1. **S3 and CloudFront Logging**: Access logging is not required for the demo application
2. **CloudFront Security Features**: WAF and geo-restrictions are not required for the demo application
3. **Cognito MFA and Advanced Security**: Not required for the demo application
4. **DynamoDB Point-in-time Recovery**: Not required for the demo application
5. **Lambda Runtime Version**: Using specific runtime version for compatibility
6. **VPC Flow Logs**: Not required for the demo application
7. **Load Balancer Access Logs**: Not required for the demo application
8. **Security Group Validation Failures**: Due to intrinsic functions in CIDR block parameters

## Production Recommendations

For a production environment, consider addressing these issues:
1. Enable server access logs for S3 buckets
2. Configure CloudFront with WAF and geo-restrictions
3. Enable MFA for Cognito user pools
4. Enable Point-in-time Recovery for DynamoDB tables
5. Update Lambda functions to use the latest runtime
6. Enable VPC Flow Logs for network monitoring and troubleshooting
7. Enable access logs for the Application Load Balancer
