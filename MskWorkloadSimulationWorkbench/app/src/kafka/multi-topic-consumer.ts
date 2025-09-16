/**
 * Multi-Topic Consumer
 * Handles message consumption from multiple topics with aggregated metrics
 */

import { Consumer, EachMessagePayload } from 'kafkajs';
import pino from 'pino';
import { WorkbenchServiceConfig } from '../services/workbench-config-service';
import { MetricsService } from '../services/metrics-service';

export interface ConsumedMessage {
  topic: string;
  partition: number;
  offset: string;
  key: string | null;
  value: string | null;
  headers: Record<string, string>;
  timestamp: string;
}

export interface MultiTopicConsumerStats {
  totalMessagesReceived: number;
  messagesPerTopic: Map<string, number>;
  messagesPerPartition: Map<string, number>;
  isRunning: boolean;
  consumerGroupId: string;
}

export class MultiTopicConsumer {
  private logger: pino.Logger;
  private consumer: Consumer;
  private config: WorkbenchServiceConfig;
  private metricsService: MetricsService | undefined;
  
  // State
  private isRunning = false;
  
  // Statistics
  private totalMessagesReceived = 0;
  private messagesPerTopic: Map<string, number> = new Map();
  private messagesPerPartition: Map<string, number> = new Map();

  constructor(
    consumer: Consumer,
    config: WorkbenchServiceConfig,
    logger: pino.Logger,
    metricsService?: MetricsService
  ) {
    this.consumer = consumer;
    this.config = config;
    this.metricsService = metricsService;
    this.logger = logger.child({ 
      component: 'MultiTopicConsumer',
      serviceIndex: config.serviceIndex,
      serviceName: config.serviceName,
      consumerGroupId: `${config.serviceName}-consumer-group`,
    });

    // Initialize per-topic counters
    this.config.topics.forEach(topic => {
      this.messagesPerTopic.set(topic, 0);
    });

    this.logger.info({
      topics: this.config.topics,
      topicCount: this.config.topics.length,
      consumerGroupId: `${this.config.serviceName}-consumer-group`,
      action: 'consumer_initialized',
    }, 'Multi-topic consumer initialized');
  }

