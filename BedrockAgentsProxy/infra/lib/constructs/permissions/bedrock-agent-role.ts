import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

/** Properties for the BedrockAgentRoleConstruct */
export interface BedrockAgentRoleProps {
  /** The Lambda function that the Bedrock Agent can invoke */
  lambdaFunction?: lambda.Function;
  /** The region for Bedrock permissions */
  region?: string;
  /** The specific foundation model ID to use */
  foundationModelId?: string;
}

/**
 * Construct that creates an IAM role for Bedrock Agents with
 * permissions to invoke Lambda functions.
 */
export class BedrockAgentRoleConstruct extends Construct {
  /** The IAM role created for Bedrock Agents */
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: BedrockAgentRoleProps = {}) {
    super(scope, id);

    const region = props.region || cdk.Stack.of(this).region;
    const accountId = cdk.Stack.of(this).account;
    
    // Use specific foundation model if provided, otherwise use a more specific pattern
    const foundationModelResource = props.foundationModelId 
      ? `arn:aws:bedrock:${region}::foundation-model/${props.foundationModelId}`
      : `arn:aws:bedrock:${region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`; // Default to Claude 3 Sonnet

    // Create IAM role for Bedrock Agent
    this.role = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      description: 'Role for Smart Todo Bedrock Agent to invoke Lambda functions',
    });

    // Create a custom policy for Bedrock permissions instead of using the managed policy
    const bedrockPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeAgent',
      ],
      resources: [
        foundationModelResource,
        `arn:aws:bedrock:${region}:${accountId}:agent/smart-todo-agent-*`,
        `arn:aws:bedrock:${region}:${accountId}:agent-alias/smart-todo-agent-*`
      ]
    });
    
    this.role.addToPolicy(bedrockPolicy);

    // Add Lambda invoke permissions if a function is provided
    if (props.lambdaFunction) {
      props.lambdaFunction.grantInvoke(this.role);
    }
  }
}
