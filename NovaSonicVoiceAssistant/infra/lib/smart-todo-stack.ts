import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SmartTodoTableConstruct } from './constructs/storage/smart-todo-table';
import { SmartTodoEcsConstruct } from './constructs/api/smart-todo-ecs';
import { SmartTodoUiConstruct } from './constructs/ui/smart-todo-ui';
import { SmartTodoAuthConstruct } from './constructs/auth/smart-todo-auth';
import { addNagSuppressions } from './nag-suppressions';
import { StackConfig, prefixResourceName } from './config';

/**
 * Main stack for the Smart Todo application.
 * Creates and connects all infrastructure components:
 * - Cognito User Pool for authentication
 * - DynamoDB table for data storage
 * - ECS Fargate for backend API
 * - S3 and CloudFront for frontend hosting with API integration
 */
export class SmartTodoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, config: StackConfig, props?: cdk.StackProps) {
    super(scope, id, props);
    
    // Store config for use in the stack
    const resourcePrefix = config.resourcePrefix;

    // UI - S3 bucket and CloudFront distribution with API integration
    const ui = new SmartTodoUiConstruct(this, prefixResourceName(config, 'Ui'), {
      apiGateway: {
        url: '' 
      }
    });

    // Database - DynamoDB table for storing todos
    const database = new SmartTodoTableConstruct(this, prefixResourceName(config, 'Database'), config);

    // Authentication - Cognito User Pool and Client with hosted UI
    const auth = new SmartTodoAuthConstruct(this, prefixResourceName(config, 'Auth'), {
      appName: prefixResourceName(config, 'App'),
      cloudfrontDomain: ui.distributionDomain,
    }, config);

    // API - ECS Fargate service with database access
    const api = new SmartTodoEcsConstruct(this, prefixResourceName(config, 'Api'), {
      tableName: database.tableName,
      userPoolId: auth.userPoolId,
      userPoolClientId: auth.userPoolClientId,
      cognitoDomainUrl: auth.cognitoDomainUrl,
      userPoolLogoutUrl: auth.userPoolLogoutUrl
    }, config);

    // Update the UI construct with the API URL
    ui.addApiGateway(api.apiEndpoint);

    // Stack Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.apiEndpoint,
      description: 'API Endpoint URL',
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
    
    new cdk.CfnOutput(this, 'CognitoDomainUrl', {
      value: auth.cognitoDomainUrl,
      description: 'Cognito Domain URL',
    });
    
    new cdk.CfnOutput(this, 'CognitoLogoutUrl', {
      value: auth.userPoolLogoutUrl,
      description: 'Cognito Logout URL',
    });
    
    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: database.tableName,
      description: 'DynamoDB table name for the application',
    });
    
    // Apply CDK Nag suppressions to the entire stack
    addNagSuppressions(this);
  }
}
