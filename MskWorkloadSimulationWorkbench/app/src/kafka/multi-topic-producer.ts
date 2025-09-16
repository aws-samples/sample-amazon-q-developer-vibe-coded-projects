/**
 * Multi-Topic Producer
 * Handles message production across multiple topics with round-robin selection
 */

import { Producer, ProducerRecord, RecordMetadata } from 'kafkajs';
import { randomBytes } from 'crypto';
import pino from 'pino';
import { WorkbenchServiceConfig } from '../services/workbench-config-service';
import { MetricsService } from '../services/metrics-service';

export interface ProducerMessage {
  key?: string;
  value: any;
  headers?: Record<string, string>;
}

export interface MultiTopicProducerStats {
  totalMessagesSent: number;
  messagesPerTopic: Map<string, number>;
  currentTopicIndex: number;
  isRunning: boolean;
}

export class MultiTopicProducer {
  private logger: pino.Logger;
  private producer: Producer;
  private config: WorkbenchServiceConfig;
  private metricsService: MetricsService | undefined;
  
  // Round-robin state
  private currentTopicIndex = 0;
  private isRunning = false;
  private productionInterval: ReturnType<typeof setInterval> | undefined;
  
  // Statistics
  private totalMessagesSent = 0;
  private messagesPerTopic: Map<string, number> = new Map();

  constructor(
    producer: Producer,
    config: WorkbenchServiceConfig,
    logger: pino.Logger,
    metricsService?: MetricsService
  ) {
    this.producer = producer;
    this.config = config;
    this.metricsService = metricsService;
    this.logger = logger.child({ 
      component: 'MultiTopicProducer',
      serviceIndex: config.serviceIndex,
      serviceName: config.serviceName,
    });

    // Initialize per-topic counters
    this.config.topics.forEach(topic => {
      this.messagesPerTopic.set(topic, 0);
    });

    this.logger.info({
      topics: this.config.topics,
      topicCount: this.config.topics.length,
      action: 'producer_initialized',
    }, 'Multi-topic producer initialized');
  }

  /**
   * Start continuous message production
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn({ action: 'start_already_running' }, 'Producer is already running');
      return;
    }

    try {
      await this.producer.connect();
      this.isRunning = true;

      this.logger.info({
        topics: this.config.topics,
        action: 'producer_start',
      }, 'Starting multi-topic message production');

      // Start continuous production
      this.startContinuousProduction();

    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'producer_start_error',
      }, 'Failed to start producer');
      throw error;
    }
  }

  /**
   * Stop message production
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn({ action: 'stop_not_running' }, 'Producer is not running');
      return;
    }

    this.logger.info({ action: 'producer_stop' }, 'Stopping multi-topic producer');

    this.isRunning = false;

    // Clear production interval
    if (this.productionInterval) {
      clearInterval(this.productionInterval);
      this.productionInterval = undefined;
    }

    try {
      await this.producer.disconnect();
      
      this.logger.info({
        totalMessagesSent: this.totalMessagesSent,
        messagesPerTopic: Object.fromEntries(this.messagesPerTopic),
        action: 'producer_stopped',
      }, 'Multi-topic producer stopped');

    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'producer_stop_error',
      }, 'Error stopping producer');
    }
  }

  /**
   * Start continuous message production using setImmediate for maximum throughput
   */
  private startContinuousProduction(): void {
    const produceNext = () => {
      if (!this.isRunning) {
        return;
      }

      // Send message immediately
      this.sendMessage()
        .then(() => {
          // Schedule next message production
          setImmediate(produceNext);
        })
        .catch((error) => {
          this.logger.error({
            error: error instanceof Error ? error.message : 'Unknown error',
            action: 'continuous_production_error',
          }, 'Error in continuous production');
          
          // Continue production after a short delay on error
          setTimeout(produceNext, 100);
        });
    };

    // Start the production loop
    setImmediate(produceNext);
  }

