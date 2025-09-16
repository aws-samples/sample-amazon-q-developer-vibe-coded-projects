/**
 * Workbench Configuration Service
 * Parses service-specific configuration from environment variables
 */

import pino from 'pino';

export interface WorkbenchServiceConfig {
  serviceIndex: number;
  serviceName: string;
  topics: string[];
  partitionsPerTopic: number;
  messageSizeBytes: number;
}

export class WorkbenchConfigService {
  private logger: pino.Logger;
  private config: WorkbenchServiceConfig;

  constructor(logger: pino.Logger) {
    this.logger = logger.child({ component: 'WorkbenchConfigService' });
    this.config = this.parseConfiguration();
    
    this.logger.info({
      config: this.config,
      action: 'configuration_parsed',
    }, 'Workbench service configuration loaded');
  }

  /**
   * Parse service configuration from environment variables
   */
  private parseConfiguration(): WorkbenchServiceConfig {
    // Get service-specific environment variables
    const serviceIndex = this.getRequiredEnvVar('SERVICE_INDEX');
    const serviceName = this.getRequiredEnvVar('SERVICE_NAME');
    const kafkaTopics = this.getRequiredEnvVar('KAFKA_TOPICS');
    const partitionsPerTopic = this.getRequiredEnvVar('PARTITIONS_PER_TOPIC');
    const messageSizeBytes = this.getRequiredEnvVar('MESSAGE_SIZE_BYTES');

    // Parse topics from comma-separated string
    const topics = kafkaTopics.split(',').map(topic => topic.trim()).filter(topic => topic.length > 0);

    if (topics.length === 0) {
      throw new Error('No valid topics found in KAFKA_TOPICS environment variable');
    }

    const config: WorkbenchServiceConfig = {
      serviceIndex: parseInt(serviceIndex, 10),
      serviceName,
      topics,
      partitionsPerTopic: parseInt(partitionsPerTopic, 10),
      messageSizeBytes: parseInt(messageSizeBytes, 10),
    };

    // Validate configuration
    this.validateConfiguration(config);

    return config;
  }

  /**
   * Get required environment variable or throw error
   */
  private getRequiredEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Required environment variable ${name} is not set`);
    }
    return value;
  }

  /**
   * Validate parsed configuration
   */
  private validateConfiguration(config: WorkbenchServiceConfig): void {
    const errors: string[] = [];

    if (isNaN(config.serviceIndex) || config.serviceIndex < 0) {
      errors.push('SERVICE_INDEX must be a non-negative integer');
    }

    if (!config.serviceName || config.serviceName.trim().length === 0) {
      errors.push('SERVICE_NAME must be a non-empty string');
    }

    if (config.topics.length === 0) {
      errors.push('At least one topic must be specified in KAFKA_TOPICS');
    }

    // Validate topic names
    config.topics.forEach((topic, index) => {
      if (!topic || topic.trim().length === 0) {
        errors.push(`Topic at index ${index} is empty or invalid`);
      }
      
      // Basic topic name validation (Kafka naming rules) - ReDoS safe
      if (topic.length === 0 || topic.length > 249) {
        errors.push(`Topic '${topic}' length must be between 1 and 249 characters`);
      } else {
        // Check each character individually to avoid ReDoS
        const validChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-';
        const hasInvalidChar = [...topic].some(char => !validChars.includes(char));
        if (hasInvalidChar) {
          errors.push(`Topic '${topic}' contains invalid characters. Use only alphanumeric, dots, underscores, and hyphens`);
        }
      }
    });

    if (isNaN(config.partitionsPerTopic) || config.partitionsPerTopic < 1) {
      errors.push('PARTITIONS_PER_TOPIC must be a positive integer');
    }

    if (isNaN(config.messageSizeBytes) || config.messageSizeBytes < 1 || config.messageSizeBytes > 1048576) {
      errors.push('MESSAGE_SIZE_BYTES must be between 1 and 1,048,576 bytes (1MB)');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Get the parsed configuration
   */
  public getConfig(): WorkbenchServiceConfig {
    return { ...this.config }; // Return a copy to prevent mutation
  }

  /**
   * Get service index
   */
  public getServiceIndex(): number {
    return this.config.serviceIndex;
  }

  /**
   * Get service name
   */
  public getServiceName(): string {
    return this.config.serviceName;
  }

  /**
   * Get all topics for this service
   */
  public getTopics(): string[] {
    return [...this.config.topics]; // Return a copy
  }

  /**
   * Get number of partitions per topic
   */
  public getPartitionsPerTopic(): number {
    return this.config.partitionsPerTopic;
  }

  /**
   * Get total number of topics
   */
  public getTopicCount(): number {
    return this.config.topics.length;
  }

  /**
   * Check if this service handles a specific topic
   */
  public handlesTopic(topic: string): boolean {
    return this.config.topics.includes(topic);
  }

  /**
   * Get consumer group ID for this service
   */
  public getConsumerGroupId(): string {
    return `${this.config.serviceName}-consumer-group`;
  }

  /**
   * Get message size in bytes
   */
  public getMessageSizeBytes(): number {
    return this.config.messageSizeBytes;
  }

  /**
   * Get formatted message size for display
   */
  public getMessageSizeFormatted(): string {
    const bytes = this.config.messageSizeBytes;
    if (bytes < 1024) {
      return `${bytes}B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)}KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    }
  }

  /**
   * Get configuration summary for logging
   */
  public getConfigSummary(): Record<string, any> {
    return {
      serviceIndex: this.config.serviceIndex,
      serviceName: this.config.serviceName,
      topicCount: this.config.topics.length,
      topics: this.config.topics,
      partitionsPerTopic: this.config.partitionsPerTopic,
      totalPartitions: this.config.topics.length * this.config.partitionsPerTopic,
      messageSizeBytes: this.config.messageSizeBytes,
      messageSizeFormatted: this.getMessageSizeFormatted(),
      consumerGroupId: this.getConsumerGroupId(),
    };
  }
}
