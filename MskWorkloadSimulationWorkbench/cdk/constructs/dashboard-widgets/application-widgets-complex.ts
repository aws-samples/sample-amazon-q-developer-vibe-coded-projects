/**
 * Application Performance Widgets - SIMPLIFIED CORRECTED VERSION
 * Multi-service Kafka streaming performance monitoring
 */

import { Duration } from 'aws-cdk-lib';
import {
  GraphWidget,
  Metric,
  Unit,
  Statistic,
  TextWidget,
  Row,
  GraphWidgetView,
} from 'aws-cdk-lib/aws-cloudwatch';
import { DeploymentConfig, NamingHelper } from '../../lib/config-types-and-helpers';

export class ApplicationWidgets {
  
  static createSectionHeader(): TextWidget {
    return new TextWidget({
      markdown: `## 🚀 Application Performance Metrics`,
      width: 24,
      height: 1,
    });
  }

  /**
   * Create service throughput comparison widgets - both total and per-instance
   */
  static createServiceThroughputComparison(region: string, deploymentConfig: DeploymentConfig): Row[] {
    const totalMetrics: Metric[] = [];
    const perInstanceMetrics: Metric[] = [];
    const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'];

    // Add metrics for each service
    deploymentConfig.services.forEach((service, index) => {
      const serviceLabel = `Service-${index} (${service.topics}T/${service.partitionsPerTopic}P/${service.instances}I/${NamingHelper.formatMessageSize(service.messageSizeBytes)})`;
      
      // Total throughput metrics - multiply by instances to get total
      totalMetrics.push(
        new Metric({
          namespace: 'MSKExpress/Kafka',
          metricName: 'MessagesSentPerSecond',
          dimensionsMap: {
            Service: `dev-mske-service-${index}`,
            Environment: 'production',
          },
          statistic: Statistic.AVERAGE,  // Get per-instance average
          period: Duration.minutes(1),
          unit: Unit.COUNT_PER_SECOND,
          label: `${serviceLabel} Producer`,
          color: colors[index % colors.length],
        }),
        new Metric({
          namespace: 'MSKExpress/Kafka',
          metricName: 'MessagesReceivedPerSecond',
          dimensionsMap: {
            Service: `dev-mske-service-${index}`,
            Environment: 'production',
          },
          statistic: Statistic.AVERAGE,  // Get per-instance average
          period: Duration.minutes(1),
          unit: Unit.COUNT_PER_SECOND,
          label: `${serviceLabel} Consumer`,
          color: colors[(index + 3) % colors.length],
        })
      );

      // Per-instance throughput metrics (AVERAGE)
      perInstanceMetrics.push(
        new Metric({
          namespace: 'MSKExpress/Kafka',
          metricName: 'MessagesSentPerSecond',
          dimensionsMap: {
            Service: `dev-mske-service-${index}`,
            Environment: 'production',
          },
          statistic: Statistic.AVERAGE,
          period: Duration.minutes(1),
          unit: Unit.COUNT_PER_SECOND,
          label: `${serviceLabel} Producer (Per Instance)`,
          color: colors[index % colors.length],
        }),
        new Metric({
          namespace: 'MSKExpress/Kafka',
          metricName: 'MessagesReceivedPerSecond',
          dimensionsMap: {
            Service: `dev-mske-service-${index}`,
            Environment: 'production',
          },
          statistic: Statistic.AVERAGE,
          period: Duration.minutes(1),
          unit: Unit.COUNT_PER_SECOND,
          label: `${serviceLabel} Consumer (Per Instance)`,
          color: colors[(index + 3) % colors.length],
        })
      );
    });

    return [
      new Row(
        new GraphWidget({
          title: 'Service Throughput Comparison (Per-Instance Average)',
          width: 24,
          height: 8,
          left: totalMetrics,
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          region,
        })
      ),
      new Row(
        new GraphWidget({
          title: 'Per-Instance Service Throughput (Individual Instance Performance)',
          width: 24,
          height: 8,
          left: perInstanceMetrics,
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          region,
        })
      )
    ];
  }

  /**
   * Create individual service performance widgets
   */
  static createServicePerformanceRow(deploymentConfig: DeploymentConfig): Row {
    const widgets = deploymentConfig.services.slice(0, 3).map((service, index) => {
      const serviceLabel = `Service-${index} (${service.instances}I)`;
      
      return new GraphWidget({
        title: `${serviceLabel} Performance`,
        width: 8,
        height: 8,
        left: [
          new Metric({
            namespace: 'MSKExpress/Kafka',
            metricName: 'MessagesSentPerSecond',
            dimensionsMap: {
              Service: `dev-mske-service-${index}`,
              Environment: 'production',
            },
            statistic: Statistic.AVERAGE,
            period: Duration.minutes(1),
            unit: Unit.COUNT_PER_SECOND,
            label: 'Producer Rate (Per Instance)',
            color: '#1f77b4',
          }),
          new Metric({
            namespace: 'MSKExpress/Kafka',
            metricName: 'MessagesReceivedPerSecond',
            dimensionsMap: {
              Service: `dev-mske-service-${index}`,
              Environment: 'production',
            },
            statistic: Statistic.AVERAGE,
            period: Duration.minutes(1),
            unit: Unit.COUNT_PER_SECOND,
            label: 'Consumer Rate (Per Instance)',
            color: '#ff7f0e',
          }),
        ],
        view: GraphWidgetView.TIME_SERIES,
      });
    });

    return new Row(...widgets);
  }

