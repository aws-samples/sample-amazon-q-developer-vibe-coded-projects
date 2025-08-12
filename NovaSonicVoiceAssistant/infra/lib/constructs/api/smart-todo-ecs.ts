import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StackConfig } from '../../config';
import { EcsVpcConstruct } from './smart-todo-ecs-vpc';
import { EcsClusterConstruct } from './smart-todo-ecs-cluster';
import { LoadBalancerConstruct } from './smart-todo-ecs-load-balancer';
import { EcsServiceConstruct } from './smart-todo-ecs-service';
import { EcsTaskRole } from '../permissions/ecs-task-role';
import { VpcEndpointsConstruct } from './smart-todo-vpc-endpoints';
import { WafProtectionConstruct } from '../security';

export interface SmartTodoEcsConstructProps {
  /**
   * The name of the DynamoDB table to use
   */
  tableName: string;

  /**
   * Cognito User Pool ID (optional)
   */
  userPoolId?: string;

  /**
   * Cognito User Pool Client ID (optional)
   */
  userPoolClientId?: string;

  /**
   * Cognito Domain URL (optional)
   */
  cognitoDomainUrl?: string;

  /**
   * Cognito Logout URL (optional)
   */
  userPoolLogoutUrl?: string;
}

/**
 * Main construct for deploying the Smart Todo API as an ECS Fargate service
 * This construct orchestrates all the ECS-related constructs
 */
export class SmartTodoEcsConstruct extends Construct {
  /**
   * The URL of the API endpoint
   */
  public readonly apiEndpoint: string;

  constructor(scope: Construct, id: string, props: SmartTodoEcsConstructProps, config?: StackConfig) {
    super(scope, id);

    // Create a VPC for the ECS service (with no NAT Gateway)
    const vpc = new EcsVpcConstruct(this, 'Vpc', config);

    // Create a load balancer
    const loadBalancer = new LoadBalancerConstruct(this, 'LoadBalancer', {
      vpc: vpc.vpc
    }, config);

    // Create VPC endpoints for AWS services to enable private connectivity
    const vpcEndpoints = new VpcEndpointsConstruct(this, 'VpcEndpoints', {
      vpc: vpc.vpc,
      securityGroup: loadBalancer.serviceSecurityGroup
    }, config);

    // Create an ECS cluster
    const cluster = new EcsClusterConstruct(this, 'Cluster', {
      vpc: vpc.vpc
    }, config);

    // Create IAM roles for the ECS task
    const taskRoles = new EcsTaskRole(this, 'TaskRoles', {
      tableName: props.tableName
    }, config);

    // Create the ECS service with environment variables for Cognito
    const service = new EcsServiceConstruct(this, 'Service', {
      cluster: cluster.cluster,
      targetGroup: loadBalancer.targetGroup,
      securityGroup: loadBalancer.serviceSecurityGroup,
      taskRole: taskRoles.taskRole,
      executionRole: taskRoles.executionRole,
      tableName: props.tableName,
      environment: {
        // Add Cognito-related environment variables if available
        ...(props.cognitoDomainUrl && { COGNITO_DOMAIN_URL: props.cognitoDomainUrl }),
        ...(props.userPoolLogoutUrl && { LOGOUT_URL: props.userPoolLogoutUrl }),
        ...(props.userPoolId && { COGNITO_USER_POOL_ID: props.userPoolId }),
        ...(props.userPoolClientId && { COGNITO_CLIENT_ID: props.userPoolClientId }),
        COGNITO_REGION: 'us-east-1'
      }
    }, config);

    // Apply WAF protection to the load balancer
    new WafProtectionConstruct(this, 'WafProtection', {
      resourceArn: loadBalancer.loadBalancer.loadBalancerArn,
      namePrefix: 'Api',
      rateLimit: 2000
    }, config);

    // Store the API endpoint URL
    this.apiEndpoint = loadBalancer.loadBalancerUrl;

    // Output the API endpoint
    new cdk.CfnOutput(this, 'ApiEndpointOutput', {
      value: this.apiEndpoint,
      description: 'API Endpoint URL',
    });
  }
}
