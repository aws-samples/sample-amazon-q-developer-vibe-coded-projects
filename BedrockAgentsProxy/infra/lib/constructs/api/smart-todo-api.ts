import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as path from 'path';
import { Construct } from 'constructs';
import { ExpressApiLambdaRoleConstruct } from '../permissions/express-api-lambda-role';

/** Properties for the SmartTodoApiConstruct */
export interface SmartTodoApiProps {
  /** The name of the DynamoDB table to use */
  tableName: string;
  /** The Cognito User Pool for authorization */
  userPool: cognito.UserPool;
  /** The Bedrock Agent ID */
  bedrockAgentId: string;
  /** The Bedrock Agent Alias ID */
  bedrockAgentAliasId: string;
  /** The KMS key for token encryption */
  encryptionKey: kms.Key;
}

/**
 * API infrastructure construct for the Smart Todo application.
 * Sets up API Gateway with Lambda integration and Cognito authorizer.
 */
export class SmartTodoApiConstruct extends Construct {
  /** The API Gateway endpoint URL */
  public readonly apiEndpoint: string;
  /** The Express Layer for reuse */
  public readonly expressLayer: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props: SmartTodoApiProps) {
    super(scope, id);

    // Create IAM role for Express API Lambda
    const lambdaRole = new ExpressApiLambdaRoleConstruct(this, 'ExpressApiRole', {
      tableName: props.tableName,
      lambdaFunctionName: 'smart-todo-api',
      // Since we're not using GSIs in our DynamoDB table, set this to false
      hasGlobalSecondaryIndexes: false
    });
    
    // Add Bedrock Agent permissions to the Lambda role with specific agent ARNs
    lambdaRole.role.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['bedrock:InvokeAgent'],
        resources: [
          `arn:aws:bedrock:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:agent/${props.bedrockAgentId}`,
          `arn:aws:bedrock:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:agent-alias/${props.bedrockAgentId}/${props.bedrockAgentAliasId}`
        ]
      })
    );
    
    // Add KMS permissions to the Lambda role with specific actions
    lambdaRole.role.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: [
          'kms:Encrypt',
          'kms:Decrypt',
          'kms:DescribeKey'
        ],
        resources: [props.encryptionKey.keyArn]
      })
    );
    
    // Create a Lambda layer for Express.js and other dependencies
    this.expressLayer = new lambda.LayerVersion(this, 'ExpressLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../../shared/lambda-layers/express-layer')),
      compatibleRuntimes: [lambda.Runtime.NODEJS_22_X],
      description: 'Express.js and other dependencies',
      layerVersionName: 'smart-todo-express-layer'
    });

    // Create CloudWatch Log Group with 1-day retention
    const logGroup = new logs.LogGroup(this, 'SmartTodoApiLogGroup', {
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      logGroupName: '/aws/lambda/smart-todo-api'
    });

    // Create Lambda function for API
    const apiFunction = new lambda.Function(this, 'SmartTodoApiFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'dist/app.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../../api')),
      role: lambdaRole.role,
      layers: [this.expressLayer], // Add the Express.js layer
      environment: {
        TABLE_NAME: props.tableName,
        NODE_ENV: 'production',
        USER_POOL_ID: props.userPool.userPoolId,
        BEDROCK_AGENT_ID: props.bedrockAgentId,
        BEDROCK_AGENT_ALIAS_ID: props.bedrockAgentAliasId,
        KMS_KEY_ID: props.encryptionKey.keyId
      },
      timeout: cdk.Duration.seconds(120),
      memorySize: 256,
      logGroup: logGroup, // Associate the log group with the Lambda function
      functionName: 'smart-todo-api'
    });
    
    // Grant the Lambda function permission to use the KMS key
    props.encryptionKey.grantEncryptDecrypt(apiFunction);

    // Create REST API Gateway with more restrictive CORS settings
    const api = new apigateway.RestApi(this, 'SmartTodoApi', {
      restApiName: 'Smart Todo API',
      description: 'API for Smart Todo application',
      deployOptions: {
        stageName: 'prod',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
      },
    });

    // Create Cognito User Pool Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'SmartTodoApiAuthorizer', {
      cognitoUserPools: [props.userPool],
      identitySource: 'method.request.header.Authorization',
    });

    // Create API Gateway integration with Lambda
    const integration = new apigateway.LambdaIntegration(apiFunction, {
      proxy: true,
    });

    // Simplified approach: Use only the necessary routes
    
    // 1. Add a method to the root resource with authorizer
    api.root.addMethod('ANY', integration, {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    
    // 2. Main proxy resource for direct API access
    const mainProxyResource = api.root.addResource('{proxy+}');
    
    // Apply the authorizer to the main proxy resource
    mainProxyResource.addMethod('ANY', integration, {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // 3. Add /api resource for CloudFront integration
    const apiResource = api.root.addResource('api');
    
    // 4. Add /api/{proxy+} for CloudFront integration
    const apiProxyResource = apiResource.addResource('{proxy+}');
    
    // Apply the authorizer to the API proxy resource
    apiProxyResource.addMethod('ANY', integration, {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Set the API endpoint URL and expose the API ID
    this.apiEndpoint = api.url;
    this.apiId = api.restApiId;
    
    // Output the Lambda layer ARN
    new cdk.CfnOutput(this, 'ExpressLayerArn', {
      value: this.expressLayer.layerVersionArn,
      description: 'ARN of the Express.js Lambda layer',
    });
  }

  /** The API Gateway ID */
  public readonly apiId: string;
}
