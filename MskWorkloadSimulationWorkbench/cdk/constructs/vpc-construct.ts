import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import { Config } from '../lib/config';
import { VpcEndpointsConstruct } from './vpc-endpoints-construct';

/**
 * VPC Construct Extension
 * Provides a convenient method to create a VPC with standard configuration and VPC endpoints
 */
export class VpcConstruct {
  /**
   * Creates a VPC with standard configuration and VPC endpoints
   * @param scope The construct scope
   * @returns Object containing VPC instance and VPC endpoints construct
   */
  static withVpc(scope: Construct): { vpc: ec2.Vpc; vpcEndpoints: VpcEndpointsConstruct } {
    const vpc = new ec2.Vpc(scope, Config.getResourceId('Vpc'), {
      vpcName: Config.getResourceName('vpc'),
      availabilityZones: Stack.of(scope).availabilityZones.slice(0, 3), // Explicitly take first 3 AZs
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: Config.getResourceName('public-subnet'),
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: Config.getResourceName('private-subnet'),
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // Create VPC endpoints for ECS and AWS services access from private subnets
    const vpcEndpoints = new VpcEndpointsConstruct(scope, Config.getResourceId('VpcEndpoints'), {
      vpc,
    });

    return { vpc, vpcEndpoints };
  }
}
