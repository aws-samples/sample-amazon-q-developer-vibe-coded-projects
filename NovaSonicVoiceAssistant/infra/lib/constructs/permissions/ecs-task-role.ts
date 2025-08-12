import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { StackConfig, prefixResourceName } from '../../config';

export interface EcsTaskRoleProps {
  /**
   * The name of the DynamoDB table to access
   */
  tableName: string;
}

/**
 * Creates IAM roles for ECS tasks with appropriate permissions
 */
export class EcsTaskRole extends Construct {
  /**
   * The IAM role for the ECS task
   */
  public readonly taskRole: iam.Role;

  /**
   * The IAM role for the ECS task execution
   */
  public readonly executionRole: iam.Role;

  constructor(scope: Construct, id: string, props: EcsTaskRoleProps, config?: StackConfig) {
    super(scope, id);

    const resourcePrefix = config?.resourcePrefix || '';

    // Create the task role that the application code will use
    this.taskRole = new iam.Role(this, 'TaskRole', {
      roleName: prefixResourceName(config || { resourcePrefix, stackName: '' }, 'EcsTaskRole'),
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Role used by ECS tasks to access AWS resources',
    });

    // Add permissions to access DynamoDB
    // The application is trying to access a table with the prefix, but the environment variable doesn't include the prefix
    // We need to grant access to both the prefixed and non-prefixed table names
    const prefixedTableName = `${resourcePrefix}${props.tableName}`;
    
    this.taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
          'dynamodb:Scan',
          'dynamodb:Query',
          'dynamodb:BatchGetItem',
          'dynamodb:BatchWriteItem',
        ],
        resources: [
          // Grant access to both the prefixed and non-prefixed table names
          `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/${props.tableName}`,
        ],
      })
    );
    
    // Add permissions to access Amazon Bedrock services
    this.taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
          'bedrock:InvokeModelWithBidirectionalStream',
          'bedrock:ListFoundationModels',
          'bedrock:GetFoundationModel'
        ],
        resources: [
          `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/amazon.nova-sonic-v1:0`,
        ],
      })
    );
    
    // Add permissions for Bedrock runtime API
    this.taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'bedrock-runtime:InvokeModel',
          'bedrock-runtime:InvokeModelWithResponseStream',
          'bedrock-runtime:InvokeModelWithBidirectionalStream'
        ],
        resources: ['*'],
      })
    );

    // Create the execution role that the ECS service will use
    this.executionRole = new iam.Role(this, 'ExecutionRole', {
      roleName: prefixResourceName(config || { resourcePrefix, stackName: '' }, 'EcsExecutionRole'),
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Role used by ECS to pull container images and publish logs',
    });

    // Add permissions for ECR and CloudWatch Logs
    this.executionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
    );
  }
}