  /**
   * Start consuming messages from all assigned topics
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn({ action: 'start_already_running' }, 'Consumer is already running');
      return;
    }

    try {
      await this.consumer.connect();

      // Subscribe to all topics assigned to this service
      await this.consumer.subscribe({
        topics: this.config.topics,
        fromBeginning: false, // Start from latest messages
      });

      this.isRunning = true;

      this.logger.info({
        topics: this.config.topics,
        consumerGroupId: `${this.config.serviceName}-consumer-group`,
        action: 'consumer_start',
      }, 'Starting multi-topic message consumption');

      // Start consuming messages
      await this.consumer.run({
        partitionsConsumedConcurrently: this.config.topics.length * this.config.partitionsPerTopic,
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });

    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'consumer_start_error',
      }, 'Failed to start consumer');
      throw error;
    }
  }

  /**
   * Stop message consumption
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn({ action: 'stop_not_running' }, 'Consumer is not running');
      return;
    }

    this.logger.info({ action: 'consumer_stop' }, 'Stopping multi-topic consumer');

    this.isRunning = false;

    try {
      await this.consumer.disconnect();
      
      this.logger.info({
        totalMessagesReceived: this.totalMessagesReceived,
        messagesPerTopic: Object.fromEntries(this.messagesPerTopic),
        action: 'consumer_stopped',
      }, 'Multi-topic consumer stopped');

    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'consumer_stop_error',
      }, 'Error stopping consumer');
    }
  }

  /**
   * Handle individual message from any topic
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    try {
      // Update statistics
      this.totalMessagesReceived++;
      
      const topicCount = this.messagesPerTopic.get(topic) || 0;
      this.messagesPerTopic.set(topic, topicCount + 1);
      
      const partitionKey = `${topic}-${partition}`;
      const partitionCount = this.messagesPerPartition.get(partitionKey) || 0;
      this.messagesPerPartition.set(partitionKey, partitionCount + 1);

      // Update metrics service
      if (this.metricsService) {
        this.metricsService.incrementMessagesReceived(1);
      }

      // Convert headers to string record
      const headers: Record<string, string> = {};
      if (message.headers) {
        Object.entries(message.headers).forEach(([key, value]) => {
          headers[key] = value?.toString() || '';
        });
      }

      const consumedMessage: ConsumedMessage = {
        topic,
        partition,
        offset: message.offset,
        key: message.key?.toString() || null,
        value: message.value?.toString() || null,
        headers,
        timestamp: message.timestamp || new Date().toISOString(),
      };

      // Calculate and record latency if we have timestamp information
      if (this.metricsService && consumedMessage.value) {
        try {
          const messageData = JSON.parse(consumedMessage.value);
          if (messageData.timestamp && typeof messageData.timestamp === 'number') {
            const currentTime = Date.now();
            const latencyMs = currentTime - messageData.timestamp;
            
            // Only record positive latencies (in case of clock skew)
            if (latencyMs >= 0 && latencyMs < 60000) { // Max 60 seconds to filter out invalid timestamps
              this.metricsService.recordLatency(latencyMs);
            }
          }
        } catch {
          // Ignore JSON parsing errors for latency calculation
        }
      }

      // Process the message
      await this.processMessage(consumedMessage);

    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        topic,
        partition,
        offset: message.offset,
        action: 'handle_message_error',
      }, 'Failed to handle consumed message');
      
      // Don't throw error to avoid stopping the consumer
    }
  }

  /**
   * Process consumed message (can be overridden for custom processing)
   */
  private async processMessage(message: ConsumedMessage): Promise<void> {
    // For performance testing, we just log occasionally
    if (this.totalMessagesReceived % 1000 === 0) {
      this.logger.debug({
        topic: message.topic,
        partition: message.partition,
        offset: message.offset,
        totalReceived: this.totalMessagesReceived,
        action: 'message_processed',
      }, 'Message processed (periodic log)');
    }

    // Simulate minimal processing time
    // In a real application, this would contain business logic
    await Promise.resolve();
  }

  /**
   * Get current consumer statistics
   */
  getStats(): MultiTopicConsumerStats {
    return {
      totalMessagesReceived: this.totalMessagesReceived,
      messagesPerTopic: new Map(this.messagesPerTopic),
      messagesPerPartition: new Map(this.messagesPerPartition),
      isRunning: this.isRunning,
      consumerGroupId: `${this.config.serviceName}-consumer-group`,
    };
  }

  /**
   * Get consumer status for health checks
   */
  getStatus(): Record<string, any> {
    return {
      isRunning: this.isRunning,
      totalMessagesReceived: this.totalMessagesReceived,
      messagesPerTopic: Object.fromEntries(this.messagesPerTopic),
      messagesPerPartition: Object.fromEntries(this.messagesPerPartition),
      subscribedTopics: this.config.topics,
      topicCount: this.config.topics.length,
      consumerGroupId: `${this.config.serviceName}-consumer-group`,
      serviceIndex: this.config.serviceIndex,
      serviceName: this.config.serviceName,
    };
  }

  /**
   * Get partition distribution statistics
   */
  getPartitionStats(): Record<string, any> {
    const partitionStats: Record<string, any> = {};
    
    this.config.topics.forEach(topic => {
      const topicStats: Record<string, number> = {};
      let topicTotal = 0;
      
      for (let partition = 0; partition < this.config.partitionsPerTopic; partition++) {
        const partitionKey = `${topic}-${partition}`;
        const count = this.messagesPerPartition.get(partitionKey) || 0;
        topicStats[`partition-${partition}`] = count;
        topicTotal += count;
      }
      
      partitionStats[topic] = {
        ...topicStats,
        total: topicTotal,
      };
    });

    return partitionStats;
  }

  /**
   * Reset statistics (useful for testing)
   */
  resetStats(): void {
    this.totalMessagesReceived = 0;
    this.messagesPerTopic.clear();
    this.messagesPerPartition.clear();
    
    this.config.topics.forEach(topic => {
      this.messagesPerTopic.set(topic, 0);
    });

    this.logger.info({ action: 'stats_reset' }, 'Consumer statistics reset');
  }
}
