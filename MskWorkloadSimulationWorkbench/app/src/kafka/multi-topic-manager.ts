/**
 * Multi-Topic Manager
 * Handles creation and management of multiple Kafka topics
 */

import { Admin, ITopicConfig } from 'kafkajs';
import pino from 'pino';
import { WorkbenchServiceConfig } from '../services/workbench-config-service';

export interface TopicCreationResult {
  topic: string;
  created: boolean;
  partitions: number;
  error?: string;
}

export class MultiTopicManager {
  private logger: pino.Logger;
  private admin: Admin;
  private config: WorkbenchServiceConfig;

  constructor(admin: Admin, config: WorkbenchServiceConfig, logger: pino.Logger) {
    this.admin = admin;
    this.config = config;
    this.logger = logger.child({ component: 'MultiTopicManager' });
  }

  /**
   * Ensure all topics exist with correct partition counts
   */
  async ensureTopicsExist(): Promise<TopicCreationResult[]> {
    this.logger.info({
      topics: this.config.topics,
      partitionsPerTopic: this.config.partitionsPerTopic,
      action: 'ensure_topics_start',
    }, 'Starting topic creation/verification process');

    const results: TopicCreationResult[] = [];

    try {
      // Connect to admin client
      await this.admin.connect();

      // Get existing topics
      const existingTopics = await this.admin.listTopics();
      this.logger.debug({
        existingTopics: existingTopics.length,
        action: 'list_topics',
      }, 'Retrieved existing topics list');

      // Get detailed metadata for existing topics
      const existingMetadata = await this.admin.fetchTopicMetadata({
        topics: this.config.topics.filter(topic => existingTopics.includes(topic)),
      });

      // Process each topic
      for (const topic of this.config.topics) {
        const result = await this.processTopicCreation(
          topic,
          existingTopics,
          existingMetadata.topics
        );
        results.push(result);
      }

      // Log summary
      const created = results.filter(r => r.created).length;
      const verified = results.filter(r => !r.created && !r.error).length;
      const errors = results.filter(r => r.error).length;

      this.logger.info({
        totalTopics: results.length,
        created,
        verified,
        errors,
        results,
        action: 'ensure_topics_complete',
      }, 'Topic creation/verification process completed');

      return results;

    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        topics: this.config.topics,
        action: 'ensure_topics_error',
      }, 'Failed to ensure topics exist');

      // Return error results for all topics
      return this.config.topics.map(topic => ({
        topic,
        created: false,
        partitions: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));

    } finally {
      try {
        await this.admin.disconnect();
      } catch (disconnectError) {
        this.logger.warn({
          error: disconnectError instanceof Error ? disconnectError.message : 'Unknown error',
          action: 'admin_disconnect_error',
        }, 'Error disconnecting admin client');
      }
    }
  }

  /**
   * Process creation/verification for a single topic
   */
  private async processTopicCreation(
    topic: string,
    existingTopics: string[],
    existingMetadata: any[]
  ): Promise<TopicCreationResult> {
    try {
      if (existingTopics.includes(topic)) {
        // Topic exists, verify partition count
        return await this.verifyExistingTopic(topic, existingMetadata);
      } else {
        // Topic doesn't exist, create it
        return await this.createNewTopic(topic);
      }
    } catch (error) {
      this.logger.error({
        topic,
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'process_topic_error',
      }, 'Error processing topic');

      return {
        topic,
        created: false,
        partitions: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify existing topic has correct partition count
   */
  private async verifyExistingTopic(
    topic: string,
    existingMetadata: any[]
  ): Promise<TopicCreationResult> {
    const topicMetadata = existingMetadata.find(t => t.name === topic);
    
    if (!topicMetadata) {
      this.logger.warn({
        topic,
        action: 'topic_metadata_missing',
      }, 'Topic exists but metadata not found');

      return {
        topic,
        created: false,
        partitions: 0,
        error: 'Topic metadata not found',
      };
    }

    const actualPartitions = topicMetadata.partitions.length;
    const expectedPartitions = this.config.partitionsPerTopic;

    if (actualPartitions !== expectedPartitions) {
      this.logger.warn({
        topic,
        actualPartitions,
        expectedPartitions,
        action: 'partition_count_mismatch',
      }, 'Topic exists but partition count does not match configuration');

      return {
        topic,
        created: false,
        partitions: actualPartitions,
        error: `Partition count mismatch: expected ${expectedPartitions}, found ${actualPartitions}`,
      };
    }

    this.logger.debug({
      topic,
      partitions: actualPartitions,
      action: 'topic_verified',
    }, 'Topic verified successfully');

    return {
      topic,
      created: false,
      partitions: actualPartitions,
    };
  }

  /**
   * Create a new topic
   */
  private async createNewTopic(topic: string): Promise<TopicCreationResult> {
    const topicConfig: ITopicConfig = {
      topic,
      numPartitions: this.config.partitionsPerTopic,
      replicationFactor: 3, // MSK Express default
      configEntries: [
        {
          name: 'retention.ms',
          value: '86400000', // 24 hours
        },
        {
          name: 'compression.type',
          value: 'gzip',
        },
      ],
    };

    this.logger.info({
      topic,
      partitions: this.config.partitionsPerTopic,
      replicationFactor: 3,
      action: 'create_topic_start',
    }, 'Creating new topic');

    await this.admin.createTopics({
      topics: [topicConfig],
      waitForLeaders: true,
      timeout: 30000, // 30 seconds
    });

    this.logger.info({
      topic,
      partitions: this.config.partitionsPerTopic,
      action: 'create_topic_success',
    }, 'Topic created successfully');

    return {
      topic,
      created: true,
      partitions: this.config.partitionsPerTopic,
    };
  }

  /**
   * Get topic creation summary
   */
  getTopicSummary(): Record<string, any> {
    return {
      serviceIndex: this.config.serviceIndex,
      serviceName: this.config.serviceName,
      topics: this.config.topics,
      partitionsPerTopic: this.config.partitionsPerTopic,
      totalTopics: this.config.topics.length,
      totalPartitions: this.config.topics.length * this.config.partitionsPerTopic,
    };
  }

  /**
   * Validate topic creation results
   */
  validateResults(results: TopicCreationResult[]): void {
    const errors = results.filter(r => r.error);
    
    if (errors.length > 0) {
      const errorMessages = errors.map(e => `${e.topic}: ${e.error}`).join(', ');
      throw new Error(`Topic creation/verification failed for: ${errorMessages}`);
    }

    this.logger.info({
      totalTopics: results.length,
      successfulTopics: results.filter(r => !r.error).length,
      action: 'topic_validation_success',
    }, 'All topics validated successfully');
  }
}
