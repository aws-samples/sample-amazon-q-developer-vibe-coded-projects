import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { VpcConstruct } from '../constructs/vpc-construct';
import { VpcEndpointsConstruct } from '../constructs/vpc-endpoints-construct';
import { TagsConstruct } from '../constructs/tags-construct';
import { RetentionPolicyConstruct } from '../constructs/retention-policy-construct';
import { MskConstruct } from '../constructs/msk-construct';
import { EcrConstruct } from '../constructs/ecr-construct';
import { EcsClusterConstruct } from '../constructs/ecs-cluster-construct';
import { EcsWorkbenchConstruct } from '../constructs/ecs-workbench-construct';
import { WorkbenchDashboardConstruct } from '../constructs/workbench-dashboard-construct';
import { MskNagSuppressions } from '../nag-suppressions';
import { Config, deploymentConfig } from './config';

export class AppStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly vpcEndpoints: VpcEndpointsConstruct;
  public readonly ecrConstruct: EcrConstruct;
  public readonly ecsCluster: EcsClusterConstruct;
  public readonly ecsWorkbench: EcsWorkbenchConstruct;
  public readonly dashboard: WorkbenchDashboardConstruct;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC with VPC endpoints
    const vpcResources = VpcConstruct.withVpc(this);
    this.vpc = vpcResources.vpc;
    this.vpcEndpoints = vpcResources.vpcEndpoints;

    // Create ECR repository with automatic Docker building
    this.ecrConstruct = new EcrConstruct(this, 'EcrConstruct');

    // Create ECS cluster
    this.ecsCluster = new EcsClusterConstruct(this, 'EcsClusterConstruct', {
      vpc: this.vpc,
      enableContainerInsights: true,
    });

    // Create ECS workbench with multiple services based on configuration
    this.ecsWorkbench = new EcsWorkbenchConstruct(this, 'EcsWorkbenchConstruct', {
      vpc: this.vpc,
      cluster: this.ecsCluster.getCluster(),
      ecrConstruct: this.ecrConstruct,
      deploymentConfig: deploymentConfig,
    });

    // Create MSK Express cluster with workbench security group for connectivity
    const mskResources = MskConstruct.create(this, this.vpc, this.ecsWorkbench.getSecurityGroup());
    const mskCluster = mskResources.cluster;
    const mskPolicy = mskResources.policy;
    const mskBootstrapBrokers = mskResources.bootstrapBrokers;

    // Update all ECS services with MSK configuration
    this.ecsWorkbench.addMskConfiguration(mskCluster, mskPolicy, mskBootstrapBrokers);

    // Create CloudWatch Dashboard for monitoring high-throughput streaming
    this.dashboard = new WorkbenchDashboardConstruct(this, deploymentConfig);

    // Add explicit dependencies to ensure proper deployment order
    this.addDependencies();

    // Configure common properties for all resources
    this.configureCommonProperties();

    // Add stack outputs
    this.addOutputs();

    // Apply NAG suppressions
    MskNagSuppressions.applySuppressions(this);
  }

  /**
   * Add explicit dependencies to ensure proper deployment order
   */
  private addDependencies(): void {
    // ECS Workbench must wait for VPC endpoints to be created
    // This is critical for container image pulling from ECR in private subnets
    this.ecsWorkbench.node.addDependency(this.vpcEndpoints);
    
    // ECS Workbench should also wait for ECR repository to be ready
    this.ecsWorkbench.node.addDependency(this.ecrConstruct);
    
    // ECS Cluster should wait for VPC to be fully configured
    this.ecsCluster.node.addDependency(this.vpc);

    // Dashboard should wait for ECS workbench to be created (for log groups)
    this.dashboard.node.addDependency(this.ecsWorkbench);
  }

  /**
   * Add stack outputs for important resources
   */
  private addOutputs(): void {
    // Dashboard URL output
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${Config.getResourceName('workbench-dashboard')}`,
      description: 'CloudWatch Dashboard URL for MSK Express Streaming Metrics',
      exportName: `${this.stackName}-DashboardUrl`,
    });

    // Log group outputs for all services
    this.ecsWorkbench.getLogGroups().forEach((logGroup, index) => {
      new cdk.CfnOutput(this, `Service${index}LogGroupName`, {
        value: logGroup.logGroupName,
        description: `CloudWatch Log Group for service-${index}`,
        exportName: `${this.stackName}-Service${index}LogGroupName`,
      });
    });

    // ECS service outputs for all services
    this.ecsWorkbench.getServices().forEach((service, index) => {
      new cdk.CfnOutput(this, `Service${index}Name`, {
        value: service.serviceName,
        description: `ECS Service name for service-${index}`,
        exportName: `${this.stackName}-Service${index}Name`,
      });
    });

    // Summary outputs
    new cdk.CfnOutput(this, 'TotalServices', {
      value: this.ecsWorkbench.getServiceCount().toString(),
      description: 'Total number of ECS services deployed',
      exportName: `${this.stackName}-TotalServices`,
    });

    new cdk.CfnOutput(this, 'TotalInstances', {
      value: this.ecsWorkbench.getTotalInstances().toString(),
      description: 'Total number of ECS task instances across all services',
      exportName: `${this.stackName}-TotalInstances`,
    });

    new cdk.CfnOutput(this, 'TotalTopics', {
      value: this.ecsWorkbench.getAllTopics().length.toString(),
      description: 'Total number of Kafka topics across all services',
      exportName: `${this.stackName}-TotalTopics`,
    });
  }

  /**
   * Configures common properties for all resources in the stack
   * This includes tags and retention policies
   * Note: CDK NAG compliance checks are applied at the app level in bin/cdk.ts
   */
  private configureCommonProperties(): void {
    // Apply common tags to all resources in this stack
    TagsConstruct.applyTags(this);

    // Apply destroy retention policy to all resources in this stack
    RetentionPolicyConstruct.applyDestroyPolicy(this);
  }
}
