/**
 * CloudWatch Metrics Service
 * Tracks and publishes Kafka message throughput metrics to CloudWatch
 */

import { CloudWatchClient, PutMetricDataCommand, MetricDatum } from '@aws-sdk/client-cloudwatch';
import pino from 'pino';

export interface MetricsConfig {
  namespace: string;
  region?: string;
  flushIntervalMs: number;
  serviceName?: string;
  serviceIndex?: number;
}

export class MetricsService {
  private logger: pino.Logger;
  private cloudWatch: CloudWatchClient;
  private config: MetricsConfig;
  
  // Counters for tracking messages per second
  private messagesSentCount = 0;
  private messagesReceivedCount = 0;
  
  // Latency tracking
  private latencyMeasurements: number[] = [];
  private maxLatencyMeasurements = 1000; // Keep last 1000 measurements
  
  // Timers for periodic metric publishing
  private metricsTimer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  constructor(config: MetricsConfig, logger: pino.Logger) {
    this.config = config;
    this.logger = logger.child({ component: 'MetricsService' });
    
    this.cloudWatch = new CloudWatchClient({
      region: config.region || process.env.AWS_REGION || 'us-east-1',
    });

    this.logger.info({
      namespace: config.namespace,
      region: config.region,
      flushInterval: config.flushIntervalMs,
      action: 'initialize',
    }, 'CloudWatch metrics service initialized');
  }

  /**
   * Start metrics collection and publishing
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn({ action: 'start' }, 'Metrics service is already running');
      return;
    }

    this.logger.info({ 
      flushInterval: this.config.flushIntervalMs,
      action: 'start' 
    }, 'Starting metrics collection');

    // Reset counters
    this.messagesSentCount = 0;
    this.messagesReceivedCount = 0;
    this.latencyMeasurements = [];

    // Start periodic metrics publishing
    this.metricsTimer = setInterval(() => {
      this.publishMetrics();
    }, this.config.flushIntervalMs);

    this.isRunning = true;

    this.logger.info({ action: 'start' }, 'Metrics collection started');
  }

  /**
   * Stop metrics collection
   */
  stop(): void {
    if (!this.isRunning) {
      this.logger.warn({ action: 'stop' }, 'Metrics service is not running');
      return;
    }

    this.logger.info({ action: 'stop' }, 'Stopping metrics collection');

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }

    // Publish final metrics before stopping
    this.publishMetrics();

    this.isRunning = false;

