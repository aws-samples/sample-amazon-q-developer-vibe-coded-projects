import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import * as fs from 'fs';
import { Construct } from 'constructs';
import { BedrockAgentRoleConstruct, LambdaFunctionPermissionsConstruct } from '../permissions';
import { SmartTodoProxyConstruct } from '../proxy';
import { ChatAgentPrompt } from './prompts';

/**
 * Properties for the SmartTodoAgentConstruct
 */
export interface SmartTodoAgentConstructProps {
  /**
   * The CloudFront distribution URL (optional)
   */
  cloudfrontUrl?: string;
  /**
   * The Express Lambda layer (optional)
   */
  expressLayer?: lambda.LayerVersion;
}

/**
 * Construct for the Smart Todo Bedrock Agent using OpenAPI schema
 */
export class SmartTodoAgentConstruct extends Construct {
  /**
   * The Bedrock Agent
   */
  public readonly agent: cdk.aws_bedrock.CfnAgent;
  
  /**
   * The Bedrock Agent alias
   */
  public readonly agentAlias: cdk.aws_bedrock.CfnAgentAlias;

  /**
   * The IAM role for the Bedrock Agent
   */
  public readonly agentServiceRole: iam.Role;

  /**
   * The proxy Lambda function
   */
  public readonly proxyFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: SmartTodoAgentConstructProps = {}) {
    super(scope, id);

    // Read the OpenAPI schema file
    const schemaPath = path.join(__dirname, '../../../../proxy/src/todo-api-schema.json');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');

    // Create the proxy Lambda function using the dedicated construct
    const proxyConstruct = new SmartTodoProxyConstruct(this, 'ProxyLambda', {
      cloudfrontUrl: props.cloudfrontUrl,
      expressLayer: props.expressLayer
    });
    this.proxyFunction = proxyConstruct.proxyFunction;

    // Define the specific foundation model to use
    const foundationModelId = 
    //'amazon.nova-micro-v1:0';
    'anthropic.claude-3-sonnet-20240229-v1:0';

    // Create IAM role for the Bedrock Agent using the dedicated construct with specific model
    const agentRoleConstruct = new BedrockAgentRoleConstruct(this, 'AgentRole', {
      lambdaFunction: this.proxyFunction,
      foundationModelId: foundationModelId
    });
    this.agentServiceRole = agentRoleConstruct.role;

    // Add permissions to the Lambda function using the dedicated construct
    new LambdaFunctionPermissionsConstruct(this, 'LambdaPermissions', {
      lambdaFunction: this.proxyFunction,
      servicePrincipal: 'bedrock.amazonaws.com',
      id: 'BedrockAgentInvokePermission'
    });

    // Generate a unique name for the agent to avoid conflicts
    const timestamp = new Date().getTime().toString().slice(-6);
    const agentName = `SmartTodoAgent-${timestamp}`;

    // Create the Bedrock Agent using CfnAgent (L1 construct)
    this.agent = new cdk.aws_bedrock.CfnAgent(this, 'SmartTodoAgent', {
      agentName: agentName,
      agentResourceRoleArn: this.agentServiceRole.roleArn,
      foundationModel: foundationModelId,
      instruction: ChatAgentPrompt,
      idleSessionTtlInSeconds: 1800,
      customerEncryptionKeyArn: undefined,
      description: 'Smart Todo Agent using OpenAPI schema',
      // Enable memory for the agent
      memoryConfiguration: {
        enabledMemoryTypes: ['SESSION_SUMMARY'],
        storageDays: 30
      },
      actionGroups: [
        {
          actionGroupName: 'TodoOperations',
          actionGroupExecutor: {
            lambda: this.proxyFunction.functionArn
          },
          description: 'Action group for managing todo items and their notes',
          apiSchema: {
            payload: schemaContent
          }
        }
      ]
    });

    // Create an agent alias for deployment
    const date = new Date();
    const aliasTimestamp = date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 12); // Formats to 'YYYYMMDDHHmm'
    
    this.agentAlias = new cdk.aws_bedrock.CfnAgentAlias(this, `TodoAgentAlias${aliasTimestamp}`, {
      agentId: this.agent.attrAgentId,
      agentAliasName: `prod-${aliasTimestamp}`,
      description: 'Production alias for the Smart Todo Agent',
    });
    this.agentAlias.addDependency(this.agent);

    // Output the agent ID and alias
    new cdk.CfnOutput(this, 'BedrockAgentId', {
      value: this.agent.attrAgentId,
      description: 'Bedrock Agent ID',
    });

    new cdk.CfnOutput(this, 'BedrockAgentAliasId', {
      value: this.agentAlias.attrAgentAliasId,
      description: 'Bedrock Agent Alias ID',
    });

    new cdk.CfnOutput(this, 'AgentServiceRoleArn', {
      value: this.agentServiceRole.roleArn,
      description: 'IAM Role ARN for the Bedrock Agent',
    });
  }
}
