/**
 * Orchestrator Service
 * Centralized topic management — creates, verifies with retry, and exposes readiness API.
 * Runs as a dedicated ECS service with ROLE=orchestrator.
 */

import express from 'express';
import pino from 'pino';
import { Kafka, Admin } from 'kafkajs';
import { KafkaConfigManager } from '../kafka/kafka-config';
import { ConfigService } from './config-service';

interface ServiceTopicConfig {
  serviceIndex: number;
  serviceName: string;
  topics: { name: string; partitions: number }[];
}

interface ServiceStatus {
  status: 'ready' | 'pending' | 'error';
  topics: string[];
  error?: string;
  attempts: number;
  nextRetryAt: number;
}

export class OrchestratorService {
  private logger = pino({ level: process.env.LOG_LEVEL || 'info', name: 'Orchestrator' });
  private app = express();
  private serviceStatuses = new Map<number, ServiceStatus>();
  private serviceConfigs: ServiceTopicConfig[] = [];
  private statusApiRequests = 0;

  async start(): Promise<void> {
    this.parseConfig();
    this.setupRoutes();

    const port = Number(process.env.PORT) || 3000;
    this.app.listen(port, async () => {
      this.logger.info({ port }, 'Orchestrator HTTP server started');
      await this.reconcileWithRetry();
    });
  }

  private parseConfig(): void {
    const configJson = process.env.DEPLOYMENT_CONFIG;
    if (!configJson) throw new Error('DEPLOYMENT_CONFIG env var is required');

    const config = JSON.parse(configJson);
    const envPrefix = process.env.ENV_PREFIX || 'dev';
    const appPrefix = process.env.APP_PREFIX || 'mske';

    this.serviceConfigs = config.services.map((svc: any, si: number) => {
      const serviceName = `${envPrefix}-${appPrefix}-service-${si}`;
      const topics = [];
      for (let ti = 0; ti < svc.topics; ti++) {
        topics.push({
          name: `${envPrefix}-${appPrefix}-service-${si}-topic-${ti}`,
          partitions: svc.partitionsPerTopic,
        });
      }
      return { serviceIndex: si, serviceName, topics };
    });

    // Initialize all as pending
    this.serviceConfigs.forEach(sc => {
      this.serviceStatuses.set(sc.serviceIndex, { status: 'pending', topics: sc.topics.map(t => t.name), attempts: 0, nextRetryAt: 0 });
    });
  }

  private async reconcileWithRetry(): Promise<void> {
    while (true) {
      const now = Date.now();
      const due = this.serviceConfigs.filter(sc => {
        const s = this.serviceStatuses.get(sc.serviceIndex)!;
        return s.status !== 'ready' && now >= s.nextRetryAt;
      });

      if (due.length > 0) {
        this.logger.info({ services: due.map(s => s.serviceIndex) }, 'Reconciling due services');
        await this.reconcileServices(due);
      }

      const allReady = this.serviceConfigs.every(sc => this.serviceStatuses.get(sc.serviceIndex)?.status === 'ready');
      if (allReady) {
        this.logger.info('All services ready');
        this.logPartitionUsage();
        return;
      }

      await new Promise(r => setTimeout(r, 2000)); // check every 2s, actual retry timing is per-service
    }
  }

  private async reconcileServices(services: ServiceTopicConfig[]): Promise<void> {
    const mskConfig = ConfigService.getMskConfig();
    if (!mskConfig) throw new Error('MSK configuration not found');

    const kafkaConfigManager = new KafkaConfigManager(mskConfig, this.logger);
    const kafka = await kafkaConfigManager.createKafkaClient();
    const admin = kafka.admin();

    try {
      await admin.connect();
      const existing = new Set(await admin.listTopics());

      for (const sc of services) {
        try {
          await this.reconcileService(admin, sc, existing);
          this.serviceStatuses.set(sc.serviceIndex, { status: 'ready', topics: sc.topics.map(t => t.name), attempts: (this.serviceStatuses.get(sc.serviceIndex)?.attempts || 0) + 1, nextRetryAt: 0 });
          this.logger.info({ service: sc.serviceIndex }, 'Service topics ready');
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          const prev = this.serviceStatuses.get(sc.serviceIndex)!;
          const attempts = prev.attempts + 1;
          const backoffMs = Math.min(5000 * Math.pow(2, attempts - 1), 30000); // 5s, 10s, 20s, 30s cap
          this.serviceStatuses.set(sc.serviceIndex, {
            status: 'pending', topics: sc.topics.map(t => t.name), error: msg,
            attempts, nextRetryAt: Date.now() + backoffMs,
          });
          this.logger.warn({ service: sc.serviceIndex, attempts, nextRetryInMs: backoffMs, error: msg }, 'Service topics not ready yet');
        }
      }
    } finally {
      await admin.disconnect().catch(() => {});
    }
  }

