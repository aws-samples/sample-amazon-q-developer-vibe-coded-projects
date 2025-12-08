/**
 * Dashboard Layout Components
 * Headers, footers, and layout elements for the workbench dashboard
 */

import { TextWidget } from 'aws-cdk-lib/aws-cloudwatch';
import { DeploymentConfig, NamingHelper } from '../../lib/config-types-and-helpers';
import { Config } from '../../lib/config';

export class DashboardLayout {
  
  /**
   * Create main dashboard header
   */
  static createMainHeader(
    totalServices: number,
    totalInstances: number,
    totalTopics: number,
    region: string
  ): TextWidget {
    return new TextWidget({
      markdown: `# MSK Express Kafka Performance Workbench Dashboard

**Multi-service Kafka streaming performance monitoring with comprehensive MSK Express cluster insights**

**Services**: ${totalServices} | **Instances**: ${totalInstances} | **Topics**: ${totalTopics} | **Region**: ${region} | **Auto-refresh**: 1 minute

*Last Updated: ${new Date().toISOString()}*`,
      width: 24,
      height: 2,
    });
  }

  /**
   * Create comprehensive dashboard footer
   */
  static createFooter(deploymentConfig: DeploymentConfig): TextWidget {
    return new TextWidget({
      markdown: `---
## 📊 Dashboard Summary

### 🏗️ MSK Express Cluster Infrastructure
- **Cluster**: ${Config.getResourceName('msk-cluster')}
- **Type**: MSK Express
- **Brokers**: Multi-AZ deployment with express instance types
- **Authentication**: IAM authentication, encryption in transit

### 🚀 Workbench Configuration
${deploymentConfig.services.map((service, index) => 
  `- **Service ${index}**: ${service.topics} topics × ${service.partitionsPerTopic} partitions × ${service.instances} instances | **Message Size**: ${NamingHelper.formatMessageSize(service.messageSizeBytes)}`
).join('\n')}

### 📈 Key Performance Metrics

#### Infrastructure Metrics (MSK Express)
- **Cluster Health**: Active controllers, global topic/partition counts
- **Resource Usage**: CPU (User/System/Idle), Memory (Used/Free/Cached/Buffered)
- **Network Health**: Packet counts, errors, and dropped packets per broker

#### Application Metrics (Workbench Services)
- **Throughput**: Producer/Consumer rates per service
- **Latency**: Average and P95 end-to-end message processing time
- **Message Size Impact**: Performance analysis across different payload sizes

### 🔧 Configuration Impact Analysis
- **Small Messages (< 1KB)**: Higher throughput, lower latency
- **Medium Messages (1-4KB)**: Balanced performance
- **Large Messages (> 4KB)**: Lower message rate, higher bandwidth utilization
- **Partition Strategy**: More partitions = higher parallelism
- **Instance Scaling**: More instances = higher throughput

### 🚨 Monitoring & Alerting
- **Real-time Metrics**: 5-minute granularity for cluster metrics, 1-minute for application metrics
- **Auto-refresh**: Dashboard updates every 1 minute

---
*MSK Express Kafka Performance Workbench - Built with AWS CDK, ECS Fargate, and CloudWatch*`,
      width: 24,
      height: 6,
    });
  }

  /**
   * Create section divider
   */
  static createSectionDivider(title: string, emoji = '📊'): TextWidget {
    return new TextWidget({
      markdown: `---\n## ${emoji} ${title}`,
      width: 24,
      height: 1,
    });
  }

  /**
   * Create performance summary widget
   */
  static createPerformanceSummary(deploymentConfig: DeploymentConfig): TextWidget {
    const totalPartitions = deploymentConfig.services.reduce(
      (sum, service) => sum + (service.topics * service.partitionsPerTopic), 0
    );
    const totalStreams = deploymentConfig.services.reduce(
      (sum, service) => sum + (service.topics * service.partitionsPerTopic * service.instances), 0
    );

    return new TextWidget({
      markdown: `### 🎯 Workbench Performance Overview

**Configuration Summary:**
- **Total Services**: ${deploymentConfig.services.length}
- **Total Partitions**: ${totalPartitions}
- **Total Streams**: ${totalStreams}
- **Message Sizes**: ${deploymentConfig.services.map(s => NamingHelper.formatMessageSize(s.messageSizeBytes)).join(', ')}

**System Overview:**
- **Concurrent Connections**: ~${totalStreams * 2} (producers + consumers)
- **Network Bandwidth**: Variable based on message sizes and throughput`,
      width: 24,
      height: 2,
    });
  }
}
