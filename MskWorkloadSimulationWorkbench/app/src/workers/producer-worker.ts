/**
 * Producer Worker Thread
 * Runs Kafka producer in a dedicated event loop with batch sends.
 * Communicates message counts to main thread via parentPort.
 */

import { parentPort, workerData } from 'worker_threads';
import { Kafka } from 'kafkajs';
import { randomBytes } from 'crypto';
import { KafkaConfigManager } from '../kafka/kafka-config';
import { ConfigService } from '../services/config-service';

interface ProducerWorkerData {
  topics: string[];
  serviceName: string;
  serviceIndex: number;
  messageSizeBytes: number;
}

const config = workerData as ProducerWorkerData;
let totalSent = 0;
let countSinceLastReport = 0;

const BATCH_SIZE = 50;

function buildBatch() {
  const topicMessages: Record<string, any[]> = {};

  for (let i = 0; i < BATCH_SIZE; i++) {
    const topic = config.topics[totalSent % config.topics.length]!;
    totalSent++;

    const messageId = `${config.serviceName}-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const baseMessage = {
      messageId,
      timestamp: Date.now(),
      serviceIndex: config.serviceIndex,
      serviceName: config.serviceName,
      topic,
      sequenceNumber: totalSent,
      messageSizeBytes: config.messageSizeBytes,
    };

    const baseSize = Buffer.byteLength(JSON.stringify(baseMessage), 'utf8');
    const paddingNeeded = config.messageSizeBytes - baseSize - 20;
    const payload = paddingNeeded > 0
      ? { ...baseMessage, padding: 'x'.repeat(paddingNeeded) }
      : baseMessage;

    if (!topicMessages[topic]) topicMessages[topic] = [];
    topicMessages[topic].push({
      key: messageId,
      value: JSON.stringify(payload),
      headers: { 'created-at': new Date().toISOString(), 'service-name': config.serviceName },
    });
  }

  return Object.entries(topicMessages).map(([topic, messages]) => ({ topic, messages }));
}

async function run() {
  const mskConfig = ConfigService.getMskConfig();
  if (!mskConfig) throw new Error('MSK config not found');

  const logger = require('pino')({ level: 'warn', name: 'ProducerWorker' });
  const kafkaConfigManager = new KafkaConfigManager(mskConfig, logger);
  const kafka = await kafkaConfigManager.createKafkaClient();

  const producer = kafka.producer({
    maxInFlightRequests: 5,
    idempotent: false,
    transactionTimeout: 30000,
  });

  await producer.connect();

  setInterval(() => {
    parentPort?.postMessage({ type: 'metrics', sent: countSinceLastReport });
    countSinceLastReport = 0;
  }, 1000);

  const produceNext = async () => {
    try {
      await producer.sendBatch({ topicMessages: buildBatch() });
      countSinceLastReport += BATCH_SIZE;
      setImmediate(produceNext);
    } catch {
      setTimeout(produceNext, 100);
    }
  };

  setImmediate(produceNext);
}

run().catch(err => {
  parentPort?.postMessage({ type: 'error', error: err.message });
  process.exit(1);
});
