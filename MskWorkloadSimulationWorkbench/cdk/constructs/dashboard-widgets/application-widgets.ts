/**
 * Application Performance Widgets - FIXED TOTAL AGGREGATION
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
  MathExpression,
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
   * Create section header for individual service performance
   */
  static createIndividualServicesSectionHeader(): TextWidget {
    return new TextWidget({
      markdown: `## 📊 Individual Service Performance (Total Throughput)

Shows total messages per second across all instances for each service`,
      width: 24,
      height: 1,
    });
  }

  /**
   * Create section header for message size analysis
   */
  static createMessageSizeAnalysisSectionHeader(): TextWidget {
    return new TextWidget({
      markdown: `## 📏 Message Size Performance Analysis`,
      width: 24,
      height: 1,
    });
  }

  /**
   * Create service throughput comparison - per-instance rates and total system throughput
   */
  static createServiceThroughputComparison(region: string, deploymentConfig: DeploymentConfig): Row[] {
    const perInstanceMetrics: Metric[] = [];
    const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'];

    // Individual service metrics for per-instance view
    deploymentConfig.services.forEach((service, index) => {
      const serviceLabel = `Service-${index} (${service.instances}I/${NamingHelper.formatMessageSize(service.messageSizeBytes)})`;
      
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
          statistic: Statistic.AVERAGE,
          period: Duration.minutes(1),
          unit: Unit.COUNT_PER_SECOND,
          label: `${serviceLabel} Consumer`,
          color: colors[(index + 3) % colors.length],
        })
      );
    });

    // Create metrics for math expressions
    const producerMetrics: { [key: string]: Metric } = {};
    const consumerMetrics: { [key: string]: Metric } = {};

    deploymentConfig.services.forEach((service, index) => {
      producerMetrics[`p${index}`] = new Metric({
        namespace: 'MSKExpress/Kafka',
        metricName: 'MessagesSentPerSecond',
        dimensionsMap: {
          Service: `dev-mske-service-${index}`,
          Environment: 'production',
        },
        statistic: Statistic.AVERAGE,  // Use AVERAGE to get per-second rates
        period: Duration.minutes(1),
        unit: Unit.COUNT_PER_SECOND,
      });

      consumerMetrics[`c${index}`] = new Metric({
        namespace: 'MSKExpress/Kafka',
        metricName: 'MessagesReceivedPerSecond',
        dimensionsMap: {
          Service: `dev-mske-service-${index}`,
          Environment: 'production',
        },
        statistic: Statistic.AVERAGE,  // Use AVERAGE to get per-second rates
        period: Duration.minutes(1),
        unit: Unit.COUNT_PER_SECOND,
      });
    });

    // Create math expressions to sum all services (now using AVERAGE rates × instance counts)
    const totalProducerExpression = new MathExpression({
      expression: Object.keys(producerMetrics).map(key => `${key} * ${deploymentConfig.services[parseInt(key.substring(1))].instances}`).join(' + '),
      usingMetrics: producerMetrics,
      label: 'Total Messages Produced per Second',
      color: '#e74c3c',
    });

    const totalConsumerExpression = new MathExpression({
      expression: Object.keys(consumerMetrics).map(key => `${key} * ${deploymentConfig.services[parseInt(key.substring(1))].instances}`).join(' + '),
      usingMetrics: consumerMetrics,
      label: 'Total Messages Consumed per Second',
      color: '#3498db',
    });

    return [
      new Row(
        new GraphWidget({
          title: 'Total System Throughput (Messages per Second)',
          width: 8,
          height: 8,
          left: [totalProducerExpression, totalConsumerExpression],
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          region,
        }),
        new GraphWidget({
          title: 'Service Throughput (Per-Instance Average)',
          width: 8,
          height: 8,
          left: perInstanceMetrics,
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          region,
        }),
        new GraphWidget({
          title: 'Service Latency Comparison (Average Across Instances)',
          width: 8,
          height: 8,
          left: this.createServiceLatencyMetrics(region, deploymentConfig),
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          region,
        })
      )
    ];
  }

  static createServicePerformanceRow(deploymentConfig: DeploymentConfig): Row[] {
    const rows: Row[] = [];
    const servicesPerRow = 3; // 3 widgets per row for better layout
    
    // Group services into rows of 3
    for (let i = 0; i < deploymentConfig.services.length; i += servicesPerRow) {
      const servicesInThisRow = deploymentConfig.services.slice(i, i + servicesPerRow);
      
      const widgets = servicesInThisRow.map((service, indexInRow) => {
        const serviceIndex = i + indexInRow;
        const serviceLabel = `Service-${serviceIndex} (${service.instances} instances)`;
        
        // Create base metrics for math expressions
        const producerMetric = new Metric({
          namespace: 'MSKExpress/Kafka',
          metricName: 'MessagesSentPerSecond',
          dimensionsMap: {
            Service: `dev-mske-service-${serviceIndex}`,
            Environment: 'production',
          },
          statistic: Statistic.AVERAGE,
          period: Duration.minutes(1),
          unit: Unit.COUNT_PER_SECOND,
        });

        const consumerMetric = new Metric({
          namespace: 'MSKExpress/Kafka',
          metricName: 'MessagesReceivedPerSecond',
          dimensionsMap: {
            Service: `dev-mske-service-${serviceIndex}`,
            Environment: 'production',
          },
          statistic: Statistic.AVERAGE,
          period: Duration.minutes(1),
          unit: Unit.COUNT_PER_SECOND,
        });

        // Create math expressions for total throughput
        const totalProducerExpression = new MathExpression({
          expression: `m1 * ${service.instances}`,
          usingMetrics: { m1: producerMetric },
          label: 'Total Producer Rate',
          color: '#1f77b4',
        });

        const totalConsumerExpression = new MathExpression({
          expression: `m2 * ${service.instances}`,
          usingMetrics: { m2: consumerMetric },
          label: 'Total Consumer Rate',
          color: '#ff7f0e',
        });
        
        return new GraphWidget({
          title: `${serviceLabel} - Total Performance`,
          width: 8,
          height: 6,
          left: [
            // Only show total throughput using math expressions
            totalProducerExpression,
            totalConsumerExpression,
          ],
          view: GraphWidgetView.TIME_SERIES,
        });
      });

      rows.push(new Row(...widgets));
    }

    return rows;
  }

  /**
   * Create latency metrics for the combined row
   */
  private static createServiceLatencyMetrics(region: string, deploymentConfig: DeploymentConfig): Metric[] {
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
        })
      );
    });

    return metrics;
  }

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
          label: `${messageSize} (Per Instance)`,
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
          title: 'Message Size Impact - Latency',
          width: 12,
          height: 6,
          left: latencyMetrics,
          view: GraphWidgetView.TIME_SERIES,
          region,
        })
      )
    ];
  }

}
