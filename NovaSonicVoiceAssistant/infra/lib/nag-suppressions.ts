import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

/**
 * Helper function to add CDK Nag suppressions to specific constructs
 * @param scope The construct to add suppressions to
 */
export function addNagSuppressions(scope: Construct): void {
  NagSuppressions.addResourceSuppressions(
    scope,
    [
      // S3 Bucket Issues
      {
        id: 'AwsSolutions-S1',
        reason: 'Server access logs not required for demo application',
      },
      // CloudFront Distribution Issues
      {
        id: 'AwsSolutions-CFR1',
        reason: 'Geo restrictions not required for demo application',
      },
      {
        id: 'AwsSolutions-CFR2',
        reason: 'WAF implemented at ALB level, and skipped on CloudFront to prevent double execution',
      },
      {
        id: 'AwsSolutions-CFR3',
        reason: 'Access logging not required for demo application',
      },
      {
        id: 'AwsSolutions-CFR4',
        reason: 'We are not using custom domain for Demo Application',
      },
      {
        id: 'AwsSolutions-CFR5',
        reason: 'Internal load balancer not using HTTPS as demo app does not have qualified domain, to allow customers to test the solution without buying a custom domain',
      },
      {
        id: 'AwsSolutions-CFR7',
        reason: 'Using S3 origin instead of OAC for demo purposes',
      },
      
      // IAM Issues - still need to suppress for CDK-generated resources
      {
        id: 'AwsSolutions-IAM4',
        reason: 'Managed policies are used for CDK-generated resources that we cannot modify',
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Wildcard permissions needed for specific use cases and CDK-generated resources',
      },
      
      // Lambda Issues
      {
        id: 'AwsSolutions-L1',
        reason: 'Using specific runtime version for compatibility',
      },
      
      // Cognito Issues
      {
        id: 'AwsSolutions-COG2',
        reason: 'MFA not required for demo application',
      },
      {
        id: 'AwsSolutions-COG3',
        reason: 'Advanced security mode requires Cognito User Pool Plus features plan that is not available in free version',
      },
      
      // DynamoDB Issues
      {
        id: 'AwsSolutions-DDB3',
        reason: 'Point-in-time recovery not required for demo application',
      },
      
      // ECS Issues
      {
        id: 'AwsSolutions-ECS2',
        reason: 'Environment variables are used for configuration and do not contain sensitive data',
      },
      {
        id: 'AwsSolutions-ECS4',
        reason: 'Container insights not required for demo application',
      },
      {
        id: 'AwsSolutions-ECS7',
        reason: 'Logging is configured at the container level',
      },
      
      // VPC Issues
      {
        id: 'AwsSolutions-VPC7',
        reason: 'Flow logs not required for demo application',
      },
      
      // Load Balancer Issues
      {
        id: 'AwsSolutions-ELB2',
        reason: 'Access logs not required for demo application',
      },
      
      // Security Group Issues
      {
        id: 'CdkNagValidationFailure',
        reason: 'Intrinsic function used in CIDR block parameter',
      },
      {
        id: 'AwsSolutions-EC23',
        reason: 'Intrinsic function used in CIDR block parameter',
      },
    ],
    true // Apply to all child resources
  );
}
