import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/** Properties for the ExpressApiLambdaRoleConstruct */
export interface ExpressApiLambdaRoleProps {
  /** The name of the DynamoDB table to grant access to */
  tableName: string;
  /** Whether to add Bedrock Agent permissions */
  addBedrockPermissions?: boolean;
  /** Specific Bedrock Agent ARNs to grant access to */
  bedrockAgentArns?: string[];
  /** Lambda function name for log group */
  lambdaFunctionName?: string;
  /** Whether the DynamoDB table has GSIs */
  hasGlobalSecondaryIndexes?: boolean;
}

/**
 * Construct that creates an IAM role for Express API Lambda functions with
 * permissions to access DynamoDB.
 */
export class ExpressApiLambdaRoleConstruct extends Construct {
  /** The IAM role created for Express API Lambda functions */
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: ExpressApiLambdaRoleProps) {
    super(scope, id);

    const functionName = props.lambdaFunctionName || 'smart-todo-api';
    const region = cdk.Stack.of(this).region;
    const accountId = cdk.Stack.of(this).account;

    // Create IAM role for Express API Lambda
    this.role = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for Express API Lambda functions with DynamoDB access',
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
        `arn:aws:logs:${region}:${accountId}:log-group:/aws/lambda/${functionName}:*`
      ]
    });
    
    // Add CloudWatch Logs permissions
    this.role.addToPolicy(logPolicy);

    // Define DynamoDB resources based on whether the table has GSIs
    const dynamoDbResources = [
      `arn:aws:dynamodb:${region}:${accountId}:table/${props.tableName}`
    ];

    // Add DynamoDB permissions with specific region and account
    const dynamoDbPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Scan',
        'dynamodb:Query',
        'dynamodb:BatchWriteItem',
      ],
      resources: dynamoDbResources,
    });
    
    this.role.addToPolicy(dynamoDbPolicy);

    // Add Bedrock Agent permissions if requested
    if (props.addBedrockPermissions) {
      const agentResources = props.bedrockAgentArns && props.bedrockAgentArns.length > 0
        ? props.bedrockAgentArns
        : [
          ];
      
      const bedrockPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:InvokeAgent',
        ],
        resources: agentResources,
      });
      
      this.role.addToPolicy(bedrockPolicy);
    }
  }
}
