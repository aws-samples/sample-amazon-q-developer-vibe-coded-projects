/**
 * Multi-Topic Manager
 * Verifies that topics exist (creation handled by orchestrator service).
 */

import { Admin } from 'kafkajs';
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

  async ensureTopicsExist(): Promise<TopicCreationResult[]> {
    this.logger.info({ topics: this.config.topics }, 'Verifying topics exist');

    try {
      await this.admin.connect();
      const existing = await this.admin.listTopics();
      const metadata = await this.admin.fetchTopicMetadata({
        topics: this.config.topics.filter(t => existing.includes(t)),
      });

      const metadataMap = new Map(metadata.topics.map(t => [t.name, t.partitions.length]));

      return this.config.topics.map(topic => {
        const partitions = metadataMap.get(topic);
        if (partitions === undefined) {
          return { topic, created: false, partitions: 0, error: 'Topic not found' };
        }
        return { topic, created: false, partitions };
      });
    } catch (error) {
      return this.config.topics.map(topic => ({
        topic, created: false, partitions: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    } finally {
      await this.admin.disconnect().catch(() => {});
    }
  }

  validateResults(results: TopicCreationResult[]): void {
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      throw new Error(`Topic verification failed: ${errors.map(e => `${e.topic}: ${e.error}`).join(', ')}`);
    }
  }

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
}
