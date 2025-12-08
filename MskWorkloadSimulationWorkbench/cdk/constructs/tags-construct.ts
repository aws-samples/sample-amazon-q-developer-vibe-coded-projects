import { Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Config } from '../lib/config';

/**
 * Tags Construct
 * Provides centralized tagging for all resources in the CDK app
 */
export class TagsConstruct {
  /**
   * Applies common tags to all resources in the stack
   * @param scope The stack construct to apply tags to
   */
  static applyTags(scope: Construct): void {
    // Apply tags that will propagate to all resources in the stack
    Tags.of(scope).add('Owner', Config.appName);
    Tags.of(scope).add('StackName', Config.stackName);
    Tags.of(scope).add('Environment', Config.envPrefix);
  }
}
