/**
 * ECS Cluster Construct
 * Creates ECS cluster with Fargate capacity and CloudWatch Container Insights
 */

import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { 
  Cluster, 
} from 'aws-cdk-lib/aws-ecs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Config } from '../lib/config';

export interface EcsClusterProps {
  vpc: Vpc;
  enableContainerInsights?: boolean;
}

export class EcsClusterConstruct extends Construct {
  public readonly cluster: Cluster;
  public readonly logGroup: LogGroup;

  constructor(scope: Construct, id: string, props: EcsClusterProps) {
    super(scope, id);

    const { vpc, enableContainerInsights = true } = props;

    // Create CloudWatch log group for cluster
    this.logGroup = new LogGroup(this, 'ClusterLogGroup', {
      logGroupName: `/aws/ecs/cluster/${Config.getResourceName('cluster')}`,
      retention: RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create ECS cluster
    this.cluster = new Cluster(this, 'Cluster', {
      clusterName: Config.getResourceName('cluster'),
      vpc,
      containerInsights: enableContainerInsights,
      enableFargateCapacityProviders: true,
    });

    // Configure default capacity provider strategy for cost optimization
    this.cluster.addDefaultCapacityProviderStrategy([
      {
        capacityProvider: 'FARGATE',
        weight: 1,
        base: 1, // Ensure at least one task on regular Fargate
      },
      {
        capacityProvider: 'FARGATE_SPOT',
        weight: 4, // Prefer spot instances for cost savings
        base: 0,
      },
    ]);
  }

  /**
   * Get the ECS cluster
   */
  public getCluster(): Cluster {
    return this.cluster;
  }

  /**
   * Get the cluster log group
   */
  public getLogGroup(): LogGroup {
    return this.logGroup;
  }

  /**
   * Get cluster ARN
   */
  public getClusterArn(): string {
    return this.cluster.clusterArn;
  }

  /**
   * Get cluster name
   */
  public getClusterName(): string {
    return this.cluster.clusterName;
  }
}
