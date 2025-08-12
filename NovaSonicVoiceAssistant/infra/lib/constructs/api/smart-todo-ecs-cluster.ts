import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { StackConfig, prefixResourceName } from '../../config';

export interface EcsClusterConstructProps {
  /**
   * The VPC to create the cluster in
   */
  vpc: ec2.IVpc;
}

/**
 * Creates an ECS cluster for running the API service
 */
export class EcsClusterConstruct extends Construct {
  /**
   * The ECS cluster
   */
  public readonly cluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props: EcsClusterConstructProps, config?: StackConfig) {
    super(scope, id);

    const resourcePrefix = config?.resourcePrefix || '';

    // Create an ECS cluster
    this.cluster = new ecs.Cluster(this, 'ApiCluster', {
      vpc: props.vpc,
      clusterName: prefixResourceName(config || { resourcePrefix, stackName: '' }, 'ApiCluster'),
      containerInsightsV2: cdk.aws_ecs.ContainerInsights.ENHANCED
    });

    // Output the cluster name
    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
      description: 'ECS Cluster name for the API service',
    });
  }
}