  /**
   * Create service latency comparison widget (always uses AVERAGE)
   */
  static createServiceLatencyComparison(region: string, deploymentConfig: DeploymentConfig): Row {
    const metrics: Metric[] = [];
    const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'];

    deploymentConfig.services.forEach((service, index) => {
      metrics.push(
        new Metric({
          namespace: 'MSKExpress/Kafka',
          metricName: 'MessageLatencyAverage',
          dimensionsMap: {
            Service: `dev-mske-service-${index}`,
            Environment: 'production',
          },
          statistic: Statistic.AVERAGE,
          period: Duration.minutes(1),
          unit: Unit.MILLISECONDS,
          label: `Service-${index} Avg Latency`,
          color: colors[index % colors.length],
        }),
        new Metric({
          namespace: 'MSKExpress/Kafka',
          metricName: 'MessageLatencyP95',
          dimensionsMap: {
            Service: `dev-mske-service-${index}`,
            Environment: 'production',
          },
          statistic: Statistic.AVERAGE,
          period: Duration.minutes(1),
          unit: Unit.MILLISECONDS,
          label: `Service-${index} P95 Latency`,
          color: colors[(index + 3) % colors.length],
        })
      );
    });

    return new Row(
      new GraphWidget({
        title: 'Service Latency Comparison (Average Across Instances)',
        width: 24,
        height: 8,
        left: metrics,
        view: GraphWidgetView.TIME_SERIES,
        stacked: false,
        region,
      })
    );
  }

  /**
   * Create message size impact analysis widgets
   */
  static createMessageSizeAnalysis(region: string, deploymentConfig: DeploymentConfig): Row[] {
    const throughputMetrics: Metric[] = [];
    const latencyMetrics: Metric[] = [];
    const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'];

    deploymentConfig.services.forEach((service, index) => {
      const messageSize = NamingHelper.formatMessageSize(service.messageSizeBytes);
      
      throughputMetrics.push(
        new Metric({
          namespace: 'MSKExpress/Kafka',
          metricName: 'MessagesSentPerSecond',
          dimensionsMap: {
            Service: `dev-mske-service-${index}`,
            Environment: 'production',
          },
          statistic: Statistic.AVERAGE,
          period: Duration.minutes(1),
          unit: Unit.COUNT_PER_SECOND,
          label: `${messageSize} Messages (Per Instance)`,
          color: colors[index % colors.length],
        })
      );

      latencyMetrics.push(
        new Metric({
          namespace: 'MSKExpress/Kafka',
          metricName: 'MessageLatencyAverage',
          dimensionsMap: {
            Service: `dev-mske-service-${index}`,
            Environment: 'production',
          },
          statistic: Statistic.AVERAGE,
          period: Duration.minutes(1),
          unit: Unit.MILLISECONDS,
          label: `${messageSize} Latency`,
          color: colors[index % colors.length],
        })
      );
    });

    return [
      new Row(
        new GraphWidget({
          title: 'Message Size Impact - Throughput (Per Instance)',
          width: 12,
          height: 6,
          left: throughputMetrics,
          view: GraphWidgetView.TIME_SERIES,
          region,
        }),
        new GraphWidget({
          title: 'Message Size Impact - Average Latency',
          width: 12,
          height: 6,
          left: latencyMetrics,
          view: GraphWidgetView.TIME_SERIES,
          region,
        })
      )
    ];
  }

  /**
   * Create consumer lag monitoring widget (always uses AVERAGE)
   */
  static createConsumerLagMonitoring(deploymentConfig: DeploymentConfig): Row {
    const widgets = deploymentConfig.services.slice(0, 3).map((service, index) => {
      return new GraphWidget({
        title: `Service-${index} Consumer Lag (Average Per Instance)`,
        width: 8,
        height: 6,
        left: [
          new Metric({
            namespace: 'MSKExpress/Kafka',
            metricName: 'ConsumerLag',
            dimensionsMap: {
              Service: `dev-mske-service-${index}`,
              Environment: 'production',
            },
            statistic: Statistic.AVERAGE,
            period: Duration.minutes(1),
            unit: Unit.COUNT,
            label: 'Consumer Lag',
            color: '#d62728',
          }),
        ],
        view: GraphWidgetView.TIME_SERIES,
      });
    });

    return new Row(...widgets);
  }
}
