/**
 * ECS Workbench Construct
 * Creates multiple ECS services based on deployment configuration
 */

import { Construct } from 'constructs';
import { RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Vpc, SecurityGroup, Port, Peer } from 'aws-cdk-lib/aws-ec2';
import { 
  Cluster,
  FargateService,
  FargateTaskDefinition,
  ContainerDefinition,
  LogDriver,
  Protocol,
  ContainerImage,
} from 'aws-cdk-lib/aws-ecs';
import { 
  Role, 
  ServicePrincipal, 
  PolicyStatement, 
  Effect,
  ManagedPolicy,
} from 'aws-cdk-lib/aws-iam';
import * as msk from '@aws-cdk/aws-msk-alpha';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { EcrConstruct } from './ecr-construct';
import { Config } from '../lib/config';
import { DeploymentConfig, ServiceConfig, NamingHelper, TaskResourceValidator } from '../lib/config-types-and-helpers';

export interface EcsWorkbenchProps {
  vpc: Vpc;
  cluster: Cluster;
  ecrConstruct: EcrConstruct;
  deploymentConfig: DeploymentConfig;
}

export interface WorkbenchService {
  service: FargateService;
  taskDefinition: FargateTaskDefinition;
  container: ContainerDefinition;
  logGroup: LogGroup;
  serviceIndex: number;
  topics: string[];
}

