/**
 * Working MSK Express Cluster Widgets
 * Exact replica of the working "test" dashboard configuration
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
import { Config } from '../../lib/config';

// Dynamic configuration from environment config
const CLUSTER_NAME = Config.getResourceName('express-cluster');
const BROKER_IDS = Config.getBrokerIds(); // Dynamic broker IDs based on config

export class WorkingClusterWidgets {
  
  /**
   * Helper function to create broker metrics for a given metric name
   */
  private static createBrokerMetrics(metricName: string, unit?: Unit, statistic: Statistic = Statistic.AVERAGE): Metric[] {
    const colors = ['#1f77b4', '#ff7f0e', '#2ca02c'];
    
    return BROKER_IDS.map((brokerId, index) => 
      new Metric({
        namespace: 'AWS/Kafka',
        metricName,
        dimensionsMap: {
          'Cluster Name': CLUSTER_NAME,
          'Broker ID': brokerId,
        },
        statistic,
        period: Duration.minutes(5),
        unit,
        label: `Broker-${brokerId}`,
        color: colors[index],
      })
    );
  }

  /**
   * Helper function to create cluster-level metric
   */
  private static createClusterMetric(metricName: string, label?: string): Metric {
    return new Metric({
      namespace: 'AWS/Kafka',
      metricName,
      dimensionsMap: {
        'Cluster Name': CLUSTER_NAME,
      },
      statistic: Statistic.AVERAGE,
      period: Duration.minutes(5),
      label: label || CLUSTER_NAME,
    });
  }
  
  /**
   * Create cluster overview section header
   */
  static createSectionHeader(): TextWidget {
    return new TextWidget({
      markdown: `## 🏗️ MSK Express Cluster Monitoring (${BROKER_IDS.length} × ${Config.mskBroker.instanceType})`,
      width: 24,
      height: 1,
    });
  }

  /**
   * Row 1: ActiveControllerCount, CpuIdle, CpuSystem
   */
  static createRow1(): Row {
    return new Row(
      // ActiveControllerCount
      new GraphWidget({
        title: 'ActiveControllerCount: Average',
        width: 8,
        height: 5,
        left: [this.createClusterMetric('ActiveControllerCount')],
        view: GraphWidgetView.TIME_SERIES,
      }),

      // CpuIdle
      new GraphWidget({
        title: 'CpuIdle: Average',
        width: 8,
        height: 5,
        left: this.createBrokerMetrics('CpuIdle', Unit.PERCENT),
        view: GraphWidgetView.TIME_SERIES,
      }),

      // CpuSystem
      new GraphWidget({
        title: 'CpuSystem: Average',
        width: 8,
        height: 5,
        left: this.createBrokerMetrics('CpuSystem', Unit.PERCENT),
        view: GraphWidgetView.TIME_SERIES,
      })
    );
  }

  /**
   * Row 2: CpuUser, GlobalPartitionCount, GlobalTopicCount
   */
  static createRow2(): Row {
    return new Row(
      // CpuUser
      new GraphWidget({
        title: 'CpuUser: Average',
        width: 8,
        height: 5,
        left: this.createBrokerMetrics('CpuUser', Unit.PERCENT),
        view: GraphWidgetView.TIME_SERIES,
      }),

      // GlobalPartitionCount
      new GraphWidget({
        title: 'GlobalPartitionCount: Average',
        width: 8,
        height: 5,
        left: [this.createClusterMetric('GlobalPartitionCount')],
        view: GraphWidgetView.TIME_SERIES,
      }),

      // GlobalTopicCount
      new GraphWidget({
        title: 'GlobalTopicCount: Average',
        width: 8,
        height: 5,
        left: [this.createClusterMetric('GlobalTopicCount')],
        view: GraphWidgetView.TIME_SERIES,
      })
    );
  }

  /**
   * Row 3: MemoryBuffered, MemoryCached, MemoryFree
   */
  static createRow3(): Row {
    return new Row(
      new GraphWidget({
        title: 'MemoryBuffered: Average',
        width: 8,
        height: 5,
        left: this.createBrokerMetrics('MemoryBuffered', Unit.BYTES),
        view: GraphWidgetView.TIME_SERIES,
      }),
      new GraphWidget({
        title: 'MemoryCached: Average',
        width: 8,
        height: 5,
        left: this.createBrokerMetrics('MemoryCached', Unit.BYTES),
        view: GraphWidgetView.TIME_SERIES,
      }),
      new GraphWidget({
        title: 'MemoryFree: Average',
        width: 8,
        height: 5,
        left: this.createBrokerMetrics('MemoryFree', Unit.BYTES),
        view: GraphWidgetView.TIME_SERIES,
      })
    );
  }

  /**
   * Row 4: MemoryUsed, NetworkRxDropped, NetworkRxErrors
   */
  static createRow4(): Row {
    return new Row(
      new GraphWidget({
        title: 'MemoryUsed: Average',
        width: 8,
        height: 5,
        left: this.createBrokerMetrics('MemoryUsed', Unit.BYTES),
        view: GraphWidgetView.TIME_SERIES,
      }),
      new GraphWidget({
        title: 'NetworkRxDropped: Sum',
        width: 8,
        height: 5,
        left: this.createBrokerMetrics('NetworkRxDropped', Unit.COUNT, Statistic.SUM),
        view: GraphWidgetView.TIME_SERIES,
      }),
      new GraphWidget({
        title: 'NetworkRxErrors: Sum',
        width: 8,
        height: 5,
        left: this.createBrokerMetrics('NetworkRxErrors', Unit.COUNT, Statistic.SUM),
        view: GraphWidgetView.TIME_SERIES,
      })
    );
  }

  /**
   * Row 5: NetworkRxPackets, NetworkTxDropped, NetworkTxErrors
   */
  static createRow5(): Row {
    return new Row(
      new GraphWidget({
        title: 'NetworkRxPackets: Sum',
        width: 8,
        height: 5,
        left: this.createBrokerMetrics('NetworkRxPackets', Unit.COUNT, Statistic.SUM),
        view: GraphWidgetView.TIME_SERIES,
      }),
      new GraphWidget({
        title: 'NetworkTxDropped: Sum',
        width: 8,
        height: 5,
        left: this.createBrokerMetrics('NetworkTxDropped', Unit.COUNT, Statistic.SUM),
        view: GraphWidgetView.TIME_SERIES,
      }),
      new GraphWidget({
        title: 'NetworkTxErrors: Sum',
        width: 8,
        height: 5,
        left: this.createBrokerMetrics('NetworkTxErrors', Unit.COUNT, Statistic.SUM),
        view: GraphWidgetView.TIME_SERIES,
      })
    );
  }

  /**
   * Row 6: NetworkTxPackets
   */
  static createRow6(): Row {
    return new Row(
      new GraphWidget({
        title: 'NetworkTxPackets: Sum',
        width: 8,
        height: 5,
        left: this.createBrokerMetrics('NetworkTxPackets', Unit.COUNT, Statistic.SUM),
        view: GraphWidgetView.TIME_SERIES,
      })
    );
  }
}
