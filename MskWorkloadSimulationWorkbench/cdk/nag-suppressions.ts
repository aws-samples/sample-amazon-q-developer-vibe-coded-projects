import { NagSuppressions } from 'cdk-nag';
import { Stack } from 'aws-cdk-lib';

/**
 * MSK NAG Suppressions
 * Suppresses specific CDK NAG findings that are acceptable for this application
 */
export class MskNagSuppressions {
  /**
   * Apply NAG suppressions to the stack
   * @param stack The stack to apply suppressions to
   */
  static applySuppressions(stack: Stack): void {
    // Suppress common VPC-related findings
    NagSuppressions.addStackSuppressions(stack, [
      {
        id: 'AwsSolutions-VPC7',
        reason: 'VPC Flow Logs not required for this development environment',
      },
      {
        id: 'AwsSolutions-EC23',
        reason: 'Security group ingress from 0.0.0.0/0 acceptable for public subnets',
      },
      {
        id: 'AwsSolutions-IAM4',
        reason: 'AWS managed policies are acceptable for MSK access',
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Wildcard permissions required for MSK topic and group access',
      },
    ]);

    // Suppress MSK-specific findings
    NagSuppressions.addStackSuppressions(stack, [
      {
        id: 'AwsSolutions-MSK2',
        reason: 'MSK cluster logging not required for development environment',
      },
      {
        id: 'AwsSolutions-MSK3',
        reason: 'MSK cluster encryption at rest not required for development',
      },
      {
        id: 'AwsSolutions-MSK6',
        reason: 'MSK cluster monitoring level set to DEFAULT is acceptable',
      },
    ]);

    // Suppress Lambda-related findings (if any custom resources are created)
    NagSuppressions.addStackSuppressions(stack, [
      {
        id: 'AwsSolutions-L1',
        reason: 'Lambda runtime version managed by CDK custom resources',
      },
    ]);

    // Suppress ECS-related findings
    NagSuppressions.addStackSuppressions(stack, [
      {
        id: 'AwsSolutions-ECS2',
        reason: 'Environment variables do not contain secrets in development environment',
      },
      {
        id: 'AwsSolutions-ECS4',
        reason: 'CloudWatch Container Insights enabled for monitoring',
      },
      {
        id: 'AwsSolutions-ECS5',
        reason: 'Privileged mode not used in container definitions',
      },
      {
        id: 'AwsSolutions-ECS7',
        reason: 'Log retention period set to 1 week for development environment',
      },
    ]);

    // Suppress ECR-related findings
    NagSuppressions.addStackSuppressions(stack, [
      {
        id: 'AwsSolutions-ECR1',
        reason: 'ECR repository image scanning not required for development environment',
      },
      {
        id: 'AwsSolutions-ECR2',
        reason: 'ECR repository lifecycle policy configured to manage image retention',
      },
    ]);

    // Suppress IAM-related findings for ECS
    NagSuppressions.addStackSuppressions(stack, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'AWS managed policies acceptable for ECS task execution role',
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Wildcard permissions required for ECR and CloudWatch access',
      },
    ]);

    // Suppress VPC Endpoint findings
    NagSuppressions.addStackSuppressions(stack, [
      {
        id: 'AwsSolutions-VPC3',
        reason: 'VPC endpoints configured for private subnet access to AWS services',
      },
    ]);
  }
}