export class EcsWorkbenchConstruct extends Construct {
  public readonly services: WorkbenchService[] = [];
  private sharedTaskRole: Role;
  private sharedExecutionRole: Role;
  private sharedSecurityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: EcsWorkbenchProps) {
    super(scope, id);

    const { vpc, cluster, ecrConstruct, deploymentConfig } = props;

    // Create shared resources that all services will use
    this.createSharedResources(vpc);

    // Create individual services based on configuration
    deploymentConfig.services.forEach((serviceConfig, index) => {
      const workbenchService = this.createService(
        vpc,
        cluster,
        ecrConstruct,
        serviceConfig,
        index
      );
      this.services.push(workbenchService);
    });
  }

  /**
   * Create shared resources used by all services
   */
  private createSharedResources(vpc: Vpc): void {
    // Create shared task execution role (for ECS agent)
    this.sharedExecutionRole = new Role(this, 'SharedTaskExecutionRole', {
      roleName: Config.getResourceName('workbench-execution-role'),
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Add ECR permissions to execution role
    this.sharedExecutionRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'ecr:GetAuthorizationToken',
        'ecr:BatchCheckLayerAvailability',
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
      ],
      resources: ['*'],
    }));

    // Create shared task role (for application)
    this.sharedTaskRole = new Role(this, 'SharedTaskRole', {
      roleName: Config.getResourceName('workbench-task-role'),
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Add basic permissions for the application
    this.sharedTaskRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'sts:GetCallerIdentity',
      ],
      resources: ['*'],
    }));

    // Add CloudWatch metrics permissions
    this.sharedTaskRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData',
      ],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'cloudwatch:namespace': 'MSKExpress/Kafka',
        },
      },
    }));

    // Create shared security group for ECS tasks
    this.sharedSecurityGroup = new SecurityGroup(this, 'SharedTaskSecurityGroup', {
      vpc,
      securityGroupName: Config.getResourceName('workbench-sg'),
      description: 'Security group for workbench ECS tasks',
      allowAllOutbound: true,
    });

    // Allow health check traffic
    this.sharedSecurityGroup.addIngressRule(
      Peer.ipv4(vpc.vpcCidrBlock),
      Port.tcp(3000),
      'Allow health check traffic from VPC'
    );
  }

  /**
   * Create individual ECS service
   */
  private createService(
    vpc: Vpc,
    cluster: Cluster,
    ecrConstruct: EcrConstruct,
    serviceConfig: ServiceConfig,
    serviceIndex: number
  ): WorkbenchService {
    const naming = new NamingHelper(Config.envPrefix, Config.appPrefix);
    const serviceName = naming.getServiceName(serviceIndex);
    const topics = naming.getServiceTopics(serviceIndex, serviceConfig.topics);

    // Get configurable task resources with defaults
    const cpu = serviceConfig.cpu || 256;
    const memoryMiB = serviceConfig.memoryMiB || TaskResourceValidator.getDefaultMemory(cpu);

    // Validate task resource configuration
    TaskResourceValidator.validateTaskResources(serviceConfig, serviceIndex);

    // Create log group for this service
    const logGroup = new LogGroup(this, `Service${serviceIndex}LogGroup`, {
      logGroupName: `/aws/ecs/workbench/${serviceName}`,
      retention: RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Add log permissions for this service
    this.sharedTaskRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: [logGroup.logGroupArn],
    }));

    // Create Fargate task definition with configurable resources
    const taskDefinition = new FargateTaskDefinition(this, `Service${serviceIndex}TaskDefinition`, {
      family: `${serviceName}-task`,
      cpu: cpu,
      memoryLimitMiB: memoryMiB,
      taskRole: this.sharedTaskRole,
      executionRole: this.sharedExecutionRole,
    });

    // Prepare environment variables specific to this service
    const environment: { [key: string]: string } = {
      NODE_ENV: 'production',
      PORT: '3000',
      AWS_REGION: cluster.stack.region,
      LOG_LEVEL: 'info',
      // Service-specific configuration
      SERVICE_INDEX: serviceIndex.toString(),
      SERVICE_NAME: serviceName,
      KAFKA_TOPICS: topics.join(','),
      PARTITIONS_PER_TOPIC: serviceConfig.partitionsPerTopic.toString(),
      MESSAGE_SIZE_BYTES: serviceConfig.messageSizeBytes.toString(),
    };

    // Add container to task definition with configurable resources
    const container = taskDefinition.addContainer('AppContainer', {
      containerName: `${serviceName}-container`,
      image: ContainerImage.fromDockerImageAsset(ecrConstruct.getDockerImageAsset()),
      cpu: cpu,
      memoryLimitMiB: memoryMiB,
      essential: true,
      logging: LogDriver.awsLogs({
        logGroup: logGroup,
        streamPrefix: 'ecs',
      }),
      environment,
      healthCheck: {
        command: ['CMD-SHELL', 'wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1'],
        interval: Duration.seconds(30),
        timeout: Duration.seconds(10),
        retries: 3,
        startPeriod: Duration.seconds(60),
      },
    });

    // Add port mapping
    container.addPortMappings({
      containerPort: 3000,
      protocol: Protocol.TCP,
      name: 'http',
    });

    // Create Fargate service
    const service = new FargateService(this, `Service${serviceIndex}`, {
      serviceName: serviceName,
      cluster,
      taskDefinition: taskDefinition,
      desiredCount: serviceConfig.instances, // Exact number from config
      vpcSubnets: { subnets: vpc.isolatedSubnets },
      securityGroups: [this.sharedSecurityGroup],
      assignPublicIp: false,
      capacityProviderStrategies: [
        {
          capacityProvider: 'FARGATE',
          weight: 1,
          base: 1, // Ensure at least one task on regular Fargate
        },
        {
          capacityProvider: 'FARGATE_SPOT',
          weight: 4, // Prefer spot for additional tasks
          base: 0,
        },
      ],
      enableExecuteCommand: true, // Enable ECS Exec for debugging
    });

    // NO AUTO-SCALING - Deploy exactly the configured number of instances

    return {
      service,
      taskDefinition,
      container,
      logGroup,
      serviceIndex,
      topics,
    };
  }

  /**
   * Add MSK configuration to all services
   */
  public addMskConfiguration(mskCluster: msk.Cluster, mskPolicy: ManagedPolicy, bootstrapBrokers: string): void {
    // Add MSK policy to shared task role
    this.sharedTaskRole.addManagedPolicy(mskPolicy);

    // Add MSK environment variables to all services
    this.services.forEach((workbenchService) => {
      workbenchService.container.addEnvironment('MSK_CLUSTER_ARN', mskCluster.clusterArn);
      workbenchService.container.addEnvironment('MSK_CLUSTER_NAME', mskCluster.clusterName);
      workbenchService.container.addEnvironment('MSK_BOOTSTRAP_SERVERS', bootstrapBrokers);
    });
  }

  /**
   * Get all ECS services
   */
  public getServices(): FargateService[] {
    return this.services.map(ws => ws.service);
  }

  /**
   * Get all log groups
   */
  public getLogGroups(): LogGroup[] {
    return this.services.map(ws => ws.logGroup);
  }

  /**
   * Get service by index
   */
  public getService(index: number): WorkbenchService | undefined {
    return this.services.find(ws => ws.serviceIndex === index);
  }

  /**
   * Get all topics across all services
   */
  public getAllTopics(): string[] {
    return this.services.flatMap(ws => ws.topics);
  }

  /**
   * Get shared security group
   */
  public getSecurityGroup(): SecurityGroup {
    return this.sharedSecurityGroup;
  }

  /**
   * Get total number of services
   */
  public getServiceCount(): number {
    return this.services.length;
  }

  /**
   * Get total number of instances across all services
   */
  public getTotalInstances(): number {
    return this.services.reduce((total, ws) => {
      const service = ws.service as any; // Cast to access desiredCount
      return total + (service.desiredCount || 0);
    }, 0);
  }
}
