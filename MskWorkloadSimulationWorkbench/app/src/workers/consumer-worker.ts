/**
 * Consumer Worker Thread
 * Runs Kafka consumer in a dedicated event loop.
 * Communicates message counts and latency to main thread via parentPort.
 */

import { parentPort, workerData } from 'worker_threads';
import { Kafka } from 'kafkajs';
import { KafkaConfigManager } from '../kafka/kafka-config';
import { ConfigService } from '../services/config-service';

interface ConsumerWorkerData {
  topics: string[];
  serviceName: string;
  serviceIndex: number;
  consumerGroupId: string;
  partitionsPerTopic: number;
}

const config = workerData as ConsumerWorkerData;
let countSinceLastReport = 0;
let latencySamples: number[] = [];

async function run() {
  const mskConfig = ConfigService.getMskConfig();
  if (!mskConfig) throw new Error('MSK config not found');

  const logger = require('pino')({ level: 'warn', name: 'ConsumerWorker' });
  const kafkaConfigManager = new KafkaConfigManager(mskConfig, logger);
  const kafka = await kafkaConfigManager.createKafkaClient();

  const consumer = kafka.consumer({
    groupId: config.consumerGroupId,
    sessionTimeout: 30000,
    rebalanceTimeout: 60000,
    heartbeatInterval: 3000,
  });

  await consumer.connect();
  await consumer.subscribe({ topics: config.topics, fromBeginning: false });

  // Report counts to main thread every second
  setInterval(() => {
    parentPort?.postMessage({ type: 'metrics', received: countSinceLastReport, latencies: latencySamples });
    countSinceLastReport = 0;
    latencySamples = [];
  }, 1000);

  await consumer.run({
    partitionsConsumedConcurrently: Math.min(config.topics.length * config.partitionsPerTopic, 20),
    eachMessage: async ({ message }) => {
      countSinceLastReport++;

      // Calculate latency
      if (message.value) {
        try {
          const data = JSON.parse(message.value.toString());
          if (data.timestamp && typeof data.timestamp === 'number') {
            const latency = Date.now() - data.timestamp;
            if (latency >= 0 && latency < 60000) {
              latencySamples.push(latency);
            }
          }
        } catch {}
      }
    },
  });
}

run().catch(err => {
  parentPort?.postMessage({ type: 'error', error: err.message });
  process.exit(1);
});
