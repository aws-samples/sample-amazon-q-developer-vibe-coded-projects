/**
 * Kafka Configuration Class
 * Handles MSK cluster connection configuration with IAM authentication
 */

import { KafkaClient, GetBootstrapBrokersCommand } from '@aws-sdk/client-kafka';
import { generateAuthToken } from 'aws-msk-iam-sasl-signer-js';
import { Kafka, KafkaConfig, SASLOptions } from 'kafkajs';
import pino from 'pino';

export interface MskConfig {
  clusterArn: string;
  clusterName: string;
  region: string;
  topicName: string;
  clientId: string;
}

export class KafkaConfigManager {
  private logger: pino.Logger;
  private kafkaClient: KafkaClient;
  private config: MskConfig;
  private bootstrapServers: string[] = [];

  constructor(config: MskConfig, logger: pino.Logger) {
    this.config = config;
    this.logger = logger.child({ component: 'KafkaConfigManager' });
    this.kafkaClient = new KafkaClient({ region: config.region });
  }

  /**
   * Get bootstrap servers from environment variable or MSK cluster
   */
  async getBootstrapServers(): Promise<string[]> {
    if (this.bootstrapServers.length > 0) {
      return this.bootstrapServers;
    }

    try {
      // First try to get from environment variable (preferred method)
      const envBootstrapServers = process.env.MSK_BOOTSTRAP_SERVERS;
      
      if (envBootstrapServers && envBootstrapServers !== 'RUNTIME_RESOLVED' && envBootstrapServers !== 'NOT_AVAILABLE') {
        this.bootstrapServers = envBootstrapServers.split(',').map(broker => broker.trim());
        
        this.logger.info({
          bootstrapServers: this.bootstrapServers,
          count: this.bootstrapServers.length,
          source: 'environment_variable',
          action: 'get_bootstrap_servers',
        }, 'Successfully retrieved bootstrap servers from environment');

        return this.bootstrapServers;
      }

      // Fallback to API call (requires VPC endpoint)
      this.logger.info({
        clusterArn: this.config.clusterArn,
        action: 'get_bootstrap_servers',
      }, 'Environment variable not available, fetching bootstrap servers from MSK cluster API');

      const command = new GetBootstrapBrokersCommand({
        ClusterArn: this.config.clusterArn,
      });
      
      const response = await this.kafkaClient.send(command);

      if (!response.BootstrapBrokerStringSaslIam) {
        throw new Error('No SASL/IAM bootstrap brokers found in MSK cluster response');
      }

      this.bootstrapServers = response.BootstrapBrokerStringSaslIam.split(',').map(broker => broker.trim());

      this.logger.info({
        bootstrapServers: this.bootstrapServers,
        count: this.bootstrapServers.length,
        source: 'msk_api',
        action: 'get_bootstrap_servers',
      }, 'Successfully retrieved bootstrap servers from MSK API');

      return this.bootstrapServers;

    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        clusterArn: this.config.clusterArn,
        envBootstrapServers: process.env.MSK_BOOTSTRAP_SERVERS,
        action: 'get_bootstrap_servers',
      }, 'Failed to get bootstrap servers');
      throw error;
    }
  }

  /**
   * Create SASL configuration for IAM authentication
   */
  private async createSaslConfig(): Promise<SASLOptions> {
    return {
      mechanism: 'oauthbearer',
      oauthBearerProvider: async () => {
        try {
          const authTokenResponse = await generateAuthToken({
            region: this.config.region,
          });

          return {
            value: authTokenResponse.token,
          };
        } catch (error) {
          this.logger.error({
            error: error instanceof Error ? error.message : 'Unknown error',
            action: 'generate_auth_token',
          }, 'Failed to generate MSK IAM auth token');
          throw error;
        }
      },
    };
  }

  /**
   * Create Kafka client instance with MSK IAM authentication
   */
  async createKafkaClient(): Promise<Kafka> {
    try {
      const bootstrapServers = await this.getBootstrapServers();
      const saslConfig = await this.createSaslConfig();

      const kafkaConfig: KafkaConfig = {
        clientId: this.config.clientId,
        brokers: bootstrapServers,
        ssl: true,
        sasl: saslConfig,
        connectionTimeout: 10000,
        requestTimeout: 30000,
        retry: {
          initialRetryTime: 100,
          retries: 8,
        },
        logLevel: 2, // INFO level
      };

      const kafka = new Kafka(kafkaConfig);

      this.logger.info({
        clientId: this.config.clientId,
        brokers: bootstrapServers,
        clusterName: this.config.clusterName,
        action: 'create_kafka_client',
      }, 'Kafka client created successfully');

      return kafka;

    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'create_kafka_client',
      }, 'Failed to create Kafka client');
      throw error;
    }
  }

  /**
   * Get configuration details
   */
  getConfig(): MskConfig {
    return { ...this.config };
  }
}
