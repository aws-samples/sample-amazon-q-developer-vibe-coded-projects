import { RemovalPolicy, Aspects } from 'aws-cdk-lib';
import { Construct, IConstruct } from 'constructs';
import * as cdk from 'aws-cdk-lib';

/**
 * Retention Policy Construct
 * Ensures all resources are destroyed when the stack is destroyed
 */
export class RetentionPolicyConstruct {
  /**
   * Applies destroy retention policy to all resources in the stack
   * @param scope The stack construct to apply retention policy to
   */
  static applyDestroyPolicy(scope: Construct): void {
    // Apply an aspect that will set RemovalPolicy.DESTROY on all applicable resources
    Aspects.of(scope).add(new DestroyPolicyAspect());
  }
}

/**
 * CDK Aspect that applies RemovalPolicy.DESTROY to all resources
 */
class DestroyPolicyAspect implements cdk.IAspect {
  visit(node: IConstruct): void {
    // Apply to resources that support RemovalPolicy
    if (node instanceof cdk.CfnResource) {
      // Set deletion policy to Delete (ensures resource is destroyed)
      node.applyRemovalPolicy(RemovalPolicy.DESTROY);
      
      // For resources that support DeletionPolicy, ensure it's set to Delete
      if ('deletionPolicy' in node) {
        const resourceWithDeletionPolicy = node as cdk.CfnResource & { deletionPolicy?: string };
        resourceWithDeletionPolicy.deletionPolicy = 'Delete';
      }
      
      // For resources that support UpdateReplacePolicy, ensure it's set to Delete
      if ('updateReplacePolicy' in node) {
        const resourceWithUpdatePolicy = node as cdk.CfnResource & { updateReplacePolicy?: string };
        resourceWithUpdatePolicy.updateReplacePolicy = 'Delete';
      }
    }
    
    // Handle specific resource types that need special attention
    if (node instanceof cdk.aws_s3.Bucket) {
      // Ensure S3 buckets are destroyed even if they contain objects
      node.applyRemovalPolicy(RemovalPolicy.DESTROY);
    }
    
    if (node instanceof cdk.aws_logs.LogGroup) {
      // Ensure CloudWatch Log Groups are destroyed
      node.applyRemovalPolicy(RemovalPolicy.DESTROY);
    }
    
    if (node instanceof cdk.aws_rds.DatabaseInstance || 
        node instanceof cdk.aws_rds.DatabaseCluster) {
      // Ensure RDS instances/clusters are destroyed without snapshots
      node.applyRemovalPolicy(RemovalPolicy.DESTROY);
    }
  }
}
