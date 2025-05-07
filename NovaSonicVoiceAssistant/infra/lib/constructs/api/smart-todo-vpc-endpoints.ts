import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { StackConfig, prefixResourceName } from '../../config';

export interface VpcEndpointsConstructProps {
  /**
   * The VPC to add endpoints to
   */
  vpc: ec2.IVpc;

  /**
   * Security group to associate with the endpoints
   */
  securityGroup?: ec2.ISecurityGroup;
}

/**
 * Creates VPC endpoints for AWS services to enable private connectivity
 * without requiring a NAT Gateway
 */
export class VpcEndpointsConstruct extends Construct {
  /**
   * The ECR API endpoint
   */
  public readonly ecrApiEndpoint: ec2.InterfaceVpcEndpoint;

  /**
   * The ECR Docker endpoint
   */
  public readonly ecrDockerEndpoint: ec2.InterfaceVpcEndpoint;

  /**
   * The DynamoDB endpoint
   */
  public readonly dynamoDbEndpoint: ec2.GatewayVpcEndpoint;

  /**
   * The CloudWatch Logs endpoint
   */
  public readonly logsEndpoint: ec2.InterfaceVpcEndpoint;

  /**
   * The S3 endpoint
   */
  public readonly s3Endpoint: ec2.GatewayVpcEndpoint;

  constructor(scope: Construct, id: string, props: VpcEndpointsConstructProps, config?: StackConfig) {
    super(scope, id);

    const resourcePrefix = config?.resourcePrefix || '';

    // Create a security group for the VPC endpoints if not provided
    const endpointSecurityGroup = props.securityGroup || new ec2.SecurityGroup(this, 'EndpointSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for VPC endpoints',
      securityGroupName: prefixResourceName(config || { resourcePrefix, stackName: '' }, 'EndpointSecurityGroup'),
      allowAllOutbound: true,
    });

    // Allow inbound HTTPS from within the VPC
    endpointSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(443),
      'Allow HTTPS from within the VPC'
    );

    // Create ECR API endpoint
    this.ecrApiEndpoint = new ec2.InterfaceVpcEndpoint(this, 'EcrApiEndpoint', {
      vpc: props.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      privateDnsEnabled: true,
      securityGroups: [endpointSecurityGroup],
    });

    // Create ECR Docker endpoint
    this.ecrDockerEndpoint = new ec2.InterfaceVpcEndpoint(this, 'EcrDockerEndpoint', {
      vpc: props.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      privateDnsEnabled: true,
      securityGroups: [endpointSecurityGroup],
    });

    // Create DynamoDB endpoint (gateway type)
    this.dynamoDbEndpoint = new ec2.GatewayVpcEndpoint(this, 'DynamoDbEndpoint', {
      vpc: props.vpc,
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    });

    // Create CloudWatch Logs endpoint
    this.logsEndpoint = new ec2.InterfaceVpcEndpoint(this, 'LogsEndpoint', {
      vpc: props.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      privateDnsEnabled: true,
      securityGroups: [endpointSecurityGroup],
    });

    // Create S3 endpoint (gateway type)
    this.s3Endpoint = new ec2.GatewayVpcEndpoint(this, 'S3Endpoint', {
      vpc: props.vpc,
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    // Output the endpoint IDs
    new cdk.CfnOutput(this, 'EcrApiEndpointId', {
      value: this.ecrApiEndpoint.vpcEndpointId,
      description: 'ECR API VPC Endpoint ID',
    });

    new cdk.CfnOutput(this, 'EcrDockerEndpointId', {
      value: this.ecrDockerEndpoint.vpcEndpointId,
      description: 'ECR Docker VPC Endpoint ID',
    });

    new cdk.CfnOutput(this, 'DynamoDbEndpointId', {
      value: this.dynamoDbEndpoint.vpcEndpointId,
      description: 'DynamoDB VPC Endpoint ID',
    });

    new cdk.CfnOutput(this, 'LogsEndpointId', {
      value: this.logsEndpoint.vpcEndpointId,
      description: 'CloudWatch Logs VPC Endpoint ID',
    });

    new cdk.CfnOutput(this, 'S3EndpointId', {
      value: this.s3Endpoint.vpcEndpointId,
      description: 'S3 VPC Endpoint ID',
    });
  }
}
