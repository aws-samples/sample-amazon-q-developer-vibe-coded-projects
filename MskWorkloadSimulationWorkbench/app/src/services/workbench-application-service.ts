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
   * Wait for orchestrator to confirm topics are ready
   */
  private async waitForTopics(): Promise<void> {
    const serviceIndex = this.workbenchConfig.getServiceIndex();
    const host = process.env.ORCHESTRATOR_HOST || 'orchestrator.workbench.local';
    const port = process.env.ORCHESTRATOR_PORT || '3000';
    const url = `http://${host}:${port}/topics/status?service=${serviceIndex}`;

    this.logger.info({ url }, 'Waiting for orchestrator to confirm topics are ready');

    while (true) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json() as { status: string };
          if (data.status === 'ready') {
            this.logger.info({ serviceIndex }, 'Topics confirmed ready by orchestrator');
            return;
          }
        }
      } catch {
        // orchestrator not reachable yet, retry
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  /**
   * Initialize Kafka components
   */
  private async initializeKafkaComponents(): Promise<void> {
    try {
      const mskConfig = ConfigService.getMskConfig();
      if (!mskConfig) throw new Error('MSK configuration not found');

      this.logger.info({ action: 'kafka_init_start' }, 'Initializing Kafka components');

      // Verify topics via admin client on main thread
      const kafkaConfigManager = new KafkaConfigManager(mskConfig, this.logger);
      this.kafka = await kafkaConfigManager.createKafkaClient();
      const admin = this.kafka.admin();
      this.topicManager = new MultiTopicManager(admin, this.workbenchConfig.getConfig(), this.logger);
      const topicResults = await this.topicManager.ensureTopicsExist();
      this.topicManager.validateResults(topicResults);

      this.logger.info({ action: 'topics_ensured' }, 'All topics verified successfully');
      this.isInitialized = true;
    } catch (error) {
      this.logger.error({ error: error instanceof Error ? error.message : 'Unknown error', action: 'kafka_init_error' }, 'Failed to initialize Kafka components');
      throw error;
    }
  }

  /**
   * Start all Kafka services using worker threads
   */
  private async startKafkaServices(): Promise<void> {
    if (!this.isInitialized || !this.metricsService) throw new Error('Kafka components not initialized');

    const { Worker } = require('worker_threads');
    const path = require('path');
    const taskCpu = Number(process.env.TASK_CPU) || 256;
    const NUM_PRODUCER_THREADS = taskCpu <= 256 ? 4 : Math.floor(taskCpu / 32);

    this.logger.info({ numProducerThreads: NUM_PRODUCER_THREADS, action: 'kafka_services_start' }, 'Starting Kafka services in worker threads');

    this.metricsService.start();
    const metricsService = this.metricsService;

    // Spawn 8 producer workers with staggered starts (2s apart)
    for (let i = 0; i < NUM_PRODUCER_THREADS; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 2000));
      const w = new Worker(path.resolve(__dirname, '..', 'workers', 'producer-worker.js'), {
        workerData: {
          topics: this.workbenchConfig.getTopics(),
          serviceName: this.workbenchConfig.getServiceName(),
          serviceIndex: this.workbenchConfig.getServiceIndex(),
          messageSizeBytes: this.workbenchConfig.getMessageSizeBytes(),
        },
      });
      w.on('message', (msg: any) => {
        if (msg.type === 'metrics') metricsService.incrementMessagesSent(msg.sent);
      });
      w.on('error', (err: Error) => this.logger.error({ error: err.message, thread: i }, 'Producer worker crashed'));
      this.logger.info({ thread: i }, `Producer worker ${i} started`);
    }

    // Single consumer worker
    const cw = new Worker(path.resolve(__dirname, '..', 'workers', 'consumer-worker.js'), {
      workerData: {
        topics: this.workbenchConfig.getTopics(),
        serviceName: this.workbenchConfig.getServiceName(),
        serviceIndex: this.workbenchConfig.getServiceIndex(),
        consumerGroupId: this.workbenchConfig.getConsumerGroupId(),
        partitionsPerTopic: this.workbenchConfig.getPartitionsPerTopic(),
      },
    });
    cw.on('message', (msg: any) => {
      if (msg.type === 'metrics') {
        metricsService.incrementMessagesReceived(msg.received);
        if (msg.latencies) msg.latencies.forEach((l: number) => metricsService.recordLatency(l));
      }
    });
    cw.on('error', (err: Error) => this.logger.error({ error: err.message }, 'Consumer worker crashed'));

    this.isRunning = true;
    this.logger.info({ action: 'kafka_services_started' }, 'All workers started');
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
        // Wait for orchestrator to confirm topics are ready
        await this.waitForTopics();

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
