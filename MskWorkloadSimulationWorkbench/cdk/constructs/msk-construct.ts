import * as cdk from 'aws-cdk-lib';
import * as msk from '@aws-cdk/aws-msk-alpha';
import * as mskCfn from 'aws-cdk-lib/aws-msk';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { Config } from '../lib/config';

/**
 * MSK Construct
 * Creates MSK Express cluster with IAM authentication
 */
export class MskConstruct {
  /**
   * Creates MSK Express cluster with required components
   * @param scope The construct scope
   * @param vpc The VPC to deploy in
   * @param ecsSecurityGroup Optional ECS security group to allow connections from
   * @returns Object containing cluster and IAM policy
   */
  static create(scope: Construct, vpc: ec2.Vpc, ecsSecurityGroup?: ec2.SecurityGroup) {
    // Create MSK Express cluster
    const cluster = new msk.Cluster(scope, Config.getResourceId('MskExpressCluster'), {
      clusterName: Config.getResourceName('express-cluster'),
      kafkaVersion: msk.KafkaVersion.V3_6_0,
      numberOfBrokerNodes: Config.mskBroker.numberOfBrokers,
      vpc,
      encryptionInTransit: {
        clientBroker: msk.ClientBrokerEncryption.TLS,
      },
      clientAuthentication: msk.ClientAuthentication.sasl({
        iam: true,
      }),
      monitoring: {
        clusterMonitoringLevel: msk.ClusterMonitoringLevel.PER_TOPIC_PER_PARTITION,
      },
      logging: {cloudwatchLogGroup: undefined, s3:undefined, firehoseDeliveryStreamName:undefined},
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      storageMode:undefined
    });
  

    // Override properties for Express brokers
    const cfnCluster = cluster.node.defaultChild as mskCfn.CfnCluster;
    
    // Set Express instance type from configuration
    cfnCluster.addPropertyOverride('BrokerNodeGroupInfo.InstanceType', Config.mskBroker.instanceType);
    
    // Remove StorageInfo section (not supported for Express brokers)
    cfnCluster.addPropertyOverride('BrokerNodeGroupInfo.StorageInfo', undefined);
    
    // Remove LoggingInfo section completely (not supported for Express brokers)
    cfnCluster.addPropertyOverride('LoggingInfo', undefined);

    // Allow connections only from private subnets
    vpc.privateSubnets.forEach((subnet, index) => {
      // Allow MSK IAM authentication (port 9098) from each private subnet
      cluster.connections.allowFrom(
        ec2.Peer.ipv4(subnet.ipv4CidrBlock),
        ec2.Port.tcp(9098),
        `MSK IAM authentication from private subnet ${index + 1}`
      );

      // Allow Zookeeper access (port 2181) from each private subnet
      cluster.connections.allowFrom(
        ec2.Peer.ipv4(subnet.ipv4CidrBlock),
        ec2.Port.tcp(2181),
        `Zookeeper access from private subnet ${index + 1}`
      );
    });

    // Allow connections from ECS security group if provided
    if (ecsSecurityGroup) {
      cluster.connections.allowFrom(
        ecsSecurityGroup,
        ec2.Port.tcp(9098),
        'MSK IAM authentication from ECS tasks'
      );

      cluster.connections.allowFrom(
        ecsSecurityGroup,
        ec2.Port.tcp(2181),
        'Zookeeper access from ECS tasks'
      );
    }

    // Create IAM policy for MSK access using the exact format from your sample policy
    // We'll use a more permissive approach that should definitely work
    const policy = new iam.ManagedPolicy(scope, Config.getResourceId('MskKafkaClusterAccessPolicyFinal'), {
      managedPolicyName: Config.getResourceName('msk-kafka-cluster-access-policy-final'),
      description: 'IAM policy for MSK Express cluster access with comprehensive permissions',
      statements: [
        // Cluster-level permissions - exact match from sample policy
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'kafka-cluster:Connect',
            'kafka-cluster:AlterCluster',
            'kafka-cluster:DescribeCluster',
          ],
          resources: [
            cluster.clusterArn, // Use the exact cluster ARN
          ],
        }),
        // Topic permissions - comprehensive access to all topics in all clusters
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'kafka-cluster:DescribeTopic',
            'kafka-cluster:CreateTopic',
            'kafka-cluster:*Topic*',
            'kafka-cluster:WriteData',
            'kafka-cluster:ReadData',
          ],
          resources: [
            // Allow access to all topics in all clusters for this account/region
            `arn:aws:kafka:${cluster.stack.region}:${cluster.stack.account}:topic/*`,
          ],
        }),
        // Consumer group permissions - comprehensive access to all groups in all clusters
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'kafka-cluster:AlterGroup',
            'kafka-cluster:DescribeGroup',
          ],
          resources: [
            // Allow access to all groups in all clusters for this account/region
            `arn:aws:kafka:${cluster.stack.region}:${cluster.stack.account}:group/*`,
          ],
        }),
        // Additional MSK API permissions for cluster discovery
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'kafka:GetBootstrapBrokers',
            'kafka:DescribeCluster',
            'kafka:DescribeClusterV2',
            'kafka:ListClusters',
            'kafka:ListNodes',
          ],
          resources: ['*'],
        }),
      ],
    });

    // Create CloudFormation output for bootstrap servers
    new cdk.CfnOutput(scope, 'BootstrapBrokerStringSaslIam', {
      value: cluster.bootstrapBrokersSaslIam,
      description: 'MSK cluster bootstrap brokers for SASL/IAM authentication',
      exportName: `${Config.getResourceName('bootstrap-brokers-sasl-iam')}`,
    });

    return {
      cluster,
      policy,
      bootstrapBrokers: cluster.bootstrapBrokersSaslIam,
    };
  }
}
