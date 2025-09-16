/**
 * Workbench Application Service
 * Main orchestrator for multi-topic Kafka performance testing workbench
 */

import express, { Application } from 'express';
import { Server } from 'http';
import pino from 'pino';
import { Kafka } from 'kafkajs';
import { WorkbenchConfigService } from './workbench-config-service';
import { MultiTopicManager } from '../kafka/multi-topic-manager';
import { MultiTopicProducer } from '../kafka/multi-topic-producer';
import { MultiTopicConsumer } from '../kafka/multi-topic-consumer';
import { MetricsService } from './metrics-service';
import { HealthService } from './health-service';
import { RoutesService } from './routes-service';
import { ConfigService } from './config-service';
import { KafkaConfigManager } from '../kafka/kafka-config';

export class WorkbenchApplicationService {
  private app: Application;
  private server: Server | null = null;
  private logger: pino.Logger;
  
  // Configuration
  private workbenchConfig: WorkbenchConfigService;
  
  // Kafka components
  private kafka: Kafka | null = null;
  private topicManager: MultiTopicManager | null = null;
  private producer: MultiTopicProducer | null = null;
  private consumer: MultiTopicConsumer | null = null;
  
  // Services
  private metricsService: MetricsService | null = null;
  private healthService!: HealthService;
  private routesService!: RoutesService;
  
  // State
  private isInitialized = false;
  private isRunning = false;

