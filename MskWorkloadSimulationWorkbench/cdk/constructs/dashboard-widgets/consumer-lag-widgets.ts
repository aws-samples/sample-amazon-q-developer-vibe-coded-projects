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
import { DeploymentConfig } from '../../lib/config-types-and-helpers';
import { Config } from '../../lib/config';

export class ConsumerLagWidgets {
  
  static createSectionHeader(): TextWidget {
    return new TextWidget({
      markdown: `## 📊 Consumer Lag Monitoring

**Max Offset Lag** measures the maximum number of messages that a consumer group is behind the latest message in a partition. 

- **What it means**: If producers write message #1000 to a partition, but consumers have only processed up to message #950, the lag is 50 messages
- **Why it matters**: High lag indicates consumers can't keep up with producers, potentially causing:
  - Increased memory usage
  - Processing delays
  - Message timeouts
- **Healthy range**: Typically < 1000 messages for real-time processing
- **Alert threshold**: > 10,000 messages may indicate consumer issues`,
      width: 24,
      height: 3,
    });
  }

  static createConsumerLagRow(deploymentConfig: DeploymentConfig): Row {
    const widgets = deploymentConfig.services.slice(0, 3).map((service, index) => {
      return new GraphWidget({
        title: `Service-${index} Max Offset Lag (Messages Behind)`,
        width: 8,
        height: 6,
        left: [
          new Metric({
            namespace: 'AWS/Kafka',
            metricName: 'MaxOffsetLag',
            dimensionsMap: {
              'Consumer Group': `dev-mske-service-${index}-consumer-group`,
              'Cluster Name': Config.getResourceName('express-cluster'),
              'Topic': `dev-mske-service-${index}-topic-0`,
            },
            statistic: Statistic.MAXIMUM,
            period: Duration.minutes(1),
            unit: Unit.COUNT,
            label: `Topic-0 Max Lag (Messages)`,
            color: '#d62728',
          }),
        ],
        view: GraphWidgetView.TIME_SERIES,
      });
    });

    return new Row(...widgets);
  }
}
