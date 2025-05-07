import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as path from 'path';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import { Construct } from 'constructs';
import { StackConfig, prefixResourceName } from '../../config';

export interface EcsServiceConstructProps {
  /**
   * The ECS cluster to deploy the service to
   */
  cluster: ecs.ICluster;

  /**
   * The target group to register the service with
   */
  targetGroup: elbv2.ApplicationTargetGroup;

  /**
   * The security group for the service
   */
  securityGroup: ec2.SecurityGroup;

  /**
   * The task role for the service
   */
  taskRole: iam.Role;

  /**
   * The execution role for the service
   */
  executionRole: iam.Role;

  /**
   * The name of the DynamoDB table to use
   */
  tableName: string;

  /**
   * Environment variables to pass to the container
   */
  environment?: Record<string, string>;
}

/**
 * Creates an ECS Fargate service for the API
 */
export class EcsServiceConstruct extends Construct {
  /**
   * The ECR repository for the API image
   */
  public readonly repository: ecr.Repository;

  /**
   * The ECR repository URI
   */
  public readonly repositoryUri: string;

  /**
   * The ECS service
   */
  public readonly service: ecs.FargateService;

  /**
   * The name of the ECS service
   */
  public readonly serviceName: string;

  constructor(scope: Construct, id: string, props: EcsServiceConstructProps, config?: StackConfig) {
    super(scope, id);

    const resourcePrefix = config?.resourcePrefix || '';

    // Create an ECR repository for the API image
    this.repository = new ecr.Repository(this, 'ApiRepository', {
      repositoryName: prefixResourceName(config || { resourcePrefix, stackName: '' }, 'api-repository').toLowerCase(),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      imageScanOnPush: true,
    });

    this.repositoryUri = this.repository.repositoryUri;

    // Build Docker image from API project using DockerImageAsset with the appropriate architecture
    let dockerfile = 'Dockerfile.amd64'; // Default to amd64
    
    if (config?.ecsConfig) {
      dockerfile = config.ecsConfig.dockerfileMap[config.ecsConfig.cpuArchitecture] || 'Dockerfile.amd64';
    }
    
    const dockerImageAsset = new DockerImageAsset(this, 'ApiDockerImage', {
      directory: path.join(__dirname, '../../../../api'), // Path to the API project
      file: dockerfile, // Use the architecture-specific Dockerfile
    });

    // Create a task definition with the appropriate CPU architecture
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'ApiTaskDef', {
      family: prefixResourceName(config || { resourcePrefix, stackName: '' }, 'ApiTaskDef'),
      taskRole: props.taskRole,
      executionRole: props.executionRole,
      cpu: 512,
      memoryLimitMiB: 1024,
      runtimePlatform: {
        cpuArchitecture: config?.ecsConfig?.cpuArchitecture === 'ARM64' 
          ? ecs.CpuArchitecture.ARM64 
          : ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX
      }
    });

    // Add container to the task definition using the Docker image asset
    const container = taskDefinition.addContainer('ApiContainer', {
      // Use the Docker image asset instead of the ECR repository
      image: ecs.ContainerImage.fromDockerImageAsset(dockerImageAsset),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: prefixResourceName(config || { resourcePrefix, stackName: '' }, 'api'),
        logRetention: cdk.aws_logs.RetentionDays.ONE_WEEK,
      }),
      environment: {
        TABLE_NAME: props.tableName,
        NODE_ENV: 'production',
        ...props.environment,
      },
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3001/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // Add port mapping
    container.addPortMappings({
      containerPort: 3001,
      hostPort: 3001,
      protocol: ecs.Protocol.TCP,
    });

    // Create the ECS service
    this.service = new ecs.FargateService(this, 'ApiService', {
      cluster: props.cluster,
      taskDefinition,
      desiredCount: 2,
      securityGroups: [props.securityGroup],
      assignPublicIp: false,
      serviceName: prefixResourceName(config || { resourcePrefix, stackName: '' }, 'ApiService'),
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }, // Use private subnets with NAT gateway
      minHealthyPercent: 50,
      maxHealthyPercent: 200,
      deploymentController: {
        type: ecs.DeploymentControllerType.ECS,
      },
      circuitBreaker: {
        rollback: true,
      },
    });

    // Register the service with the target group
    this.service.attachToApplicationTargetGroup(props.targetGroup);

    // Store the service name
    this.serviceName = this.service.serviceName;

    // Output the ECR repository name and URI
    new cdk.CfnOutput(this, 'EcrRepositoryName', {
      value: this.repository.repositoryName,
      description: 'ECR repository name',
    });

    new cdk.CfnOutput(this, 'EcrRepositoryUri', {
      value: this.repository.repositoryUri,
      description: 'ECR repository URI',
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: this.service.serviceName,
      description: 'ECS service name',
    });
  }
}