    this.logger.info({ action: 'stop' }, 'Metrics collection stopped');
  }

  /**
   * Increment messages sent counter
   */
  incrementMessagesSent(count = 1): void {
    this.messagesSentCount += count;
  }

  /**
   * Increment messages received counter
   */
  incrementMessagesReceived(count = 1): void {
    this.messagesReceivedCount += count;
  }

  /**
   * Record message latency (time from creation to consumption)
   */
  recordLatency(latencyMs: number): void {
    // Add new latency measurement
    this.latencyMeasurements.push(latencyMs);
    
    // Keep only the most recent measurements to prevent memory growth
    if (this.latencyMeasurements.length > this.maxLatencyMeasurements) {
      this.latencyMeasurements = this.latencyMeasurements.slice(-this.maxLatencyMeasurements);
    }
  }

  /**
   * Get standard dimensions for metrics
   */
  private getStandardDimensions(): Array<{ Name: string; Value: string }> {
    const dimensions = [
      {
        Name: 'Service',
        Value: this.config.serviceName || this.config.serviceName || 'MSKExpressApp',
      },
    ];

    // Add service-specific dimensions if available
    if (this.config.serviceName) {
      dimensions.push({
        Name: 'ServiceName',
        Value: this.config.serviceName,
      });
    }

    if (this.config.serviceIndex !== undefined) {
      dimensions.push({
        Name: 'ServiceIndex',
        Value: this.config.serviceIndex.toString(),
      });
    }

    return dimensions;
  }

  /**
   * Get environment-specific dimensions
   */
  private getEnvironmentDimensions(): Array<{ Name: string; Value: string }> {
    return [
      ...this.getStandardDimensions(),
      {
        Name: 'Environment',
        Value: process.env.NODE_ENV || 'development',
      },
    ];
  }
  private async publishMetrics(): Promise<void> {
    try {
      const currentTime = new Date();
      const intervalSeconds = this.config.flushIntervalMs / 1000;
      
      // Calculate messages per second
      const messagesSentPerSecond = this.messagesSentCount / intervalSeconds;
      const messagesReceivedPerSecond = this.messagesReceivedCount / intervalSeconds;

      // Calculate latency statistics
      let avgLatency = 0;
      let minLatency = 0;
      let maxLatency = 0;
      let p95Latency = 0;
      let p99Latency = 0;

      if (this.latencyMeasurements.length > 0) {
        // Sort latencies for percentile calculations
        const sortedLatencies = [...this.latencyMeasurements].sort((a, b) => a - b);
        
        // Calculate statistics
        avgLatency = sortedLatencies.reduce((sum, lat) => sum + lat, 0) / sortedLatencies.length;
        minLatency = sortedLatencies[0] ?? 0;
        maxLatency = sortedLatencies[sortedLatencies.length - 1] ?? 0;
        
        // Calculate percentiles
        const p95Index = Math.floor(sortedLatencies.length * 0.95);
        const p99Index = Math.floor(sortedLatencies.length * 0.99);
        p95Latency = sortedLatencies[Math.min(p95Index, sortedLatencies.length - 1)] ?? 0;
        p99Latency = sortedLatencies[Math.min(p99Index, sortedLatencies.length - 1)] ?? 0;
      }

      const metricData: MetricDatum[] = [
        {
          MetricName: 'MessagesSentPerSecond',
          Value: messagesSentPerSecond,
          Unit: 'Count/Second',
          Timestamp: currentTime,
          Dimensions: [
            {
              Name: 'Service',
              Value: this.config.serviceName || 'MSKExpressApp',
            },
            {
              Name: 'Environment',
              Value: process.env.NODE_ENV || 'development',
            },
          ],
        },
        {
          MetricName: 'MessagesReceivedPerSecond',
          Value: messagesReceivedPerSecond,
          Unit: 'Count/Second',
          Timestamp: currentTime,
          Dimensions: [
            {
              Name: 'Service',
              Value: this.config.serviceName || 'MSKExpressApp',
            },
            {
              Name: 'Environment',
              Value: process.env.NODE_ENV || 'development',
            },
          ],
        },
        {
          MetricName: 'TotalMessagesSent',
          Value: this.messagesSentCount,
          Unit: 'Count',
          Timestamp: currentTime,
          Dimensions: [
            {
              Name: 'Service',
              Value: this.config.serviceName || 'MSKExpressApp',
            },
          ],
        },
        {
          MetricName: 'TotalMessagesReceived',
          Value: this.messagesReceivedCount,
          Unit: 'Count',
          Timestamp: currentTime,
          Dimensions: [
            {
              Name: 'Service',
              Value: this.config.serviceName || 'MSKExpressApp',
            },
          ],
        },
      ];

      // Add latency metrics only if we have measurements
      if (this.latencyMeasurements.length > 0) {
        metricData.push(
          {
            MetricName: 'MessageLatencyAverage',
            Value: avgLatency,
            Unit: 'Milliseconds',
            Timestamp: currentTime,
            Dimensions: [
              {
                Name: 'Service',
                Value: this.config.serviceName || 'MSKExpressApp',
              },
              {
                Name: 'Environment',
                Value: process.env.NODE_ENV || 'development',
              },
            ],
          },
          {
            MetricName: 'MessageLatencyMin',
            Value: minLatency,
            Unit: 'Milliseconds',
            Timestamp: currentTime,
            Dimensions: [
              {
                Name: 'Service',
                Value: this.config.serviceName || 'MSKExpressApp',
              },
              {
                Name: 'Environment',
                Value: process.env.NODE_ENV || 'development',
              },
            ],
          },
          {
            MetricName: 'MessageLatencyMax',
            Value: maxLatency,
            Unit: 'Milliseconds',
            Timestamp: currentTime,
            Dimensions: [
              {
                Name: 'Service',
                Value: this.config.serviceName || 'MSKExpressApp',
              },
              {
                Name: 'Environment',
                Value: process.env.NODE_ENV || 'development',
              },
            ],
          },
          {
            MetricName: 'MessageLatencyP95',
            Value: p95Latency,
            Unit: 'Milliseconds',
            Timestamp: currentTime,
            Dimensions: [
              {
                Name: 'Service',
                Value: this.config.serviceName || 'MSKExpressApp',
              },
              {
                Name: 'Environment',
                Value: process.env.NODE_ENV || 'development',
              },
            ],
          },
          {
            MetricName: 'MessageLatencyP99',
            Value: p99Latency,
            Unit: 'Milliseconds',
            Timestamp: currentTime,
            Dimensions: [
              {
                Name: 'Service',
                Value: this.config.serviceName || 'MSKExpressApp',
              },
              {
                Name: 'Environment',
                Value: process.env.NODE_ENV || 'development',
              },
            ],
          }
        );
      }

      // Add instance count metrics (each task reports 1 active producer and 1 active consumer)
      metricData.push(
        {
          MetricName: 'ActiveProducers',
          Value: 1, // Each task has 1 producer
          Unit: 'Count',
          Timestamp: currentTime,
          Dimensions: [
            {
              Name: 'Service',
              Value: this.config.serviceName || 'MSKExpressApp',
            },
            {
              Name: 'Environment',
              Value: process.env.NODE_ENV || 'development',
            },
          ],
        },
        {
          MetricName: 'ActiveConsumers',
          Value: 1, // Each task has 1 consumer
          Unit: 'Count',
          Timestamp: currentTime,
          Dimensions: [
            {
              Name: 'Service',
              Value: this.config.serviceName || 'MSKExpressApp',
            },
            {
              Name: 'Environment',
              Value: process.env.NODE_ENV || 'development',
            },
          ],
        }
      );

      const command = new PutMetricDataCommand({
        Namespace: this.config.namespace,
        MetricData: metricData,
      });

      await this.cloudWatch.send(command);

      this.logger.info({
        messagesSentPerSecond: messagesSentPerSecond.toFixed(2),
        messagesReceivedPerSecond: messagesReceivedPerSecond.toFixed(2),
        totalSent: this.messagesSentCount,
        totalReceived: this.messagesReceivedCount,
        avgLatency: avgLatency.toFixed(2),
        p95Latency: p95Latency.toFixed(2),
        p99Latency: p99Latency.toFixed(2),
        latencySamples: this.latencyMeasurements.length,
        intervalSeconds,
        action: 'publish_metrics',
      }, 'Metrics published to CloudWatch');

      // Reset counters for next interval
      this.messagesSentCount = 0;
      this.messagesReceivedCount = 0;
      this.latencyMeasurements = []; // Reset latency measurements

    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'publish_metrics',
      }, 'Failed to publish metrics to CloudWatch');
    }
  }
  /**
   * Get current metrics status
   */
  getStatus(): {
    isRunning: boolean;
    messagesSentCount: number;
    messagesReceivedCount: number;
    latencySamples: number;
    namespace: string;
    flushIntervalMs: number;
  } {
    return {
      isRunning: this.isRunning,
      messagesSentCount: this.messagesSentCount,
      messagesReceivedCount: this.messagesReceivedCount,
      latencySamples: this.latencyMeasurements.length,
      namespace: this.config.namespace,
      flushIntervalMs: this.config.flushIntervalMs,
    };
  }
}
