import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { StackConfig, prefixResourceName } from '../../config';

/**
 * Creates a VPC for the ECS Fargate service with public and private subnets
 * NAT Gateway is used to provide internet connectivity to private subnets
 */
export class EcsVpcConstruct extends Construct {
  /**
   * The VPC created for the ECS service
   */
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, config?: StackConfig) {
    super(scope, id);

    const resourcePrefix = config?.resourcePrefix || '';

    // Create a VPC with public and private subnets in 2 AZs
    // NAT Gateways are provisioned to allow outbound internet access from private subnets
    this.vpc = new ec2.Vpc(this, 'ApiVpc', {
      vpcName: prefixResourceName(config || { resourcePrefix, stackName: '' }, 'ApiVpc'),
      maxAzs: 2,
      natGateways: 1, // Single NAT Gateway for cost optimization
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // Private subnets with NAT Gateway for outbound access
          cidrMask: 24,
        }
      ]
    });

    // Output the VPC ID
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID for the API infrastructure',
    });
  }
}
