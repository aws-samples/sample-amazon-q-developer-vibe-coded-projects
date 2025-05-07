import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
import { StackConfig, prefixResourceName } from '../../config';

export interface WafProtectionProps {
  /**
   * The ARN of the resource to associate with the WAF WebACL
   */
  resourceArn: string;
  
  /**
   * Optional name prefix for the WAF resources
   */
  namePrefix?: string;
  
  /**
   * Optional request rate limit per IP (requests per 5 minutes)
   * Default: 2000
   */
  rateLimit?: number;
}

/**
 * Creates a WAF WebACL and associates it with the specified resource
 */
export class WafProtectionConstruct extends Construct {
  /**
   * The WAF WebACL
   */
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: WafProtectionProps, config?: StackConfig) {
    super(scope, id);

    const resourcePrefix = config?.resourcePrefix || '';
    const namePrefix = props.namePrefix || id;
    const rateLimit = props.rateLimit || 2000;

    // Create a WAF Web ACL
    this.webAcl = new wafv2.CfnWebACL(this, 'WebACL', {
      name: prefixResourceName(config || { resourcePrefix, stackName: '' }, `${namePrefix}WebACL`),
      defaultAction: { allow: {} }, // Allow by default, rules will block specific threats
      scope: 'REGIONAL', // For ALB, use REGIONAL scope
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `${namePrefix}WebACL`,
        sampledRequestsEnabled: true,
      },
      rules: [
        // Rate limiting rule
        {
          name: 'RateLimitRule',
          priority: 0,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: rateLimit,
              aggregateKeyType: 'IP'
            }
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRule',
            sampledRequestsEnabled: true,
          },
        },
        
        // AWS Managed Rules - Core rule set
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              name: 'AWSManagedRulesCommonRuleSet',
              vendorName: 'AWS',
              excludedRules: []
            }
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesCommonRuleSet',
            sampledRequestsEnabled: true,
          },
        },
        
        // SQL Injection protection
        {
          name: 'AWSManagedRulesSQLiRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              name: 'AWSManagedRulesSQLiRuleSet',
              vendorName: 'AWS',
              excludedRules: []
            }
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesSQLiRuleSet',
            sampledRequestsEnabled: true,
          },
        },
        
        // Known bad inputs
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 3,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
              vendorName: 'AWS',
              excludedRules: []
            }
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesKnownBadInputsRuleSet',
            sampledRequestsEnabled: true,
          },
        }
      ]
    });
    
    // Associate the Web ACL with the provided resource
    new wafv2.CfnWebACLAssociation(this, 'WebACLAssociation', {
      resourceArn: props.resourceArn,
      webAclArn: this.webAcl.attrArn,
    });
    
    // Output the WebACL ARN
    new cdk.CfnOutput(this, 'WebACLArn', {
      value: this.webAcl.attrArn,
      description: 'ARN of the WAF WebACL',
    });
  }
}