  /**
   * Send a single message using round-robin topic selection
   */
  async sendMessage(): Promise<RecordMetadata[]> {
    const topic = this.selectNextTopic();
    const message = this.generateMessage(topic);

    const producerRecord: ProducerRecord = {
      topic,
      messages: [
        {
          key: message.key || null,
          value: JSON.stringify(message.value),
          headers: {
            'content-type': 'application/json',
            'created-at': new Date().toISOString(),
            'service-name': this.config.serviceName,
            'service-index': this.config.serviceIndex.toString(),
            'topic-name': topic,
            ...message.headers,
          },
        },
      ],
    };

    try {
      const metadata = await this.producer.send(producerRecord);
      
      // Update statistics
      this.totalMessagesSent++;
      const currentCount = this.messagesPerTopic.get(topic) || 0;
      this.messagesPerTopic.set(topic, currentCount + 1);

      // Update metrics service
      if (this.metricsService) {
        this.metricsService.incrementMessagesSent(1);
      }

      return metadata;

    } catch (error) {
      this.logger.error({
        topic,
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'send_message_error',
      }, 'Failed to send message');
      throw error;
    }
  }

  /**
   * Select next topic using round-robin algorithm
   */
  private selectNextTopic(): string {
    if (this.config.topics.length === 0) {
      throw new Error('No topics configured for producer');
    }
    
    // Ensure currentTopicIndex is within bounds
    if (this.currentTopicIndex >= this.config.topics.length) {
      this.currentTopicIndex = 0;
    }
    
    const topic = this.config.topics[this.currentTopicIndex]!; // Non-null assertion since we checked length
    this.currentTopicIndex = (this.currentTopicIndex + 1) % this.config.topics.length;
    return topic;
  }

  /**
   * Generate message payload for a specific topic
   */
  private generateMessage(topic: string): ProducerMessage {
    const messageId = `${this.config.serviceName}-${Date.now()}-${randomBytes(4).toString('hex')}`;
    
    // Create base message structure
    const baseMessage = {
      messageId,
      timestamp: Date.now(), // For latency calculation
      serviceIndex: this.config.serviceIndex,
      serviceName: this.config.serviceName,
      topic,
      sequenceNumber: this.totalMessagesSent + 1,
      messageSizeBytes: this.config.messageSizeBytes,
    };

    // Calculate how much space we need for padding
    const baseMessageJson = JSON.stringify(baseMessage);
    const baseSize = Buffer.byteLength(baseMessageJson, 'utf8');
    const targetSize = this.config.messageSizeBytes;
    
    // If base message is already larger than target, just return it
    if (baseSize >= targetSize) {
      this.logger.warn({
        baseSize,
        targetSize,
        messageId,
        action: 'message_size_warning'
      }, 'Base message size exceeds target size');
      
      return {
        key: messageId,
        value: baseMessage,
        headers: {
          'message-type': 'performance-test',
          'topic-target': topic,
          'actual-size': baseSize.toString(),
        },
      };
    }

    // Calculate padding needed
    const paddingNeeded = targetSize - baseSize - 20; // Reserve some space for JSON structure
    const padding = paddingNeeded > 0 ? 'x'.repeat(Math.max(0, paddingNeeded)) : '';

    const finalMessage = {
      ...baseMessage,
      payload: {
        testData: `Message for topic ${topic}`,
        randomValue: randomBytes(4).readUInt32BE(0) / 0xFFFFFFFF,
        generatedAt: new Date().toISOString(),
        padding: padding, // This will pad the message to the desired size
      },
    };

    return {
      key: messageId,
      value: finalMessage,
      headers: {
        'message-type': 'performance-test',
        'topic-target': topic,
        'target-size': targetSize.toString(),
      },
    };
  }

  /**
   * Get current producer statistics
   */
  getStats(): MultiTopicProducerStats {
    return {
      totalMessagesSent: this.totalMessagesSent,
      messagesPerTopic: new Map(this.messagesPerTopic),
      currentTopicIndex: this.currentTopicIndex,
      isRunning: this.isRunning,
    };
  }

  /**
   * Get producer status for health checks
   */
  getStatus(): Record<string, any> {
    return {
      isRunning: this.isRunning,
      totalMessagesSent: this.totalMessagesSent,
      messagesPerTopic: Object.fromEntries(this.messagesPerTopic),
      currentTopic: this.config.topics.length > 0 ? this.config.topics[this.currentTopicIndex] : 'no-topics',
      topicCount: this.config.topics.length,
      serviceIndex: this.config.serviceIndex,
      serviceName: this.config.serviceName,
    };
  }

  /**
   * Reset statistics (useful for testing)
   */
  resetStats(): void {
    this.totalMessagesSent = 0;
    this.messagesPerTopic.clear();
    this.config.topics.forEach(topic => {
      this.messagesPerTopic.set(topic, 0);
    });
    this.currentTopicIndex = 0;

    this.logger.info({ action: 'stats_reset' }, 'Producer statistics reset');
  }
}
