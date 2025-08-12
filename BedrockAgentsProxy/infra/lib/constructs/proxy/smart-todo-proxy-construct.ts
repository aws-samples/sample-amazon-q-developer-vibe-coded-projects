import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { SmartTodoProxyRoleConstruct } from '../permissions/smart-todo-proxy-role';

/**
 * Properties for the SmartTodoProxyConstruct
 */
export interface SmartTodoProxyConstructProps {
  /**
   * The CloudFront distribution URL for the application (optional)
   */
  cloudfrontUrl?: string;
  /**
   * The Express Lambda layer (optional)
   */
  expressLayer?: lambda.LayerVersion;
}

/**
 * Construct for the Smart Todo Proxy Lambda that handles Bedrock Agent requests
 */
export class SmartTodoProxyConstruct extends Construct {
  /**
   * The Lambda function that handles Bedrock Agent requests
   */
  public readonly proxyFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: SmartTodoProxyConstructProps = {}) {
    super(scope, id);

    // Create IAM role for the proxy Lambda using the dedicated construct
    const proxyRoleConstruct = new SmartTodoProxyRoleConstruct(this, 'ProxyRole');

    // Create the Lambda layer for shared dependencies if not provided
    const expressLayer = props.expressLayer || new lambda.LayerVersion(this, 'ProxyExpressLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../../shared/lambda-layers/express-layer')),
      compatibleRuntimes: [lambda.Runtime.NODEJS_22_X],
      description: 'Express.js and other dependencies for Proxy Lambda',
    });

    // Extract hostname from CloudFront URL if provided
    let apiHost = 'example.com';
    if (props.cloudfrontUrl) {
      try {
        const url = new URL(props.cloudfrontUrl);
        apiHost = url.hostname;
      } catch (error) {
        console.warn('Invalid CloudFront URL provided:', props.cloudfrontUrl);
      }
    }

    // Create the Lambda function for handling Bedrock Agent requests
    this.proxyFunction = new lambda.Function(this, 'SmartTodoProxyFunction', {
      runtime: Runtime.NODEJS_22_X,
      handler: 'dist/index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../../proxy')),
      timeout: cdk.Duration.minutes(1),
      environment: {
        USE_MOCK_RESPONSES: 'false',
        API_HOST: apiHost,
        API_BASE_PATH: '/api',
        TABLE_NAME: 'smart-todo-list-table'
      },
      role: proxyRoleConstruct.role,
      functionName: 'smart-todo-proxy',
      description: 'Proxy Lambda function that handles Bedrock Agent requests for Smart Todo App',
      layers: [expressLayer]
    });

    // Create a log group with 1-day retention
    new logs.LogGroup(this, 'SmartTodoProxyLogGroup', {
      logGroupName: `/aws/lambda/${this.proxyFunction.functionName}`,
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Output the function ARN
    new cdk.CfnOutput(this, 'ProxyFunctionArn', {
      value: this.proxyFunction.functionArn,
      description: 'ARN of the Smart Todo Proxy Lambda function',
    });
  }
}