  private async reconcileService(admin: Admin, sc: ServiceTopicConfig, existing: Set<string>): Promise<void> {
    const toCreate = sc.topics.filter(t => !existing.has(t.name));
    const toVerify = sc.topics.filter(t => existing.has(t.name));

    if (toCreate.length > 0) {
      this.logger.info({ service: sc.serviceIndex, topics: toCreate.map(t => t.name) }, 'Creating topics');
      await admin.createTopics({
        topics: toCreate.map(t => ({
          topic: t.name,
          numPartitions: t.partitions,
          replicationFactor: 3,
          configEntries: [
            { name: 'retention.ms', value: '86400000' },
            { name: 'compression.type', value: 'gzip' },
          ],
        })),
        waitForLeaders: true,
        timeout: 120000,
      });
      // Add newly created topics to verify list
      toCreate.forEach(t => toVerify.push(t));
      // Mark them as existing for future iterations
      toCreate.forEach(t => existing.add(t.name));
    }

    // Verify all topics have correct partition counts
    if (toVerify.length > 0) {
      const metadata = await admin.fetchTopicMetadata({ topics: toVerify.map(t => t.name) });
      for (const tm of metadata.topics) {
        const expected = sc.topics.find(t => t.name === tm.name)?.partitions || 0;
        const actual = tm.partitions.length;
        if (actual < expected) {
          this.logger.info({ topic: tm.name, from: actual, to: expected }, 'Expanding partitions');
          await admin.createPartitions({ topicPartitions: [{ topic: tm.name, count: expected }] });
        } else if (actual > expected) {
          this.logger.warn({ topic: tm.name, actual, expected }, 'Topic has more partitions than config (cannot shrink)');
        }
      }
    }
  }

  private logPartitionUsage(): void {
    const allTopics = this.serviceConfigs.flatMap(sc => sc.topics);
    const totalLeaders = allTopics.reduce((sum, t) => sum + t.partitions, 0);
    const totalReplicas = totalLeaders * 3;
    const brokersPerAz = Number(process.env.MSK_BROKERS_PER_AZ) || 1;
    const totalBrokers = brokersPerAz * 3;
    const replicasPerBroker = Math.ceil(totalReplicas / totalBrokers);
    const ready = this.serviceConfigs.filter(sc => this.serviceStatuses.get(sc.serviceIndex)?.status === 'ready').length;

    this.logger.info({
      totalLeaders,
      totalReplicas,
      totalBrokers,
      replicasPerBroker,
      servicesReady: ready,
      servicesTotal: this.serviceConfigs.length,
    }, `Partition usage — ${replicasPerBroker} replicas/broker, ${ready}/${this.serviceConfigs.length} services ready`);
  }

  private setupRoutes(): void {
    this.app.get('/health', (_req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString() }));

    this.app.get('/topics/status', (req, res) => {
      this.statusApiRequests++;
      const serviceIndex = Number(req.query.service);
      if (isNaN(serviceIndex)) { res.status(400).json({ error: 'service query param required' }); return; }

      const status = this.serviceStatuses.get(serviceIndex);
      if (!status) { res.status(404).json({ error: `service ${serviceIndex} not found` }); return; }

      res.json(status);
    });

    this.app.get('/topics/cleanup', async (_req, res) => {
      try {
        const stale = await this.findStaleTopics();
        res.json({ stale });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
      }
    });

    this.app.post('/topics/cleanup', async (_req, res) => {
      try {
        const stale = await this.findStaleTopics();
        if (stale.length === 0) { res.json({ deleted: [] }); return; }

        const mskConfig = ConfigService.getMskConfig();
        if (!mskConfig) throw new Error('MSK configuration not found');
        const kafkaConfigManager = new KafkaConfigManager(mskConfig, this.logger);
        const kafka = await kafkaConfigManager.createKafkaClient();
        const admin = kafka.admin();
        await admin.connect();
        await admin.deleteTopics({ topics: stale, timeout: 30000 });
        await admin.disconnect().catch(() => {});

        this.logger.info({ deleted: stale }, 'Deleted stale topics');
        res.json({ deleted: stale });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
      }
    });

    this.app.get('/topics/summary', (_req, res) => {
      const allTopics = this.serviceConfigs.flatMap(sc => sc.topics);
      const totalLeaders = allTopics.reduce((sum, t) => sum + t.partitions, 0);
      const totalReplicas = totalLeaders * 3;
      const brokersPerAz = Number(process.env.MSK_BROKERS_PER_AZ) || 1;
      const totalBrokers = brokersPerAz * 3;
      const ready = this.serviceConfigs.filter(sc => this.serviceStatuses.get(sc.serviceIndex)?.status === 'ready').length;

      res.json({
        services: { ready, total: this.serviceConfigs.length },
        topics: { desired: allTopics.length, created: allTopics.length },
        partitions: { totalLeaders, totalReplicas, replicasPerBroker: Math.ceil(totalReplicas / totalBrokers), totalBrokers },
        statusApiRequests: this.statusApiRequests,
        statuses: Object.fromEntries(this.serviceStatuses),
      });
    });
  }

  private async findStaleTopics(): Promise<string[]> {
    const mskConfig = ConfigService.getMskConfig();
    if (!mskConfig) throw new Error('MSK configuration not found');
    const kafkaConfigManager = new KafkaConfigManager(mskConfig, this.logger);
    const kafka = await kafkaConfigManager.createKafkaClient();
    const admin = kafka.admin();
    await admin.connect();

    const allTopics = await admin.listTopics();
    await admin.disconnect().catch(() => {});

    const envPrefix = process.env.ENV_PREFIX || 'dev';
    const appPrefix = process.env.APP_PREFIX || 'mske';
    const prefix = `${envPrefix}-${appPrefix}-service-`;
    const knownTopics = new Set(this.serviceConfigs.flatMap(sc => sc.topics.map(t => t.name)));

    return allTopics.filter(t => t.startsWith(prefix) && !knownTopics.has(t));
  }
}
