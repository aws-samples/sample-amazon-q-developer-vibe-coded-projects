import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/** Properties for the SmartTodoProxyRoleConstruct */
export interface SmartTodoProxyRoleProps {
  /** Lambda function name for log group */
  lambdaFunctionName?: string;
}

/**
 * Construct that creates an IAM role for the Smart Todo Proxy Lambda function that
 * handles requests from Bedrock Agent and forwards them to the API via CloudFront.
 */
export class SmartTodoProxyRoleConstruct extends Construct {
  /** The IAM role created for the Smart Todo Proxy Lambda function */
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: SmartTodoProxyRoleProps = {}) {
    super(scope, id);

    const functionName = props.lambdaFunctionName || 'smart-todo-proxy';

    // Create IAM role for Smart Todo Proxy Lambda
    this.role = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for Smart Todo Proxy Lambda function that handles Bedrock Agent requests',
    });
    
    // Create a custom policy for CloudWatch Logs instead of using the managed policy
    const logPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [
        `arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:/aws/lambda/${functionName}:*`
      ]
    });
    
    // Add CloudWatch Logs permissions
    this.role.addToPolicy(logPolicy);
  }
}
