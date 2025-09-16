/**
 * VPC Endpoints Construct
 * Creates VPC endpoints for ECS tasks to access AWS services from private subnets
 */

import { Construct } from 'constructs';
import {
  Vpc,
  InterfaceVpcEndpoint,
  InterfaceVpcEndpointAwsService,
  GatewayVpcEndpoint,
  GatewayVpcEndpointAwsService,
  SecurityGroup,
  Port,
  Peer,
} from 'aws-cdk-lib/aws-ec2';
import { Config } from '../lib/config';

export interface VpcEndpointsProps {
  vpc: Vpc;
}

export class VpcEndpointsConstruct extends Construct {
  public readonly endpointSecurityGroup: SecurityGroup;
  public readonly endpoints: InterfaceVpcEndpoint[];
  public readonly s3GatewayEndpoint: GatewayVpcEndpoint;

  constructor(scope: Construct, id: string, props: VpcEndpointsProps) {
    super(scope, id);

    const { vpc } = props;

    // Create security group for VPC endpoints
    this.endpointSecurityGroup = new SecurityGroup(this, 'EndpointSecurityGroup', {
      vpc,
      securityGroupName: Config.getResourceName('vpc-endpoints-sg'),
      description: 'Security group for VPC endpoints',
      allowAllOutbound: false,
    });

    // Allow HTTPS traffic from private subnets
    this.endpointSecurityGroup.addIngressRule(
      Peer.ipv4(vpc.vpcCidrBlock),
      Port.tcp(443),
      'Allow HTTPS from VPC'
    );

    // Allow HTTP traffic for some endpoints
    this.endpointSecurityGroup.addIngressRule(
      Peer.ipv4(vpc.vpcCidrBlock),
      Port.tcp(80),
      'Allow HTTP from VPC'
    );

    // Create VPC endpoints for ECS and related services
    this.endpoints = [
      // ECR endpoints for container image pulling
      new InterfaceVpcEndpoint(this, 'EcrApiEndpoint', {
        vpc,
        service: InterfaceVpcEndpointAwsService.ECR,
        subnets: { subnets: vpc.isolatedSubnets },
        securityGroups: [this.endpointSecurityGroup],
        privateDnsEnabled: true,
      }),

      new InterfaceVpcEndpoint(this, 'EcrDkrEndpoint', {
        vpc,
        service: InterfaceVpcEndpointAwsService.ECR_DOCKER,
        subnets: { subnets: vpc.isolatedSubnets },
        securityGroups: [this.endpointSecurityGroup],
        privateDnsEnabled: true,
      }),

      // ECS endpoints for task management
      new InterfaceVpcEndpoint(this, 'EcsEndpoint', {
        vpc,
        service: InterfaceVpcEndpointAwsService.ECS,
        subnets: { subnets: vpc.isolatedSubnets },
        securityGroups: [this.endpointSecurityGroup],
        privateDnsEnabled: true,
      }),

      new InterfaceVpcEndpoint(this, 'EcsAgentEndpoint', {
        vpc,
        service: InterfaceVpcEndpointAwsService.ECS_AGENT,
        subnets: { subnets: vpc.isolatedSubnets },
        securityGroups: [this.endpointSecurityGroup],
        privateDnsEnabled: true,
      }),

      new InterfaceVpcEndpoint(this, 'EcsTelemetryEndpoint', {
        vpc,
        service: InterfaceVpcEndpointAwsService.ECS_TELEMETRY,
        subnets: { subnets: vpc.isolatedSubnets },
        securityGroups: [this.endpointSecurityGroup],
        privateDnsEnabled: true,
      }),

      // CloudWatch Logs for application logging
      new InterfaceVpcEndpoint(this, 'CloudWatchLogsEndpoint', {
        vpc,
        service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        subnets: { subnets: vpc.isolatedSubnets },
        securityGroups: [this.endpointSecurityGroup],
        privateDnsEnabled: true,
      }),

      // CloudWatch Monitoring
      new InterfaceVpcEndpoint(this, 'CloudWatchEndpoint', {
        vpc,
        service: InterfaceVpcEndpointAwsService.CLOUDWATCH_MONITORING,
        subnets: { subnets: vpc.isolatedSubnets },
        securityGroups: [this.endpointSecurityGroup],
        privateDnsEnabled: true,
      }),

      // STS for AWS credential management
      new InterfaceVpcEndpoint(this, 'StsEndpoint', {
        vpc,
        service: InterfaceVpcEndpointAwsService.STS,
        subnets: { subnets: vpc.isolatedSubnets },
        securityGroups: [this.endpointSecurityGroup],
        privateDnsEnabled: true,
      }),

      // SSM for parameter store access
      new InterfaceVpcEndpoint(this, 'SsmEndpoint', {
        vpc,
        service: InterfaceVpcEndpointAwsService.SSM,
        subnets: { subnets: vpc.isolatedSubnets },
        securityGroups: [this.endpointSecurityGroup],
        privateDnsEnabled: true,
      }),

      // SSM Messages for Session Manager
      new InterfaceVpcEndpoint(this, 'SsmMessagesEndpoint', {
        vpc,
        service: InterfaceVpcEndpointAwsService.SSM_MESSAGES,
        subnets: { subnets: vpc.isolatedSubnets },
        securityGroups: [this.endpointSecurityGroup],
        privateDnsEnabled: true,
      }),

      // EC2 Messages for Session Manager
      new InterfaceVpcEndpoint(this, 'Ec2MessagesEndpoint', {
        vpc,
        service: InterfaceVpcEndpointAwsService.EC2_MESSAGES,
        subnets: { subnets: vpc.isolatedSubnets },
        securityGroups: [this.endpointSecurityGroup],
        privateDnsEnabled: true,
      }),
    ];

    // Create S3 Gateway VPC Endpoint (required for ECR image layers)
    this.s3GatewayEndpoint = new GatewayVpcEndpoint(this, 'S3GatewayEndpoint', {
      vpc,
      service: GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnets: vpc.isolatedSubnets }],
    });

    // Tag all endpoints
    this.endpoints.forEach((endpoint, index) => {
      endpoint.node.addMetadata('Name', Config.getResourceName(`vpc-endpoint-${index}`));
    });
  }

  /**
   * Get security group for VPC endpoints
   */
  public getEndpointSecurityGroup(): SecurityGroup {
    return this.endpointSecurityGroup;
  }

  /**
   * Get all VPC endpoints
   */
  public getEndpoints(): InterfaceVpcEndpoint[] {
    return this.endpoints;
  }

  /**
   * Get S3 Gateway VPC endpoint
   */
  public getS3GatewayEndpoint(): GatewayVpcEndpoint {
    return this.s3GatewayEndpoint;
  }
}