  constructor() {
    // Setup logger
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      name: 'WorkbenchApp',
    });
    
    this.app = express();
    
    try {
      // Parse workbench configuration from environment
      this.workbenchConfig = new WorkbenchConfigService(this.logger);
      
      this.logger.info({
        config: this.workbenchConfig.getConfigSummary(),
        action: 'workbench_config_loaded',
      }, 'Workbench configuration loaded successfully');
      
    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'workbench_config_error',
      }, 'Failed to load workbench configuration');
      throw error;
    }
    
    // Initialize services
    this.initializeServices();
    this.setupRoutes();
    this.setupGracefulShutdown();
  }

  /**
   * Initialize all services
   */
  private initializeServices(): void {
    // Initialize metrics service
    this.metricsService = new MetricsService(
      {
        namespace: 'MSKExpress/Kafka',
        flushIntervalMs: 5000,
        region: process.env.AWS_REGION || 'us-east-1',
        serviceName: this.workbenchConfig.getServiceName(),
        serviceIndex: this.workbenchConfig.getServiceIndex(),
      },
      this.logger
    );

    // Initialize health service
    this.healthService = new HealthService(this.logger);
    
    // Set workbench app reference for health checks
    this.healthService.setWorkbenchApp(this);
    
    // Initialize routes service
    this.routesService = new RoutesService(this.logger, this.healthService);
  }

  /**
   * Initialize Kafka components
   */
  private async initializeKafkaComponents(): Promise<void> {
    try {
      // Get MSK configuration
      const mskConfig = ConfigService.getMskConfig();
      if (!mskConfig) {
        throw new Error('MSK configuration not found');
      }

      this.logger.info({
        clusterArn: mskConfig.clusterArn,
        clusterName: mskConfig.clusterName,
        action: 'kafka_init_start',
      }, 'Initializing Kafka components');

      // Create Kafka client
      const kafkaConfigManager = new KafkaConfigManager(mskConfig, this.logger);
      this.kafka = await kafkaConfigManager.createKafkaClient();

      // Initialize topic manager
      const admin = this.kafka.admin();
      this.topicManager = new MultiTopicManager(
        admin,
        this.workbenchConfig.getConfig(),
        this.logger
      );

      // Ensure all topics exist
      const topicResults = await this.topicManager.ensureTopicsExist();
      this.topicManager.validateResults(topicResults);

      this.logger.info({
        topicResults,
        action: 'topics_ensured',
      }, 'All topics created/verified successfully');

      // Initialize producer with moderate optimization
      const kafkaProducer = this.kafka.producer({
        maxInFlightRequests: 20,        // Increased from 5 to 20 for better throughput
        idempotent: true,
        transactionTimeout: 30000,
      });

      this.producer = new MultiTopicProducer(
        kafkaProducer,
        this.workbenchConfig.getConfig(),
        this.logger,
        this.metricsService || undefined
      );

      // Initialize consumer with stable settings
      const kafkaConsumer = this.kafka.consumer({
        groupId: this.workbenchConfig.getConsumerGroupId(),
        sessionTimeout: 30000,
        rebalanceTimeout: 60000,
        heartbeatInterval: 3000,
      });

      this.consumer = new MultiTopicConsumer(
        kafkaConsumer,
        this.workbenchConfig.getConfig(),
        this.logger,
        this.metricsService || undefined
      );

      this.isInitialized = true;

      this.logger.info({
        serviceIndex: this.workbenchConfig.getServiceIndex(),
        serviceName: this.workbenchConfig.getServiceName(),
        topics: this.workbenchConfig.getTopics(),
        action: 'kafka_init_complete',
      }, 'Kafka components initialized successfully');

    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'kafka_init_error',
      }, 'Failed to initialize Kafka components');
      throw error;
    }
  }

  /**
   * Start all Kafka services
   */
  private async startKafkaServices(): Promise<void> {
    if (!this.isInitialized || !this.producer || !this.consumer || !this.metricsService) {
      throw new Error('Kafka components not initialized');
    }

    try {
      this.logger.info({ action: 'kafka_services_start' }, 'Starting Kafka services');

      // Start metrics service first
      this.metricsService.start();

      // Start producer and consumer in parallel
      await Promise.all([
        this.producer.start(),
        this.consumer.start(),
      ]);

      this.isRunning = true;

      this.logger.info({
        producerStatus: this.producer.getStatus(),
        consumerStatus: this.consumer.getStatus(),
        metricsStatus: this.metricsService.getStatus(),
        action: 'kafka_services_started',
      }, 'All Kafka services started successfully');

    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'kafka_services_start_error',
      }, 'Failed to start Kafka services');
      throw error;
    }
  }

  /**
   * Stop all Kafka services
   */
  private async stopKafkaServices(): Promise<void> {
    if (!this.isRunning) {
      this.logger.info({ action: 'kafka_services_stop_skip' }, 'Kafka services not running');
      return;
    }

    try {
      this.logger.info({ action: 'kafka_services_stop' }, 'Stopping Kafka services');

      // Stop producer and consumer in parallel
      const stopPromises: Promise<void>[] = [];
      
      if (this.producer) {
        stopPromises.push(this.producer.stop());
      }
      
      if (this.consumer) {
        stopPromises.push(this.consumer.stop());
      }

      await Promise.all(stopPromises);

      // Stop metrics service last
      if (this.metricsService) {
        this.metricsService.stop();
      }

      this.isRunning = false;

      this.logger.info({ action: 'kafka_services_stopped' }, 'All Kafka services stopped');

    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'kafka_services_stop_error',
      }, 'Error stopping Kafka services');
    }
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // Add workbench-specific routes
    this.app.get('/workbench/status', (req, res) => {
      const status = {
        service: {
          index: this.workbenchConfig.getServiceIndex(),
          name: this.workbenchConfig.getServiceName(),
          topics: this.workbenchConfig.getTopics(),
          partitionsPerTopic: this.workbenchConfig.getPartitionsPerTopic(),
        },
        kafka: {
          initialized: this.isInitialized,
          running: this.isRunning,
          producer: this.producer?.getStatus() || null,
          consumer: this.consumer?.getStatus() || null,
          metrics: this.metricsService?.getStatus() || null,
        },
        timestamp: new Date().toISOString(),
      };

      res.json(status);
    });

    // Add workbench statistics route
    this.app.get('/workbench/stats', (req, res) => {
      const stats = {
        producer: this.producer?.getStats() || null,
        consumer: this.consumer?.getStats() || null,
        consumerPartitions: this.consumer?.getPartitionStats() || null,
        topicManager: this.topicManager?.getTopicSummary() || null,
        timestamp: new Date().toISOString(),
      };

      res.json(stats);
    });

    // Use existing routes service for health checks
    this.app.use('/', this.routesService.getRouter());
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      this.logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown');

      try {
        // Stop accepting new requests
        if (this.server) {
          this.server.close(() => {
            this.logger.info('HTTP server closed');
          });
        }

        // Stop Kafka services
        await this.stopKafkaServices();

        this.logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        this.logger.error({
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Error during graceful shutdown');
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.fatal({
        error: error.message,
        stack: error.stack,
      }, 'Uncaught exception');
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.fatal({
        reason,
        promise,
      }, 'Unhandled promise rejection');
      process.exit(1);
    });
  }

  /**
   * Start the workbench application
   */
  async start(): Promise<void> {
    const port = ConfigService.getPort();

    this.server = this.app.listen(port, async () => {
      this.logger.info({
        service: 'WorkbenchApp',
        serviceIndex: this.workbenchConfig.getServiceIndex(),
        serviceName: this.workbenchConfig.getServiceName(),
        port,
        nodeVersion: process.version,
        config: this.workbenchConfig.getConfigSummary(),
        action: 'startup',
        timestamp: new Date().toISOString(),
      }, `Workbench application started on port ${port}`);

      try {
        // Initialize and start Kafka services
        await this.initializeKafkaComponents();
        await this.startKafkaServices();

        this.logger.info({
          action: 'workbench_ready',
          timestamp: new Date().toISOString(),
        }, 'Workbench application is ready and processing messages');

      } catch (error) {
        this.logger.error({
          error: error instanceof Error ? error.message : 'Unknown error',
          action: 'workbench_startup_error',
        }, 'Failed to start workbench services');
        
        // Don't exit - let the app run for health checks even if Kafka fails
      }
    });
  }

  /**
   * Get Express application
   */
  getApp(): Application {
    return this.app;
  }

  /**
   * Get workbench configuration
   */
  getConfig(): WorkbenchConfigService {
    return this.workbenchConfig;
  }

  /**
   * Check if workbench is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.isRunning;
  }
}
