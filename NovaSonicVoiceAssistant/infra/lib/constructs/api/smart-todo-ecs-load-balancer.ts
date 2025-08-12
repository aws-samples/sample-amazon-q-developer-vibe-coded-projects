import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { StackConfig, prefixResourceName } from '../../config';

export interface LoadBalancerConstructProps {
  /**
   * The VPC to create the load balancer in
   */
  vpc: ec2.IVpc;
}

/**
 * Creates an Application Load Balancer for the ECS service
 */
export class LoadBalancerConstruct extends Construct {
  /**
   * The Application Load Balancer
   */
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;

  /**
   * The target group for the API service
   */
  public readonly targetGroup: elbv2.ApplicationTargetGroup;

  /**
   * The security group for the load balancer
   */
  public readonly securityGroup: ec2.SecurityGroup;

  /**
   * The security group for the ECS service
   */
  public readonly serviceSecurityGroup: ec2.SecurityGroup;

  /**
   * The URL of the load balancer
   */
  public readonly loadBalancerUrl: string;

  /**
   * The listener for the load balancer
   */
  public readonly listener: elbv2.ApplicationListener;

  constructor(scope: Construct, id: string, props: LoadBalancerConstructProps, config?: StackConfig) {
    super(scope, id);

    const resourcePrefix = config?.resourcePrefix || '';

    // Create a security group for the load balancer
    this.securityGroup = new ec2.SecurityGroup(this, 'LbSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for API load balancer',
      allowAllOutbound: false, // Changed to false to be more restrictive
      securityGroupName: prefixResourceName(config || { resourcePrefix, stackName: '' }, 'LbSecurityGroup'),
    });

    // Allow HTTP traffic only from CloudFront using the managed prefix list
    this.securityGroup.addIngressRule(
      ec2.Peer.prefixList('pl-3b927c52'), // CloudFront managed prefix list in east us
      ec2.Port.tcp(80),
      'Allow HTTP traffic only from CloudFront'
    );
    
    // Add specific outbound rules for the traffic you need
    this.securityGroup.addEgressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(3001),
      'Allow outbound traffic to ECS service'
    );
    this.serviceSecurityGroup = new ec2.SecurityGroup(this, 'ServiceSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for API ECS service',
      allowAllOutbound: true,
      securityGroupName: prefixResourceName(config || { resourcePrefix, stackName: '' }, 'ServiceSecurityGroup'),
    });

    // Create an Application Load Balancer
    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'ApiLoadBalancer', {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: this.securityGroup,
      loadBalancerName: prefixResourceName(config || { resourcePrefix, stackName: '' }, 'ApiLB').substring(0, 32),
    });

    // Create a target group with faster health checks
    this.targetGroup = new elbv2.ApplicationTargetGroup(this, 'ApiTargetGroup', {
      vpc: props.vpc,
      port: 3001,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.seconds(5), // Reduced from 30s to 5s
        timeout: cdk.Duration.seconds(2),  // Reduced timeout
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 2,
      },
      deregistrationDelay: cdk.Duration.seconds(5), // Reduced from default 300s to 5s
      targetGroupName: prefixResourceName(config || { resourcePrefix, stackName: '' }, 'ApiTargetGroup').substring(0, 32),
    });

    // Add HTTP listener for the load balancer
    this.listener = this.loadBalancer.addListener('ApiListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      open: false,
      defaultAction: elbv2.ListenerAction.forward([this.targetGroup]),
    });

    // Add a rule for the health check endpoint
    this.listener.addAction('health-check-rule', {
      priority: 10,
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['/health']),
      ],
      action: elbv2.ListenerAction.forward([this.targetGroup]),
    });
    
    // Add a rule for WebSocket connections
    this.listener.addAction('websocket-rule', {
      priority: 20,
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['/novasonic']),
      ],
      action: elbv2.ListenerAction.forward([this.targetGroup]),
    });

    // Allow traffic from the load balancer to the service
    this.serviceSecurityGroup.addIngressRule(
      this.securityGroup,
      ec2.Port.tcp(3001),
      'Allow traffic from load balancer'
    );
    
    // Allow WebSocket traffic to the service
    this.serviceSecurityGroup.addIngressRule(
      this.securityGroup,
      ec2.Port.tcp(3001),
      'Allow WebSocket traffic from load balancer'
    );

    // Set the load balancer URL
    this.loadBalancerUrl = `http://${this.loadBalancer.loadBalancerDnsName}`;

    // Output the load balancer URL
    new cdk.CfnOutput(this, 'LoadBalancerUrl', {
      value: this.loadBalancerUrl,
      description: 'URL of the API load balancer',
    });
  }
}
