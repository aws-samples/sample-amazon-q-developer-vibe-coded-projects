import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SmartTodoTableConstruct } from './constructs/storage/smart-todo-table';
import { SmartTodoApiConstruct } from './constructs/api/smart-todo-api';
import { SmartTodoUiConstruct } from './constructs/ui/smart-todo-ui';
import { SmartTodoAuthConstruct } from './constructs/auth/smart-todo-auth';
import { SmartTodoAgentConstruct } from './constructs/agents/smart-todo-agent-construct';
import { EncryptionKeyConstruct } from './constructs/security/encryption-key-construct';
import { addNagSuppressions } from './nag-suppressions';

/**
 * Main stack for the Smart Todo application.
 * Creates and connects all infrastructure components:
 * - Cognito User Pool for authentication
 * - DynamoDB table for data storage
 * - HTTP API Gateway and Lambda functions for backend
 * - S3 and CloudFront for frontend hosting with API integration
 * - Bedrock Agent for natural language interaction with the app
 * - KMS key for token encryption/decryption
 */
export class SmartTodoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // UI - S3 bucket and CloudFront distribution with API integration
    const ui = new SmartTodoUiConstruct(this, 'SmartTodoUi', {
      apiGateway: {
        url: '' // We'll set this after creating the API
      }
    });

    // Authentication - Cognito User Pool and Client
    const auth = new SmartTodoAuthConstruct(this, 'SmartTodoAuth', {
      appName: 'SmartTodoApp',
      cloudfrontDomain: ui.distributionDomain
    });

    // Database - DynamoDB table for storing todos
    const database = new SmartTodoTableConstruct(this, 'SmartTodoDatabase');
    
    // Create KMS key for token encryption
    const encryptionKey = new EncryptionKeyConstruct(this, 'TokenEncryptionKey', {
      keyAlias: 'alias/smart-todo-token-encryption',
      description: 'KMS key for encrypting/decrypting user tokens in Smart Todo App'
    });

    // Create the Bedrock Agent construct with proxy Lambda
    const agent = new SmartTodoAgentConstruct(this, 'SmartTodoAgent', {
      cloudfrontUrl: ui.distributionUrl
    });

    // API - HTTP API Gateway and Lambda functions with database access
    const api = new SmartTodoApiConstruct(this, 'SmartTodoApi', {
      tableName: database.tableName,
      userPool: auth.userPool, // Pass the user pool to the API construct
      bedrockAgentId: agent.agent.attrAgentId, // Set the agent ID
      bedrockAgentAliasId: agent.agentAlias.attrAgentAliasId, // Set the agent alias ID
      encryptionKey: encryptionKey.key // Pass the KMS key to the API construct
    });

    // Update the API construct with the Bedrock Agent IDs
    const apiFunction = (api as any).node.findChild('SmartTodoApiFunction');
    apiFunction.addEnvironment('BEDROCK_AGENT_ID', agent.agent.attrAgentId);
    apiFunction.addEnvironment('BEDROCK_AGENT_ALIAS_ID', agent.agentAlias.attrAgentAliasId);

    // Explicitly grant the API Lambda function permission to use the KMS key
    encryptionKey.key.grantEncryptDecrypt(apiFunction);

    // Update the UI construct with the API URL
    ui.addApiGateway(api.apiEndpoint);

    // Update the proxy Lambda function with the CloudFront URL and grant access to KMS key
    agent.proxyFunction.addEnvironment('API_HOST', ui.distributionDomain);
    agent.proxyFunction.addEnvironment('API_BASE_PATH', '/api');
    agent.proxyFunction.addEnvironment('KMS_KEY_ID', encryptionKey.keyId);
    encryptionKey.key.grantEncryptDecrypt(agent.proxyFunction);
    
    // Grant the proxy Lambda access to the DynamoDB table
    database.table.grantReadWriteData(agent.proxyFunction);

    // Stack Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.apiEndpoint,
      description: 'HTTP API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: ui.distributionUrl,
      description: 'Frontend website URL',
    });
    
    new cdk.CfnOutput(this, 'ApiProxyPath', {
      value: `${ui.distributionUrl}/api`,
      description: 'API proxy path through CloudFront',
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: auth.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolClientId', {
      value: auth.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'BedrockAgentId', {
      value: agent.agent.attrAgentId,
      description: 'Bedrock Agent ID',
    });

    new cdk.CfnOutput(this, 'BedrockAgentAliasId', {
      value: agent.agentAlias.attrAgentAliasId,
      description: 'Bedrock Agent Alias ID',
    });
    
    new cdk.CfnOutput(this, 'TokenEncryptionKeyId', {
      value: encryptionKey.keyId,
      description: 'KMS Key ID for token encryption',
    });
    
    new cdk.CfnOutput(this, 'ExpressLayerArn', {
      value: api.expressLayer.layerVersionArn,
      description: 'ARN of the Express.js Lambda layer',
    });
    
    // Apply CDK Nag suppressions to the entire stack
    addNagSuppressions(this);
  }
}
